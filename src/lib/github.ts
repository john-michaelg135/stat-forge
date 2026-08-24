/* ------------------------------------------------------------------ */
/*  StatForge — GitHub REST client (unauthenticated, CORS-friendly)    */
/* ------------------------------------------------------------------ */

export interface LanguageSlice {
  name: string;
  weight: number;
  pct: number; // 0..100, share of displayed weight
}

export interface StatsBundle {
  login: string;
  name: string;
  avatarDataUrl: string | null;
  joined: string; // "Mar 2008"
  followers: number;
  following: number;
  publicRepos: number;
  reposAnalyzed: number;
  totalStars: number;
  totalForks: number;
  commits: number | null;
  commitsWindow: "all-time" | "90d";
  prs: number | null;
  languages: LanguageSlice[];
  fetchedAt: number;
}

export interface RateInfo {
  remaining: number;
  limit: number;
  resetAt?: number;
  bucket: "core" | "search";
}

export type StageLabel =
  | "Locating profile"
  | "Scanning repositories"
  | "Counting commits"
  | "Tallying pull requests"
  | "Embedding avatar";

export interface StageUpdate {
  label: StageLabel;
  pct: number; // 0..100
}

export class GhError extends Error {
  kind: "not_found" | "rate" | "network" | "aborted" | "other";
  resetAt?: number;
  constructor(
    kind: GhError["kind"],
    message: string,
    resetAt?: number
  ) {
    super(message);
    this.kind = kind;
    this.resetAt = resetAt;
  }
}

const API = "https://api.github.com";

async function ghFetch<T>(
  path: string,
  opts: { signal?: AbortSignal; onRate?: (r: RateInfo) => void } = {}
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      signal: opts.signal,
      headers: { Accept: "application/vnd.github+json" },
    });
  } catch (e) {
    if ((e as Error).name === "AbortError")
      throw new GhError("aborted", "Request cancelled");
    throw new GhError(
      "network",
      "GitHub didn't respond. Check your connection and try again."
    );
  }

  const rem = res.headers.get("x-ratelimit-remaining");
  const lim = res.headers.get("x-ratelimit-limit");
  const reset = res.headers.get("x-ratelimit-reset");
  if (rem !== null && lim !== null && opts.onRate) {
    opts.onRate({
      remaining: Number(rem),
      limit: Number(lim),
      resetAt: reset ? Number(reset) * 1000 : undefined,
      bucket: path.startsWith("/search") ? "search" : "core",
    });
  }

  if (res.ok) return (await res.json()) as T;

  if (res.status === 404)
    throw new GhError("not_found", "404 — GitHub has no user by that name.");
  if ((res.status === 403 || res.status === 429) && rem === "0")
    throw new GhError(
      "rate",
      "Hourly API budget exhausted (60 calls/h without a token). It resets soon — the forge will be right back.",
      reset ? Number(reset) * 1000 : undefined
    );
  if (res.status === 422)
    throw new GhError("other", "GitHub rejected the query (422).");
  throw new GhError("other", `GitHub API error ${res.status}.`);
}

/* ------------------------------ types ------------------------------ */

interface GhUser {
  login: string;
  name: string | null;
  avatar_url: string;
  followers: number;
  following: number;
  public_repos: number;
  created_at: string;
}

interface GhRepo {
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  fork: boolean;
}

interface GhSearch {
  total_count?: number;
}

interface GhEvent {
  type: string;
  payload?: { distinct_commit_count?: number };
}

/* --------------------------- main pipeline -------------------------- */

const REPO_PAGES = 3; // 300 repos max — keeps us polite on the 60/h budget
const EVENT_PAGES = 3; // events only retain ~90 days anyway

export async function fetchStats(
  rawLogin: string,
  opts: {
    signal?: AbortSignal;
    onStage?: (s: StageUpdate) => void;
    onRate?: (r: RateInfo) => void;
  } = {}
): Promise<StatsBundle> {
  const login = rawLogin.trim().replace(/^@+/, "");
  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(login))
    throw new GhError(
      "other",
      "That doesn't look like a valid GitHub username."
    );

  const stage = opts.onStage ?? (() => {});
  const { signal, onRate } = opts;

  stage({ label: "Locating profile", pct: 6 });
  const user = await ghFetch<GhUser>(`/users/${encodeURIComponent(login)}`, {
    signal,
    onRate,
  });

  /* ---- repositories: stars, forks, language mix ---- */
  stage({ label: "Scanning repositories", pct: 18 });
  const pages = Math.max(
    1,
    Math.min(REPO_PAGES, Math.ceil(Math.max(user.public_repos, 1) / 100))
  );
  const repos: GhRepo[] = [];
  for (let p = 1; p <= pages; p++) {
    const batch = await ghFetch<GhRepo[]>(
      `/users/${encodeURIComponent(login)}/repos?per_page=100&page=${p}&type=owner&sort=full_name`,
      { signal, onRate }
    );
    repos.push(...batch);
    stage({
      label: "Scanning repositories",
      pct: 18 + Math.round((p / pages) * 30),
    });
    if (batch.length < 100) break;
  }

  let totalStars = 0;
  let totalForks = 0;
  const langMap = new Map<string, { repos: number; stars: number }>();
  for (const r of repos) {
    totalStars += r.stargazers_count ?? 0;
    totalForks += r.forks_count ?? 0;
    if (r.language) {
      const e = langMap.get(r.language) ?? { repos: 0, stars: 0 };
      e.repos += 1;
      e.stars += r.stargazers_count ?? 0;
      langMap.set(r.language, e);
    }
  }
  // weight: repo count dominates, stars break ties toward beloved work
  const weighted = [...langMap.entries()]
    .map(([name, v]) => ({ name, weight: v.repos * 4 + v.stars }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6);
  const weightSum = weighted.reduce((s, l) => s + l.weight, 0) || 1;
  const languages: LanguageSlice[] = weighted.map((l) => ({
    ...l,
    pct: Math.max(1, Math.round((l.weight / weightSum) * 100)),
  }));

  /* ---- commits: search API (all-time) with events fallback (90d) ---- */
  stage({ label: "Counting commits", pct: 58 });
  let commits: number | null = null;
  let commitsWindow: "all-time" | "90d" = "all-time";
  try {
    const sc = await ghFetch<GhSearch>(
      `/search/commits?q=${encodeURIComponent(`author:${login}`)}&per_page=1`,
      { signal, onRate }
    );
    commits = typeof sc.total_count === "number" ? sc.total_count : null;
  } catch (e) {
    if (e instanceof GhError && e.kind === "aborted") throw e;
    commitsWindow = "90d";
    let total = 0;
    let got = false;
    try {
      for (let p = 1; p <= EVENT_PAGES; p++) {
        const evs = await ghFetch<GhEvent[]>(
          `/users/${encodeURIComponent(login)}/events/public?per_page=100&page=${p}`,
          { signal, onRate }
        );
        got = true;
        for (const ev of evs)
          if (ev.type === "PushEvent")
            total += ev.payload?.distinct_commit_count ?? 0;
        if (evs.length < 100) break;
      }
    } catch (e2) {
      if (e2 instanceof GhError && e2.kind === "aborted") throw e2;
      // keep whatever pages succeeded; null only if nothing came back
    }
    commits = got ? total : null;
  }

  /* ---- pull requests via issue search ---- */
  stage({ label: "Tallying pull requests", pct: 78 });
  let prs: number | null = null;
  try {
    const sp = await ghFetch<GhSearch>(
      `/search/issues?q=${encodeURIComponent(`author:${login} type:pr`)}&per_page=1`,
      { signal, onRate }
    );
    prs = typeof sp.total_count === "number" ? sp.total_count : null;
  } catch (e) {
    if (e instanceof GhError && e.kind === "aborted") throw e;
    prs = null;
  }

  /* ---- avatar → embedded data URL so the SVG is fully portable ---- */
  stage({ label: "Embedding avatar", pct: 90 });
  let avatarDataUrl: string | null = null;
  try {
    const av = await fetch(`${user.avatar_url}&s=160`, { signal });
    if (av.ok) {
      const blob = await av.blob();
      avatarDataUrl = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(new Error("read failed"));
        fr.readAsDataURL(blob);
      });
    }
  } catch (e) {
    if ((e as Error).name === "AbortError")
      throw new GhError("aborted", "Request cancelled");
    avatarDataUrl = null; // initials fallback inside the card
  }

  const joined = new Date(user.created_at).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return {
    login: user.login,
    name: user.name?.trim() || user.login,
    avatarDataUrl,
    joined,
    followers: user.followers,
    following: user.following,
    publicRepos: user.public_repos,
    reposAnalyzed: repos.length,
    totalStars,
    totalForks,
    commits,
    commitsWindow,
    prs,
    languages,
    fetchedAt: Date.now(),
  };
}

/* ------------------------------ caching ----------------------------- */

const cacheKey = (login: string) => `statforge:v1:${login.toLowerCase()}`;
export const CACHE_TTL = 30 * 60 * 1000; // 30 min

export function getCached(
  login: string
): { data: StatsBundle; at: number } | null {
  try {
    const raw = localStorage.getItem(cacheKey(login));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data?.login) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setCached(login: string, data: StatsBundle): void {
  try {
    localStorage.setItem(cacheKey(login), JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* quota — non-fatal */
  }
}

/* ---------------------------- demo bundle --------------------------- */

export const DEMO_STATS: StatsBundle = {
  login: "octocat",
  name: "The Octocat",
  avatarDataUrl: null,
  joined: "Jan 2008",
  followers: 9842,
  following: 9,
  publicRepos: 8,
  reposAnalyzed: 8,
  totalStars: 1437,
  totalForks: 296,
  commits: 1312,
  commitsWindow: "all-time",
  prs: 27,
  languages: [
    { name: "JavaScript", weight: 42, pct: 34 },
    { name: "TypeScript", weight: 28, pct: 23 },
    { name: "Python", weight: 21, pct: 17 },
    { name: "Rust", weight: 16, pct: 13 },
    { name: "Go", weight: 10, pct: 8 },
    { name: "CSS", weight: 6, pct: 5 },
  ],
  fetchedAt: 0,
};

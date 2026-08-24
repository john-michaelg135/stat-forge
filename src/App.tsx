import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchStats,
  getCached,
  setCached,
  CACHE_TTL,
  DEMO_STATS,
  GhError,
  type StatsBundle,
  type StageUpdate,
  type RateInfo,
} from "./lib/github";
import {
  buildStatsSvg,
  cardSize,
  svgToDataUri,
  svgToBase64,
  DEFAULT_OPTIONS,
  type CardOptions,
} from "./lib/svg";
import { THEMES, ACCENTS, getTheme, resolveAccent } from "./lib/themes";
import { copyText, downloadFile } from "./lib/clipboard";
import { useReveal, useTilt } from "./hooks";
import Ticker from "./components/Ticker";
import EmbedGuide from "./components/EmbedGuide";
import {
  IconSpark,
  IconDownload,
  IconCopy,
  IconCheck,
  IconRefresh,
  IconAlert,
  IconCode,
  IconImage,
  IconMarkdown,
  IconGitHub,
  IconClock,
} from "./components/icons";

/* ----------------------------- tiny UI ------------------------------ */

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.2em] text-muted">
      <span className="inline-block h-[7px] w-[7px] rotate-45 rounded-[2px] bg-amber" />
      {children}
    </p>
  );
}

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      className="btn-press group flex w-full items-center justify-between rounded-lg border border-transparent px-2 py-1.5 hover:border-line hover:bg-panel-2"
    >
      <span
        className={`text-[13.5px] transition-colors ${on ? "text-snow" : "text-muted"}`}
      >
        {label}
      </span>
      <span
        className={`relative h-[18px] w-[32px] rounded-full transition-colors ${
          on ? "bg-amber" : "bg-line-2"
        }`}
      >
        <span
          className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-ink transition-all ${
            on ? "left-[16px]" : "left-[2px]"
          }`}
        />
      </span>
    </button>
  );
}

function RateMeter({ rate }: { rate: RateInfo | null }) {
  if (!rate) return null;
  const pct = Math.max(0, Math.min(1, rate.remaining / rate.limit));
  const color = pct > 0.5 ? "bg-lime" : pct > 0.15 ? "bg-amber" : "bg-coral";
  return (
    <div
      className="hidden items-center gap-2 sm:flex"
      title={
        rate.resetAt
          ? `Core API budget · resets ${new Date(rate.resetAt).toLocaleTimeString()}`
          : "Core API budget"
      }
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
        API
      </span>
      <span className="h-[6px] w-14 overflow-hidden rounded-full bg-line">
        <span
          className={`block h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct * 100}%` }}
        />
      </span>
      <span className="font-mono text-[10.5px] text-ash/80">
        {rate.remaining}/{rate.limit}
      </span>
    </div>
  );
}

/* ------------------------------- app -------------------------------- */

const OPTS_KEY = "statforge:opts";
const LAST_KEY = "statforge:last";

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

export default function App() {
  const [input, setInput] = useState("");
  const [stats, setStats] = useState<StatsBundle | null>(null);
  const [isDemo, setIsDemo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<StageUpdate | null>(null);
  const [error, setError] = useState<{ msg: string; resetAt?: number } | null>(null);
  const [rate, setRate] = useState<RateInfo | null>(null);
  const [cacheAt, setCacheAt] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [opts, setOpts] = useState<CardOptions>(() => {
    try {
      const raw = localStorage.getItem(OPTS_KEY);
      if (raw) return { ...DEFAULT_OPTIONS, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_OPTIONS;
  });

  const abortRef = useRef<AbortController | null>(null);
  const hasStatsRef = useRef(false);
  const benchRef = useRef<HTMLDivElement | null>(null);
  const tiltRef = useTilt<HTMLDivElement>(3.2);
  const tickerHeadRef = useReveal<HTMLDivElement>();
  const guideRailRef = useReveal<HTMLDivElement>();

  useEffect(() => {
    try {
      localStorage.setItem(OPTS_KEY, JSON.stringify(opts));
    } catch {}
  }, [opts]);

  const setOpt = <K extends keyof CardOptions>(k: K, v: CardOptions[K]) =>
    setOpts((o) => ({ ...o, [k]: v }));

  async function runFetch(rawLogin: string) {
    const login = rawLogin.trim().replace(/^@+/, "");
    if (!login || loading) return;
    setInput(login);
    setError(null);

    const cached = getCached(login);
    if (cached && Date.now() - cached.at < CACHE_TTL) {
      setStats(cached.data);
      hasStatsRef.current = true;
      setIsDemo(false);
      setCacheAt(cached.at);
      try {
        localStorage.setItem(LAST_KEY, login);
      } catch {}
      return;
    }
    if (cached) {
      setStats(cached.data);
      hasStatsRef.current = true;
      setIsDemo(false);
      setCacheAt(cached.at);
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setStage({ label: "Locating profile", pct: 4 });

    try {
      const data = await fetchStats(login, {
        signal: ctrl.signal,
        onStage: setStage,
        onRate: (r) => {
          if (r.bucket === "core") setRate(r);
        },
      });
      setStats(data);
      hasStatsRef.current = true;
      setIsDemo(false);
      setCacheAt(null);
      setCached(login, data);
      try {
        localStorage.setItem(LAST_KEY, login);
      } catch {}
    } catch (e) {
      if (e instanceof GhError && e.kind === "aborted") return;
      if (!hasStatsRef.current) {
        setIsDemo(true);
      }
      setError({
        msg:
          e instanceof GhError
            ? e.message
            : "Something went sideways while forging.",
        resetAt: e instanceof GhError ? e.resetAt : undefined,
      });
    } finally {
      setLoading(false);
      setStage(null);
    }
  }

  /* restore last session */
  useEffect(() => {
    try {
      const last = localStorage.getItem(LAST_KEY);
      if (last) void runFetch(last);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------- derived SVG ------------------------- */
  const active = stats ?? DEMO_STATS;
  const svg = useMemo(() => buildStatsSvg(active, opts), [active, opts]);
  const dataUri = useMemo(() => svgToDataUri(svg), [svg]);
  const size = useMemo(() => cardSize(opts, active), [opts, active]);
  const svgKey = useMemo(() => hash(svg).toString(36), [svg]);

  const theme = getTheme(opts.themeId);
  const accent = resolveAccent(theme, opts.accentId);

  /* --------------------------- actions --------------------------- */
  const flash = (id: string) => {
    setCopied(id);
    window.setTimeout(() => setCopied((c) => (c === id ? null : c)), 1700);
  };

  const actions = [
    {
      id: "download",
      label: "Download SVG",
      icon: <IconDownload size={15} />,
      primary: true,
      run: () =>
        downloadFile(
          `${active.login}-github-stats-${opts.variant}.svg`,
          svg,
          "image/svg+xml;charset=utf-8"
        ),
    },
    {
      id: "md",
      label: copied === "md" ? "Copied" : "Copy markdown",
      icon: copied === "md" ? <IconCheck size={15} /> : <IconMarkdown size={15} />,
      run: async () => {
        if (await copyText(`![GitHub stats for @${active.login}](data:image/svg+xml;base64,${svgToBase64(svg)})`)) flash("md");
      },
    },
    {
      id: "img",
      label: copied === "img" ? "Copied" : "Copy <img> tag",
      icon: copied === "img" ? <IconCheck size={15} /> : <IconImage size={15} />,
      run: async () => {
        if (
          await copyText(
            `<img src="data:image/svg+xml;base64,${svgToBase64(svg)}" alt="GitHub stats for @${active.login}" width="${size.w}" />`
          )
        )
          flash("img");
      },
    },
    {
      id: "raw",
      label: copied === "raw" ? "Copied" : "Copy SVG code",
      icon: copied === "raw" ? <IconCheck size={15} /> : <IconCode size={15} />,
      run: async () => {
        if (await copyText(svg)) flash("raw");
      },
    },
  ];

  const cacheMins = cacheAt ? Math.max(0, Math.round((Date.now() - cacheAt) / 60000)) : null;

  return (
    <div className="relative min-h-screen">
      {/* ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="dotgrid absolute inset-0" />
        <div className="glow-a" />
        <div className="glow-b" />
        <div className="noise" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-6 md:px-8">
        {/* ------------------------------ header ------------------------------ */}
        <header className="flex items-center justify-between gap-4 border-b border-line pb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber/30 bg-amber/10 text-amber">
              <IconSpark size={19} />
            </span>
            <div>
              <p className="font-display text-[17px] font-extrabold leading-none tracking-tight text-snow">
                StatForge
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                github stats → svg
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <RateMeter rate={rate} />
            <span className="flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ash/80">
              <span className="pulse-dot h-[7px] w-[7px] rounded-full bg-lime" />
              rest api · no token
            </span>
          </div>
        </header>

        {/* ------------------------------ intro ------------------------------- */}
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-end">
          <div>
            <p className="font-mono text-[12px] tracking-[0.08em] text-cyan">
              // type a username, get an embeddable card
              <span className="caret-blink ml-1 inline-block h-[13px] w-[7px] translate-y-[2px] bg-cyan" />
            </p>
            <h1 className="mt-4 font-display text-[34px] font-extrabold leading-[1.05] tracking-tight text-snow md:text-[46px]">
              Forge your GitHub numbers into{" "}
              <span className="relative whitespace-nowrap text-amber">
                one portable SVG
                <svg
                  className="absolute -bottom-1.5 left-0 w-full"
                  viewBox="0 0 220 8"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M2 6C60 2 140 2 218 5"
                    stroke="#ffb454"
                    strokeOpacity="0.5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              .
            </h1>
          </div>
          <p className="max-w-md text-[15px] leading-relaxed text-ash/85 lg:justify-self-end lg:pb-1 lg:text-right">
            StatForge queries the public GitHub API — repos, stars earned,
            commits, pull requests, followers — and strikes a themeable,
            self-contained SVG card for your README profile. All in-browser,
            nothing stored server-side.
          </p>
        </div>

        {/* ------------------------------ bench ------------------------------- */}
        <div ref={benchRef} className="mt-10 grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* control rail */}
          <aside className="flex flex-col gap-7 rounded-xl border border-line bg-panel/80 p-5 backdrop-blur-[2px]">
            <div>
              <Label>Source</Label>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void runFetch(input);
                }}
              >
                <div className="relative min-w-0 flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[14px] text-muted">
                    @
                  </span>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="username"
                    spellCheck={false}
                    autoComplete="off"
                    aria-label="GitHub username"
                    className="w-full rounded-lg border border-line bg-ink-2 py-2.5 pl-8 pr-3 font-mono text-[14px] text-snow placeholder:text-muted/70 outline-none transition-colors focus:border-amber/60 focus:ring-2 focus:ring-amber/15"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="btn-press flex items-center gap-2 rounded-lg bg-amber px-4 py-2.5 font-display text-[14px] font-bold text-ink hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? (
                    <IconRefresh size={15} className="animate-spin" />
                  ) : (
                    <IconSpark size={15} />
                  )}
                  Forge
                </button>
              </form>

              {cacheMins !== null && !loading && !error && (
                <p className="mt-2.5 flex items-center gap-1.5 font-mono text-[11px] text-muted">
                  <IconClock size={12} />
                  {cacheMins < 1 ? "cached just now" : `cached ${cacheMins}m ago`}
                  <button
                    onClick={() => {
                      try {
                        localStorage.removeItem(`statforge:v1:${active.login.toLowerCase()}`);
                      } catch {}
                      setCacheAt(null);
                      void runFetch(active.login);
                    }}
                    className="ml-1 text-cyan underline decoration-cyan/40 underline-offset-2 hover:text-snow"
                  >
                    refresh
                  </button>
                </p>
              )}

              {error && (
                <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-coral/30 bg-coral/[0.07] px-3 py-2.5">
                  <IconAlert size={15} className="mt-0.5 shrink-0 text-coral" />
                  <div className="text-[12.5px] leading-snug text-ash">
                    {error.msg}
                    {error.resetAt && (
                      <span className="mt-1 block font-mono text-[11px] text-muted">
                        resets at {new Date(error.resetAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label>Theme</Label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {THEMES.map((t) => {
                  const on = opts.themeId === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setOpt("themeId", t.id)}
                      className={`btn-press flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left ${
                        on
                          ? "border-amber/50 bg-amber/[0.06]"
                          : "border-line bg-ink-2 hover:border-line-2"
                      }`}
                    >
                      <span className="flex -space-x-1">
                        {t.swatch.map((c, i) => (
                          <span
                            key={i}
                            className="h-3.5 w-3.5 rounded-full border border-ink"
                            style={{ background: c, zIndex: 3 - i }}
                          />
                        ))}
                      </span>
                      <span
                        className={`text-[12.5px] font-medium ${on ? "text-snow" : "text-ash/80"}`}
                      >
                        {t.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                Accent
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {ACCENTS.map((a) => {
                  const on = opts.accentId === a.id;
                  return (
                    <button
                      key={a.id}
                      title={a.name}
                      aria-label={a.name}
                      onClick={() => setOpt("accentId", a.id)}
                      className={`btn-press h-6 w-6 rounded-full transition-shadow ${
                        on ? "ring-2 ring-snow/70 ring-offset-2 ring-offset-panel" : "hover:scale-110"
                      }`}
                      style={{
                        background:
                          a.id === "auto"
                            ? "conic-gradient(from 210deg, #ffb454, #5ccfe6, #bae67e, #ffb454)"
                            : a.hex,
                      }}
                    />
                  );
                })}
                <span className="ml-1 font-mono text-[10.5px] text-muted">
                  {opts.accentId === "auto" ? theme.accent : accent}
                </span>
              </div>
            </div>

            <div>
              <Label>Layout</Label>
              <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-line bg-ink-2 p-1">
                {(["full", "compact"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setOpt("variant", v)}
                    className={`btn-press rounded-md py-1.5 font-mono text-[11.5px] uppercase tracking-[0.12em] transition-colors ${
                      opts.variant === v
                        ? "bg-panel-2 text-amber shadow-[inset_0_0_0_1px_#2a3548]"
                        : "text-muted hover:text-ash"
                    }`}
                  >
                    {v === "full" ? "Full card" : "Compact"}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-col gap-0.5">
                <Toggle label="Avatar" on={opts.showAvatar} onChange={(v) => setOpt("showAvatar", v)} />
                <Toggle
                  label="Language mix"
                  on={opts.showLanguages}
                  onChange={(v) => setOpt("showLanguages", v)}
                />
                <Toggle label="Border" on={opts.showBorder} onChange={(v) => setOpt("showBorder", v)} />
                <Toggle label="Rounded corners" on={opts.rounded} onChange={(v) => setOpt("rounded", v)} />
                <Toggle
                  label="Transparent background"
                  on={opts.transparent}
                  onChange={(v) => setOpt("transparent", v)}
                />
              </div>
            </div>
          </aside>

          {/* artboard */}
          <section className="flex min-w-0 flex-col">
            <div className="relative flex-1 overflow-hidden rounded-xl border border-line bg-panel-2/60">
              <div className="dotgrid absolute inset-0 opacity-70" />
              {/* corner ticks */}
              {(
                [
                  "left-3 top-3 border-l-2 border-t-2",
                  "right-3 top-3 border-r-2 border-t-2",
                  "bottom-3 left-3 border-b-2 border-l-2",
                  "bottom-3 right-3 border-b-2 border-r-2",
                ] as const
              ).map((c) => (
                <span key={c} className={`absolute h-4 w-4 border-amber/40 ${c}`} />
              ))}

              <span className="absolute left-8 top-6 z-10 rounded border border-line bg-ink/80 px-2 py-1 font-mono text-[10px] tracking-[0.08em] text-muted">
                {size.w} × {size.h} px
              </span>
              <span className="absolute right-8 top-6 z-10 flex items-center gap-2 rounded border border-line bg-ink/80 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]">
                {loading ? (
                  <>
                    <span className="h-[6px] w-[6px] animate-pulse rounded-full bg-amber" />
                    <span className="text-amber">forging…</span>
                  </>
                ) : isDemo ? (
                  <>
                    <span className="h-[6px] w-[6px] rounded-full bg-cyan" />
                    <span className="text-cyan">demo data</span>
                  </>
                ) : (
                  <>
                    <span className="pulse-dot h-[6px] w-[6px] rounded-full bg-lime" />
                    <span className="text-lime">live · @{active.login}</span>
                  </>
                )}
              </span>

              <div className="flex min-h-[420px] items-center justify-center px-6 py-16 md:min-h-[480px]">
                <div ref={tiltRef} className="tilt-wrap max-w-full">
                  <div key={svgKey} className="card-in relative max-w-full">
                    <img
                      src={dataUri}
                      alt={`GitHub stats card for ${active.name}`}
                      draggable={false}
                      className="h-auto max-w-full select-none rounded-2xl"
                      style={{ filter: "drop-shadow(0 24px 48px rgba(0,0,0,0.45))" }}
                      width={size.w}
                      height={size.h}
                    />
                    {loading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-ink/60 backdrop-blur-[3px]">
                        <div className="shimmer h-1 w-44 overflow-hidden rounded-full bg-line" />
                        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ash">
                          {stage ? `${stage.label} · ${stage.pct}%` : "warming the forge"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* export bar */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {actions.map((a) => {
                const done = copied === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={a.run}
                    className={`btn-press flex items-center gap-2 rounded-lg border px-3.5 py-2.5 font-mono text-[12px] font-medium ${
                      a.primary
                        ? "border-amber/40 bg-amber text-ink hover:brightness-110"
                        : done
                          ? "border-lime/40 bg-lime/10 text-lime"
                          : "border-line bg-panel text-ash hover:border-line-2 hover:text-snow"
                    }`}
                  >
                    {a.icon}
                    {a.label}
                  </button>
                );
              })}
              <span className="ml-auto hidden font-mono text-[10.5px] text-muted md:block">
                {active.publicRepos > active.reposAnalyzed
                  ? `★ counted across first ${active.reposAnalyzed} of ${active.publicRepos} repos`
                  : isDemo
                    ? "sample numbers — forge a real profile above"
                    : `${active.reposAnalyzed} repos analyzed · ${new Date(active.fetchedAt).toLocaleTimeString()}`}
              </span>
            </div>

            {/* ticker */}
            <div className="mt-8">
              <div ref={tickerHeadRef} className="reveal mb-3 flex items-center gap-3">
                <Label>Forge someone famous</Label>
                <span className="h-px flex-1 bg-line" />
                <span className="font-mono text-[10px] text-muted">click to load</span>
              </div>
              <Ticker busy={loading} onPick={(l) => void runFetch(l)} />
            </div>
          </section>
        </div>

        {/* ------------------------------ guide ------------------------------- */}
        <div ref={guideRailRef} className="reveal">
          <EmbedGuide />
        </div>

        {/* ------------------------------ footer ------------------------------ */}
        <footer className="mt-20 flex flex-col items-start justify-between gap-4 border-t border-line pt-6 sm:flex-row sm:items-center">
          <p className="flex items-center gap-2.5 font-mono text-[11px] text-muted">
            <IconGitHub size={15} className="text-ash/70" />
            Built on the public GitHub REST API · unauthenticated · 60 calls/h
          </p>
          <p className="font-mono text-[11px] text-muted">
            Everything runs in your browser — no keys, no servers, no tracking.
            <span className="caret-blink ml-1 inline-block h-[11px] w-[6px] translate-y-[1px] bg-amber" />
          </p>
        </footer>
      </div>
    </div>
  );
}

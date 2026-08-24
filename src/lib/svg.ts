/* ------------------------------------------------------------------ */
/*  StatForge — SVG card engine                                        */
/*  Builds a fully self-contained SVG string (avatar embedded as a     */
/*  data-URL, CSS animations included) for `full` and `compact` cards. */
/* ------------------------------------------------------------------ */

import type { StatsBundle } from "./github";
import { getTheme, resolveAccent, languageColor } from "./themes";

export interface CardOptions {
  variant: "full" | "compact";
  themeId: string;
  accentId: string;
  showAvatar: boolean;
  showLanguages: boolean;
  showBorder: boolean;
  rounded: boolean;
  transparent: boolean;
}

export const DEFAULT_OPTIONS: CardOptions = {
  variant: "full",
  themeId: "ayu",
  accentId: "auto",
  showAvatar: true,
  showLanguages: true,
  showBorder: true,
  rounded: true,
  transparent: false,
};

/* ------------------------------ helpers ----------------------------- */

const SANS = `-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif`;
const MONO = `ui-monospace,'SF Mono','Cascadia Code',Menlo,Consolas,'Liberation Mono',monospace`;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function fmtCompact(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v >= 100 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (n >= 10_000) return `${Math.round(n / 100) / 10}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

const IN_CARD_CSS = `
text{font-family:${SANS}}
.m{font-family:${MONO}}
@keyframes sf-in{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
.g{opacity:0;animation:sf-in .6s cubic-bezier(.16,.84,.32,1) forwards}
.d1{animation-delay:.05s}.d2{animation-delay:.14s}.d3{animation-delay:.23s}.d4{animation-delay:.32s}.d5{animation-delay:.41s}
@keyframes sf-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.seg{transform-box:fill-box;transform-origin:left center;animation:sf-grow .9s .5s cubic-bezier(.2,.8,.25,1) both}
@keyframes sf-ring{from{stroke-dashoffset:var(--c)}to{stroke-dashoffset:0}}
.ring{animation:sf-ring 1s .2s cubic-bezier(.2,.8,.25,1) both}
@media (prefers-reduced-motion:reduce){.g,.seg{animation:none;opacity:1}.ring{animation:none}}
`.trim();

/* 14×14 stroke icons, drawn inline */
const ICONS: Record<string, string> = {
  repo: `<path d="M3.2 2.4h5.6a2 2 0 0 1 2 2v7.2H5.2a2 2 0 0 1-2-2V2.4z"/><path d="M3.2 9.4a2 2 0 0 1 2-2h5.6"/>`,
  star: `<path d="M7 1.9l1.65 3.3 3.65.55-2.65 2.6.6 3.65L7 10.3l-3.25 1.7.6-3.65L1.7 5.75l3.65-.55L7 1.9z"/>`,
  fork: `<circle cx="4" cy="3.4" r="1.5"/><circle cx="10" cy="3.4" r="1.5"/><circle cx="7" cy="11" r="1.5"/><path d="M4 4.9v.9a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-.9M7 9.5V7.8"/>`,
  commit: `<path d="M1.4 7h3.1M9.5 7h3.1"/><circle cx="7" cy="7" r="2.6"/>`,
  pr: `<circle cx="4.4" cy="3.4" r="1.7"/><circle cx="4.4" cy="10.6" r="1.7"/><circle cx="10.4" cy="10.6" r="1.7"/><path d="M4.4 5.1v3.8M10.4 8.9V6.6a2 2 0 0 0-2-2H7.3M8.5 3.3 7.1 4.6l1.4 1.3"/>`,
  user: `<circle cx="7" cy="4.6" r="2.4"/><path d="M2.6 11.8a4.4 4.4 0 0 1 8.8 0"/>`,
};

function icon(name: keyof typeof ICONS, x: number, y: number, color: string): string {
  return `<g transform="translate(${x} ${y})" fill="none" stroke="${color}" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</g>`;
}

/* --------------------------- stat cell ------------------------------ */

function statCell(
  x: number,
  y: number,
  iconName: keyof typeof ICONS,
  label: string,
  value: string,
  colors: { accent: string; strong: string; muted: string },
  sub?: string,
  dense?: boolean
): string {
  return [
    icon(iconName, x, y - 1, colors.accent),
    `<text class="m" x="${x + 19}" y="${y + 10}" font-size="${dense ? 8.5 : 9.5}" letter-spacing="${dense ? 0.8 : 1.4}" fill="${colors.muted}">${esc(label)}${
      sub
        ? `<tspan fill="${colors.accent}">${esc(sub)}</tspan>`
        : ""
    }</text>`,
    `<text class="m" x="${x}" y="${y + 41}" font-size="24" font-weight="700" fill="${colors.strong}">${esc(value)}</text>`,
  ].join("");
}

/* ---------------------------- avatar -------------------------------- */

function avatarBlock(
  cx: number,
  cy: number,
  r: number,
  stats: StatsBundle,
  accent: string
): string {
  const inner = stats.avatarDataUrl
    ? `<image href="${stats.avatarDataUrl}" x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" clip-path="url(#sf-av)" preserveAspectRatio="xMidYMid slice"/>`
    : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${accent}" fill-opacity="0.16"/>
       <text x="${cx}" y="${cy + r * 0.38}" text-anchor="middle" font-size="${r * 0.78}" font-weight="700" fill="${accent}">${esc(
         (stats.name || stats.login).slice(0, 1).toUpperCase()
       )}</text>`;
  const circ = Math.round(2 * Math.PI * (r + 3));
  return `${inner}<circle class="ring" style="--c:${circ}" cx="${cx}" cy="${cy}" r="${r + 3}" fill="none" stroke="${accent}" stroke-opacity="0.85" stroke-width="1.6" stroke-dasharray="${circ}" stroke-dashoffset="0" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="round"/>`;
}

/* --------------------------- full card ------------------------------ */

const FULL_W = 520;
const PAD = 26;

export function fullCardSize(
  opts: CardOptions,
  stats: StatsBundle
): { w: number; h: number } {
  const headerH = opts.showAvatar ? 70 : 44;
  const hasLangs = opts.showLanguages && stats.languages.length > 0;
  const gridBottom = PAD + headerH + 22 + 24 + 160 + 4;
  // mirrors the builder's exact vertical rhythm
  const h = hasLangs ? gridBottom + 10 + 96 + 18 : gridBottom + 34 + 18;
  return { w: FULL_W, h };
}

function buildFull(stats: StatsBundle, opts: CardOptions): string {
  const theme = getTheme(opts.themeId);
  const accent = resolveAccent(theme, opts.accentId);
  const { w } = fullCardSize(opts, stats);
  const rx = opts.rounded ? 18 : 4;

  let y = PAD;
  const headerTop = y;
  const headerH = opts.showAvatar ? 70 : 44;

  const nameX = opts.showAvatar ? PAD + 64 + 20 : PAD;
  const nameY = headerTop + (opts.showAvatar ? 30 : 20);
  const subY = nameY + 21;

  const dividerY = headerTop + headerH + 22;
  const gridY = dividerY + 24;

  const colGap = 18;
  const colW = (w - PAD * 2 - colGap * 2) / 3;
  const rowH = 80;

  let langY = gridY + rowH * 2 + 4;
  const hasLangs = opts.showLanguages && stats.languages.length > 0;

  let h: number;
  if (hasLangs) {
    langY += 10;
    h = langY + 96 + 18;
  } else {
    h = langY + 34 + 18;
  }

  const bg = opts.transparent ? "none" : theme.bg;
  const borderRect = opts.showBorder
    ? `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${rx}" fill="${bg}" stroke="${theme.border}" stroke-width="1.4"/>`
    : `<rect x="0" y="0" width="${w}" height="${h}" rx="${rx}" fill="${bg}"/>`;

  const statsCells = [
    { icon: "repo", label: "REPOSITORIES", value: fmtCompact(stats.publicRepos) },
    { icon: "star", label: "STARS EARNED", value: fmtCompact(stats.totalStars) },
    { icon: "fork", label: "FORKS", value: fmtCompact(stats.totalForks) },
    {
      icon: "commit",
      label: "COMMITS ",
      sub: stats.commitsWindow === "90d" ? "· 90D" : undefined,
      value: stats.commits === null ? "—" : fmtCompact(stats.commits),
    },
    { icon: "pr", label: "PULL REQUESTS", value: stats.prs === null ? "—" : fmtCompact(stats.prs) },
    { icon: "user", label: "FOLLOWERS", value: fmtCompact(stats.followers) },
  ];

  const grid = statsCells
    .map((c, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = PAD + col * (colW + colGap);
      const cy = gridY + row * rowH;
      return `<g class="g d${row + 2}">${statCell(
        x,
        cy,
        c.icon as keyof typeof ICONS,
        c.label,
        c.value,
        { accent, strong: theme.strong, muted: theme.muted },
        (c as { sub?: string }).sub
      )}</g>`;
    })
    .join("");

  /* language bar + legend */
  let lang = "";
  if (hasLangs) {
    const barW = w - PAD * 2;
    const barY = langY + 22;
    const segs = stats.languages
      .map((l, i) => {
        const segW = Math.max(4, (l.pct / 100) * (barW - (stats.languages.length - 1) * 3));
        return { ...l, segW, i };
      });
    // normalize widths to exactly fill the bar
    const rawSum = segs.reduce((s, x) => s + x.segW, 0);
    const scale = (barW - (segs.length - 1) * 3) / rawSum;
    let cx = PAD;
    const segRects = segs
      .map((l, i) => {
        const sw = Math.max(3, l.segW * scale);
        const rect = `<rect class="seg" style="animation-delay:${0.45 + i * 0.08}s" x="${cx.toFixed(1)}" y="${barY}" width="${sw.toFixed(1)}" height="10" fill="${languageColor(l.name)}"/>`;
        cx += sw + 3;
        return rect;
      })
      .join("");

    let lx = PAD;
    let ly = barY + 30;
    const legend = stats.languages
      .map((l) => {
        const label = `${esc(l.name)} ${l.pct}%`;
        const estW = label.length * 5.6 + 22;
        if (lx + estW > w - PAD && lx > PAD) {
          lx = PAD;
          ly += 17;
        }
        const item = `<circle cx="${lx + 4}" cy="${ly - 3}" r="3.4" fill="${languageColor(l.name)}"/><text class="m" x="${lx + 13}" y="${ly}" font-size="9.5" fill="${theme.muted}">${label}</text>`;
        lx += estW;
        return item;
      })
      .join("");

    lang = `<g class="g d4">
      <text class="m" x="${PAD}" y="${langY + 8}" font-size="9.5" letter-spacing="1.4" fill="${theme.muted}">LANGUAGE MIX</text>
      <clipPath id="sf-bar"><rect x="${PAD}" y="${barY}" width="${barW}" height="10" rx="5"/></clipPath>
      <rect x="${PAD}" y="${barY}" width="${barW}" height="10" rx="5" fill="${theme.track}"/>
      <g clip-path="url(#sf-bar)">${segRects}</g>
      ${legend}
    </g>`;
  }

  const footerY = h - 22;
  const footer = `<g class="g d5">
    <rect x="${PAD}" y="${footerY - 8}" width="7" height="7" rx="1.5" fill="${accent}" transform="rotate(45 ${PAD + 3.5} ${footerY - 4.5})"/>
    <text class="m" x="${PAD + 14}" y="${footerY}" font-size="9" letter-spacing="2" fill="${theme.muted}">STATFORGE</text>
    <text class="m" x="${w - PAD}" y="${footerY}" text-anchor="end" font-size="9" fill="${theme.muted}" opacity="0.85">public data · ${new Date(stats.fetchedAt || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</text>
  </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="GitHub stats for ${esc(stats.login)}">
<title>GitHub stats for ${esc(stats.name)}</title>
<style>${IN_CARD_CSS}</style>
<defs><clipPath id="sf-av"><circle cx="${opts.showAvatar ? PAD + 32 : 0}" cy="${opts.showAvatar ? headerTop + 32 : 0}" r="32"/></clipPath></defs>
${borderRect}
<g class="g d1">
  ${opts.showAvatar ? avatarBlock(PAD + 32, headerTop + 32, 32, stats, accent) : ""}
  <text x="${nameX}" y="${nameY}" font-size="21" font-weight="700" fill="${theme.strong}">${esc(stats.name)}</text>
  <text x="${nameX}" y="${subY}" font-size="12" fill="${theme.muted}">@${esc(stats.login)} · joined ${esc(stats.joined)} · following ${fmtCompact(stats.following)}</text>
  <text class="m" x="${w - PAD}" y="${headerTop + 14}" text-anchor="end" font-size="9" letter-spacing="2.4" fill="${theme.muted}">GITHUB STATS</text>
  <rect x="${w - PAD - 36}" y="${headerTop + 21}" width="36" height="2" rx="1" fill="${accent}"/>
</g>
<line x1="${PAD}" y1="${dividerY}" x2="${w - PAD}" y2="${dividerY}" stroke="${theme.border}" stroke-width="1"/>
${grid}
${lang}
${footer}
</svg>`;
}

/* --------------------------- compact card --------------------------- */

const COMPACT_W = 460;

export function compactCardSize(): { w: number; h: number } {
  return { w: COMPACT_W, h: 158 };
}

function buildCompact(stats: StatsBundle, opts: CardOptions): string {
  const theme = getTheme(opts.themeId);
  const accent = resolveAccent(theme, opts.accentId);
  const w = COMPACT_W;
  const h = 158;
  const pad = 22;
  const rx = opts.rounded ? 16 : 4;
  const bg = opts.transparent ? "none" : theme.bg;

  const borderRect = opts.showBorder
    ? `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${rx}" fill="${bg}" stroke="${theme.border}" stroke-width="1.4"/>`
    : `<rect x="0" y="0" width="${w}" height="${h}" rx="${rx}" fill="${bg}"/>`;

  const nameX = opts.showAvatar ? pad + 34 + 14 : pad;
  const items = [
    { icon: "repo", label: "REPOS", value: fmtCompact(stats.publicRepos) },
    { icon: "star", label: "STARS", value: fmtCompact(stats.totalStars) },
    {
      icon: "commit",
      label: stats.commitsWindow === "90d" ? "COMMITS·90D" : "COMMITS",
      value: stats.commits === null ? "—" : fmtCompact(stats.commits),
    },
    { icon: "pr", label: "PRS", value: stats.prs === null ? "—" : fmtCompact(stats.prs) },
    { icon: "user", label: "FOLLOWERS", value: fmtCompact(stats.followers) },
  ] as const;

  const gap = 12;
  const colW = (w - pad * 2 - gap * 4) / 5;
  const cells = items
    .map((c, i) => {
      const x = pad + i * (colW + gap);
      return `<g class="g d${Math.min(i + 2, 5)}">${statCell(
        x,
        78,
        c.icon,
        c.label,
        c.value,
        { accent, strong: theme.strong, muted: theme.muted },
        undefined,
        true
      )}</g>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="GitHub stats for ${esc(stats.login)}">
<title>GitHub stats for ${esc(stats.name)}</title>
<style>${IN_CARD_CSS}</style>
<defs><clipPath id="sf-av"><circle cx="${pad + 17}" cy="${pad + 22}" r="17"/></clipPath></defs>
${borderRect}
<g class="g d1">
  ${opts.showAvatar ? avatarBlock(pad + 17, pad + 22, 17, stats, accent) : ""}
  <text x="${nameX}" y="${pad + 18}" font-size="16.5" font-weight="700" fill="${theme.strong}">${esc(stats.name)}</text>
  <text x="${nameX}" y="${pad + 36}" font-size="11" fill="${theme.muted}">@${esc(stats.login)} · since ${esc(stats.joined)}</text>
  <text class="m" x="${w - pad}" y="${pad + 14}" text-anchor="end" font-size="8.5" letter-spacing="2.2" fill="${theme.muted}">GITHUB STATS</text>
  <rect x="${w - pad - 30}" y="${pad + 20}" width="30" height="2" rx="1" fill="${accent}"/>
</g>
${cells}
<g class="g d5">
  <rect x="${pad}" y="${h - 26}" width="6" height="6" rx="1.2" fill="${accent}" transform="rotate(45 ${pad + 3} ${h - 23})"/>
  <text class="m" x="${pad + 12}" y="${h - 18}" font-size="8.5" letter-spacing="1.8" fill="${theme.muted}">STATFORGE</text>
  <text class="m" x="${w - pad}" y="${h - 18}" text-anchor="end" font-size="8.5" fill="${theme.muted}" opacity="0.85">${new Date(stats.fetchedAt || Date.now()).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</text>
</g>
</svg>`;
}

/* ----------------------------- entry -------------------------------- */

export function buildStatsSvg(stats: StatsBundle, opts: CardOptions): string {
  return opts.variant === "compact" ? buildCompact(stats, opts) : buildFull(stats, opts);
}

export function cardSize(
  opts: CardOptions,
  stats: StatsBundle
): { w: number; h: number } {
  return opts.variant === "compact" ? compactCardSize() : fullCardSize(opts, stats);
}

export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function svgToBase64(svg: string): string {
  // unicode-safe base64
  const bytes = new TextEncoder().encode(svg);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

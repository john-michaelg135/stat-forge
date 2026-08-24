/* Card themes, accent swatches and GitHub Linguist language colors */

export interface CardTheme {
  id: string;
  name: string;
  bg: string;
  border: string;
  strong: string;
  muted: string;
  accent: string;
  track: string;
  swatch: [string, string, string]; // preview dots
}

export const THEMES: CardTheme[] = [
  {
    id: "ayu",
    name: "Ayu Night",
    bg: "#0b0e14",
    border: "#1e2530",
    strong: "#e6e1cf",
    muted: "#69727f",
    accent: "#ffb454",
    track: "#151b26",
    swatch: ["#0b0e14", "#ffb454", "#5ccfe6"],
  },
  {
    id: "terminal",
    name: "Phosphor",
    bg: "#04110b",
    border: "#10331f",
    strong: "#c9f5d8",
    muted: "#4f8265",
    accent: "#41e07d",
    track: "#0a2317",
    swatch: ["#04110b", "#41e07d", "#c9f5d8"],
  },
  {
    id: "paper",
    name: "Daylight",
    bg: "#f7f8fa",
    border: "#d9dee7",
    strong: "#1f2328",
    muted: "#6e7781",
    accent: "#d4600e",
    track: "#e8ebf1",
    swatch: ["#f7f8fa", "#d4600e", "#1f2328"],
  },
  {
    id: "glacier",
    name: "Glacier",
    bg: "#0d1b26",
    border: "#1d3346",
    strong: "#dbe9f4",
    muted: "#5f7d95",
    accent: "#56ccf2",
    track: "#132738",
    swatch: ["#0d1b26", "#56ccf2", "#dbe9f4"],
  },
  {
    id: "ember",
    name: "Ember",
    bg: "#160e12",
    border: "#33202a",
    strong: "#f3ddd3",
    muted: "#8a6570",
    accent: "#ff7a59",
    track: "#241420",
    swatch: ["#160e12", "#ff7a59", "#ffd08a"],
  },
  {
    id: "graphite",
    name: "Graphite",
    bg: "#101113",
    border: "#26282c",
    strong: "#e8e9eb",
    muted: "#73767c",
    accent: "#c8cdd4",
    track: "#1b1d20",
    swatch: ["#101113", "#c8cdd4", "#e8e9eb"],
  },
];

export interface Accent {
  id: string;
  name: string;
  hex: string;
}

export const ACCENTS: Accent[] = [
  { id: "auto", name: "Theme default", hex: "conic-gradient(from 210deg, #ffb454, #5ccfe6, #bae67e, #ffb454)" },
  { id: "amber", name: "Amber", hex: "#ffb454" },
  { id: "cyan", name: "Cyan", hex: "#5ccfe6" },
  { id: "lime", name: "Lime", hex: "#bae67e" },
  { id: "coral", name: "Coral", hex: "#f07178" },
  { id: "violet", name: "Violet", hex: "#d4bfff" },
  { id: "rose", name: "Rose", hex: "#f27983" },
  { id: "gold", name: "Gold", hex: "#e6b450" },
];

export const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572a5",
  Go: "#00add8",
  Rust: "#dea584",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  Java: "#b07219",
  Kotlin: "#a97bff",
  Swift: "#f05138",
  Ruby: "#e0553c",
  PHP: "#4f5d95",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#6639ba",
  SCSS: "#c6538c",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Dart: "#00b4ab",
  Elixir: "#b04dbf",
  Haskell: "#5e5086",
  Lua: "#4f6db3",
  R: "#198ce7",
  Scala: "#c22d40",
  Zig: "#ec915c",
  Jupyter: "#f37626",
  "Jupyter Notebook": "#f37626",
  Makefile: "#7a8794",
  Dockerfile: "#384d54",
  OCaml: "#ef7a08",
  Clojure: "#db5855",
  Nix: "#7e7eff",
  Astro: "#ff5a03",
  Markdown: "#519aba",
  "Objective-C": "#438eff",
  Perl: "#0298c3",
  Julia: "#a270ba",
  "Vim Script": "#199f4b",
  PowerShell: "#012456",
  Groovy: "#4298b8",
  Solidity: "#aa6746",
  TeX: "#3d6117",
};

export function languageColor(name: string): string {
  if (LANGUAGE_COLORS[name]) return LANGUAGE_COLORS[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 62% 58%)`;
}

export function getTheme(id: string): CardTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function resolveAccent(theme: CardTheme, accentId: string): string {
  if (accentId === "auto") return theme.accent;
  return ACCENTS.find((a) => a.id === accentId)?.hex ?? theme.accent;
}

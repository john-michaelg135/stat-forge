import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function base(props: P) {
  const { size = 16, ...rest } = props;
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
}

export const IconSpark = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M13.6 2.2 5.4 13.5h4.7l-1.3 8.3 8.6-11.7h-4.9l1.1-7.9z" />
  </svg>
);

export const IconDownload = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3v11m0 0 4.2-4.2M12 14 7.8 9.8" />
    <path d="M4 16.5v2A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5v-2" />
  </svg>
);

export const IconCopy = (p: P) => (
  <svg {...base(p)}>
    <rect x="9" y="9" width="12" height="12" rx="2.5" />
    <path d="M5.5 15H5a2.5 2.5 0 0 1-2.5-2.5v-7A2.5 2.5 0 0 1 5 3h7a2.5 2.5 0 0 1 2.5 2.5V6" />
  </svg>
);

export const IconCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="m4.5 12.5 5 5L19.5 7" />
  </svg>
);

export const IconRefresh = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 11a8 8 0 1 0-1.2 5.3" />
    <path d="M20 5v6h-6" />
  </svg>
);

export const IconAlert = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3.5 1.9 20.5h20.2L12 3.5z" />
    <path d="M12 10v4.2M12 17.6v.1" />
  </svg>
);

export const IconCode = (p: P) => (
  <svg {...base(p)}>
    <path d="m8 7-5 5 5 5M16 7l5 5-5 5" />
  </svg>
);

export const IconImage = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m5 18 4.8-4.8a1.6 1.6 0 0 1 2.3 0L17 18m-2.5-2.5 1.6-1.6a1.6 1.6 0 0 1 2.3 0l2.1 2.1" />
  </svg>
);

export const IconMarkdown = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h17A1.5 1.5 0 0 1 22 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 18.5v-13zM4 16.5v-9h2.6l2.4 3 2.4-3H14v9h-2.5v-5.1l-2.5 3-2.5-3v5.1H4zm14.3-4.2v4.2h-2.1v-4.2h-2l3.1-3.6 3.1 3.6h-2.1z" />
  </svg>
);

export const IconGitHub = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M12 1.9a10.3 10.3 0 0 0-3.26 20.07c.51.1.7-.22.7-.5v-1.93c-2.87.62-3.47-1.22-3.47-1.22-.47-1.18-1.14-1.5-1.14-1.5-.94-.64.07-.62.07-.62 1.03.07 1.58 1.06 1.58 1.06.92 1.57 2.42 1.12 3 .85.1-.66.36-1.11.66-1.37-2.3-.26-4.7-1.14-4.7-5.1 0-1.13.4-2.05 1.06-2.77-.1-.26-.46-1.31.1-2.74 0 0 .87-.28 2.84 1.06a9.8 9.8 0 0 1 5.16 0c1.97-1.34 2.83-1.06 2.83-1.06.57 1.43.21 2.48.11 2.74.66.72 1.06 1.64 1.06 2.77 0 3.97-2.41 4.84-4.71 5.09.37.32.7.95.7 1.91v2.83c0 .28.18.6.7.5A10.3 10.3 0 0 0 12 1.9z" />
  </svg>
);

export const IconArrow = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 12h16m0 0-6-6m6 6-6 6" />
  </svg>
);

export const IconClock = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2.5" />
  </svg>
);

export const IconFile = (p: P) => (
  <svg {...base(p)}>
    <path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5L13.5 3z" />
    <path d="M13.5 3v5.5H19" />
  </svg>
);

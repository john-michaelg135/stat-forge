const FAMOUS: { login: string; tag: string }[] = [
  { login: "octocat", tag: "the mascot" },
  { login: "torvalds", tag: "linux" },
  { login: "gaearon", tag: "react" },
  { login: "sindresorhus", tag: "1k+ packages" },
  { login: "yyx990803", tag: "vue" },
  { login: "antirez", tag: "redis" },
  { login: "mojombo", tag: "github cofounder" },
  { login: "mattn", tag: "vim · go" },
  { login: "fabpot", tag: "symfony" },
  { login: "getify", tag: "js educator" },
];

export default function Ticker({
  onPick,
  busy,
}: {
  onPick: (login: string) => void;
  busy: boolean;
}) {
  const row = (ariaHidden: boolean) => (
    <div className="flex items-center gap-3 pr-3" aria-hidden={ariaHidden}>
      {FAMOUS.map((u) => (
        <button
          key={`${ariaHidden ? "b" : "a"}-${u.login}`}
          onClick={() => onPick(u.login)}
          disabled={busy}
          className="btn-press group flex shrink-0 items-center gap-2.5 rounded-lg border border-line bg-panel px-4 py-2.5 text-left hover:border-line-2 hover:bg-panel-2 disabled:opacity-50"
        >
          <span className="font-mono text-[13px] font-medium text-snow transition-colors group-hover:text-amber">
            @{u.login}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            {u.tag}
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-line-2 transition-colors group-hover:bg-lime" />
        </button>
      ))}
    </div>
  );

  return (
    <div className="marquee relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
      <div className="marquee-track flex items-center py-1">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

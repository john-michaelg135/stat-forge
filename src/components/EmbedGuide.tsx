import { useState } from "react";
import { useReveal } from "../hooks";
import { copyText } from "../lib/clipboard";
import { IconCheck, IconCopy, IconFile, IconArrow } from "./icons";

function Step({
  n,
  title,
  body,
  delay,
  children,
}: {
  n: string;
  title: string;
  body: string;
  delay: number;
  children?: React.ReactNode;
}) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className="reveal group relative border-t border-line py-8 md:grid md:grid-cols-[110px_1fr] md:gap-8"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="hollow-num font-display text-[64px] font-extrabold leading-none transition-colors md:text-[84px]">
        {n}
      </div>
      <div className="mt-3 md:mt-2">
        <h3 className="font-display text-xl font-bold text-snow md:text-2xl">
          {title}
        </h3>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ash/80">
          {body}
        </p>
        {children}
      </div>
    </div>
  );
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4 flex max-w-xl items-center gap-3 rounded-lg border border-line bg-ink-2 px-4 py-3">
      <IconFile size={15} className="shrink-0 text-muted" />
      <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-cyan">
        {code}
      </code>
      <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted sm:block">
        {label}
      </span>
      <button
        onClick={async () => {
          if (await copyText(code)) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }
        }}
        aria-label="Copy snippet"
        className={`btn-press shrink-0 rounded-md border p-1.5 ${
          copied
            ? "border-lime/40 bg-lime/10 text-lime"
            : "border-line text-muted hover:border-line-2 hover:text-snow"
        }`}
      >
        {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
      </button>
    </div>
  );
}

export default function EmbedGuide() {
  const headRef = useReveal<HTMLDivElement>();
  const noteRef = useReveal<HTMLDivElement>();

  return (
    <section className="mt-24">
      <div ref={headRef} className="reveal">
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-amber">
          <IconArrow size={13} /> Ship it
        </p>
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-extrabold leading-[1.08] text-snow md:text-[42px]">
          From forge to README in under a minute.
        </h2>
      </div>

      <div className="mt-10">
        <Step
          n="01"
          delay={0}
          title="Forge & download"
          body="Dial in the theme, accent and layout on the artboard above, then hit Download SVG. You get one self-contained file — avatar, fonts and animations embedded, zero external requests."
        >
          <CodeBlock code="github-stats.svg · ~12 KB · no dependencies" label="output" />
        </Step>

        <Step
          n="02"
          delay={90}
          title="Commit it to your profile repo"
          body={`Your profile README lives in a repo named after you (you/you). Drop the card anywhere in it — a tidy assets/ folder does nicely.`}
        >
          <CodeBlock code="assets/github-stats.svg" label="path in repo" />
        </Step>

        <Step
          n="03"
          delay={180}
          title="Reference it in README.md"
          body="One line of markdown and the card renders on your profile, in discussions, anywhere GitHub renders markdown. Re-forge and re-commit whenever you want fresh numbers."
        >
          <CodeBlock
            code="![My GitHub stats](./assets/github-stats.svg)"
            label="markdown"
          />
        </Step>
      </div>

      <div
        ref={noteRef}
        className="reveal mt-2 flex flex-col gap-4 rounded-xl border border-amber/20 bg-amber/[0.04] p-6 md:flex-row md:items-start md:gap-6"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber/30 bg-amber/10 font-display text-lg font-bold text-amber">
          ?
        </div>
        <div>
          <h4 className="font-display text-base font-bold text-snow">
            Prefer zero files? Use the data-URI copy.
          </h4>
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ash/80">
            The <span className="font-mono text-[12.5px] text-cyan">Copy markdown</span> button
            packs the whole card into a base64 data URI — perfect for GitLab,
            Obsidian, dev.to and HTML-friendly editors. GitHub's own sanitizer
            strips <span className="font-mono text-[12.5px] text-cyan">data:</span> images in
            READMEs, which is exactly why step 02 exists: a committed file is
            the bulletproof path there.
          </p>
        </div>
      </div>
    </section>
  );
}

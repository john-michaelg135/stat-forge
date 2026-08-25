import { useEffect, useRef } from "react";

/** Adds the `on` class when the element scrolls into view (pairs with .reveal). */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            el.classList.add("on");
            io.disconnect();
          }
      },
      { threshold: 0.18 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/** Gentle pointer-follow tilt for the preview artboard.
 *  Optimized: caches bounds, only writes transform inside a single rAF,
 *  and skips intermediate moves between frames for high-Hz displays. */
export function useTilt<T extends HTMLElement>(maxDeg = 4) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let latestX = 0;
    let latestY = 0;
    let bounds: DOMRect | null = null;
    let boundsStale = true;

    // Refresh bounds on scroll/resize instead of every mousemove
    const markStale = () => { boundsStale = true; };
    window.addEventListener("scroll", markStale, { passive: true });
    window.addEventListener("resize", markStale, { passive: true });

    const tick = () => {
      raf = 0;
      if (boundsStale || !bounds) {
        bounds = el.getBoundingClientRect();
        boundsStale = false;
      }
      const px = (latestX - bounds.left) / bounds.width - 0.5;
      const py = (latestY - bounds.top) / bounds.height - 0.5;
      el.style.transform = `perspective(1100px) rotateX(${(-py * maxDeg).toFixed(2)}deg) rotateY(${(px * maxDeg).toFixed(2)}deg)`;
    };

    const move = (e: MouseEvent) => {
      latestX = e.clientX;
      latestY = e.clientY;
      if (!raf) {
        raf = requestAnimationFrame(tick);
      }
    };

    const leave = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      el.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg)";
    };

    el.addEventListener("mousemove", move, { passive: true });
    el.addEventListener("mouseleave", leave);
    return () => {
      el.removeEventListener("mousemove", move);
      el.removeEventListener("mouseleave", leave);
      window.removeEventListener("scroll", markStale);
      window.removeEventListener("resize", markStale);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [maxDeg]);
  return ref;
}

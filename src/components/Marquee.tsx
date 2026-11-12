import { useEffect, useRef, type ReactNode } from "react";

/**
 * Endless horizontal strip. Drifts on its own and eases faster while the page scrolls.
 * Cheap per frame: the width is measured only on resize, nothing runs while it's off screen,
 * and each frame writes a single transform.
 */
export function Marquee({ children, speed = 0.5, className = "", reverse = false }: { children: ReactNode; speed?: number; className?: string; reverse?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = root.current;
    const el = track.current;
    if (!box || !el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let half = el.scrollWidth / 2;
    let x = 0;
    let boost = 0; // eased extra speed
    let target = 0; // extra speed the scroll asks for
    let lastY = window.scrollY;
    let raf = 0;
    let visible = false;
    let prev = 0;

    const ro = new ResizeObserver(() => {
      half = el.scrollWidth / 2;
    });
    ro.observe(el);

    const tick = (t: number) => {
      const dt = prev ? Math.min(3, (t - prev) / 16.67) : 1; // frame-rate independent
      prev = t;
      target *= Math.pow(0.9, dt);
      boost += (target - boost) * Math.min(1, 0.12 * dt);
      x -= ((reduce ? 0 : speed) + boost) * dt;
      if (half > 0 && -x >= half) x += half;
      el.style.transform = `translate3d(${(reverse ? -half - x : x).toFixed(1)}px,0,0)`;
      raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!raf) {
        prev = 0;
        raf = requestAnimationFrame(tick);
      }
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(box);

    const onScroll = () => {
      const y = window.scrollY;
      if (visible) target = Math.min(14, target + Math.abs(y - lastY) * 0.06);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [speed, reverse]);
  return (
    <div className={`marquee ${className}`} ref={root}>
      <div className="marquee__track" ref={track}>
        {children}
        <div className="marquee__dup" aria-hidden="true">{children}</div>
      </div>
    </div>
  );
}

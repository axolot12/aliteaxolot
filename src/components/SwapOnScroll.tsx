import { useEffect, useRef, useState, ReactNode } from "react";

// As the user scrolls this section into/out of view, the "outgoing" panel
// slides diagonally out (left + up) while the "incoming" panel slides in
// diagonally (right + down). Both stay in normal flow so the layout
// reflows naturally instead of overlapping.
export default function SwapOnScroll({ outgoing, incoming }: { outgoing: ReactNode; incoming: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handler = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // progress 0 -> element top at bottom of viewport, 1 -> element top at top of viewport
      const raw = (vh - rect.top) / (vh + rect.height);
      setProgress(Math.min(1, Math.max(0, raw)));
    };
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
    };
  }, []);

  const t = Math.min(1, Math.max(0, (progress - 0.25) / 0.5));

  return (
    <div ref={ref} className="relative w-full">
      <div
        style={{
          transform: `translate(${-t * 40}%, ${-t * 40}px)`,
          opacity: 1 - t,
          transition: "transform 0.1s linear, opacity 0.1s linear",
        }}
      >
        {outgoing}
      </div>
      <div
        style={{
          transform: `translate(${(1 - t) * 40}%, ${(1 - t) * 40}px)`,
          opacity: t,
          transition: "transform 0.1s linear, opacity 0.1s linear",
        }}
      >
        {incoming}
      </div>
    </div>
  );
}

import { ReactNode, useRef, useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

// Shows one slide (category) at a time, sliding horizontally.
// Advance via the right-side arrow, or by swiping left on touch devices.
export default function CategorySlider({ slides }: { slides: ReactNode[] }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const go = (dir: 1 | -1) => {
    setIndex((i) => Math.min(slides.length - 1, Math.max(0, i + dir)));
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    touchStartX.current = null;
  };

  if (slides.length === 0) return null;

  return (
    <div className="relative px-0 md:px-12">
      <div
        className="overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex transition-transform duration-500 ease-out items-start"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <div key={i} className="w-full shrink-0 px-0.5">
              {slide}
            </div>
          ))}
        </div>
      </div>

      {/* Nav arrows */}
      {index > 0 && (
        <button
          onClick={() => go(-1)}
          aria-label="Previous category"
          className="absolute left-0 md:left-0 top-1/2 -translate-y-1/2 -translate-x-1 md:-translate-x-12 z-10 w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:border-primary/50 hover:text-primary transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      {index < slides.length - 1 && (
        <button
          onClick={() => go(1)}
          aria-label="Next category"
          className="absolute right-0 md:right-0 top-1/2 -translate-y-1/2 translate-x-1 md:translate-x-12 z-10 w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:border-primary/50 hover:text-primary transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      )}

      {/* Dots */}
      {slides.length > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`w-2 h-2 rounded-full transition-colors ${i === index ? "bg-primary" : "bg-border"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

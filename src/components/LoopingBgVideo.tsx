import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import introVideo from "@/assets/intro.mp4";

export interface LoopingBgVideoHandle {
  setMuted: (muted: boolean) => void;
}

// Plays the video forward, pauses ~1s near the end, then plays it in
// reverse at 1.5x speed back to the start (looping forward/backward).
const LoopingBgVideo = forwardRef<LoopingBgVideoHandle>((_, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useImperativeHandle(ref, () => ({
    setMuted: (muted: boolean) => {
      const v = videoRef.current;
      if (v) v.muted = muted;
    },
  }));

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    let mode: "forward" | "pausing" | "reverse" = "forward";
    let rafId: ReturnType<typeof setTimeout>;
    let pauseTimeout: ReturnType<typeof setTimeout>;
    const NEAR_END = 0.5; // seconds before the end to trigger the pause
    const REVERSE_RATE = 1.5;

    const step = () => {
      const next = v.currentTime - (REVERSE_RATE * 50) / 1000;
      if (next <= 0) {
        v.currentTime = 0;
        mode = "forward";
        v.play().catch(() => {});
        return;
      }
      v.currentTime = next;
      rafId = setTimeout(step, 50);
    };

    const onTimeUpdate = () => {
      if (mode !== "forward") return;
      if (v.duration && v.currentTime >= v.duration - NEAR_END) {
        mode = "pausing";
        v.pause();
        pauseTimeout = setTimeout(() => {
          mode = "reverse";
          step();
        }, 1000);
      }
    };

    v.addEventListener("timeupdate", onTimeUpdate);
    v.play().catch(() => {});

    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      clearTimeout(rafId);
      clearTimeout(pauseTimeout);
    };
  }, []);

  return (
    <div className="absolute top-0 left-0 right-0 h-screen z-0 overflow-hidden pointer-events-none">
      <video
        ref={videoRef}
        src={introVideo}
        muted
        playsInline
        autoPlay
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-background/25" />
    </div>
  );
});

export default LoopingBgVideo;

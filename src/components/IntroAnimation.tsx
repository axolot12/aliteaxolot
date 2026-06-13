import { useState, useRef, useEffect } from "react";
import introVideo from "@/assets/intro.mp4";

export default function IntroAnimation({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"playing" | "flash" | "done">("playing");
  const videoRef = useRef<HTMLVideoElement>(null);

  const finish = () => {
    if (phase === "done") return;
    setPhase("flash");
    setTimeout(() => {
      setPhase("done");
      onDone();
    }, 450);
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onEnded = () => finish();
    v.addEventListener("ended", onEnded);
    return () => v.removeEventListener("ended", onEnded);
  }, [phase]);

  if (phase === "done") return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        src={introVideo}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
      />
      {/* White flash overlay */}
      <div
        className={`absolute inset-0 bg-white transition-opacity duration-500 ${
          phase === "flash" ? "opacity-100" : "opacity-0"
        }`}
        style={{ pointerEvents: "none" }}
      />
      {/* Skip button */}
      <button
        onClick={finish}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-white/10 border border-white/30 text-white text-sm font-mono backdrop-blur-md hover:bg-white/20 transition-colors z-10"
      >
        Skip Intro
      </button>
    </div>
  );
}

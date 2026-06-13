import { useState } from "react";

function playKeyClick() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Thock body — short filtered noise burst
    const bufferSize = ctx.sampleRate * 0.04;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 1800;
    bandpass.Q.value = 1.2;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.6, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    noise.connect(bandpass);
    bandpass.connect(gainNode);
    gainNode.connect(ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + 0.04);

    // Sharp click transient
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.frequency.setValueAtTime(900, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.015);
    oscGain.gain.setValueAtTime(0.3, ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.015);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.015);

    setTimeout(() => ctx.close(), 200);
  } catch {}
}

interface SkillKeyProps {
  name: string;
  percent: number;
}

function SkillKey({ name, percent }: SkillKeyProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onMouseDown={() => { setPressed(true); playKeyClick(); }}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => { setPressed(true); playKeyClick(); }}
      onTouchEnd={() => setPressed(false)}
      className={`relative aspect-square rounded-xl border bg-card flex flex-col items-center justify-center gap-1 font-mono text-foreground transition-all duration-100 select-none
        ${pressed
          ? "border-primary translate-y-1 shadow-none bg-primary/10"
          : "border-border shadow-[0_4px_0_0_hsl(var(--border))] hover:border-primary/50 hover:-translate-y-0.5"}
      `}
    >
      <span className="text-sm md:text-base font-semibold text-center px-1 leading-tight">{name}</span>
      <span className="text-[10px] text-primary">{percent}%</span>
    </button>
  );
}

export default function SkillKeyboard({ skills }: { skills: { id: string; name: string; percent: number }[] }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4 p-6 bg-card/40 border border-border rounded-2xl">
      {skills.map((s) => (
        <SkillKey key={s.id} name={s.name} percent={s.percent} />
      ))}
    </div>
  );
}

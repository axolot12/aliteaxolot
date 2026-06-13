import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import characterImg from "@/assets/character.png";
import CategorySlider from "@/components/CategorySlider";
import SkillKeyboard from "@/components/SkillKeyboard";
import LoopingBgVideo, { LoopingBgVideoHandle } from "@/components/LoopingBgVideo";
import { Volume2, VolumeX } from "lucide-react";

// ─── Types ───
interface Bot {
  id: string;
  category_id: string;
  name: string;
  description: string;
  details: string;
  image_url: string | null;
  link: string | null;
  sort_order: number;
}
interface BotCategory {
  id: string;
  title: string;
  sort_order: number;
  bots: Bot[];
}
interface Skill {
  id: string;
  name: string;
  percent: number;
  sort_order: number;
}
interface JourneyItem {
  id: string;
  year: string;
  title: string;
  description: string;
  sort_order: number;
}
interface ProjectItem {
  id: string;
  name: string;
  description: string;
  details: string;
  link: string | null;
  image_url: string | null;
  category: string;
  sort_order: number;
}
interface EditItem {
  id: string;
  title: string;
  description: string;
  video_url: string | null;
  thumbnail_url: string | null;
  ratio: string;
  sort_order: number;
}

// ─── Helpers ───
function LetterPop({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`flex flex-wrap ${className}`}>
      {text.split("").map((ch, i) => (
        <span key={i} className="letter-pop font-bold">
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </span>
  );
}

function SkillBar({ name, percent, delay }: { name: string; percent: number; delay: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="mb-6" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex justify-between mb-2">
        <span className="text-sm font-mono text-foreground">{name}</span>
        <span className="text-sm font-mono text-primary">{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
          style={{ width: visible ? `${percent}%` : "0%" }}
        />
      </div>
    </div>
  );
}

function ScrollReveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        filter: visible ? "blur(0)" : "blur(4px)",
        transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Edits Uploader (admin) ───
function EditsUploader({ onUpload }: { onUpload: (file: File, title: string, ratio: string, desc: string) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [ratio, setRatio] = useState("16:9");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!file || !title) { alert("Pick a video file and enter a title"); return; }
    setBusy(true);
    await onUpload(file, title, ratio, desc);
    setBusy(false);
    setTitle(""); setDesc(""); setFile(null); setRatio("16:9");
  };
  return (
    <div className="mt-6 bg-card/50 border border-dashed border-border rounded-xl p-5 flex flex-col gap-3 max-w-xl">
      <h4 className="text-sm font-mono text-muted-foreground">Upload New Edit</h4>
      <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
      <input placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
      <div className="flex gap-2">
        <button onClick={() => setRatio("16:9")} className={`flex-1 px-3 py-2 rounded-lg text-sm border ${ratio === "16:9" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border"}`}>16:9 (Wide)</button>
        <button onClick={() => setRatio("9:16")} className={`flex-1 px-3 py-2 rounded-lg text-sm border ${ratio === "9:16" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border"}`}>9:16 (Vertical)</button>
      </div>
      <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-xs text-muted-foreground" />
      <button disabled={busy} onClick={submit} className="bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors active:scale-[0.97] disabled:opacity-50">
        {busy ? "Uploading..." : "Upload Edit"}
      </button>
    </div>
  );
}

// ─── Animated Mesh Background: flowing grid that deforms around cursor and springs back ───
function AnimatedBG({ mouseRef }: { mouseRef: React.MutableRefObject<{ x: number; y: number }> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    let t = 0;
    type Node = { ox: number; oy: number; x: number; y: number; vx: number; vy: number; phase: number };
    let nodes: Node[] = [];
    let cols = 0, rows = 0;
    const spacing = 80;

    const build = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = Math.ceil(canvas.width / spacing) + 2;
      rows = Math.ceil(canvas.height / spacing) + 2;
      nodes = [];
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const ox = i * spacing - spacing;
          const oy = j * spacing - spacing;
          nodes.push({ ox, oy, x: ox, y: oy, vx: 0, vy: 0, phase: Math.random() * Math.PI * 2 });
        }
      }
    };
    build();
    window.addEventListener("resize", build);

    const draw = () => {
      t += 0.012;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Update node positions: gentle flowing motion + cursor repulsion + spring back to origin
      for (const n of nodes) {
        // Continuous flowing offset
        const flowX = Math.sin(t + n.phase) * 6;
        const flowY = Math.cos(t * 0.8 + n.phase) * 6;
        const targetX = n.ox + flowX;
        const targetY = n.oy + flowY;

        // Spring back
        n.vx += (targetX - n.x) * 0.05;
        n.vy += (targetY - n.y) * 0.05;

        // Cursor push
        const dx = n.x - mx;
        const dy = n.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 160 && dist > 0) {
          const force = (160 - dist) / 160;
          n.vx += (dx / dist) * force * 2.5;
          n.vy += (dy / dist) * force * 2.5;
        }

        n.vx *= 0.82;
        n.vy *= 0.82;
        n.x += n.vx;
        n.y += n.vy;
      }

      // Draw mesh lines (right and down neighbors)
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const a = nodes[j * cols + i];
          const drawLine = (b: Node) => {
            const dx = a.x - mx;
            const dy = a.y - my;
            const d = Math.sqrt(dx * dx + dy * dy);
            const near = d < 220;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            if (near) {
              ctx.strokeStyle = `hsla(0, 72%, 55%, ${0.4 * (1 - d / 220)})`;
              ctx.lineWidth = 1;
            } else {
              ctx.strokeStyle = `hsla(215, 60%, 65%, 0.18)`;
              ctx.lineWidth = 0.7;
            }
            ctx.stroke();
          };
          if (i < cols - 1) drawLine(nodes[j * cols + i + 1]);
          if (j < rows - 1) drawLine(nodes[(j + 1) * cols + i]);
        }
      }

      // Draw nodes
      for (const n of nodes) {
        const dx = n.x - mx;
        const dy = n.y - my;
        const d = Math.sqrt(dx * dx + dy * dy);
        const near = d < 200;
        ctx.beginPath();
        ctx.arc(n.x, n.y, near ? 1.8 : 1, 0, Math.PI * 2);
        ctx.fillStyle = near
          ? `hsla(0, 72%, 60%, ${0.7 * (1 - d / 200)})`
          : `hsla(215, 50%, 60%, 0.25)`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", build); };
  }, [mouseRef]);
  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />;
}

// ─── Custom Cursor: silky-smooth, two-layer with hover detection ───
function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let mx = -100, my = -100;
    let dx = -100, dy = -100;
    let rx = -100, ry = -100;
    let down = false;
    let hover = false;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY;
      const el = e.target as HTMLElement | null;
      hover = !!el && !!el.closest("a, button, [role='button'], input, textarea, select, label");
    };
    const onDown = () => { down = true; };
    const onUp = () => { down = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);

    let raf: number;
    const loop = () => {
      // Dot snaps fast, ring trails smoothly
      dx += (mx - dx) * 0.45;
      dy += (my - dy) * 0.45;
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      if (dotRef.current) {
        const s = down ? 4 : 5;
        dotRef.current.style.transform = `translate3d(${dx - s}px, ${dy - s}px, 0) scale(${down ? 0.7 : 1})`;
        dotRef.current.style.width = dotRef.current.style.height = `${s * 2}px`;
      }
      if (ringRef.current) {
        const size = hover ? 36 : down ? 28 : 36;
        ringRef.current.style.transform = `translate3d(${rx - size / 2}px, ${ry - size / 2}px, 0) rotate(${hover ? 45 : 0}deg)`;
        ringRef.current.style.width = ringRef.current.style.height = `${size}px`;
        ringRef.current.style.opacity = hover ? "1" : "0.7";
        ringRef.current.style.borderColor = hover ? "hsl(0 72% 60% / 1)" : "hsl(0 72% 51% / 0.5)";
        ringRef.current.style.borderRadius = hover ? "4px" : "999px";
        ringRef.current.style.backgroundColor = hover ? "hsl(0 72% 51% / 0.18)" : "transparent";
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);
  return (
    <>
      <div
        ref={ringRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] border-2 hidden md:block"
        style={{ width: 36, height: 36, transition: "width 0.2s, height 0.2s, opacity 0.2s, border-color 0.2s, border-radius 0.2s, background-color 0.2s" }}
      />
      <div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] rounded-full bg-primary hidden md:block"
        style={{ width: 10, height: 10, boxShadow: "0 0 12px hsl(0 72% 51% / 0.8)" }}
      />
    </>
  );
}

// ─── What I Do (defaults; editable via settings.what_i_do JSON) ───
const defaultWhatIDo = [
  { title: "Websites & Apps", desc: "Full-stack web apps, landing pages, dashboards, and tools built from scratch." },
  { title: "Discord Bots", desc: "Music, moderation, tickets, giveaways — automated bots for any server." },
  { title: "Game Launchers", desc: "Custom Minecraft launchers with mod support and auto-updates." },
  { title: "Video Editing", desc: "Reels, shorts, montages and cinematic edits in 9:16 and 16:9." },
  { title: "Web Games", desc: "Browser-based games and interactive experiences." },
  { title: "Automation & Tools", desc: "Scripts, scrapers, and automation tools for any workflow." },
  { title: "Security Testing", desc: "Penetration testing tools and security research for educational purposes." },
];
const defaultStats = [
  { num: "6+", label: "Discord Bots" },
  { num: "500+", label: "Servers Reached" },
  { num: "3+", label: "Years Coding" },
  { num: "1", label: "Custom Launcher" },
];

// ─── Image Upload Helper ───
async function uploadImage(file: File): Promise<string | null> {
  const ext = file.name.split(".").pop();
  const path = `uploads/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("portfolio").upload(path, file);
  if (error) { console.error("Upload error:", error); return null; }
  const { data } = supabase.storage.from("portfolio").getPublicUrl(path);
  return data.publicUrl;
}

// ─── Main ───
const Index = () => {
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [section, setSection] = useState("home");
  const [adminMode, setAdminMode] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState(false);
  const mouseRef = useRef({ x: -100, y: -100 });
  const charRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [, forceRender] = useState(0);
  const [musicOn, setMusicOn] = useState(false);
  const bgVideoRef = useRef<LoopingBgVideoHandle>(null);
  const scrollStopTimeout = useRef<ReturnType<typeof setTimeout>>();

  // DB state
  const [categories, setCategories] = useState<BotCategory[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [journey, setJourney] = useState<JourneyItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [edits, setEdits] = useState<EditItem[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});

  // View popups (non-admin)
  const [viewItem, setViewItem] = useState<{ type: "bot" | "project" | "edit"; data: any } | null>(null);

  // Admin editing
  const [editModal, setEditModal] = useState<{ type: string; data: any } | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editExtra, setEditExtra] = useState("");
  const [editExtra2, setEditExtra2] = useState("");
  const [editDetails, setEditDetails] = useState("");

  // Track mouse for 3D + bg
  useEffect(() => {
    const handler = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  // Scroll tracking
  useEffect(() => {
    if (section !== "home") return;
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [section]);

  // Music: only audible on home, mutes while scrolling, unmutes when scroll stops
  useEffect(() => {
    if (!musicOn || section !== "home") {
      bgVideoRef.current?.setMuted(true);
      return;
    }
    const handler = () => {
      bgVideoRef.current?.setMuted(true);
      clearTimeout(scrollStopTimeout.current);
      scrollStopTimeout.current = setTimeout(() => {
        if (musicOn && section === "home") bgVideoRef.current?.setMuted(false);
      }, 200);
    };
    bgVideoRef.current?.setMuted(false);
    window.addEventListener("scroll", handler, { passive: true });
    return () => {
      window.removeEventListener("scroll", handler);
      clearTimeout(scrollStopTimeout.current);
    };
  }, [musicOn, section]);

  const toggleMusic = () => {
    setMusicOn((prev) => {
      const next = !prev;
      bgVideoRef.current?.setMuted(!next);
      return next;
    });
  };

  // Fetch all data
  const fetchData = useCallback(async () => {
    const [catRes, botRes, skillRes, journeyRes, projRes, editsRes, settRes] = await Promise.all([
      supabase.from("bot_categories").select("*").order("sort_order"),
      supabase.from("bots").select("*").order("sort_order"),
      supabase.from("skills").select("*").order("sort_order"),
      supabase.from("journey").select("*").order("sort_order"),
      supabase.from("projects").select("*").order("sort_order"),
      supabase.from("edits").select("*").order("sort_order"),
      supabase.from("site_settings").select("*"),
    ]);
    const cats = (catRes.data || []) as any[];
    const bots = (botRes.data || []) as any[];
    const merged: BotCategory[] = cats.map((c) => ({
      ...c,
      bots: bots.filter((b) => b.category_id === c.id),
    }));
    setCategories(merged);
    setSkills((skillRes.data || []) as Skill[]);
    setJourney((journeyRes.data || []) as JourneyItem[]);
    setProjects((projRes.data || []) as ProjectItem[]);
    setEdits((editsRes.data || []) as EditItem[]);
    const s: Record<string, string> = {};
    (settRes.data || []).forEach((r: any) => { s[r.key] = r.value; });
    setSettings(s);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const headerShrunk = section === "home" && scrollY > 200;

  const getCharTransform = useCallback(() => {
    if (!charRef.current) return {};
    const rect = charRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (mouseRef.current.x - cx) / 30;
    const dy = (mouseRef.current.y - cy) / 30;
    return { transform: `perspective(800px) rotateY(${dx}deg) rotateX(${-dy}deg)` };
  }, []);

  // Re-render on mouse move for 3D character only when on home
  useEffect(() => {
    if (section !== "home") return;
    let raf: number;
    const loop = () => { forceRender((n) => n + 1); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [section]);

  const navigate = (s: string) => {
    setSection(s);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogin = () => {
    if (loginPass === "ayush0122") {
      setAdminMode(true);
      setShowLogin(false);
      setLoginPass("");
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  // Admin CRUD
  const addBot = async (categoryId: string) => {
    if (!editName) return;
    await supabase.from("bots").insert({ category_id: categoryId, name: editName, description: editDesc, link: editExtra || null, details: editDetails || "", sort_order: 99 });
    setEditName(""); setEditDesc(""); setEditExtra(""); setEditDetails("");
    fetchData();
  };
  const removeBot = async (id: string) => {
    await supabase.from("bots").delete().eq("id", id);
    fetchData();
  };
  const saveEditBot = async (id: string) => {
    await supabase.from("bots").update({ name: editName, description: editDesc, link: editExtra || null, details: editDetails }).eq("id", id);
    setEditModal(null);
    fetchData();
  };
  const uploadBotImage = async (id: string, file: File) => {
    const url = await uploadImage(file);
    if (url) {
      await supabase.from("bots").update({ image_url: url }).eq("id", id);
      fetchData();
    }
  };
  const saveEditSkill = async (id: string) => {
    await supabase.from("skills").update({ name: editName, percent: parseInt(editExtra) || 0 }).eq("id", id);
    setEditModal(null);
    fetchData();
  };
  const addSkill = async () => {
    await supabase.from("skills").insert({ name: editName, percent: parseInt(editExtra) || 0, sort_order: 99 });
    setEditName(""); setEditExtra("");
    fetchData();
  };
  const removeSkill = async (id: string) => {
    await supabase.from("skills").delete().eq("id", id);
    fetchData();
  };
  const saveEditJourney = async (id: string) => {
    await supabase.from("journey").update({ year: editExtra, title: editName, description: editDesc }).eq("id", id);
    setEditModal(null);
    fetchData();
  };
  const addJourney = async () => {
    await supabase.from("journey").insert({ year: editExtra, title: editName, description: editDesc, sort_order: 99 });
    setEditName(""); setEditDesc(""); setEditExtra("");
    fetchData();
  };
  const removeJourney = async (id: string) => {
    await supabase.from("journey").delete().eq("id", id);
    fetchData();
  };
  const saveEditProject = async (id: string) => {
    await supabase.from("projects").update({ name: editName, description: editDesc, link: editExtra || null, category: editExtra2 || "other", details: editDetails }).eq("id", id);
    setEditModal(null);
    fetchData();
  };
  const addProject = async () => {
    await supabase.from("projects").insert({ name: editName, description: editDesc, link: editExtra || null, category: editExtra2 || "other", details: editDetails || "", sort_order: 99 });
    setEditName(""); setEditDesc(""); setEditExtra(""); setEditExtra2(""); setEditDetails("");
    fetchData();
  };
  const removeProject = async (id: string) => {
    await supabase.from("projects").delete().eq("id", id);
    fetchData();
  };
  const uploadProjectImage = async (id: string, file: File) => {
    const url = await uploadImage(file);
    if (url) {
      await supabase.from("projects").update({ image_url: url }).eq("id", id);
      fetchData();
    }
  };
  const saveSetting = async (key: string, value: string) => {
    await supabase.from("site_settings").upsert({ key, value });
    fetchData();
  };
  const addCategory = async () => {
    if (!editName) return;
    await supabase.from("bot_categories").insert({ title: editName, sort_order: 99 });
    setEditName("");
    fetchData();
  };
  const removeCategory = async (id: string) => {
    if (!confirm("Delete this category and all its bots?")) return;
    await supabase.from("bots").delete().eq("category_id", id);
    await supabase.from("bot_categories").delete().eq("id", id);
    fetchData();
  };

  // Edits (video) CRUD
  const uploadVideo = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `edits/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("portfolio").upload(path, file);
    if (error) { console.error("Video upload error:", error); return null; }
    const { data } = supabase.storage.from("portfolio").getPublicUrl(path);
    return data.publicUrl;
  };
  const addEdit = async (file: File, title: string, ratio: string, description: string) => {
    const url = await uploadVideo(file);
    if (!url) { alert("Upload failed"); return; }
    await supabase.from("edits").insert({ title, description, ratio, video_url: url, sort_order: 99 });
    fetchData();
  };
  const removeEdit = async (id: string) => {
    if (!confirm("Delete this edit?")) return;
    await supabase.from("edits").delete().eq("id", id);
    fetchData();
  };
  const saveEditEdit = async (id: string) => {
    await supabase.from("edits").update({ title: editName, description: editDesc, ratio: editExtra || "16:9" }).eq("id", id);
    setEditModal(null);
    fetchData();
  };

  const openEdit = (type: string, data: any) => {
    setEditModal({ type, data });
    setEditName(data.name || data.title || "");
    setEditDesc(data.description || data.desc || "");
    setEditExtra(data.year || data.percent?.toString() || data.link || data.ratio || "");
    setEditExtra2(data.category || "");
    setEditDetails(data.details || "");
  };

  const menuItems = [
    { key: "home", label: "Home" },
    { key: "projects", label: "Projects" },
    { key: "skills", label: "Skills" },
    { key: "journey", label: "Journey" },
    { key: "contact", label: "Contact" },
  ];

  // Group projects by category dynamically (any category supported)
  const projectGroups = projects.reduce<Record<string, ProjectItem[]>>((acc, p) => {
    const key = p.category || "other";
    (acc[key] = acc[key] || []).push(p);
    return acc;
  }, {});
  const groupOrder = Object.keys(projectGroups).sort((a, b) => {
    if (a === "launcher") return -1;
    if (b === "launcher") return 1;
    if (a === "other") return 1;
    if (b === "other") return -1;
    return a.localeCompare(b);
  });
  const formatCategory = (c: string) => c.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

  const removeProjectGroup = async (groupKey: string) => {
    if (!confirm(`Delete ALL projects in "${formatCategory(groupKey)}"?`)) return;
    await supabase.from("projects").delete().eq("category", groupKey);
    fetchData();
  };

  const whatIDo: { title: string; desc: string }[] = (() => {
    try { const v = settings.what_i_do; if (v) return JSON.parse(v); } catch {}
    return defaultWhatIDo;
  })();
  const stats: { num: string; label: string }[] = (() => {
    try { const v = settings.stats; if (v) return JSON.parse(v); } catch {}
    return defaultStats;
  })();

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden">
      {section === "home" && <LoopingBgVideo ref={bgVideoRef} />}
      <AnimatedBG mouseRef={mouseRef} />
      <CustomCursor />

      {/* Ambient cursor glow */}
      <div
        className="fixed pointer-events-none z-0 w-[500px] h-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(0 72% 51% / 0.03), transparent 70%)",
          left: mouseRef.current.x - 250,
          top: mouseRef.current.y - 250,
        }}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4">
        <div
          className="transition-all duration-500"
          style={{
            opacity: headerShrunk || section !== "home" ? 1 : 0,
            transform: headerShrunk || section !== "home" ? "translateX(0) scale(1)" : "translateX(-20px) scale(0.8)",
            pointerEvents: headerShrunk || section !== "home" ? "auto" : "none",
          }}
        >
          <button onClick={() => navigate("home")} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/30">
              <img src={characterImg} alt="AliteAxolot" className="w-full h-full object-cover" />
            </div>
            <LetterPop text="AliteAxolot" className="text-sm md:text-base" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {section === "home" && (
            <button
              onClick={toggleMusic}
              className="relative z-50 p-2 text-foreground hover:text-primary transition-colors"
              aria-label="Toggle music"
            >
              {musicOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
          )}
          <button onClick={() => setMenuOpen(!menuOpen)} className="relative z-50 flex flex-col gap-1.5 p-2" aria-label="Menu">
            <span className={`block w-6 h-0.5 bg-foreground transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-6 h-0.5 bg-foreground transition-all duration-300 ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-6 h-0.5 bg-foreground transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
      </header>

      {/* Right side menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
          <nav
            className="absolute right-0 top-0 h-full w-72 bg-card/95 backdrop-blur-md border-l border-border flex flex-col justify-between p-8 pt-20 animate-slide-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-2">
              {menuItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => navigate(item.key)}
                  className={`text-left text-lg font-medium py-3 px-4 rounded-lg transition-all duration-300 active:scale-[0.97] ${
                    section === item.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="border-t border-border pt-4">
              {adminMode ? (
                <button onClick={() => { setAdminMode(false); setMenuOpen(false); }} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Logout Admin
                </button>
              ) : (
                <button onClick={() => { setShowLogin(true); setMenuOpen(false); }} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Admin Login
                </button>
              )}
            </div>
          </nav>
        </div>
      )}

      {/* Admin Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setShowLogin(false)}>
          <div className="bg-card border border-border rounded-xl p-8 w-80 box-glow" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 text-foreground">Admin Login</h3>
            <input
              type="password"
              value={loginPass}
              onChange={(e) => { setLoginPass(e.target.value); setLoginError(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Password"
              className="w-full bg-secondary border border-border rounded-lg px-4 py-2 mb-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {loginError && <p className="text-primary text-sm mb-3">Wrong password</p>}
            <button onClick={handleLogin} className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors active:scale-[0.97]">
              Login
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="relative z-10 min-h-screen">
        {/* ─── HOME ─── */}
        {section === "home" && (
          <div>
            <div className="min-h-screen flex flex-col items-center justify-center px-6">
              <div ref={charRef} className="relative mb-8 group" style={getCharTransform()}>
                <div className="w-36 h-36 md:w-48 md:h-48 rounded-full overflow-hidden border-2 border-primary/30 animate-pulse-glow transition-transform duration-300 group-hover:scale-110">
                  <img src={characterImg} alt="AliteAxolot" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -inset-3 rounded-full border border-primary/10 animate-float" />
              </div>
              <div className="text-center mb-10">
                <h1 className="display-font text-5xl md:text-7xl lg:text-8xl mb-4 leading-[0.95] flex justify-center">
                  <LetterPop text="AliteAxolot" />
                </h1>
                <p className="text-muted-foreground text-base md:text-lg max-w-lg mx-auto leading-relaxed" style={{ textWrap: "balance" as any }}>
                  {settings.hero_subtitle || "Full-Stack Developer & Video Editor — I build websites, apps, web games, launchers, Discord bots, automation tools, and edit cinematic reels & shorts."}
                </p>
                {adminMode && (
                  <button
                    onClick={() => {
                      const val = prompt("Edit subtitle:", settings.hero_subtitle || "");
                      if (val !== null) saveSetting("hero_subtitle", val);
                    }}
                    className="mt-2 text-xs text-primary/60 hover:text-primary transition-colors"
                  >
                    [Edit Subtitle]
                  </button>
                )}
              </div>
              <div className="flex gap-4 mb-8">
                <button
                  onClick={() => navigate("projects")}
                  className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium transition-all duration-300 active:scale-[0.96] box-glow hover:shadow-[0_0_30px_hsl(0_72%_51%/0.3)] hover:-translate-y-1"
                >
                  View Projects
                </button>
                <button
                  onClick={() => navigate("contact")}
                  className="px-8 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium transition-all duration-300 active:scale-[0.96] border border-border hover:border-primary/40 hover:-translate-y-1"
                >
                  Contact Me
                </button>
              </div>
              <div className="absolute bottom-8 flex flex-col items-center gap-2 animate-float">
                <span className="text-xs font-mono text-muted-foreground tracking-widest">SCROLL</span>
                <div className="w-5 h-8 rounded-full border border-muted-foreground/30 flex items-start justify-center p-1">
                  <div className="w-1 h-2 bg-primary rounded-full animate-bounce" />
                </div>
              </div>
            </div>

            {/* What I Do */}
            <div className="px-6 pb-24 max-w-5xl mx-auto">
              <ScrollReveal>
                <h2 className="display-font text-3xl md:text-5xl mb-2 text-center">What I Do</h2>
                <div className="w-16 h-1 bg-primary rounded-full mx-auto mb-12" />
              </ScrollReveal>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {whatIDo.map((item, i) => (
                  <ScrollReveal key={i} delay={i * 80}>
                    <div className="bg-card border border-border rounded-xl p-6 card-hover h-full hover:scale-[1.03] hover:border-primary/50 transition-all duration-300 relative group">
                      <h3 className="font-semibold text-foreground mb-2 text-lg">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                      {adminMode && (
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => {
                            const t = prompt("Title:", item.title); if (t === null) return;
                            const d = prompt("Description:", item.desc); if (d === null) return;
                            const next = [...whatIDo]; next[i] = { title: t, desc: d };
                            saveSetting("what_i_do", JSON.stringify(next));
                          }} className="text-xs bg-secondary px-2 py-1 rounded text-muted-foreground hover:text-foreground">Edit</button>
                          <button onClick={() => {
                            const next = whatIDo.filter((_, idx) => idx !== i);
                            saveSetting("what_i_do", JSON.stringify(next));
                          }} className="text-xs bg-primary/20 px-2 py-1 rounded text-primary">X</button>
                        </div>
                      )}
                    </div>
                  </ScrollReveal>
                ))}
                {adminMode && (
                  <button onClick={() => {
                    const t = prompt("New title:"); if (!t) return;
                    const d = prompt("Description:") || "";
                    saveSetting("what_i_do", JSON.stringify([...whatIDo, { title: t, desc: d }]));
                  }} className="bg-card/50 border border-dashed border-border rounded-xl p-6 text-sm text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
                    + Add Service
                  </button>
                )}
              </div>
              <ScrollReveal delay={200}>
                <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {stats.map((s, i) => (
                    <div key={i} className="text-center py-6 bg-card/50 border border-border rounded-xl hover:-translate-y-1 hover:border-primary/40 transition-all duration-300 relative group">
                      <p className="display-font text-3xl md:text-4xl text-primary mb-1">{s.num}</p>
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{s.label}</p>
                      {adminMode && (
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => {
                            const n = prompt("Number:", s.num); if (n === null) return;
                            const l = prompt("Label:", s.label); if (l === null) return;
                            const next = [...stats]; next[i] = { num: n, label: l };
                            saveSetting("stats", JSON.stringify(next));
                          }} className="text-xs bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">Edit</button>
                          <button onClick={() => saveSetting("stats", JSON.stringify(stats.filter((_, idx) => idx !== i)))} className="text-xs bg-primary/20 px-1.5 py-0.5 rounded text-primary">X</button>
                        </div>
                      )}
                    </div>
                  ))}
                  {adminMode && (
                    <button onClick={() => {
                      const n = prompt("Number (e.g. 10+):"); if (!n) return;
                      const l = prompt("Label:") || "";
                      saveSetting("stats", JSON.stringify([...stats, { num: n, label: l }]));
                    }} className="text-center py-6 bg-card/30 border border-dashed border-border rounded-xl text-sm text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
                      + Add Stat
                    </button>
                  )}
                </div>
              </ScrollReveal>
            </div>
          </div>
        )}

        {/* ─── PROJECTS ─── */}
        {section === "projects" && (
          <div className="min-h-screen pt-24 pb-16 px-6 max-w-5xl mx-auto">
            <ScrollReveal>
              <h2 className="display-font text-4xl md:text-6xl mb-2 flex"><LetterPop text="Projects" /></h2>
              <div className="w-16 h-1 bg-primary rounded-full mb-12" />
            </ScrollReveal>

            <CategorySlider
              slides={[
                <ScrollReveal className="mb-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-primary font-mono">{`// Edits`}</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {edits.map((ed) => (
                  <div
                    key={ed.id}
                    onClick={() => !adminMode && setViewItem({ type: "edit", data: ed })}
                    className="bg-card border border-border rounded-xl overflow-hidden card-hover relative group cursor-pointer"
                  >
                    <div className={`bg-black/60 ${ed.ratio === "9:16" ? "aspect-[9/16]" : "aspect-video"} flex items-center justify-center relative overflow-hidden`}>
                      {ed.video_url ? (
                        <video src={ed.video_url} className="w-full h-full object-cover" muted preload="metadata" />
                      ) : (
                        <span className="text-muted-foreground text-xs">No video</span>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center">
                          <div className="w-0 h-0 border-l-[10px] border-l-primary-foreground border-y-[7px] border-y-transparent ml-1" />
                        </div>
                      </div>
                      <span className="absolute top-2 left-2 text-[10px] font-mono bg-background/70 px-2 py-0.5 rounded text-foreground">{ed.ratio}</span>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-foreground truncate">{ed.title}</p>
                      {ed.description && <p className="text-xs text-muted-foreground truncate">{ed.description}</p>}
                    </div>
                    {adminMode && (
                      <div className="absolute top-2 right-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openEdit("edit", ed)} className="text-[10px] bg-secondary px-2 py-1 rounded text-muted-foreground hover:text-foreground">Edit</button>
                        <button onClick={() => removeEdit(ed.id)} className="text-[10px] bg-primary/20 px-2 py-1 rounded text-primary">X</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {adminMode && (
                <EditsUploader onUpload={addEdit} />
              )}
                </ScrollReveal>,
                ...categories.map((cat) => (
              <ScrollReveal key={cat.id} className="mb-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-primary font-mono">{`// ${cat.title}`}</h3>
                  {adminMode && (
                    <button onClick={() => removeCategory(cat.id)} className="text-xs text-primary/60 hover:text-primary transition-colors">Remove Category</button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cat.bots.map((bot) => (
                    <div
                      key={bot.id}
                      onClick={() => !adminMode && setViewItem({ type: "bot", data: bot })}
                      className="bg-card border border-border rounded-xl p-6 card-hover relative group cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center mb-4 overflow-hidden">
                        {bot.image_url ? (
                          <img src={bot.image_url} alt={bot.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-primary font-bold text-lg">{bot.name[0]}</span>
                        )}
                      </div>
                      <h4 className="font-semibold text-foreground mb-1">{bot.name}</h4>
                      <p className="text-sm text-muted-foreground">{bot.description}</p>
                      <span className="text-xs text-primary mt-2 inline-block font-mono opacity-70 group-hover:opacity-100">View →</span>
                      {adminMode && (
                        <div className="absolute top-3 right-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <label className="text-xs bg-secondary px-2 py-1 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                            Img
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadBotImage(bot.id, e.target.files[0])} />
                          </label>
                          <button onClick={() => openEdit("bot", bot)} className="text-xs bg-secondary px-2 py-1 rounded text-muted-foreground hover:text-foreground transition-colors">Edit</button>
                          <button onClick={() => removeBot(bot.id)} className="text-xs bg-primary/20 px-2 py-1 rounded text-primary hover:bg-primary/30 transition-colors">X</button>
                        </div>
                      )}
                    </div>
                  ))}
                  {adminMode && (
                    <div className="bg-card/50 border border-dashed border-border rounded-xl p-6 flex flex-col gap-3">
                      <input placeholder="Bot name" value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                      <input placeholder="Short description" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                      <input placeholder="Link (optional)" value={editExtra} onChange={(e) => setEditExtra(e.target.value)} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                      <textarea placeholder="Full details (shown in popup)" value={editDetails} onChange={(e) => setEditDetails(e.target.value)} rows={4} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
                      <button onClick={() => addBot(cat.id)} className="bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors active:scale-[0.97]">Add Bot</button>
                    </div>
                  )}
                </div>
              </ScrollReveal>
                )),
                ...groupOrder.map((groupKey) => (
              <ScrollReveal key={groupKey} className="mb-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-primary font-mono">{`// ${formatCategory(groupKey)}`}</h3>
                  {adminMode && (
                    <button onClick={() => removeProjectGroup(groupKey)} className="text-xs text-primary/60 hover:text-primary transition-colors">Remove Group</button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {projectGroups[groupKey].map((p) => (
                    <div
                      key={p.id}
                      onClick={() => !adminMode && setViewItem({ type: "project", data: p })}
                      className="bg-card border border-border rounded-xl p-6 card-hover relative group cursor-pointer"
                    >
                      {p.image_url && (
                        <div className="w-14 h-14 rounded-lg bg-secondary overflow-hidden mb-3">
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <h4 className="font-semibold text-foreground mb-1">{p.name}</h4>
                      <p className="text-sm text-muted-foreground">{p.description}</p>
                      <span className="text-xs text-primary mt-2 inline-block font-mono opacity-70 group-hover:opacity-100">View →</span>
                      {adminMode && (
                        <div className="absolute top-3 right-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <label className="text-xs bg-secondary px-2 py-1 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                            Img
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadProjectImage(p.id, e.target.files[0])} />
                          </label>
                          <button onClick={() => openEdit("project", p)} className="text-xs bg-secondary px-2 py-1 rounded text-muted-foreground hover:text-foreground transition-colors">Edit</button>
                          <button onClick={() => removeProject(p.id)} className="text-xs bg-primary/20 px-2 py-1 rounded text-primary hover:bg-primary/30 transition-colors">X</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollReveal>
                )),
              ]}
            />

            {adminMode && (
              <div className="mb-12 flex gap-3 items-center mt-4">
                <input placeholder="New category name" value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                <button onClick={addCategory} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors active:scale-[0.97]">Add Category</button>
              </div>
            )}

            {adminMode && (
              <ScrollReveal className="mt-4">
                <h4 className="text-sm font-mono text-muted-foreground mb-3">Add New Project</h4>
                <div className="flex gap-3 flex-wrap">
                  <input placeholder="Name" value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  <input placeholder="Short description" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  <input placeholder="Link (optional)" value={editExtra} onChange={(e) => setEditExtra(e.target.value)} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  <input placeholder="Category (e.g. launcher, tool, game)" value={editExtra2} onChange={(e) => setEditExtra2(e.target.value)} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  <textarea placeholder="Full details (popup)" value={editDetails} onChange={(e) => setEditDetails(e.target.value)} rows={2} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full resize-none" />
                  <button onClick={addProject} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors active:scale-[0.97]">Add Project</button>
                </div>
              </ScrollReveal>
            )}

          </div>
        )}

        {/* ─── SKILLS ─── */}
        {section === "skills" && (
          <div className="min-h-screen pt-24 pb-16 px-6 max-w-3xl mx-auto">
            <ScrollReveal>
              <h2 className="display-font text-4xl md:text-6xl mb-2 flex"><LetterPop text="Skills" /></h2>
              <div className="w-16 h-1 bg-primary rounded-full mb-12" />
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <SkillKeyboard skills={skills} />
              {adminMode && (
                <div className="mt-4 flex gap-3 flex-wrap">
                  {skills.map((skill) => (
                    <div key={skill.id} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 text-xs">
                      <span>{skill.name} ({skill.percent}%)</span>
                      <button onClick={() => openEdit("skill", skill)} className="text-muted-foreground hover:text-foreground">Edit</button>
                      <button onClick={() => removeSkill(skill.id)} className="text-primary hover:text-primary/80">X</button>
                    </div>
                  ))}
                  <input placeholder="Skill name" value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  <input placeholder="Percent" type="number" value={editExtra} onChange={(e) => setEditExtra(e.target.value)} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-24" />
                  <button onClick={addSkill} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors active:scale-[0.97]">Add</button>
                </div>
              )}
            </ScrollReveal>
          </div>
        )}

        {/* ─── JOURNEY ─── */}
        {section === "journey" && (
          <div className="min-h-screen pt-24 pb-16 px-6 max-w-3xl mx-auto">
            <ScrollReveal>
              <h2 className="display-font text-4xl md:text-6xl mb-2 flex"><LetterPop text="Journey" /></h2>
              <div className="w-16 h-1 bg-primary rounded-full mb-12" />
            </ScrollReveal>
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />
              {journey.map((item, i) => (
                <ScrollReveal key={item.id} delay={i * 100}>
                  <div className="flex gap-6 mb-8 relative group">
                    <div className="w-12 h-12 rounded-full bg-card border-2 border-primary/40 flex items-center justify-center shrink-0 z-10">
                      <span className="text-xs font-mono text-primary">{item.year}</span>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-6 flex-1 card-hover">
                      <h4 className="font-semibold text-foreground mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    {adminMode && (
                      <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit("journey", item)} className="text-xs bg-secondary px-2 py-1 rounded text-muted-foreground hover:text-foreground">Edit</button>
                        <button onClick={() => removeJourney(item.id)} className="text-xs bg-primary/20 px-2 py-1 rounded text-primary hover:bg-primary/30">X</button>
                      </div>
                    )}
                  </div>
                </ScrollReveal>
              ))}
            </div>
            {adminMode && (
              <div className="mt-4 flex gap-3 flex-wrap">
                <input placeholder="Year" value={editExtra} onChange={(e) => setEditExtra(e.target.value)} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-24" />
                <input placeholder="Title" value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                <input placeholder="Description" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                <button onClick={addJourney} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors active:scale-[0.97]">Add</button>
              </div>
            )}
          </div>
        )}

        {/* ─── CONTACT ─── */}
        {section === "contact" && (
          <div className="min-h-screen pt-24 pb-16 px-6 max-w-2xl mx-auto">
            <ScrollReveal>
              <h2 className="display-font text-4xl md:text-6xl mb-2 flex"><LetterPop text="Contact" /></h2>
              <div className="w-16 h-1 bg-primary rounded-full mb-12" />
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-xl p-6 card-hover">
                  <p className="text-sm text-muted-foreground mb-1 font-mono">Discord</p>
                  <p className="text-lg font-semibold text-foreground">{settings.discord_id || "axobhaiya"}</p>
                  {adminMode && (
                    <button onClick={() => { const v = prompt("Discord ID:", settings.discord_id || ""); if (v !== null) saveSetting("discord_id", v); }} className="mt-2 text-xs text-primary/60 hover:text-primary transition-colors">[Edit]</button>
                  )}
                </div>
                <div className="bg-card border border-border rounded-xl p-6 card-hover">
                  <p className="text-sm text-muted-foreground mb-1 font-mono">Email</p>
                  <a href={`mailto:${settings.email || "hbhaiya820@gmail.com"}`} className="text-lg font-semibold text-primary hover:underline">
                    {settings.email || "hbhaiya820@gmail.com"}
                  </a>
                  {adminMode && (
                    <button onClick={() => { const v = prompt("Email:", settings.email || ""); if (v !== null) saveSetting("email", v); }} className="mt-2 text-xs text-primary/60 hover:text-primary transition-colors block">[Edit]</button>
                  )}
                </div>
              </div>
            </ScrollReveal>
          </div>
        )}
      </main>

      {/* Edit modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setEditModal(null)}>
          <div className="bg-card border border-border rounded-xl p-8 w-96 box-glow" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 text-foreground">Edit {editModal.type}</h3>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" className="w-full bg-secondary border border-border rounded-lg px-4 py-2 mb-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            {editModal.type !== "skill" && (
              <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description" className="w-full bg-secondary border border-border rounded-lg px-4 py-2 mb-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            )}
            {editModal.type === "skill" && (
              <input value={editExtra} onChange={(e) => setEditExtra(e.target.value)} placeholder="Percent" type="number" className="w-full bg-secondary border border-border rounded-lg px-4 py-2 mb-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            )}
            {editModal.type === "journey" && (
              <input value={editExtra} onChange={(e) => setEditExtra(e.target.value)} placeholder="Year" className="w-full bg-secondary border border-border rounded-lg px-4 py-2 mb-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            )}
            {(editModal.type === "project" || editModal.type === "bot") && (
              <input value={editExtra} onChange={(e) => setEditExtra(e.target.value)} placeholder="Link (optional)" className="w-full bg-secondary border border-border rounded-lg px-4 py-2 mb-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            )}
            {editModal.type === "project" && (
              <input value={editExtra2} onChange={(e) => setEditExtra2(e.target.value)} placeholder="Category" className="w-full bg-secondary border border-border rounded-lg px-4 py-2 mb-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            )}
            {editModal.type === "edit" && (
              <input value={editExtra} onChange={(e) => setEditExtra(e.target.value)} placeholder="Ratio (16:9 or 9:16)" className="w-full bg-secondary border border-border rounded-lg px-4 py-2 mb-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            )}
            {(editModal.type === "bot" || editModal.type === "project") && (
              <textarea value={editDetails} onChange={(e) => setEditDetails(e.target.value)} placeholder="Full details (shown in popup)" rows={6} className="w-full bg-secondary border border-border rounded-lg px-4 py-2 mb-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (editModal.type === "bot") saveEditBot(editModal.data.id);
                  if (editModal.type === "skill") saveEditSkill(editModal.data.id);
                  if (editModal.type === "journey") saveEditJourney(editModal.data.id);
                  if (editModal.type === "project") saveEditProject(editModal.data.id);
                  if (editModal.type === "edit") saveEditEdit(editModal.data.id);
                }}
                className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors active:scale-[0.97]"
              >
                Save
              </button>
              <button onClick={() => setEditModal(null)} className="flex-1 bg-secondary text-secondary-foreground py-2 rounded-lg font-medium hover:bg-secondary/80 transition-colors active:scale-[0.97]">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View popup (bot/project/edit) */}
      {viewItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/85 backdrop-blur-md p-4" onClick={() => setViewItem(null)}>
          <div
            className="bg-card border border-border rounded-2xl box-glow max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {viewItem.type === "edit" ? (
              <div>
                <div className={`bg-black ${viewItem.data.ratio === "9:16" ? "aspect-[9/16] max-h-[80vh] mx-auto" : "aspect-video"} flex items-center justify-center overflow-hidden rounded-t-2xl`}>
                  {viewItem.data.video_url ? (
                    <video src={viewItem.data.video_url} controls autoPlay className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-muted-foreground">No video</span>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="display-font text-2xl mb-2 text-foreground">{viewItem.data.title}</h3>
                  {viewItem.data.description && <p className="text-sm text-muted-foreground">{viewItem.data.description}</p>}
                </div>
              </div>
            ) : (
              <div className="p-8">
                <div className="flex items-start gap-4 mb-4">
                  {viewItem.data.image_url && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary shrink-0">
                      <img src={viewItem.data.image_url} alt={viewItem.data.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="display-font text-3xl text-foreground mb-1">{viewItem.data.name}</h3>
                    <p className="text-sm text-muted-foreground">{viewItem.data.description}</p>
                  </div>
                </div>
                {viewItem.data.details && (
                  <div className="mt-4 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed border-t border-border pt-4">
                    {viewItem.data.details}
                  </div>
                )}
                <div className="mt-6 flex gap-3">
                  {viewItem.data.link && (
                    <a
                      href={viewItem.data.link}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 text-center bg-primary text-primary-foreground py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-all active:scale-[0.97]"
                    >
                      Visit →
                    </a>
                  )}
                  <button
                    onClick={() => setViewItem(null)}
                    className="flex-1 bg-secondary text-secondary-foreground py-2.5 rounded-lg font-medium hover:bg-secondary/80 transition-all active:scale-[0.97]"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin indicator */}
      {adminMode && (
        <div className="fixed bottom-4 left-4 z-50 bg-primary/10 border border-primary/30 rounded-lg px-4 py-2 text-sm text-primary font-mono">
          Admin Mode
        </div>
      )}
    </div>
  );
};

export default Index;

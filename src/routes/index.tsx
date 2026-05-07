import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Trash2,
  Sparkles,
  Volume2,
  Languages,
  Music2,
  Download,
  Loader2,
  Wind,
  Mic,
  FileAudio,
  Copy,
  Share2,
  Wand2,
  Lightbulb,
  Flame,
  BookOpen,
  Clock,
  Star,
  BarChart3,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { useSpeech } from "@/hooks/use-speech";
import { useAmbientMusic } from "@/hooks/use-ambient-music";
import { useBreath } from "@/hooks/use-breath";
import { Waveform } from "@/components/Waveform";
import { VoiceVibes, type Vibe } from "@/components/VoiceVibes";
import { AppSidebar, type SidebarKey } from "@/components/AppSidebar";
import {
  detectLanguage,
  pickVoiceForLang,
  cleanTextForSpeech,
  type VoiceGender,
} from "@/lib/detect-language";

export const Route = createFileRoute("/")({
  component: Index,
});

interface AiPreset {
  id: string;
  name: string;
  description: string;
  rate: number;
  pitch: number;
  pause: number;
  breath: number;
  icon: typeof Flame;
}
const AI_PRESETS: AiPreset[] = [
  { id: "shorts", name: "YouTube Shorts", description: "Punchy, fast, energetic.", rate: 1.1, pitch: 1.05, pause: 180, breath: 0.3, icon: Flame },
  { id: "story", name: "Story Narration", description: "Calm, immersive storytelling.", rate: 0.9, pitch: 1.0, pause: 380, breath: 0.5, icon: BookOpen },
  { id: "podcast", name: "Podcast", description: "Warm, conversational pace.", rate: 0.95, pitch: 0.98, pause: 280, breath: 0.45, icon: Mic },
  { id: "motivation", name: "Motivation Reel", description: "Bold, inspiring delivery.", rate: 1.0, pitch: 1.05, pause: 320, breath: 0.55, icon: Star },
  { id: "horror", name: "Horror Story", description: "Slow, deep, eerie pauses.", rate: 0.7, pitch: 0.75, pause: 700, breath: 0.8, icon: FileAudio },
  { id: "news", name: "News Reporter", description: "Crisp, neutral, professional.", rate: 1.0, pitch: 0.95, pause: 140, breath: 0.2, icon: BarChart3 },
];

const HOOK_IDEAS = [
  "Wait... you won't believe what happened next.",
  "Most people get this completely wrong — here's why.",
  "I tried this for 30 days. The results shocked me.",
  "If you're watching this, it's already too late.",
  "Three secrets nobody told you about success.",
  "What I'm about to share will change everything.",
];

function Index() {
  const { voices, status, speak, pause, resume, stop } = useSpeech();
  const ambient = useAmbientMusic();
  const { inhale } = useBreath();

  const [section, setSection] = useState<SidebarKey>("new");
  const [text, setText] = useState(
    "Welcome to VoxWave. Type anything and hear it spoken in seconds, with natural breathing and human pacing.",
  );
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [rate, setRate] = useState(0.9);
  const [pitch, setPitch] = useState(1.0);
  const [volume, setVolume] = useState(1);
  const [musicOn, setMusicOn] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.05);
  const [highlight, setHighlight] = useState<{ start: number; len: number } | null>(null);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [gender, setGender] = useState<VoiceGender>("auto");

  // Voice Inhaling controls
  const [inhalingOn, setInhalingOn] = useState(true);
  const [breathIntensity, setBreathIntensity] = useState(0.45);
  const [naturalPause, setNaturalPause] = useState(320);
  const [clarity, setClarity] = useState(0.7);

  // Saved/history state
  const [history, setHistory] = useState<{ id: string; text: string; at: number }[]>([]);
  const [saved, setSaved] = useState<{ id: string; name: string; preset: string }[]>([]);

  const cleanedText = useMemo(() => cleanTextForSpeech(text), [text]);
  const detection = useMemo(() => detectLanguage(cleanedText || text), [cleanedText, text]);
  const selectedVoice = useMemo(
    () => pickVoiceForLang(voices, detection, gender),
    [voices, detection, gender],
  );
  const fallbackUsed =
    !!selectedVoice &&
    detection?.lang !== "en" &&
    !selectedVoice.lang?.toLowerCase().startsWith(detection?.bcp47?.split("-")[0] ?? "");

  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

  const computeFinal = () => {
    const rateMul = vibe?.rate ? vibe.rate / 0.9 : 1;
    const pitchMul = vibe?.pitch ? vibe.pitch / 1.0 : 1;
    const pitchBias = gender === "male" ? 0.92 : gender === "female" ? 1.02 : 1;
    const finalRate = clamp(rate * rateMul, 0.1, 10);
    const finalPitch = clamp(pitch * pitchMul * pitchBias, 0, 2);
    const finalPause = vibe?.pause ?? naturalPause;
    return { finalRate, finalPitch, finalPause };
  };

  const speakNow = async (onEndExtra?: () => void) => {
    const sayable = (cleanedText || "").trim();
    if (!sayable) return;
    setHighlight(null);
    const { finalRate, finalPitch, finalPause } = computeFinal();
    if (musicOn) ambient.start(musicVolume);
    if (inhalingOn) {
      try {
        await inhale(breathIntensity, 380 + breathIntensity * 320);
      } catch { /* noop */ }
    }
    speak({
      text: sayable,
      voice: selectedVoice ?? null,
      rate: finalRate,
      pitch: finalPitch,
      volume: clamp(volume * (0.85 + clarity * 0.3), 0, 1),
      sentencePause: finalPause,
      commaPause: 100 + Math.round(breathIntensity * 80),
      leadInDelay: 200,
      tailDelay: 400,
      breathBeforeLong: 200 + Math.round(breathIntensity * 250),
      onBoundary: (start, len) => setHighlight({ start, len }),
      onEnd: () => {
        setHighlight(null);
        ambient.stop();
        onEndExtra?.();
      },
    });
    setHistory((h) =>
      [{ id: `${Date.now()}`, text: sayable.slice(0, 80), at: Date.now() }, ...h].slice(0, 10),
    );
  };

  const handleSpeak = () => {
    void speakNow();
  };

  const handleStop = () => {
    stop();
    setHighlight(null);
    ambient.stop();
  };

  const handleDownload = async (mime: "webm" | "wav" = "webm") => {
    const sayable = (cleanedText || "").trim();
    if (!sayable || recording) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
      alert("Audio capture is not supported in this browser. Try Chrome on desktop.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    } catch { return; }
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      stream.getTracks().forEach((t) => t.stop());
      alert('No audio captured. Pick "Chrome Tab" and enable "Share tab audio".');
      return;
    }
    stream.getVideoTracks().forEach((t) => t.stop());
    const audioStream = new MediaStream(audioTracks);
    const recMime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    const recorder = new MediaRecorder(audioStream, { mimeType: recMime });
    recorderRef.current = recorder;
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      audioStream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: recMime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = mime === "wav" ? "wav" : "webm";
      a.download = `voxwave-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setRecording(false);
      recorderRef.current = null;
    };
    setRecording(true);
    recorder.start();
    void speakNow(() => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    });
  };

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(text); } catch { /* noop */ }
  };
  const handleShare = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "VoxWave script", text });
      else await navigator.clipboard.writeText(text);
    } catch { /* noop */ }
  };

  const applyPreset = (p: AiPreset) => {
    setRate(p.rate);
    setPitch(p.pitch);
    setNaturalPause(p.pause);
    setBreathIntensity(p.breath);
    setInhalingOn(true);
    setSection("new");
  };

  const insertHook = () => {
    const idea = HOOK_IDEAS[Math.floor(Math.random() * HOOK_IDEAS.length)];
    setText((t) => `${idea}\n\n${t}`);
  };

  useEffect(() => {
    if (status === "speaking" && musicOn) ambient.setVolume(musicVolume);
  }, [musicVolume, musicOn, status, ambient]);
  useEffect(() => { if (!musicOn) ambient.stop(); }, [musicOn, ambient]);

  const renderHighlighted = () => {
    if (!highlight || status !== "speaking") return text;
    const { start, len } = highlight;
    const src = cleanedText || text;
    const safeStart = Math.max(0, Math.min(start, src.length));
    const end = safeStart + (len || src.slice(safeStart).split(/\s/)[0]?.length || 0);
    return (
      <>
        {src.slice(0, safeStart)}
        <span className="highlight-word">{src.slice(safeStart, end)}</span>
        {src.slice(end)}
      </>
    );
  };

  const statusLabel = status === "speaking" ? "Speaking" : status === "paused" ? "Paused" : "Idle";
  const statusColor = status === "speaking" ? "var(--neon-purple)" : status === "paused" ? "var(--neon-blue)" : "var(--muted-foreground)";

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full">
        <AppSidebar active={section} onSelect={setSection} />
        <SidebarInset className="bg-transparent">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-3 border-b border-border/40 backdrop-blur-xl bg-background/40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="hover:bg-white/5" />
              <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                <span className="capitalize">{section === "new" ? "Studio" : section}</span>
                <span>·</span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: statusColor, boxShadow: status === "speaking" ? `0 0 10px ${statusColor}` : "none" }}
                  />
                  {statusLabel}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass text-[10px] uppercase tracking-widest text-muted-foreground">
                <Sparkles className="h-3 w-3" /> Premium AI
              </span>
            </div>
          </header>

          <main className="px-4 md:px-8 py-6 md:py-10">
            <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
              {section === "presets" ? (
                <PresetsView onPick={applyPreset} />
              ) : section === "saved" ? (
                <SavedView saved={saved} onRemove={(id) => setSaved((s) => s.filter((x) => x.id !== id))} />
              ) : section === "history" ? (
                <HistoryView history={history} onPick={(t) => { setText(t); setSection("new"); }} />
              ) : section === "projects" ? (
                <ProjectsView />
              ) : section === "settings" ? (
                <SettingsView
                  musicOn={musicOn} setMusicOn={setMusicOn}
                  musicVolume={musicVolume} setMusicVolume={setMusicVolume}
                  gender={gender} setGender={setGender}
                />
              ) : (
                <>
                  {/* Hero */}
                  <section className="text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-[10px] uppercase tracking-widest text-muted-foreground">
                      <Sparkles className="h-3 w-3" /> AI Voice Studio · No API Key
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                      <span className="text-gradient">VoxWave Studio</span>
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
                      Premium AI narration with natural breathing, human pacing, and cinematic delivery.
                    </p>
                  </section>

                  {/* Voice Inhaling — featured */}
                  <section
                    className="glass rounded-3xl p-6 md:p-7 relative overflow-hidden"
                    style={{ boxShadow: "var(--shadow-neon)" }}
                  >
                    <div
                      className="absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl opacity-30 pointer-events-none"
                      style={{ background: "var(--gradient-primary)" }}
                    />
                    <div className="relative flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-12 w-12 rounded-2xl flex items-center justify-center animate-pulse-ring"
                          style={{ background: "var(--gradient-primary)" }}
                        >
                          <Wind className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-xl md:text-2xl font-bold">Voice Inhaling</h2>
                          <p className="text-xs text-muted-foreground">
                            Natural inhale before speech · realistic narration pacing
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Enable</span>
                        <Switch checked={inhalingOn} onCheckedChange={setInhalingOn} />
                      </div>
                    </div>
                    <div className="relative grid md:grid-cols-3 gap-5 mt-5">
                      <SliderRow label="Breath intensity" value={breathIntensity} min={0} max={1} step={0.05} onChange={setBreathIntensity} />
                      <SliderRow label="Natural pause" value={naturalPause} min={0} max={900} step={20} onChange={setNaturalPause} suffix="ms" />
                      <SliderRow label="Voice clarity" value={clarity} min={0} max={1} step={0.05} onChange={setClarity} />
                    </div>
                  </section>

                  {/* Editor */}
                  <section className="glass rounded-3xl p-6 md:p-8 space-y-5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-[color:var(--neon-purple)]" />
                        <span className="text-sm font-semibold">AI Voice Generator</span>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">{text.length} chars</span>
                    </div>

                    <div className="relative">
                      {status === "speaking" && highlight && (
                        <div aria-hidden className="absolute inset-0 p-4 text-base whitespace-pre-wrap pointer-events-none text-transparent">
                          {renderHighlighted()}
                        </div>
                      )}
                      <Textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Type or paste a script to generate AI narration..."
                        className="min-h-44 bg-background/40 border-border/60 resize-none text-base rounded-2xl"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 justify-between">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" size="sm" onClick={insertHook}>
                          <Lightbulb className="h-4 w-4 mr-1" /> Hook idea
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleCopy}>
                          <Copy className="h-4 w-4 mr-1" /> Copy
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleShare}>
                          <Share2 className="h-4 w-4 mr-1" /> Share
                        </Button>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setText("")} disabled={!text}>
                        <Trash2 className="h-4 w-4 mr-1" /> Clear
                      </Button>
                    </div>

                    <Waveform active={status === "speaking"} />

                    <div className="flex flex-wrap items-center gap-2">
                      <Chip icon={<Languages className="h-3.5 w-3.5 text-[color:var(--neon-blue)]" />} label="Detected" value={detection?.label ?? "—"} />
                      <Chip
                        icon={<Mic className="h-3.5 w-3.5 text-[color:var(--neon-purple)]" />}
                        label="Voice"
                        value={selectedVoice?.name ? `${selectedVoice.name}${selectedVoice.lang ? ` · ${selectedVoice.lang}` : ""}` : voices.length === 0 ? "Loading…" : "None"}
                        extra={fallbackUsed ? "fallback" : undefined}
                      />
                      <Chip icon={<Sparkles className="h-3.5 w-3.5 text-[color:var(--neon-purple)]" />} label="Vibe" value={vibe?.name ?? "None"} />
                    </div>

                    {/* Character */}
                    <div className="glass rounded-2xl p-4 flex flex-wrap items-center gap-3">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Character</span>
                      <div className="flex flex-wrap gap-2">
                        {([
                          { id: "auto", label: "Auto" },
                          { id: "male", label: "Man" },
                          { id: "female", label: "Woman" },
                        ] as const).map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setGender(g.id as VoiceGender)}
                            className={`px-4 py-1.5 rounded-full text-xs border transition-all ${
                              gender === g.id
                                ? "bg-[color:var(--neon-purple)]/25 border-[color:var(--neon-purple)] text-foreground"
                                : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-white/5"
                            }`}
                          >
                            {g.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => { setGender("female"); setPitch(1.25); setRate(1.0); }}
                          className="px-4 py-1.5 rounded-full text-xs border border-border/60 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
                        >
                          Young
                        </button>
                        <button
                          type="button"
                          onClick={() => { setGender("female"); setPitch(1.45); setRate(1.05); }}
                          className="px-4 py-1.5 rounded-full text-xs border border-border/60 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
                        >
                          Child
                        </button>
                      </div>
                    </div>

                    {/* Smart controls */}
                    <div className="grid md:grid-cols-3 gap-6">
                      <SliderRow label="Speed" value={rate} min={0.5} max={2} step={0.05} onChange={setRate} suffix="x" />
                      <SliderRow label="Pitch" value={pitch} min={0} max={2} step={0.05} onChange={setPitch} />
                      <SliderRow label="Volume" value={volume} min={0} max={1} step={0.05} onChange={setVolume} icon={<Volume2 className="h-3.5 w-3.5" />} />
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      {status === "idle" && (
                        <Button size="lg" className="btn-neon rounded-full px-8" onClick={handleSpeak} disabled={!text.trim()}>
                          <Play className="h-5 w-5 mr-2" /> Generate Voice
                        </Button>
                      )}
                      {status === "speaking" && (
                        <Button size="lg" variant="secondary" className="rounded-full px-8" onClick={pause}>
                          <Pause className="h-5 w-5 mr-2" /> Pause
                        </Button>
                      )}
                      {status === "paused" && (
                        <Button size="lg" className="btn-neon rounded-full px-8" onClick={resume}>
                          <Play className="h-5 w-5 mr-2" /> Resume
                        </Button>
                      )}
                      <Button size="lg" variant="outline" className="rounded-full px-6" onClick={handleStop} disabled={status === "idle"}>
                        <Square className="h-4 w-4 mr-2" /> Stop
                      </Button>
                      <Button size="lg" variant="ghost" className="rounded-full px-6" onClick={handleSpeak} disabled={!text.trim()}>
                        <RotateCcw className="h-4 w-4 mr-2" /> Regenerate
                      </Button>
                    </div>

                    {/* Export */}
                    <div className="glass rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <FileAudio className="h-4 w-4 text-[color:var(--neon-blue)]" />
                        <span className="text-sm font-semibold">Export</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="rounded-full" onClick={() => handleDownload("webm")} disabled={!text.trim() || recording || status !== "idle"}>
                          {recording ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                          MP3
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-full" onClick={() => handleDownload("wav")} disabled={!text.trim() || recording || status !== "idle"}>
                          <Download className="h-4 w-4 mr-1" /> WAV
                        </Button>
                        <Button variant="ghost" size="sm" className="rounded-full" onClick={handleCopy}>
                          <Copy className="h-4 w-4 mr-1" /> Script
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full"
                          onClick={() => setSaved((s) => [{ id: `${Date.now()}`, name: text.slice(0, 40) || "Untitled", preset: vibe?.name ?? "Default" }, ...s].slice(0, 12))}
                          disabled={!text.trim()}
                        >
                          <Star className="h-4 w-4 mr-1" /> Save
                        </Button>
                      </div>
                    </div>
                    <p className="text-center text-[11px] text-muted-foreground">
                      Tip: For audio download, choose <span className="font-semibold">"Chrome Tab"</span> and enable
                      <span className="font-semibold"> "Share tab audio"</span> when prompted.
                    </p>
                  </section>

                  {/* Vibes */}
                  <VoiceVibes activeId={vibe?.id ?? null} onSelect={setVibe} />

                  {/* AI Presets quick row */}
                  <section className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h2 className="text-2xl font-bold tracking-tight">
                        AI <span className="text-gradient">Presets</span>
                      </h2>
                      <span className="text-xs text-muted-foreground">One-tap creator templates</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {AI_PRESETS.map((p) => {
                        const Icon = p.icon;
                        return (
                          <button
                            key={p.id}
                            onClick={() => applyPreset(p)}
                            className="glass rounded-2xl p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:ring-1 hover:ring-[color:var(--neon-purple)]/40 group"
                          >
                            <div
                              className="h-9 w-9 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"
                              style={{ background: "var(--gradient-primary)" }}
                            >
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            <h3 className="text-sm font-semibold">{p.name}</h3>
                            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{p.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* Dashboard stats */}
                  <DashboardSection
                    history={history}
                    saved={saved}
                    voicesCount={voices.length}
                  />
                </>
              )}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function Chip({ icon, label, value, extra }: { icon: React.ReactNode; label: string; value: string; extra?: string }) {
  return (
    <div className="glass rounded-full px-3 py-1.5 flex items-center gap-2 text-xs">
      {icon}
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-semibold truncate max-w-[200px]">{value}</span>
      {extra && (
        <span className="text-[10px] uppercase tracking-wider text-[color:var(--neon-purple)]">{extra}</span>
      )}
    </div>
  );
}

function SliderRow({
  label, value, min, max, step, onChange, suffix, icon,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; suffix?: string; icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          {icon} {label}
        </label>
        <span className="text-sm font-mono text-foreground">
          {value < 10 ? value.toFixed(2) : Math.round(value)}{suffix}
        </span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

function PresetsView({ onPick }: { onPick: (p: AiPreset) => void }) {
  return (
    <section className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold"><span className="text-gradient">AI Presets</span></h1>
        <p className="text-sm text-muted-foreground">Instant creator templates with smart pacing.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {AI_PRESETS.map((p) => {
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              onClick={() => onPick(p)}
              className="glass rounded-3xl p-6 text-left transition-all hover:-translate-y-1 hover:ring-1 hover:ring-[color:var(--neon-purple)]/40"
            >
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-neon)" }}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-bold text-lg">{p.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
              <div className="mt-3 text-[11px] text-muted-foreground/70 font-mono">
                rate {p.rate}x · pitch {p.pitch} · breath {p.breath}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SavedView({ saved, onRemove }: { saved: { id: string; name: string; preset: string }[]; onRemove: (id: string) => void }) {
  return (
    <section className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold"><span className="text-gradient">Saved Voices</span></h1>
        <p className="text-sm text-muted-foreground">Your favorite scripts & voice setups.</p>
      </div>
      {saved.length === 0 ? (
        <EmptyState title="No saved voices yet" subtitle="Tap Save in the studio to keep your favorite scripts." />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {saved.map((s) => (
            <div key={s.id} className="glass rounded-2xl p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm">{s.name}</div>
                <div className="text-[11px] text-muted-foreground">Preset · {s.preset}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onRemove(s.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function HistoryView({ history, onPick }: { history: { id: string; text: string; at: number }[]; onPick: (t: string) => void }) {
  return (
    <section className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold"><span className="text-gradient">History</span></h1>
        <p className="text-sm text-muted-foreground">Recent generations from this session.</p>
      </div>
      {history.length === 0 ? (
        <EmptyState title="Nothing here yet" subtitle="Your last 10 generations will appear here." />
      ) : (
        <div className="space-y-2">
          {history.map((h) => (
            <button
              key={h.id}
              onClick={() => onPick(h.text)}
              className="w-full glass rounded-2xl p-4 text-left hover:ring-1 hover:ring-[color:var(--neon-purple)]/40 transition"
            >
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
                <Clock className="h-3 w-3" /> {new Date(h.at).toLocaleTimeString()}
              </div>
              <div className="text-sm">{h.text}</div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function ProjectsView() {
  return (
    <section className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold"><span className="text-gradient">Projects</span></h1>
        <p className="text-sm text-muted-foreground">Organize your scripts into projects.</p>
      </div>
      <EmptyState title="No projects yet" subtitle="Project workspaces are coming soon." />
    </section>
  );
}

function SettingsView({
  musicOn, setMusicOn, musicVolume, setMusicVolume, gender, setGender,
}: {
  musicOn: boolean; setMusicOn: (b: boolean) => void;
  musicVolume: number; setMusicVolume: (n: number) => void;
  gender: VoiceGender; setGender: (g: VoiceGender) => void;
}) {
  return (
    <section className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold"><span className="text-gradient">Settings</span></h1>
        <p className="text-sm text-muted-foreground">Tune your global studio defaults.</p>
      </div>
      <div className="glass rounded-3xl p-6 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Music2 className="h-4 w-4 text-[color:var(--neon-purple)]" />
            <div>
              <div className="text-sm font-semibold">Cinematic music</div>
              <div className="text-[11px] text-muted-foreground">Soft ambient pad behind narration.</div>
            </div>
          </div>
          <Switch checked={musicOn} onCheckedChange={setMusicOn} />
        </div>
        <SliderRow label="Music volume" value={musicVolume} min={0} max={0.2} step={0.005} onChange={setMusicVolume} />
        <div className="pt-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Default character</div>
          <div className="flex gap-2">
            {(["auto", "male", "female"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`px-4 py-1.5 rounded-full text-xs capitalize border transition ${
                  gender === g
                    ? "bg-[color:var(--neon-purple)]/25 border-[color:var(--neon-purple)] text-foreground"
                    : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                {g === "male" ? "Man" : g === "female" ? "Woman" : "Auto"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DashboardSection({
  history, saved, voicesCount,
}: { history: { id: string }[]; saved: { id: string }[]; voicesCount: number }) {
  return (
    <section className="grid md:grid-cols-3 gap-4">
      <StatCard label="Generations" value={history.length} icon={<BarChart3 className="h-4 w-4" />} />
      <StatCard label="Saved Voices" value={saved.length} icon={<Star className="h-4 w-4" />} />
      <StatCard label="Voices Available" value={voicesCount} icon={<Mic className="h-4 w-4" />} />
    </section>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5 flex items-center justify-between">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="text-3xl font-bold mt-1">{value}</div>
      </div>
      <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
        {icon}
      </div>
    </div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="glass rounded-3xl p-10 text-center">
      <div className="mx-auto h-12 w-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: "var(--gradient-primary)" }}>
        <Wand2 className="h-5 w-5 text-white" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );
}

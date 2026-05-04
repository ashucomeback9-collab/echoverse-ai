import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Square, RotateCcw, Trash2, Sparkles, Volume2, Languages, Music2, Download, Loader2, Wand2, User, UserRound, Baby, GraduationCap, Mic2, Drama, Newspaper, Sword } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useSpeech } from "@/hooks/use-speech";
import { useAmbientMusic } from "@/hooks/use-ambient-music";
import { Waveform } from "@/components/Waveform";
import { VoiceVibes, type Vibe } from "@/components/VoiceVibes";
import { detectLanguage, pickVoiceForLang, cleanTextForSpeech } from "@/lib/detect-language";
import { generateOpenAIAudio } from "@/server/tts.functions";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { voices, status, speak, pause, resume, stop } = useSpeech();
  const ambient = useAmbientMusic();
  const [text, setText] = useState("Welcome to VoxWave. Type anything and hear it spoken in seconds.");
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [rate, setRate] = useState(0.85);
  const [pitch, setPitch] = useState(0.95);
  const [volume, setVolume] = useState(1);
  const [musicOn, setMusicOn] = useState(true);
  const [musicVolume, setMusicVolume] = useState(0.06);
  const [highlight, setHighlight] = useState<{ start: number; len: number } | null>(null);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [aiVoice, setAiVoice] = useState<string>("alloy");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAudioUrl, setAiAudioUrl] = useState<string | null>(null);
  const aiAudioRef = useRef<HTMLAudioElement | null>(null);
  const [character, setCharacter] = useState<string>("man");

  const OPENAI_VOICES = [
    { id: "alloy", label: "Alloy" },
    { id: "echo", label: "Echo" },
    { id: "fable", label: "Fable" },
    { id: "onyx", label: "Onyx" },
    { id: "nova", label: "Nova" },
    { id: "shimmer", label: "Shimmer" },
  ];

  const CHARACTERS: {
    id: string;
    name: string;
    description: string;
    icon: typeof User;
    voice: string;
    style: string;
  }[] = [
    {
      id: "man",
      name: "Man",
      description: "Deep, calm, natural adult male.",
      icon: User,
      voice: "onyx",
      style:
        "You are an adult man with a warm, deep, natural voice. Speak in a calm, grounded, conversational tone — like a friendly narrator in his 30s.",
    },
    {
      id: "woman",
      name: "Woman",
      description: "Warm, soft, natural adult female.",
      icon: UserRound,
      voice: "nova",
      style:
        "You are an adult woman with a warm, soft, natural voice. Speak in a friendly, gentle, conversational tone — clear and inviting.",
    },
    {
      id: "child",
      name: "Child",
      description: "Bright, playful, youthful child voice.",
      icon: Baby,
      voice: "shimmer",
      style:
        "You are a cheerful child around 8 years old. Speak in a bright, playful, slightly higher-pitched voice with curious, excited energy. Keep it innocent and fun.",
    },
    {
      id: "professor",
      name: "Professor",
      description: "Wise, articulate, lecturing professor.",
      icon: GraduationCap,
      voice: "ash",
      style:
        "You are a wise university professor in his 60s. Speak in a measured, articulate, slightly slow lecturing tone, with thoughtful pauses and clear emphasis on key ideas.",
    },
    {
      id: "narrator",
      name: "Narrator",
      description: "Cinematic movie-trailer voice.",
      icon: Mic2,
      voice: "ash",
      style:
        "You are a cinematic movie-trailer narrator. Speak in a deep, dramatic, slow, epic voice with weighty pauses and powerful intensity.",
    },
    {
      id: "villain",
      name: "Villain",
      description: "Dark, menacing, theatrical villain.",
      icon: Drama,
      voice: "onyx",
      style:
        "You are a theatrical villain. Speak in a dark, low, menacing, slightly drawn-out tone with cold confidence and a hint of cruel amusement.",
    },
    {
      id: "news",
      name: "News Anchor",
      description: "Crisp, neutral, professional anchor.",
      icon: Newspaper,
      voice: "echo",
      style:
        "You are a professional television news anchor. Speak in a clear, crisp, neutral, well-paced broadcast tone with confident articulation.",
    },
    {
      id: "hero",
      name: "Hero",
      description: "Bold, heroic, inspiring warrior.",
      icon: Sword,
      voice: "fable",
      style:
        "You are a bold heroic warrior. Speak in a strong, brave, inspiring tone — confident, noble, and full of conviction.",
    },
  ];

  const handleAiSpeak = async () => {
    const sayable = (cleanedText || "").trim();
    if (!sayable || aiLoading) return;
    setAiLoading(true);
    try {
      if (aiAudioRef.current) {
        aiAudioRef.current.pause();
        aiAudioRef.current = null;
      }
      if (aiAudioUrl) {
        URL.revokeObjectURL(aiAudioUrl);
        setAiAudioUrl(null);
      }
      const activeChar = CHARACTERS.find((c) => c.id === character) ?? null;
      const res = await generateOpenAIAudio({
        data: {
          text: sayable,
          voice: aiVoice,
          style: activeChar?.style ?? "",
        },
      });
      const bin = atob(res.audioBase64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: res.mime });
      const url = URL.createObjectURL(blob);
      setAiAudioUrl(url);
      const audio = new Audio(url);
      aiAudioRef.current = audio;
      audio.volume = volume ?? 1;
      if (musicOn) ambient.start(musicVolume);
      audio.onended = () => ambient.stop();
      await audio.play();
    } catch (err) {
      console.error("AI voice failed:", err);
      alert((err as Error)?.message ?? "AI voice generation failed");
      ambient.stop();
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiDownload = () => {
    if (!aiAudioUrl) return;
    const a = document.createElement("a");
    a.href = aiAudioUrl;
    a.download = `voxwave-ai-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const cleanedText = useMemo(() => cleanTextForSpeech(text), [text]);
  const detection = useMemo(() => detectLanguage(cleanedText || text), [cleanedText, text]);
  const selectedVoice = useMemo(
    () => pickVoiceForLang(voices, detection),
    [voices, detection],
  );
  const fallbackUsed =
    !!selectedVoice &&
    detection?.lang !== "en" &&
    !selectedVoice.lang?.toLowerCase().startsWith(detection?.bcp47?.split("-")[0] ?? "");

  const handleSpeak = () => {
    const sayable = (cleanedText || "").trim();
    if (!sayable) return;
    setHighlight(null);
    try {
      // Natural human-like baseline: slightly slower, slightly lower pitch,
      // sentence pauses for cinematic pacing.
      const NATURAL_BASE = { rate: 0.9, pitch: 1.0, pause: 320 };
      const baseRate = vibe?.rate ?? NATURAL_BASE.rate;
      const basePitch = vibe?.pitch ?? NATURAL_BASE.pitch;
      const basePause = vibe?.pause ?? NATURAL_BASE.pause;
      // Clamp to natural human-narrator range to avoid robotic extremes.
      const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
      const finalRate = clamp(baseRate, 0.85, 0.95);
      const finalPitch = clamp(basePitch, 0.9, 1.05);
      const finalPause = basePause;

      if (musicOn) ambient.start(musicVolume);
      speak({
        text: sayable,
        voice: selectedVoice ?? null,
        rate: finalRate,
        pitch: finalPitch,
        volume: volume ?? 1,
        sentencePause: finalPause,
        commaPause: 100,
        leadInDelay: 350,
        tailDelay: 400,
        breathBeforeLong: 220,
        onBoundary: (start, len) => setHighlight({ start, len }),
        onEnd: () => {
          setHighlight(null);
          ambient.stop();
        },
      });
    } catch (err) {
      console.error("Speech failed:", err);
      setHighlight(null);
      ambient.stop();
    }
  };

  const handleStop = () => {
    stop();
    setHighlight(null);
    ambient.stop();
  };

  const handleDownload = async () => {
    const sayable = (cleanedText || "").trim();
    if (!sayable || recording) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
      alert("Audio capture is not supported in this browser. Try Chrome on desktop.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
    } catch {
      return;
    }
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      stream.getTracks().forEach((t) => t.stop());
      alert('No audio captured. When the share dialog appears, pick "Chrome Tab" and enable "Share tab audio".');
      return;
    }
    // Drop video tracks; we only need audio.
    stream.getVideoTracks().forEach((t) => t.stop());
    const audioStream = new MediaStream(audioTracks);
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    const recorder = new MediaRecorder(audioStream, { mimeType: mime });
    recorderRef.current = recorder;
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      audioStream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `voxwave-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setRecording(false);
      recorderRef.current = null;
    };
    setRecording(true);
    recorder.start();
    // Begin speaking; stop the recorder when speech ends.
    setHighlight(null);
    const NATURAL_BASE = { rate: 0.9, pitch: 1.0, pause: 320 };
    const baseRate = vibe?.rate ?? NATURAL_BASE.rate;
    const basePitch = vibe?.pitch ?? NATURAL_BASE.pitch;
    const basePause = vibe?.pause ?? NATURAL_BASE.pause;
    const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
    if (musicOn) ambient.start(musicVolume);
    speak({
      text: sayable,
      voice: selectedVoice ?? null,
      rate: clamp(baseRate, 0.85, 0.95),
      pitch: clamp(basePitch, 0.9, 1.05),
      volume: volume ?? 1,
      sentencePause: basePause,
      commaPause: 100,
      leadInDelay: 350,
      tailDelay: 600,
      breathBeforeLong: 220,
      onBoundary: (start, len) => setHighlight({ start, len }),
      onEnd: () => {
        setHighlight(null);
        ambient.stop();
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
          recorderRef.current.stop();
        }
      },
    });
  };

  const handleDownloadText = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voxwave-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  useEffect(() => {
    if (status === "speaking" && musicOn) ambient.setVolume(musicVolume);
  }, [musicVolume, musicOn, status, ambient]);

  useEffect(() => {
    if (!musicOn) ambient.stop();
  }, [musicOn, ambient]);

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

  const statusLabel = status === "speaking" ? "Speaking" : status === "paused" ? "Paused" : "Stopped";
  const statusColor = status === "speaking" ? "var(--neon-purple)" : status === "paused" ? "var(--neon-blue)" : "var(--muted-foreground)";

  return (
    <main className="min-h-screen px-4 py-10 md:py-16">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Web Speech · No API Key
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            <span className="text-gradient">VoxWave</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Turn any text into natural speech right in your browser. Pick a voice, tune it, press play.
          </p>
        </header>

        <VoiceVibes activeId={vibe?.id ?? null} onSelect={setVibe} />

        <section className="glass rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: statusColor, boxShadow: status === "speaking" ? `0 0 12px ${statusColor}` : "none" }}
              />
              <span className="text-sm font-medium" style={{ color: statusColor }}>{statusLabel}</span>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">{text.length} chars</span>
          </div>

          <div className="relative">
            {status === "speaking" && highlight && (
              <div
                aria-hidden
                className="absolute inset-0 p-4 text-base whitespace-pre-wrap pointer-events-none text-transparent"
              >
                {renderHighlighted()}
              </div>
            )}
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type or paste text to speak..."
              className="min-h-40 bg-background/40 border-border resize-none text-base"
            />
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setText("")} disabled={!text}>
              <Trash2 className="h-4 w-4 mr-1" /> Clear
            </Button>
          </div>

          <Waveform active={status === "speaking"} />

          <div className="flex flex-wrap items-center gap-2">
            <div className="glass rounded-full px-3 py-1.5 flex items-center gap-2 text-xs">
              <Languages className="h-3.5 w-3.5 text-[color:var(--neon-blue)]" />
              <span className="text-muted-foreground">Detected:</span>
              <span className="font-semibold">{detection?.label ?? "—"}</span>
            </div>
            <div className="glass rounded-full px-3 py-1.5 flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Voice:</span>
              <span className="font-semibold truncate max-w-[200px]">
                {selectedVoice?.name
                  ? `${selectedVoice.name}${selectedVoice.lang ? ` · ${selectedVoice.lang}` : ""}`
                  : voices.length === 0
                    ? "Loading…"
                    : "No voice available"}
              </span>
              {fallbackUsed && (
                <span className="text-[10px] uppercase tracking-wider text-[color:var(--neon-purple)]">fallback</span>
              )}
            </div>
            <div className="glass rounded-full px-3 py-1.5 flex items-center gap-2 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-[color:var(--neon-purple)]" />
              <span className="text-muted-foreground">Vibe:</span>
              <span className="font-semibold">{vibe?.name ?? "None"}</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <SliderRow label="Speed" value={rate} min={0.5} max={2} step={0.1} onChange={setRate} suffix="x" />
            <SliderRow label="Pitch" value={pitch} min={0} max={2} step={0.1} onChange={setPitch} />
            <SliderRow label="Volume" value={volume} min={0} max={1} step={0.05} onChange={setVolume} icon={<Volume2 className="h-3.5 w-3.5" />} />
          </div>

          <div className="glass rounded-2xl p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Music2 className="h-4 w-4 text-[color:var(--neon-purple)]" />
              <span className="text-sm font-semibold">Cinematic music</span>
            </div>
            <Switch checked={musicOn} onCheckedChange={setMusicOn} />
            <div className="flex-1 min-w-[180px]">
              <SliderRow
                label="Music volume"
                value={musicVolume}
                min={0}
                max={0.2}
                step={0.005}
                onChange={setMusicVolume}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {status === "idle" && (
              <Button size="lg" className="btn-neon rounded-full px-8" onClick={handleSpeak} disabled={!text.trim()}>
                <Play className="h-5 w-5 mr-2" /> Speak
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
              <RotateCcw className="h-4 w-4 mr-2" /> Generate Again
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-6"
              onClick={handleDownload}
              disabled={!text.trim() || recording || status !== "idle"}
            >
              {recording ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {recording ? "Recording…" : "Download Audio"}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="rounded-full px-6"
              onClick={handleDownloadText}
              disabled={!text.trim()}
            >
              <Download className="h-4 w-4 mr-2" /> Download Text
            </Button>
          </div>
          <p className="text-center text-[11px] text-muted-foreground -mt-2">
            Tip: For audio download, choose <span className="font-semibold">"Chrome Tab"</span> and enable
            <span className="font-semibold"> "Share tab audio"</span> when prompted.
          </p>

          <div className="glass rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-[color:var(--neon-purple)]" />
              <span className="text-sm font-semibold">AI Voice (OpenAI gpt-audio)</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">natural · human-like</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {OPENAI_VOICES.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setAiVoice(v.id)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition ${
                    aiVoice === v.id
                      ? "bg-[color:var(--neon-purple)]/20 border-[color:var(--neon-purple)] text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="btn-neon rounded-full px-5"
                onClick={handleAiSpeak}
                disabled={!text.trim() || aiLoading}
              >
                {aiLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                {aiLoading ? "Generating…" : "Generate AI Voice"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full px-5"
                onClick={handleAiDownload}
                disabled={!aiAudioUrl}
              >
                <Download className="h-4 w-4 mr-2" /> Download AI Audio
              </Button>
            </div>
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          Voices are provided by your browser/OS. Quality and language availability vary.
        </p>
      </div>
    </main>
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
        <label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          {icon} {label}
        </label>
        <span className="text-sm font-mono text-foreground">{value.toFixed(2)}{suffix}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

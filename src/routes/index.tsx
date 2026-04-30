import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Play, Pause, Square, RotateCcw, Trash2, Sparkles, Volume2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSpeech } from "@/hooks/use-speech";
import { Waveform } from "@/components/Waveform";
import { VoiceLibrary, VOICE_PRESETS, pickVoiceForPreset } from "@/components/VoiceLibrary";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { voices, status, speak, pause, resume, stop } = useSpeech();
  const [text, setText] = useState("Welcome to VoxWave. Type anything and hear it spoken in seconds.");
  const [voiceURI, setVoiceURI] = useState<string>("");
  const [presetId, setPresetId] = useState<string | null>(null);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [highlight, setHighlight] = useState<{ start: number; len: number } | null>(null);

  const selectedVoice = useMemo(
    () => voices.find((v) => v.voiceURI === voiceURI) ?? voices[0] ?? null,
    [voices, voiceURI]
  );

  // Auto-select Ash preset once voices load
  useEffect(() => {
    if (!presetId && voices.length) {
      const ash = VOICE_PRESETS[0];
      const v = pickVoiceForPreset(ash, voices);
      if (v) {
        setPresetId(ash.id);
        setVoiceURI(v.voiceURI);
      }
    }
  }, [voices, presetId]);

  const handleSpeak = () => {
    if (!text.trim()) return;
    setHighlight(null);
    speak({
      text,
      voice: selectedVoice,
      rate,
      pitch,
      volume,
      onBoundary: (start, len) => setHighlight({ start, len }),
      onEnd: () => setHighlight(null),
    });
  };

  const handleStop = () => {
    stop();
    setHighlight(null);
  };

  const renderHighlighted = () => {
    if (!highlight || status !== "speaking") return text;
    const { start, len } = highlight;
    const end = start + (len || text.slice(start).split(/\s/)[0]?.length || 0);
    return (
      <>
        {text.slice(0, start)}
        <span className="highlight-word">{text.slice(start, end)}</span>
        {text.slice(end)}
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

        <VoiceLibrary
          voices={voices}
          activeId={presetId}
          onSelect={(p, v) => {
            setPresetId(p.id);
            if (v) setVoiceURI(v.voiceURI);
          }}
        />

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

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Voice</label>
              <Select value={selectedVoice?.voiceURI ?? ""} onValueChange={setVoiceURI}>
                <SelectTrigger className="bg-background/40">
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {voices.length === 0 && <SelectItem value="none" disabled>Loading voices…</SelectItem>}
                  {voices.map((v) => (
                    <SelectItem key={v.voiceURI} value={v.voiceURI}>
                      {v.name} — {v.lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <SliderRow label="Speed" value={rate} min={0.5} max={2} step={0.1} onChange={setRate} suffix="x" />
            <SliderRow label="Pitch" value={pitch} min={0} max={2} step={0.1} onChange={setPitch} />
            <SliderRow label="Volume" value={volume} min={0} max={1} step={0.05} onChange={setVolume} icon={<Volume2 className="h-3.5 w-3.5" />} />
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

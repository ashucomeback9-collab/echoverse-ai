import { Button } from "@/components/ui/button";
import { Check, Mic2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VoicePreset {
  id: string;
  name: string;
  description: string;
  tag: string;
  match: (v: SpeechSynthesisVoice) => number;
}

const englishOnly = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().startsWith("en");

const score = (v: SpeechSynthesisVoice, keywords: string[]) => {
  const n = `${v.name} ${v.voiceURI}`.toLowerCase();
  return keywords.reduce((s, k) => s + (n.includes(k) ? 1 : 0), 0);
};

export const VOICE_PRESETS: VoicePreset[] = [
  {
    id: "ash",
    name: "Ash",
    description: "Deep, confident, cinematic male voice — perfect for trailers and intros.",
    tag: "Male · Cinematic",
    match: (v) => (englishOnly(v) ? 1 : 0) + score(v, ["male", "daniel", "alex", "fred", "david", "google uk english male"]) * 2,
  },
  {
    id: "scenic",
    name: "Scenic",
    description: "Calm, warm storytelling voice — great for narration and audiobooks.",
    tag: "Neutral · Storyteller",
    match: (v) => (englishOnly(v) ? 1 : 0) + score(v, ["serena", "moira", "karen", "tessa", "google uk english female"]) * 2,
  },
  {
    id: "nova",
    name: "Nova",
    description: "Soft, friendly female voice — ideal for assistants and explainers.",
    tag: "Female · Soft",
    match: (v) => (englishOnly(v) ? 1 : 0) + score(v, ["female", "samantha", "victoria", "zira", "google us english"]) * 2,
  },
  {
    id: "blaze",
    name: "Blaze",
    description: "Energetic, youthful voice — punchy for ads, shorts, and reels.",
    tag: "Youth · Energetic",
    match: (v) => (englishOnly(v) ? 1 : 0) + score(v, ["junior", "kid", "child", "youth", "alex", "aaron"]) * 2,
  },
];

export function pickVoiceForPreset(
  preset: VoicePreset,
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  let best = voices[0];
  let bestScore = -1;
  for (const v of voices) {
    const s = preset.match(v);
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }
  return best;
}

interface Props {
  voices: SpeechSynthesisVoice[];
  activeId: string | null;
  onSelect: (preset: VoicePreset, voice: SpeechSynthesisVoice | null) => void;
}

export function VoiceLibrary({ voices, activeId, onSelect }: Props) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">
          Voice <span className="text-gradient">Library</span>
        </h2>
        <span className="text-xs text-muted-foreground">Curated presets · mapped to your browser voices</span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {VOICE_PRESETS.map((p) => {
          const mapped = pickVoiceForPreset(p, voices);
          const active = activeId === p.id;
          return (
            <div
              key={p.id}
              className={cn(
                "glass rounded-2xl p-5 flex flex-col gap-3 transition-all duration-300",
                active
                  ? "ring-2 ring-[color:var(--neon-purple)] -translate-y-1"
                  : "hover:-translate-y-1 hover:ring-1 hover:ring-[color:var(--neon-blue)]/40",
              )}
              style={active ? { boxShadow: "var(--shadow-neon)" } : undefined}
            >
              <div className="flex items-start justify-between">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-neon)" }}
                >
                  <Mic2 className="h-5 w-5 text-white" />
                </div>
                {active && (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[color:var(--neon-purple)]">
                    <Check className="h-3 w-3" /> Active
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{p.tag}</p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">{p.description}</p>
              <p className="text-[11px] text-muted-foreground/70 truncate">
                {mapped ? `→ ${mapped.name}` : "Loading browser voices…"}
              </p>
              <Button
                size="sm"
                className={cn("rounded-full mt-1", active ? "btn-neon" : "")}
                variant={active ? "default" : "secondary"}
                onClick={() => onSelect(p, mapped)}
                disabled={!mapped}
              >
                {active ? "Selected" : "Use Voice"}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
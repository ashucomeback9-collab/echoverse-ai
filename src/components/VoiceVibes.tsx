import { cn } from "@/lib/utils";
import { Drama, Heart, Mic, Skull, Trophy, CloudRain, BookOpen, Newspaper, Ghost, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface Vibe {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  rateMul: number;   // multiplier on user rate
  pitchMul: number;  // multiplier on user pitch
  pause: "none" | "short" | "medium" | "long" | "suspense";
}

export const VIBES: Vibe[] = [
  { id: "sincere",      name: "Sincere",      description: "Honest, grounded delivery.",                icon: Heart,      rateMul: 0.95, pitchMul: 0.98, pause: "short" },
  { id: "dramatic",     name: "Dramatic",     description: "Slower pace, deeper tone, weighty pauses.", icon: Drama,      rateMul: 0.8,  pitchMul: 0.85, pause: "long" },
  { id: "friendly",     name: "Friendly",     description: "Warm, upbeat, slightly higher pitch.",      icon: Sparkles,   rateMul: 1.05, pitchMul: 1.15, pause: "short" },
  { id: "true-crime",   name: "True Crime",   description: "Slow, deep, suspenseful pauses.",           icon: Skull,      rateMul: 0.78, pitchMul: 0.8,  pause: "suspense" },
  { id: "motivational", name: "Motivational", description: "Confident, energetic, uplifting.",          icon: Trophy,     rateMul: 1.1,  pitchMul: 1.1,  pause: "medium" },
  { id: "sad",          name: "Sad",          description: "Slow, soft, low pitch.",                    icon: CloudRain,  rateMul: 0.78, pitchMul: 0.85, pause: "long" },
  { id: "storytelling", name: "Storytelling", description: "Calm narration with natural beats.",        icon: BookOpen,   rateMul: 0.95, pitchMul: 1.0,  pause: "medium" },
  { id: "news-anchor",  name: "News Anchor",  description: "Crisp, even, professional cadence.",        icon: Newspaper,  rateMul: 1.0,  pitchMul: 1.0,  pause: "short" },
  { id: "horror",       name: "Horror",       description: "Whisper-slow, deep, eerie pauses.",         icon: Ghost,      rateMul: 0.7,  pitchMul: 0.75, pause: "suspense" },
];

const pauseToken: Record<Vibe["pause"], string> = {
  none: " ",
  short: " , ",
  medium: " … ",
  long: " … … ",
  suspense: " … … … ",
};

/** Insert pauses between sentences according to the vibe. */
export function applyVibeToText(text: string, vibe: Vibe | null): string {
  if (!vibe || vibe.pause === "none") return text;
  const token = pauseToken[vibe.pause];
  // Split on sentence terminators while keeping them
  return text.replace(/([.!?])\s+/g, `$1${token}`);
}

interface Props {
  activeId: string | null;
  onSelect: (vibe: Vibe | null) => void;
}

export function VoiceVibes({ activeId, onSelect }: Props) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold tracking-tight">
          Voice <span className="text-gradient">Vibes</span>
        </h2>
        <span className="text-xs text-muted-foreground">Mood presets · tweak rate, pitch & pauses</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {VIBES.map((v) => {
          const Icon = v.icon;
          const active = activeId === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelect(active ? null : v)}
              className={cn(
                "glass rounded-2xl p-4 text-left transition-all duration-300 group",
                active
                  ? "ring-2 ring-[color:var(--neon-purple)] -translate-y-1"
                  : "hover:-translate-y-1 hover:ring-1 hover:ring-[color:var(--neon-blue)]/40",
              )}
              style={active ? { boxShadow: "var(--shadow-neon)" } : undefined}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: active ? "var(--gradient-primary)" : "rgba(255,255,255,0.06)" }}
                >
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-sm font-semibold">{v.name}</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-snug">{v.description}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

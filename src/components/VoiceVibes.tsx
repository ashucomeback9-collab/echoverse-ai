import { cn } from "@/lib/utils";
import { Drama, Heart, Skull, Trophy, CloudRain, BookOpen, Newspaper, Ghost, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface Vibe {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  rate: number;   // absolute rate (0.1–2)
  pitch: number;  // absolute pitch (0–2)
  pause: number;  // ms pause between sentences
}

export const VIBES: Vibe[] = [
  { id: "sincere",      name: "Sincere",      description: "Honest, grounded delivery.",                icon: Heart,     rate: 0.85, pitch: 0.9,  pause: 300 },
  { id: "dramatic",     name: "Dramatic",     description: "Slower pace, deeper tone, weighty pauses.", icon: Drama,     rate: 0.7,  pitch: 0.8,  pause: 600 },
  { id: "friendly",     name: "Friendly",     description: "Warm, upbeat, slightly higher pitch.",      icon: Sparkles,  rate: 1.05, pitch: 1.2,  pause: 150 },
  { id: "true-crime",   name: "True Crime",   description: "Slow, deep, suspenseful pauses.",           icon: Skull,     rate: 0.65, pitch: 0.75, pause: 800 },
  { id: "motivational", name: "Motivational", description: "Confident, energetic, uplifting.",          icon: Trophy,    rate: 1.15, pitch: 1.1,  pause: 200 },
  { id: "sad",          name: "Sad",          description: "Slow, soft, low pitch.",                    icon: CloudRain, rate: 0.75, pitch: 0.7,  pause: 500 },
  { id: "storytelling", name: "Storytelling", description: "Calm narration with natural beats.",        icon: BookOpen,  rate: 0.9,  pitch: 1.0,  pause: 300 },
  { id: "news-anchor",  name: "News Anchor",  description: "Crisp, even, professional cadence.",        icon: Newspaper, rate: 1.0,  pitch: 0.95, pause: 100 },
  { id: "horror",       name: "Horror",       description: "Whisper-slow, deep, eerie pauses.",         icon: Ghost,     rate: 0.6,  pitch: 0.65, pause: 900 },
];

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

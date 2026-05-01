import { cn } from "@/lib/utils";
import { User, UserRound, Zap, Baby, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { LangDetection } from "@/lib/detect-language";

export interface Character {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  /** Multipliers applied on top of vibe/manual settings */
  rateMul: number;
  pitchMul: number;
  /** Keywords used to score browser voices */
  keywords: string[];
  /** Prefer voices whose name suggests this gender */
  prefer: "male" | "female" | "any";
}

export const CHARACTERS: Character[] = [
  {
    id: "man",
    name: "Man",
    description: "Deep, grounded male voice.",
    icon: User,
    rateMul: 0.95,
    pitchMul: 0.75,
    keywords: ["male", "man", "daniel", "alex", "fred", "david", "george", "ravi", "hemant"],
    prefer: "male",
  },
  {
    id: "woman",
    name: "Woman",
    description: "Soft, warm female voice.",
    icon: UserRound,
    rateMul: 1.0,
    pitchMul: 1.15,
    keywords: ["female", "woman", "samantha", "victoria", "zira", "serena", "karen", "lekha", "swara", "heera"],
    prefer: "female",
  },
  {
    id: "young",
    name: "Young",
    description: "Teen, energetic, upbeat.",
    icon: Zap,
    rateMul: 1.15,
    pitchMul: 1.25,
    keywords: ["junior", "young", "teen", "aaron", "alex"],
    prefer: "any",
  },
  {
    id: "child",
    name: "Child",
    description: "High pitch, fast, playful.",
    icon: Baby,
    rateMul: 1.2,
    pitchMul: 1.7,
    keywords: ["kid", "child", "junior"],
    prefer: "any",
  },
];

function scoreVoice(v: SpeechSynthesisVoice, c: Character, langPrefix: string) {
  const name = `${v.name} ${v.voiceURI}`.toLowerCase();
  const lang = (v.lang || "").toLowerCase();
  let s = 0;
  if (lang.startsWith(langPrefix)) s += 5;
  else if (lang.startsWith("en")) s += 1;
  for (const k of c.keywords) if (name.includes(k)) s += 2;
  if (c.prefer === "female" && /female|woman/.test(name)) s += 3;
  if (c.prefer === "male" && /male|man/.test(name) && !/female/.test(name)) s += 3;
  return s;
}

export function pickVoiceForCharacter(
  voices: SpeechSynthesisVoice[],
  character: Character,
  detection: LangDetection | null,
): SpeechSynthesisVoice | null {
  if (!voices?.length) return null;
  const langPrefix = (detection?.bcp47 ?? "en-US").toLowerCase().split("-")[0];
  let best = voices[0] ?? null;
  let bestScore = -Infinity;
  for (const v of voices) {
    if (!v) continue;
    const s = scoreVoice(v, character, langPrefix);
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }
  return best;
}

interface Props {
  voices: SpeechSynthesisVoice[];
  detection: LangDetection | null;
  activeId: string | null;
  onSelect: (character: Character | null) => void;
}

export function CharacterVoices({ voices, detection, activeId, onSelect }: Props) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold tracking-tight">
          Character <span className="text-gradient">Voices</span>
        </h2>
        <span className="text-xs text-muted-foreground">Auto-mapped to your browser voices</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {CHARACTERS.map((c) => {
          const Icon = c.icon;
          const active = activeId === c.id;
          const mapped = pickVoiceForCharacter(voices, c, detection);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(active ? null : c)}
              className={cn(
                "glass rounded-2xl p-4 text-left transition-all duration-300 flex flex-col gap-2",
                active
                  ? "ring-2 ring-[color:var(--neon-purple)] -translate-y-1"
                  : "hover:-translate-y-1 hover:ring-1 hover:ring-[color:var(--neon-blue)]/40",
              )}
              style={active ? { boxShadow: "var(--shadow-neon)" } : undefined}
            >
              <div className="flex items-center justify-between">
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center"
                  style={{ background: active ? "var(--gradient-primary)" : "rgba(255,255,255,0.06)" }}
                >
                  <Icon className="h-4 w-4 text-white" />
                </div>
                {active && (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[color:var(--neon-purple)]">
                    <Check className="h-3 w-3" /> Active
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold">{c.name}</h3>
              <p className="text-xs text-muted-foreground leading-snug">{c.description}</p>
              <p className="text-[11px] text-muted-foreground/70 truncate">
                {mapped?.name ? `→ ${mapped.name}` : voices.length === 0 ? "Loading voices…" : "No match"}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
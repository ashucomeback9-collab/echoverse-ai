import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechStatus = "idle" | "speaking" | "paused";

export interface SpeakOptions {
  text: string;
  voice: SpeechSynthesisVoice | null;
  rate: number;
  pitch: number;
  volume: number;
  /** Pause in ms between sentences. 0 = no chunking. */
  sentencePause?: number;
  /** Pause in ms after commas / soft punctuation. */
  commaPause?: number;
  /** Silent delay before first sentence (breathing in). */
  leadInDelay?: number;
  /** Silent delay after last sentence. */
  tailDelay?: number;
  /** Extra pause before long sentences (>120 chars) to mimic breath. */
  breathBeforeLong?: number;
  onBoundary?: (charIndex: number, charLength: number) => void;
  onEnd?: () => void;
}

export function useSpeech() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const cancelledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length) setVoices(v);
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const speak = useCallback((opts: SpeakOptions) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const safeText = (opts?.text ?? "").toString();
    if (!safeText.trim()) return;
    window.speechSynthesis.cancel();
    if (timerRef.current) clearTimeout(timerRef.current);
    cancelledRef.current = false;

    const pause = Math.max(0, opts.sentencePause ?? 0);
    const commaPause = Math.max(0, opts.commaPause ?? 0);
    const leadIn = Math.max(0, opts.leadInDelay ?? 0);
    const tail = Math.max(0, opts.tailDelay ?? 0);
    const breathLong = Math.max(0, opts.breathBeforeLong ?? 0);
    // Split into sentences while preserving terminators; track offsets for highlighting.
    const chunks: { text: string; offset: number }[] = [];
    if (pause > 0) {
      const re = /[^.!?]+[.!?]+\s*|[^.!?]+$/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(opts.text)) !== null) {
        const t = m[0];
        if (t.trim()) chunks.push({ text: t, offset: m.index });
      }
    }
    if (chunks.length === 0) chunks.push({ text: opts.text, offset: 0 });

    // Inject SSML-like comma pauses by padding commas with whitespace.
    // Most browser TTS engines lengthen the pause when commas are followed
    // by extra spaces, giving a softer, more human cadence.
    const commaSpacer = commaPause > 0 ? "   " : "";
    const withCommaPauses = (s: string) =>
      commaSpacer ? s.replace(/,\s*/g, `,${commaSpacer}`) : s;

    let i = 0;
    let started = false;

    const speakNext = () => {
      if (cancelledRef.current) return;
      if (i >= chunks.length) {
        timerRef.current = setTimeout(() => {
          setStatus("idle");
          opts.onEnd?.();
        }, tail);
        return;
      }
      const { text, offset } = chunks[i];
      const u = new SpeechSynthesisUtterance(withCommaPauses(text));
      if (opts.voice && typeof opts.voice === "object") {
        try {
          u.voice = opts.voice;
          if (opts.voice.lang) u.lang = opts.voice.lang;
        } catch {
          /* ignore voice assignment failures */
        }
      }
      u.rate = Math.max(0.1, Math.min(10, Number(opts.rate) || 1));
      u.pitch = Math.max(0, Math.min(2, Number(opts.pitch) || 1));
      u.volume = Math.max(0, Math.min(1, Number(opts.volume) ?? 1));
      u.onstart = () => {
        if (!started) {
          started = true;
          setStatus("speaking");
        }
      };
      u.onpause = () => setStatus("paused");
      u.onresume = () => setStatus("speaking");
      u.onerror = () => {
        if (!cancelledRef.current) {
          setStatus("idle");
          opts.onEnd?.();
        }
      };
      u.onboundary = (e) => {
        if (e.name === "word" || !e.name) {
          opts.onBoundary?.(offset + e.charIndex, e.charLength ?? 0);
        }
      };
      u.onend = () => {
        if (cancelledRef.current) return;
        i++;
        if (i >= chunks.length) {
          timerRef.current = setTimeout(() => {
            setStatus("idle");
            opts.onEnd?.();
          }, tail);
        } else {
          const next = chunks[i];
          const extra = next.text.length > 120 ? breathLong : 0;
          timerRef.current = setTimeout(speakNext, pause + extra);
        }
      };
      window.speechSynthesis.speak(u);
    };

    setStatus("speaking");
    if (leadIn > 0) {
      timerRef.current = setTimeout(speakNext, leadIn);
    } else {
      speakNext();
    }
  }, []);

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
    setStatus("paused");
  }, []);
  const resume = useCallback(() => {
    window.speechSynthesis.resume();
    setStatus("speaking");
  }, []);
  const stop = useCallback(() => {
    cancelledRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    window.speechSynthesis.cancel();
    setStatus("idle");
  }, []);

  return { voices, status, speak, pause, resume, stop };
}

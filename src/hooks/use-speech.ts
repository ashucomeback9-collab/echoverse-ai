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
    window.speechSynthesis.cancel();
    if (timerRef.current) clearTimeout(timerRef.current);
    cancelledRef.current = false;

    const pause = Math.max(0, opts.sentencePause ?? 0);
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

    let i = 0;
    let started = false;

    const speakNext = () => {
      if (cancelledRef.current) return;
      if (i >= chunks.length) {
        setStatus("idle");
        opts.onEnd?.();
        return;
      }
      const { text, offset } = chunks[i];
      const u = new SpeechSynthesisUtterance(text);
      if (opts.voice) {
        u.voice = opts.voice;
        u.lang = opts.voice.lang;
      }
      u.rate = opts.rate;
      u.pitch = opts.pitch;
      u.volume = opts.volume;
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
          setStatus("idle");
          opts.onEnd?.();
        } else {
          timerRef.current = setTimeout(speakNext, pause);
        }
      };
      window.speechSynthesis.speak(u);
    };

    setStatus("speaking");
    speakNext();
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

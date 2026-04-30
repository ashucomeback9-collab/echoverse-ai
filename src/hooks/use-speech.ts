import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechStatus = "idle" | "speaking" | "paused";

export interface SpeakOptions {
  text: string;
  voice: SpeechSynthesisVoice | null;
  rate: number;
  pitch: number;
  volume: number;
  onBoundary?: (charIndex: number, charLength: number) => void;
  onEnd?: () => void;
}

export function useSpeech() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

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
    };
  }, []);

  const speak = useCallback((opts: SpeakOptions) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(opts.text);
    if (opts.voice) {
      u.voice = opts.voice;
      u.lang = opts.voice.lang;
    }
    u.rate = opts.rate;
    u.pitch = opts.pitch;
    u.volume = opts.volume;
    u.onstart = () => setStatus("speaking");
    u.onpause = () => setStatus("paused");
    u.onresume = () => setStatus("speaking");
    u.onend = () => {
      setStatus("idle");
      opts.onEnd?.();
    };
    u.onerror = () => setStatus("idle");
    u.onboundary = (e) => {
      if (e.name === "word" || !e.name) {
        opts.onBoundary?.(e.charIndex, e.charLength ?? 0);
      }
    };
    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
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
    window.speechSynthesis.cancel();
    setStatus("idle");
  }, []);

  return { voices, status, speak, pause, resume, stop };
}
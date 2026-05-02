import { useCallback, useEffect, useRef } from "react";

/**
 * Procedural cinematic ambient pad using WebAudio.
 * No external assets — generates a soft layered drone that loops indefinitely
 * at a low volume to give speech a cinematic feel.
 */
export function useAmbientMusic() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const nodesRef = useRef<OscillatorNode[]>([]);
  const lfoRef = useRef<OscillatorNode | null>(null);

  const stop = useCallback(() => {
    try {
      nodesRef.current.forEach((o) => {
        try { o.stop(); } catch { /* noop */ }
        try { o.disconnect(); } catch { /* noop */ }
      });
      nodesRef.current = [];
      if (lfoRef.current) {
        try { lfoRef.current.stop(); } catch { /* noop */ }
        try { lfoRef.current.disconnect(); } catch { /* noop */ }
        lfoRef.current = null;
      }
      if (masterRef.current && ctxRef.current) {
        const now = ctxRef.current.currentTime;
        masterRef.current.gain.cancelScheduledValues(now);
        masterRef.current.gain.setTargetAtTime(0, now, 0.3);
      }
    } catch {
      /* noop */
    }
  }, []);

  const start = useCallback((volume = 0.06) => {
    if (typeof window === "undefined") return;
    try {
      stop();
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = ctxRef.current ?? new Ctx();
      ctxRef.current = ctx;
      if (ctx.state === "suspended") ctx.resume().catch(() => undefined);

      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      masterRef.current = master;

      // Soft lowpass for warmth
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 900;
      filter.Q.value = 0.7;
      filter.connect(master);

      // Layered sine drones — A minor-ish pad (A2, E3, C4, G4)
      const freqs = [110, 164.81, 261.63, 392.0];
      const oscs: OscillatorNode[] = [];
      freqs.forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = i === 0 ? "sine" : i === 3 ? "triangle" : "sine";
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.value = i === 0 ? 0.5 : 0.25;
        o.connect(g);
        g.connect(filter);
        o.start();
        oscs.push(o);
      });
      nodesRef.current = oscs;

      // Slow LFO on the filter cutoff for breathing motion
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.08;
      lfoGain.gain.value = 250;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();
      lfoRef.current = lfo;

      // Fade in
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(0, now);
      master.gain.linearRampToValueAtTime(Math.max(0, Math.min(0.2, volume)), now + 1.2);
    } catch {
      /* noop */
    }
  }, [stop]);

  const setVolume = useCallback((volume: number) => {
    const ctx = ctxRef.current;
    const m = masterRef.current;
    if (!ctx || !m) return;
    const now = ctx.currentTime;
    m.gain.cancelScheduledValues(now);
    m.gain.setTargetAtTime(Math.max(0, Math.min(0.2, volume)), now, 0.2);
  }, []);

  useEffect(() => {
    return () => {
      try {
        stop();
        ctxRef.current?.close().catch(() => undefined);
        ctxRef.current = null;
      } catch {
        /* noop */
      }
    };
  }, [stop]);

  return { start, stop, setVolume };
}
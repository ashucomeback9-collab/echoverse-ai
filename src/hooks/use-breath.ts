import { useCallback, useRef } from "react";

/**
 * Procedural inhale/breath sound using WebAudio filtered noise.
 * No external assets — generates a soft, natural inhale before speech.
 */
export function useBreath() {
  const ctxRef = useRef<AudioContext | null>(null);

  const inhale = useCallback(
    (intensity = 0.5, durationMs = 450): Promise<void> =>
      new Promise((resolve) => {
        if (typeof window === "undefined") return resolve();
        try {
          const Ctx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext })
              .webkitAudioContext;
          if (!Ctx) return resolve();
          const ctx = ctxRef.current ?? new Ctx();
          ctxRef.current = ctx;
          if (ctx.state === "suspended") ctx.resume().catch(() => undefined);

          const dur = Math.max(0.15, Math.min(1.5, durationMs / 1000));
          const amp = Math.max(0, Math.min(1, intensity)) * 0.18;

          // White-noise buffer
          const buffer = ctx.createBuffer(
            1,
            ctx.sampleRate * dur,
            ctx.sampleRate,
          );
          const data = buffer.getChannelData(0);
          for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

          const src = ctx.createBufferSource();
          src.buffer = buffer;

          // Bandpass filter for "breathy" character
          const bp = ctx.createBiquadFilter();
          bp.type = "bandpass";
          bp.frequency.value = 800;
          bp.Q.value = 0.6;

          // Highpass to remove rumble
          const hp = ctx.createBiquadFilter();
          hp.type = "highpass";
          hp.frequency.value = 300;

          const gain = ctx.createGain();
          gain.gain.value = 0;

          src.connect(hp);
          hp.connect(bp);
          bp.connect(gain);
          gain.connect(ctx.destination);

          const now = ctx.currentTime;
          // Inhale envelope: quick rise, longer decay (like sniff in)
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(amp, now + dur * 0.35);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
          // Sweep filter upward to simulate air rushing in
          bp.frequency.setValueAtTime(500, now);
          bp.frequency.linearRampToValueAtTime(1400, now + dur);

          src.start(now);
          src.stop(now + dur + 0.05);
          src.onended = () => resolve();
        } catch {
          resolve();
        }
      }),
    [],
  );

  return { inhale };
}

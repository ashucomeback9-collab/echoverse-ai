interface Props { active: boolean }
export function Waveform({ active }: Props) {
  const bars = Array.from({ length: 28 });
  return (
    <div className="flex items-center justify-center gap-1 h-16">
      {bars.map((_, i) => (
        <div
          key={i}
          className="w-1 rounded-full"
          style={{
            height: active ? `${20 + Math.random() * 80}%` : "20%",
            background: "var(--gradient-primary)",
            animation: active ? `wave ${0.6 + (i % 5) * 0.15}s ease-in-out ${i * 0.04}s infinite` : "none",
            opacity: active ? 1 : 0.3,
            transition: "opacity 0.3s",
          }}
        />
      ))}
    </div>
  );
}
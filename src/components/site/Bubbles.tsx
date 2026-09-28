import { useEffect, useState } from "react";

const GLYPHS = ["𓂀", "𓋹", "𓆣", "𓅓", "𓊽", "𓇳", "𓃭", "𓏏", "𓎛", "𓂋", "𓁹", "𓆓"];

type B = { left: number; size: number; delay: number; dur: number; g: string };

export function Bubbles({ count = 22 }: { count?: number }) {
  const [items, setItems] = useState<B[]>([]);
  useEffect(() => {
    setItems(
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        size: 36 + Math.random() * 60,
        delay: Math.random() * 14,
        dur: 14 + Math.random() * 14,
        g: GLYPHS[i % GLYPHS.length],
      })),
    );
  }, [count]);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {items.map((b, i) => (
        <span
          key={i}
          className="absolute bottom-[-120px] grid place-items-center rounded-full border border-primary/40 bg-primary/10 text-primary backdrop-blur-sm"
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: b.size,
            fontSize: b.size * 0.45,
            animation: `float-up ${b.dur}s linear ${b.delay}s infinite`,
          }}
        >
          {b.g}
        </span>
      ))}
    </div>
  );
}

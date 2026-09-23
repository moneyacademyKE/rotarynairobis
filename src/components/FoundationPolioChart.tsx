import { component$, useStylesScoped$ } from "@builder.io/qwik";
import { diagramStyles } from "../routes/foundation/styles";

/**
 * Wild poliovirus case collapse: 1988 vs 2024 vs 2025.
 * Linear scale — the 2024/25 bars are nearly invisible, which is the point.
 */
export default component$(() => {
  useStylesScoped$(diagramStyles);
  const bars = [
    { x: 140, h: 200, year: "1988", cases: "350,000" },
    { x: 400, h: 2, year: "2024", cases: "99" },
    { x: 660, h: 2, year: "2025", cases: "52" },
  ];
  const baseY = 252;

  return (
    <figure class="fd-diagram-wrap" role="img" aria-label="Bar chart of wild poliovirus cases per year: 350 thousand in 1988, 99 in 2024, 52 in 2025 — a 99.9 percent collapse. 2026: 22 cases through August.">
      <svg viewBox="0 0 920 300" class="fd-diagram" font-family="inherit">
        {bars.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={baseY - b.h} width="120" height={Math.max(b.h, 2)} rx="6" class={i === 0 ? "fd-bar fd-bar-start" : "fd-bar fd-bar-end"} />
            <text x={b.x + 60} y={baseY - b.h - 30} text-anchor="middle" class="fd-bar-cases">
              {b.cases}
            </text>
            <text x={b.x + 60} y={baseY - b.h - 10} text-anchor="middle" class="fd-box-sub">cases</text>
            <text x={b.x + 60} y={baseY + 28} text-anchor="middle" class="fd-bar-year">
              {b.year}
            </text>
          </g>
        ))}

        <line x1="60" y1={baseY + 1} x2="880" y2={baseY + 1} class="fd-ladder-base" />

        <text x="470" y="286" text-anchor="middle" class="fd-box-sub">
          2026: 22 cases through August — wild poliovirus now survives in only Afghanistan &amp; Pakistan
        </text>
      </svg>
      <figcaption class="fd-diagram-caption">
        Linear scale — the 2024 and 2025 bars are drawn at their true proportion: under 0.03% of 1988’s bar. That near-invisibility is the achievement.
      </figcaption>
    </figure>
  );
});

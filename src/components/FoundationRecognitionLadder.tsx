import { component$, useStylesScoped$ } from "@builder.io/qwik";
import { diagramStyles } from "../routes/foundation/styles";

/**
 * The donor recognition staircase: Paul Harris Fellow to Arch Klumph Society.
 */
export default component$(() => {
  useStylesScoped$(diagramStyles);
  const steps = [
    { x: 20, h: 92, amount: "$1,000", name: "Paul Harris Fellow" },
    { x: 192, h: 142, amount: "$10,000", name: "Major Donor" },
    { x: 364, h: 192, amount: "$250,000", name: "Arch Klumph Society" },
    { x: 536, h: 242, amount: "$1,000,000", name: "Foundation Circle" },
    { x: 708, h: 292, amount: "$10,000,000+", name: "Platinum Foundation Circle" },
  ];
  const baseY = 336;

  return (
    <figure class="fd-diagram-wrap" role="img" aria-label="Recognition ladder staircase: one thousand dollars Paul Harris Fellow, ten thousand dollars Major Donor, two hundred fifty thousand dollars Arch Klumph Society, one million dollars Foundation Circle, ten million dollars or more Platinum Foundation Circle. Parallel tracks: Paul Harris Society for annual giving and Bequest or Legacy Society for planned gifts.">
      <svg viewBox="0 0 920 420" class="fd-diagram" font-family="inherit">
        {steps.map((s, i) => (
          <g key={i}>
            <rect
              x={s.x}
              y={baseY - s.h}
              width="152"
              height={s.h}
              rx="8"
              class={i === steps.length - 1 ? "fd-step fd-step-top" : "fd-step"}
            />
            <text x={s.x + 76} y={baseY - s.h - 10} text-anchor="middle" class="fd-step-amount">
              {s.amount}
            </text>
            <text x={s.x + 76} y={baseY - 22} text-anchor="middle" class="fd-step-name">
              {s.name}
            </text>
            <text x={s.x + 76} y={baseY - 6} text-anchor="middle" class="fd-step-index">
              cumulative giving
            </text>
          </g>
        ))}

        {/* Baseline */}
        <line x1="8" y1={baseY + 1} x2="912" y2={baseY + 1} class="fd-ladder-base" />

        {/* Parallel tracks */}
        <rect x="20" y="352" width="420" height="52" rx="8" class="fd-box fd-box-note" />
        <text x="230" y="373" text-anchor="middle" class="fd-box-note-title">Paul Harris Society — parallel track</text>
        <text x="230" y="391" text-anchor="middle" class="fd-box-sub">$1,000+ every single year</text>

        <rect x="480" y="352" width="420" height="52" rx="8" class="fd-box fd-box-note" />
        <text x="690" y="373" text-anchor="middle" class="fd-box-note-title">Bequest &amp; Legacy Society — legacy track</text>
        <text x="690" y="391" text-anchor="middle" class="fd-box-sub">planned gifts from $10K to $1M+</text>
      </svg>
      <figcaption class="fd-diagram-caption">
        The ladder recognizes cumulative personal giving — recognition points (transferable, $1 per $1 given) can carry someone to PHF status, but only personal giving climbs above $10,000.
      </figcaption>
    </figure>
  );
});

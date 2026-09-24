import { component$, useStylesScoped$ } from "@builder.io/qwik";
import type { FoundationPageData } from "../domain/foundation-specs";
import FoundationPointsFlow from "./FoundationPointsFlow";
import { pointsStyles } from "../routes/foundation/section-styles";

/**
 * The recognition-points section internals: the flow diagram, what earns
 * points, the transfer rules, the strategic playbook, and club-level honors.
 * The section heading and intro render in the route; this is everything below.
 */
export default component$(({ points }: { points: FoundationPageData["points"] }) => {
  useStylesScoped$(pointsStyles);

  return (
    <div class="p-block">
      <FoundationPointsFlow />

      {/* What earns points */}
      <div class="p-earning-grid">
        {points.earning.map((e) => (
          <div key={e.label} class={`p-earning-card${e.label === "Endowment Fund" ? " p-earning-zero" : ""}`}>
            <span class="p-earning-label">{e.label}</span>
            <span class="p-earning-text">{e.text}</span>
          </div>
        ))}
      </div>

      <p class="p-note">{points.ownership}</p>

      {/* Transfer rules */}
      <ul class="p-rules">
        {points.transferRules.map((r, i) => <li key={i}>{r}</li>)}
      </ul>

      {/* The playbook */}
      <div class="p-strategy">
        <p class="p-strategy-title">{points.strategy.title}</p>
        <ul class="p-strategy-list">
          {points.strategy.items.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </div>

      <p class="p-recognition">{points.recognitionAmount}</p>

      {/* Club-level honors */}
      <div class="p-block">
        <h3 class="p-title">{points.clubRecognition.title}</h3>
        <div class="p-club-wrap">
          <table class="p-club-table">
            <thead>
              <tr><th>Honor</th><th>Requirement</th><th>Note</th></tr>
            </thead>
            <tbody>
              {points.clubRecognition.items.map((c) => (
                <tr key={c.name}>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.requirement}</td>
                  <td>{c.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

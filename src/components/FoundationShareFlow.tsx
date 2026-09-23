import { component$, useStylesScoped$ } from "@builder.io/qwik";
import { diagramStyles } from "../routes/foundation/styles";

/**
 * SHARE flow diagram: how a Rotarian's dollar becomes a community project.
 * Hand-rolled SVG — no chart library, styled with the site's design tokens.
 */
export default component$(() => {
  useStylesScoped$(diagramStyles);
  return (
    <figure class="fd-diagram-wrap" role="img" aria-label="Diagram of the Rotary Foundation SHARE system: Rotarians give to the Annual Fund, contributions are invested for three years, then split 50-50 between the World Fund and the District Designated Fund, which fund district grants, global grants, and programs that become community projects.">
      <svg viewBox="0 0 920 624" class="fd-diagram" font-family="inherit">
        <defs>
          <marker id="fd-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-primary)" />
          </marker>
        </defs>

        {/* Donors */}
        <rect x="330" y="14" width="260" height="58" rx="10" class="fd-box fd-box-donor" />
        <text x="460" y="38" text-anchor="middle" class="fd-box-title">Rotarians &amp; friends give</text>
        <text x="460" y="58" text-anchor="middle" class="fd-box-sub">452,255 donors in 2024–25</text>

        <line x1="460" y1="72" x2="460" y2="104" class="fd-arrow-line" marker-end="url(#fd-arrow)" />

        {/* Annual Fund-SHARE */}
        <rect x="330" y="106" width="260" height="64" rx="10" class="fd-box fd-box-share" />
        <text x="460" y="131" text-anchor="middle" class="fd-box-title">Annual Fund-SHARE</text>
        <text x="460" y="151" text-anchor="middle" class="fd-box-sub">invested for 3 years — earnings cover costs</text>

        {/* Split arrows */}
        <line x1="460" y1="170" x2="170" y2="224" class="fd-arrow-line" marker-end="url(#fd-arrow)" />
        <line x1="460" y1="170" x2="750" y2="224" class="fd-arrow-line" marker-end="url(#fd-arrow)" />
        <text x="280" y="196" class="fd-split-label">50%</text>
        <text x="628" y="196" class="fd-split-label">50%</text>

        {/* World Fund */}
        <rect x="40" y="226" width="260" height="64" rx="10" class="fd-box" />
        <text x="170" y="251" text-anchor="middle" class="fd-box-title">World Fund</text>
        <text x="170" y="271" text-anchor="middle" class="fd-box-sub">Trustees’ worldwide priorities</text>

        {/* DDF */}
        <rect x="620" y="226" width="260" height="64" rx="10" class="fd-box" />
        <text x="750" y="251" text-anchor="middle" class="fd-box-title">District Designated Fund</text>
        <text x="750" y="271" text-anchor="middle" class="fd-box-sub">the district directs its use</text>

        {/* Left column */}
        <line x1="170" y1="290" x2="170" y2="338" class="fd-arrow-line" marker-end="url(#fd-arrow)" />
        <rect x="40" y="340" width="260" height="76" rx="10" class="fd-box fd-box-grant" />
        <text x="170" y="364" text-anchor="middle" class="fd-box-title">Global Grant matching</text>
        <text x="170" y="383" text-anchor="middle" class="fd-box-sub">80% on DDF · 50% on cash</text>
        <text x="170" y="401" text-anchor="middle" class="fd-box-sub">$30K min · $400K max award</text>

        <line x1="170" y1="416" x2="170" y2="450" class="fd-arrow-line" marker-end="url(#fd-arrow)" />
        <rect x="40" y="452" width="260" height="64" rx="10" class="fd-box" />
        <text x="170" y="477" text-anchor="middle" class="fd-box-title">Programs</text>
        <text x="170" y="497" text-anchor="middle" class="fd-box-sub">Peace Centers · Programs of Scale · Disaster Response</text>

        {/* Right column */}
        <line x1="750" y1="290" x2="750" y2="338" class="fd-arrow-line" marker-end="url(#fd-arrow)" />
        <rect x="620" y="340" width="260" height="64" rx="10" class="fd-box fd-box-grant" />
        <text x="750" y="364" text-anchor="middle" class="fd-box-title">District Grants</text>
        <text x="750" y="384" text-anchor="middle" class="fd-box-sub">up to 50% of DDF — fast &amp; local</text>

        <line x1="750" y1="404" x2="750" y2="450" class="fd-arrow-line" marker-end="url(#fd-arrow)" />
        <rect x="620" y="452" width="260" height="64" rx="10" class="fd-box fd-box-grant" />
        <text x="750" y="477" text-anchor="middle" class="fd-box-title">DDF into Global Grants</text>
        <text x="750" y="497" text-anchor="middle" class="fd-box-sub">+ PolioPlus (50% match)</text>

        {/* Converge to projects */}
        <line x1="170" y1="516" x2="380" y2="560" class="fd-arrow-line" marker-end="url(#fd-arrow)" />
        <line x1="750" y1="516" x2="540" y2="560" class="fd-arrow-line" marker-end="url(#fd-arrow)" />
        <rect x="300" y="562" width="320" height="52" rx="10" class="fd-box fd-box-impact" />
        <text x="460" y="583" text-anchor="middle" class="fd-box-title">Community projects,</text>
        <text x="460" y="601" text-anchor="middle" class="fd-box-title">scholarships &amp; peace fellows</text>

        {/* Side notes */}
        <rect x="40" y="562" width="236" height="52" rx="10" class="fd-box fd-box-note" />
        <text x="158" y="583" text-anchor="middle" class="fd-box-note-title">Endowment Fund</text>
        <text x="158" y="601" text-anchor="middle" class="fd-box-sub">principal never spent</text>

        <rect x="644" y="562" width="236" height="52" rx="10" class="fd-box fd-box-note" />
        <text x="762" y="583" text-anchor="middle" class="fd-box-note-title">PolioPlus Fund</text>
        <text x="762" y="601" text-anchor="middle" class="fd-box-sub">Gates 2:1 match → GPEI</text>
      </svg>
      <figcaption class="fd-diagram-caption">
        The SHARE system: every Annual Fund-SHARE dollar splits 50/50 after a three-year investment — half to worldwide priorities, half to the district’s own designated fund.
      </figcaption>
    </figure>
  );
});

import { component$, useStylesScoped$ } from "@builder.io/qwik";
import { diagramStyles } from "../routes/foundation/styles";

/**
 * The recognition-points flow: dollars become points, points pool in three
 * gated accounts, and transfers mint new Paul Harris Fellows.
 */
export default component$(() => {
  useStylesScoped$(diagramStyles);

  const accounts = [
    { y: 20, title: "Individual account", sub: "only the donor can transfer" },
    { y: 116, title: "Club account", sub: "only the president can transfer" },
    { y: 212, title: "District account", sub: "only the governor can transfer" },
  ];

  return (
    <figure class="fd-diagram-wrap" role="img" aria-label="Recognition points flow: every dollar given to the Annual Fund, PolioPlus, the Disaster Response Fund or a global grant earns one point. Points pool in individual, club and district accounts; each can only be transferred by its authorized signer in blocks of one hundred points or more. Transferred points add to a recipient's recognition amount, which can make them a new Paul Harris Fellow at one thousand dollars. Points never count toward Major Donor or Arch Klumph Society recognition.">
      <svg viewBox="0 0 920 400" class="fd-diagram" font-family="inherit">
        {/* Left: dollars become points */}
        <rect x="20" y="30" width="190" height="72" rx="8" class="fd-box fd-box-donor" />
        <text x="115" y="58" text-anchor="middle" class="fd-box-title">Every $1 given</text>
        <text x="115" y="78" text-anchor="middle" class="fd-box-sub">Annual Fund · PolioPlus ·</text>
        <text x="115" y="92" text-anchor="middle" class="fd-box-sub">DRF · grant sponsorship</text>

        <line x1="115" y1="102" x2="115" y2="128" class="fd-arrow-line" />
        <polygon points="115,136 111,128 119,128" class="fd-arrow-line" fill="none" />

        <rect x="20" y="138" width="190" height="64" rx="8" class="fd-box fd-box-share" />
        <text x="115" y="163" text-anchor="middle" class="fd-split-label">1 recognition point</text>
        <text x="115" y="182" text-anchor="middle" class="fd-box-sub">earned per dollar</text>

        {/* Middle: three gated accounts */}
        {accounts.map((a, i) => (
          <g key={i}>
            <rect x="280" y={a.y} width="210" height="80" rx="8" class="fd-box" />
            <text x="385" y={a.y + 28} text-anchor="middle" class="fd-box-title">{a.title}</text>
            <text x="385" y={a.y + 48} text-anchor="middle" class="fd-box-sub">{a.sub}</text>
            <text x="385" y={a.y + 64} text-anchor="middle" class="fd-box-sub">signature required</text>
            {/* arrow from points box to account */}
            <line x1="210" y1="170" x2="272" y2={a.y + 40} class="fd-arrow-line" />
            <polygon points={`280,${a.y + 40} 272,${a.y + 36} 272,${a.y + 44}`} fill="var(--accent-primary)" />
            {/* arrow from account to PHF box */}
            <line x1="490" y1={a.y + 40} x2="582" y2="96" class="fd-arrow-line" />
            <polygon points="590,96 582,92 582,100" fill="var(--accent-primary)" />
          </g>
        ))}

        {/* Transfer rule note */}
        <rect x="280" y="308" width="210" height="56" rx="8" class="fd-box fd-box-note" />
        <text x="385" y="330" text-anchor="middle" class="fd-box-note-title">min 100 points per transfer</text>
        <text x="385" y="348" text-anchor="middle" class="fd-box-sub">signed Recognition and</text>
        <text x="385" y="360" text-anchor="middle" class="fd-box-sub">Transfer Request form</text>

        {/* Right: the PHF mint */}
        <rect x="590" y="30" width="310" height="132" rx="8" class="fd-box fd-box-impact" />
        <text x="745" y="60" text-anchor="middle" class="fd-box-title">New Paul Harris Fellow</text>
        <text x="745" y="88" text-anchor="middle" class="fd-step-amount">$1,000 recognition</text>
        <text x="745" y="112" text-anchor="middle" class="fd-box-sub">recognition amount =</text>
        <text x="745" y="128" text-anchor="middle" class="fd-box-sub">personal giving + points received</text>
        <text x="745" y="148" text-anchor="middle" class="fd-box-sub">certificate and the iconic pin</text>

        {/* The never path */}
        <rect x="590" y="182" width="310" height="86" rx="8" class="fd-box fd-box-note" />
        <text x="745" y="210" text-anchor="middle" class="fd-box-note-title">✕  Major Donor · Arch Klumph Society</text>
        <text x="745" y="230" text-anchor="middle" class="fd-box-sub">points never count toward these —</text>
        <text x="745" y="246" text-anchor="middle" class="fd-box-sub">only personal outright giving climbs</text>
        <text x="745" y="262" text-anchor="middle" class="fd-box-sub">the ladder above $10,000</text>

        {/* Worked example */}
        <rect x="590" y="286" width="310" height="78" rx="8" class="fd-box fd-box-grant" />
        <text x="745" y="310" text-anchor="middle" class="fd-box-note-title">The club playbook</text>
        <text x="745" y="328" text-anchor="middle" class="fd-box-sub">transfer 1,000 points to a member</text>
        <text x="745" y="344" text-anchor="middle" class="fd-box-sub">who has given $500 outright —</text>
        <text x="745" y="358" text-anchor="middle" class="fd-box-sub">and a new PHF is minted</text>
      </svg>
      <figcaption class="fd-diagram-caption">
        Points flow one way — to individuals, never from a person to a club or district. They can carry a member all the way to Multiple PHF (sapphires and rubies), but the Major Donor and AKS tiers stay reserved for personal giving alone.
      </figcaption>
    </figure>
  );
});

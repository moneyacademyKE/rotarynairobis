import { component$, useStylesScoped$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { parseFoundationPageData, parseFoundationImpactData } from "../../domain/foundation-specs";
import rawData from "../../data/foundation.json";
import impactData from "../../data/foundation-impact.json";
import ShareFlowDiagram from "../../components/FoundationShareFlow";
import RecognitionLadder from "../../components/FoundationRecognitionLadder";
import PolioImpactChart from "../../components/FoundationPolioChart";
import { pageStyles } from "./styles";

export const useFoundation = routeLoader$(() => parseFoundationPageData(rawData));
export const useFoundationImpact = routeLoader$(() => parseFoundationImpactData(impactData));

export default component$(() => {
  const data = useFoundation().value;
  const impact = useFoundationImpact().value;
  useStylesScoped$(pageStyles);

  return (
    <div class="foundation-page">
      {/* 1. Hero */}
      <section class="fd-hero">
        <h1 class="fd-hero-title">{data.pageTitle}</h1>
        <p class="fd-hero-sub">{data.pageSubtitle}</p>
      </section>

      {/* 2. At a glance */}
      <section class="fd-stats-grid" aria-label="The Foundation at a glance">
        {data.stats.map((s) => (
          <div key={s.label} class="fd-stat-card">
            <span class="fd-stat-value">{s.value}</span>
            <span class="fd-stat-label">{s.label}</span>
            <span class="fd-stat-detail">{s.detail}</span>
          </div>
        ))}
      </section>

      {/* 3. Origins */}
      <section class="fd-section">
        <h2 class="fd-section-title">{data.origin.title}</h2>
        <p class="fd-section-intro">{data.origin.intro}</p>
        <div class="fd-origin-list">
          {data.origin.timeline.map((t) => (
            <div key={t.year + t.title} class="fd-origin-item">
              <span class="fd-origin-year">{t.year}</span>
              <span class="fd-origin-title">{t.title}</span>
              <span class="fd-origin-text">{t.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Areas of focus pointer */}
      <section class="fd-areas-note">
        <h2 class="fd-section-title">{data.areasNote.title}</h2>
        <p>{data.areasNote.text}</p>
        <p>
          <a href={data.areasNote.link} class="fd-areas-link">Explore the seven areas of focus →</a>
        </p>
      </section>

      {/* 5. Mechanism */}
      <section class="fd-section">
        <h2 class="fd-section-title">{data.mechanism.title}</h2>
        <p class="fd-section-intro">{data.mechanism.intro}</p>
        <ShareFlowDiagram />
        <div class="fd-steps">
          {data.mechanism.steps.map((s) => (
            <div key={s.step} class="fd-step-card">
              <span class="fd-step-num">{s.step}</span>
              <span class="fd-step-heading">{s.title}</span>
              <span class="fd-step-text">{s.text}</span>
            </div>
          ))}
        </div>
        <div class="fd-funds-grid">
          {data.mechanism.funds.map((f) => (
            <div key={f.name} class="fd-fund-card">
              <span class="fd-fund-name">{f.name}</span>
              <span class="fd-fund-role">{f.role}</span>
              <span class="fd-fund-fy">{f.fy}</span>
              <span class="fd-fund-all">{f.allTime}</span>
              <span class="fd-fund-note">{f.note}</span>
            </div>
          ))}
        </div>
        <div class="fd-table-wrap">
          <table class="fd-table">
            <thead>
              <tr><th>Grant type</th><th>Size</th><th>Match</th><th>What it funds</th></tr>
            </thead>
            <tbody>
              {data.mechanism.grantTypes.map((g) => (
                <tr key={g.name}>
                  <td><strong>{g.name}</strong></td>
                  <td>{g.size}</td>
                  <td>{g.match}</td>
                  <td>{g.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p class="fd-example">{data.mechanism.shareExample}</p>
      </section>

      {/* 6. Recognition ladder */}
      <section class="fd-section">
        <h2 class="fd-section-title">{data.recognition.title}</h2>
        <p class="fd-section-intro">{data.recognition.intro}</p>
        <RecognitionLadder />
        <div class="fd-table-wrap">
          <table class="fd-table">
            <thead>
              <tr><th>Cumulative giving</th><th>Recognition</th></tr>
            </thead>
            <tbody>
              {data.recognition.phfRows.map((r) => (
                <tr key={r.amount}>
                  <td><strong>{r.amount}</strong></td>
                  <td>{r.recognition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p class="fd-note">{data.recognition.phfNote}</p>
        <div class="fd-societies-grid">
          {data.recognition.societies.map((s) => (
            <div key={s.name} class="fd-society-card">
              <span class="fd-society-name">{s.name}</span>
              <span class="fd-society-req">{s.requirement}</span>
              <span class="fd-society-note">{s.note}</span>
            </div>
          ))}
        </div>
        <div class="fd-table-wrap">
          <table class="fd-table">
            <thead>
              <tr><th>Arch Klumph Society circle</th><th>Lifetime giving</th></tr>
            </thead>
            <tbody>
              {data.recognition.aksCircles.map((c) => (
                <tr key={c.circle}>
                  <td><strong>{c.circle}</strong></td>
                  <td>{c.range}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p class="fd-note">{data.recognition.aksNote}</p>
      </section>

      {/* 7. Polio */}
      <section class="fd-section">
        <h2 class="fd-section-title">{impact.polio.title}</h2>
        <p class="fd-section-intro">{impact.polio.intro}</p>
        <PolioImpactChart />
        <div class="fd-numbers-grid">
          {impact.polio.numbers.map((n) => (
            <div key={n.label} class="fd-number-card">
              <span class="fd-number-label">{n.label}</span>
              <span class="fd-number-value">{n.value}</span>
            </div>
          ))}
        </div>
        <h3 class="fd-section-title">{impact.polio.kenyaTitle}</h3>
        <ul class="fd-kenya-list">
          {impact.polio.kenya.map((k, i) => <li key={i}>{k}</li>)}
        </ul>
      </section>

      {/* 8. Funders */}
      <section class="fd-section">
        <h2 class="fd-section-title">{impact.funders.title}</h2>
        <p class="fd-section-intro">{impact.funders.globalIntro}</p>
        <div class="fd-table-wrap">
          <table class="fd-table">
            <thead>
              <tr><th>#</th><th>Country</th><th>Total contributions</th><th>Annual Fund per Rotarian</th></tr>
            </thead>
            <tbody>
              {impact.funders.topCountries.map((c) => (
                <tr key={c.country}>
                  <td>{c.rank}</td>
                  <td><strong>{c.country}</strong></td>
                  <td>{c.total}</td>
                  <td>{c.perCapita}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p class="fd-note">{impact.funders.countriesNote}</p>
        <div class="fd-gates-card">
          <h3>{impact.funders.gates.title}</h3>
          <p>{impact.funders.gates.text}</p>
        </div>
        <div class="fd-gates-card">
          <h3>{impact.funders.donorBase.title}</h3>
          <p>{impact.funders.donorBase.text}</p>
        </div>
        <h3 class="fd-section-title">{impact.funders.districtTitle}</h3>
        <p class="fd-section-intro">{impact.funders.districtIntro}</p>
        <div class="fd-societies-grid">
          {impact.funders.districtNamed.map((d) => (
            <div key={d.name} class="fd-named-card">
              <span class="fd-named-name">{d.name}</span>
              <p class="fd-named-detail">{d.detail}</p>
            </div>
          ))}
        </div>
        <ul class="fd-agg-list">
          {impact.funders.districtAggregate.map((a, i) => <li key={i}>{a}</li>)}
        </ul>
      </section>

      {/* 9. Global achievements */}
      <section class="fd-section">
        <h2 class="fd-section-title">Top 15 achievements — worldwide</h2>
        <p class="fd-section-intro">From a $26.50 seed to the brink of eradicating a human disease.</p>
        <div class="fd-ach-list">
          {impact.achievementsGlobal.map((a, i) => (
            <div key={a.title} class="fd-ach-item">
              <span class="fd-ach-rank">{i + 1}</span>
              <div>
                <span class="fd-ach-title">{a.title}</span>
                <span class="fd-ach-year">{a.year}</span>
                <p class="fd-ach-detail">{a.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 10. District achievements */}
      <section class="fd-section">
        <h2 class="fd-section-title">Top 15 achievements — District 9212 &amp; Kenya</h2>
        <p class="fd-section-intro">Thirteen years, four countries, 267 clubs — and a club from Nairobi South in the story from the start.</p>
        <div class="fd-ach-list">
          {impact.achievementsDistrict.map((a, i) => (
            <div key={a.title} class="fd-ach-item">
              <span class="fd-ach-rank">{i + 1}</span>
              <div>
                <span class="fd-ach-title">{a.title}</span>
                <span class="fd-ach-year">{a.year}</span>
                <p class="fd-ach-detail">{a.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 11. Our club */}
      <section class="fd-club-callout">
        <h3>{impact.club.title}</h3>
        <p>{impact.club.intro}</p>
        <ul class="fd-club-list">
          {impact.club.items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </section>

      {/* 12. Sources */}
      <section class="fd-section">
        <h2 class="fd-section-title">{impact.sources.title}</h2>
        <p class="fd-note">{impact.sources.intro}</p>
        <ul class="fd-sources-list">
          {impact.sources.items.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
});

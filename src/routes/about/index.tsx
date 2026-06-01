import { component$, useSignal, useStylesScoped$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { parseAboutPageData, type AboutPageData } from "../../domain/about-specs";
import rawData from "../../data/rotary-basics.json";

// routeLoader$ to safely load and validate the static JSON ledger
export const useAboutData = routeLoader$((): AboutPageData => {
  return parseAboutPageData(rawData);
});

export default component$(() => {
  const data = useAboutData().value;
  const searchGlossary = useSignal("");
  const activeAvenue = useSignal("club");
  const openGlossaryTerm = useSignal<string | null>(null);

  useStylesScoped$(STYLES);

  // Filter glossary items based on real-time user search input
  const filteredGlossary = data.glossary.filter((item) =>
    item.term.toLowerCase().includes(searchGlossary.value.toLowerCase()) ||
    item.definition.toLowerCase().includes(searchGlossary.value.toLowerCase())
  );

  return (
    <div class="about-page">
      {/* 1. Hero Section */}
      <section class="about-hero">
        <span class="kicker">Rotary International</span>
        <h1 class="main-title gold-glow">{data.welcomeTitle}</h1>
        <p class="welcome-text">{data.welcomeMessage}</p>
        <div class="quote-card">
          <p class="quote-text">
            "Every Rotary club in the world, no matter how big or small, has one thing in common: friendship. And it’s from this base of friendship that we serve our community."
          </p>
          <span class="quote-author">— Kemal Attilâ, Rotary Club of Ankara-Tandogan, Turkey</span>
        </div>
      </section>

      {/* 2. Rotary by the Numbers Grid */}
      <section class="numbers-section">
        <h2 class="section-title">Rotary by the Numbers</h2>
        <div class="numbers-grid">
          <div class="number-card">
            <span class="num-value">{data.numbers.membersCount}</span>
            <span class="num-label">Rotarians Worldwide</span>
          </div>
          <div class="number-card">
            <span class="num-value">{data.numbers.clubsCount}</span>
            <span class="num-label">Rotary Clubs</span>
          </div>
          <div class="number-card">
            <span class="num-value">{data.numbers.interactCount}</span>
            <span class="num-label">Interact Clubs</span>
          </div>
          <div class="number-card">
            <span class="num-value">{data.numbers.rotaractCount}</span>
            <span class="num-label">Rotaract Clubs</span>
          </div>
          <div class="number-card">
            <span class="num-value">{data.numbers.rccCount}</span>
            <span class="num-label">Rotary Community Corps</span>
          </div>
          <div class="number-card">
            <span class="num-value">{data.numbers.districtsCount}</span>
            <span class="num-label">Districts</span>
          </div>
          <div class="number-card">
            <span class="num-value">{data.numbers.zonesCount}</span>
            <span class="num-label">Zones</span>
          </div>
        </div>
      </section>

      {/* 3. The Four-Way Test */}
      <section class="four-way-section">
        <div class="section-header-centered">
          <span class="kicker-centered">Our Ethical Compass</span>
          <h2 class="section-title-centered">{data.fourWayTestTitle}</h2>
          <p class="section-intro-centered">{data.fourWayTestIntro}</p>
        </div>
        <div class="four-way-grid">
          {data.fourWayTest.map((item) => (
            <div key={item.id} class="four-way-card">
              <div class="four-way-num">0{item.id}</div>
              <h3 class="four-way-question">{item.question}</h3>
              <p class="four-way-desc">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Avenues of Service (Interactive Tabbed Layout) */}
      <section class="avenues-section">
        <div class="section-header-centered">
          <span class="kicker-centered">How We Serve</span>
          <h2 class="section-title-centered">{data.avenuesOfServiceTitle}</h2>
          <p class="section-intro-centered">{data.avenuesOfServiceIntro}</p>
        </div>

        <div class="avenues-tabs-container">
          <div class="avenues-pills">
            {data.avenuesOfService.map((ave) => (
              <button
                key={ave.id}
                class={["avenue-pill", activeAvenue.value === ave.id ? "active" : ""]}
                onClick$={() => { activeAvenue.value = ave.id; }}
              >
                <span class="avenue-icon">{ave.icon}</span>
                <span class="avenue-pill-title">{ave.title}</span>
              </button>
            ))}
          </div>

          <div class="avenue-content-box">
            {data.avenuesOfService.map((ave) => {
              if (activeAvenue.value !== ave.id) return null;
              return (
                <div key={ave.id} class="avenue-active-details animate-fade-in">
                  <div class="avenue-details-header">
                    <span class="avenue-details-icon">{ave.icon}</span>
                    <h3 class="avenue-details-title">{ave.title}</h3>
                  </div>
                  <p class="avenue-details-desc">{ave.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Areas of Focus */}
      <section class="focus-section">
        <div class="section-header-centered">
          <span class="kicker-centered">Global Impact</span>
          <h2 class="section-title-centered">{data.areasOfFocusTitle}</h2>
          <p class="section-intro-centered">
            Rotary directs our service in six key areas of focus to address humanity's most pressing challenges.
          </p>
        </div>
        <div class="focus-grid">
          {data.areasOfFocus.map((focus) => (
            <div key={focus.id} class="focus-card">
              <div class="focus-icon-wrap">
                <span class="focus-icon">{focus.icon}</span>
              </div>
              <h3 class="focus-card-title">{focus.title}</h3>
              <p class="focus-card-desc">{focus.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. The Rotary Foundation & Polio Eradication */}
      <section class="impact-split-section">
        <div class="impact-column">
          <div class="impact-header">
            <span class="impact-badge">Philanthropic Arm</span>
            <h2 class="impact-title">The Rotary Foundation</h2>
          </div>
          <p class="impact-desc">{data.foundationFacts.description}</p>
          <div class="impact-stat-panel">
            <div class="stat-item">
              <span class="stat-num">{data.foundationFacts.totalContributed}</span>
              <span class="stat-label">Contributed Since 1947</span>
            </div>
            <div class="stat-item">
              <span class="stat-num">{data.foundationFacts.peaceFellowsCount}</span>
              <span class="stat-label">Peace Fellows Hosted</span>
            </div>
            <div class="stat-item">
              <span class="stat-num">{data.foundationFacts.peaceFellowsCost}</span>
              <span class="stat-label">Fellowship Grants Distributed</span>
            </div>
          </div>
        </div>

        <div class="impact-column">
          <div class="impact-header">
            <span class="impact-badge alert">Top Priority</span>
            <h2 class="impact-title">Polio Eradication</h2>
          </div>
          <p class="impact-desc">
            As a spearheading partner in the Global Polio Eradication Initiative, Rotary's efforts have dropped case counts by 99% worldwide since 1988, protecting millions of children.
          </p>
          <div class="polio-progress-card">
            <div class="polio-meter-row">
              <span class="polio-meter-label">Polio Cases Eradicated</span>
              <span class="polio-meter-value">{data.polioEradication.casesDroppedPercentage}</span>
            </div>
            <div class="polio-progress-bar">
              <div class="polio-progress-fill" style={{ width: data.polioEradication.casesDroppedPercentage }} />
            </div>
            <div class="polio-challenge-row">
              <div class="challenge-item">
                <span class="challenge-value">{data.polioEradication.challengeGoal}</span>
                <span class="challenge-label">Rotary Match Goal</span>
              </div>
              <div class="challenge-item">
                <span class="challenge-value">{data.polioEradication.gatesFoundationGrant}</span>
                <span class="challenge-label">Gates Foundation Grant</span>
              </div>
            </div>
          </div>
          <div class="partners-box">
            <span class="partners-title">GPEI Partners:</span>
            <div class="partners-list">
              {data.polioEradication.partners.map((partner, index) => (
                <span key={index} class="partner-badge">{partner}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 7. Interactive Rotary Glossary */}
      <section class="glossary-section">
        <h2 class="section-title">{data.glossaryTitle}</h2>
        <div class="glossary-controls">
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search terms and definitions..."
              class="search-field"
              value={searchGlossary.value}
              onInput$={(e) => { searchGlossary.value = (e.target as HTMLInputElement).value; }}
            />
          </div>
        </div>

        <div class="glossary-grid">
          {filteredGlossary.length === 0 ? (
            <div class="glossary-empty">
              No glossary terms match your search. Try "Interact", "RYLA", or "Foundation".
            </div>
          ) : (
            filteredGlossary.map((item, index) => {
              const isOpen = openGlossaryTerm.value === item.term;
              return (
                <div key={index} class={["glossary-card", isOpen ? "glossary-card--open" : "", item.insight ? "glossary-card--expandable" : ""].filter(Boolean).join(" ")}>
                  <button
                    class="glossary-card-header"
                    onClick$={() => {
                      openGlossaryTerm.value = isOpen ? null : item.term;
                    }}
                    aria-expanded={isOpen}
                  >
                    <div class="glossary-header-left">
                      {item.icon && <span class="glossary-icon">{item.icon}</span>}
                      <div>
                        <h3 class="glossary-term">{item.term}</h3>
                        <p class="glossary-definition">{item.definition}</p>
                      </div>
                    </div>
                    {item.insight && (
                      <span class="glossary-chevron" aria-hidden="true">{isOpen ? "▲" : "▼"}</span>
                    )}
                  </button>

                  {item.insight && (
                    <div class={["glossary-drawer", isOpen ? "glossary-drawer--open" : ""].join(" ")} aria-hidden={!isOpen}>
                      <div class="drawer-inner">
                        {/* Overview */}
                        <div class="drawer-section">
                          <p class="drawer-overview">{item.insight.overview}</p>
                        </div>

                        {/* Key Facts */}
                        <div class="drawer-section">
                          <h4 class="drawer-section-title">📋 Key Facts</h4>
                          <ul class="drawer-facts-list">
                            {item.insight.keyFacts.map((fact, fi) => (
                              <li key={fi} class="drawer-fact-item">{fact}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Why It Matters */}
                        <div class="drawer-section drawer-section--highlight">
                          <h4 class="drawer-section-title">💡 Why It Matters</h4>
                          <p class="drawer-body">{item.insight.whyItMatters}</p>
                        </div>

                        {/* District Connection */}
                        <div class="drawer-section">
                          <h4 class="drawer-section-title">🌍 District 9212 Connection</h4>
                          <p class="drawer-body">{item.insight.districtConnection}</p>
                        </div>

                        {/* Pro Tip */}
                        <div class="drawer-section drawer-section--tip">
                          <h4 class="drawer-section-title">⭐ Pro Tip</h4>
                          <p class="drawer-body">{item.insight.tip}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
});

const STYLES = `
.about-page {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 var(--space-md) var(--space-lg) var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  animation: page-in 0.6s var(--ease-out-expo) both;
}

@keyframes page-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.kicker {
  font-family: var(--font-serif);
  font-size: var(--font-size-base);
  font-style: italic;
  color: var(--accent-primary);
  display: block;
  margin-bottom: var(--space-xs);
}

.main-title {
  font-family: var(--font-serif);
  font-size: clamp(2.5rem, 5vw + 1rem, 4.5rem);
  font-weight: 400;
  line-height: 1.05;
  letter-spacing: -0.04em;
  margin: 0 0 var(--space-md) 0;
  color: var(--text-primary);
}

.gold-glow {
  text-shadow: 0 0 40px oklch(76% 0.11 70 / 0.25);
}

.welcome-text {
  font-size: var(--font-size-base);
  color: var(--text-secondary);
  line-height: 1.6;
  max-width: 75ch;
  margin-bottom: var(--space-md);
  font-weight: 300;
}

.quote-card {
  background-color: var(--bg-panel);
  border-left: 3px solid var(--accent-primary);
  padding: var(--space-md);
  border-radius: 0 16px 16px 0;
  max-width: 80ch;
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-subtle);
  border-left-width: 3px;
  border-left-color: var(--accent-primary);
}

.quote-text {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: var(--font-size-lg);
  color: var(--text-primary);
  line-height: 1.4;
  margin: 0 0 var(--space-xs) 0;
}

.quote-author {
  font-size: var(--font-size-xs);
  color: var(--accent-primary);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* Numbers section */
.numbers-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.section-title {
  font-family: var(--font-serif);
  font-size: var(--font-size-xl);
  color: var(--text-primary);
  margin: 0;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: var(--space-xs);
}

.numbers-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-sm);
}

@media (min-width: 640px) {
  .numbers-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 1024px) {
  .numbers-grid {
    grid-template-columns: repeat(7, 1fr);
  }
}

.number-card {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: var(--space-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  justify-content: center;
  transition: transform var(--transition-fast), border-color var(--transition-fast);
}

.number-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent-primary);
  box-shadow: 0 4px 12px var(--accent-glow);
}

.num-value {
  font-family: var(--font-serif);
  font-size: var(--font-size-xl);
  color: var(--accent-primary);
  font-weight: 500;
  line-height: 1;
  margin-bottom: 4px;
}

.num-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.05em;
}

/* Centralized headers */
.section-header-centered {
  text-align: center;
  max-width: 70ch;
  margin: 0 auto var(--space-md) auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.kicker-centered {
  font-family: var(--font-serif);
  font-size: var(--font-size-base);
  font-style: italic;
  color: var(--accent-primary);
  margin-bottom: 4px;
}

.section-title-centered {
  font-family: var(--font-serif);
  font-size: var(--font-size-xl);
  color: var(--text-primary);
  margin: 0 0 var(--space-xs) 0;
  line-height: 1.1;
}

.section-intro-centered {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

/* Four Way Test Grid */
.four-way-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-md);
}

@media (min-width: 768px) {
  .four-way-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.four-way-card {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: var(--space-md);
  position: relative;
  overflow: hidden;
  transition: transform var(--transition-smooth), border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.four-way-card:hover {
  transform: translateY(-4px) scale(1.01);
  border-color: var(--accent-primary);
  box-shadow: 0 12px 30px rgba(0, 103, 200, 0.4);
}

.four-way-num {
  position: absolute;
  top: -10px;
  right: -5px;
  font-family: var(--font-serif);
  font-size: 7rem;
  color: oklch(76% 0.11 70 / 0.05);
  font-weight: 900;
  line-height: 1;
  pointer-events: none;
  user-select: none;
}

.four-way-question {
  font-family: var(--font-sans);
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--accent-primary);
  margin: 0 0 var(--space-xs) 0;
  line-height: 1.3;
}

.four-way-desc {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

/* Avenues of Service */
.avenues-tabs-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  max-width: 900px;
  margin: 0 auto;
}

.avenues-pills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  justify-content: center;
}

.avenue-pill {
  background: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  padding: var(--space-xs) var(--space-sm);
  border-radius: 9999px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}

.avenue-pill:hover {
  border-color: var(--text-muted);
  color: var(--text-primary);
}

.avenue-pill.active {
  background-color: var(--accent-primary);
  color: var(--bg-obsidian);
  border-color: var(--accent-primary);
  font-weight: 600;
}

.avenue-pill:active {
  transform: scale(0.95);
}

.avenue-content-box {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: var(--space-md);
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(12px);
}

.avenue-active-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  text-align: center;
  width: 100%;
}

.avenue-details-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.avenue-details-icon {
  font-size: 2.2rem;
}

.avenue-details-title {
  font-family: var(--font-serif);
  font-size: var(--font-size-lg);
  color: var(--text-primary);
  margin: 0;
  font-weight: 400;
}

.avenue-details-desc {
  font-size: var(--font-size-base);
  color: var(--text-secondary);
  line-height: 1.6;
  max-width: 65ch;
  margin: 0 auto;
  font-weight: 300;
}

.animate-fade-in {
  animation: fadeIn 0.4s var(--ease-out-expo);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Focus Section */
.focus-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-md);
}

@media (min-width: 640px) {
  .focus-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .focus-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.focus-card {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  transition: transform var(--transition-fast), border-color var(--transition-fast);
}

.focus-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent-primary);
  box-shadow: 0 4px 12px var(--accent-glow);
}

.focus-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background-color: oklch(from var(--accent-primary) l c h / 0.1);
  border: 1px solid oklch(from var(--accent-primary) l c h / 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.focus-icon {
  font-size: 1.5rem;
}

.focus-card-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.3;
}

.focus-card-desc {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

/* Impact Split Section */
.impact-split-section {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-lg);
  border-top: 1px solid var(--border-color);
  padding-top: var(--space-lg);
}

@media (min-width: 1024px) {
  .impact-split-section {
    grid-template-columns: 1fr 1fr;
  }
}

.impact-column {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.impact-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.impact-badge {
  align-self: flex-start;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background-color: oklch(from var(--accent-primary) l c h / 0.15);
  color: var(--accent-primary);
  border: 1px solid oklch(from var(--accent-primary) l c h / 0.3);
  padding: 2px 8px;
  border-radius: 4px;
}

.impact-badge.alert {
  background-color: rgba(220, 38, 38, 0.15);
  color: #f87171;
  border: 1px solid rgba(220, 38, 38, 0.3);
}

.impact-title {
  font-family: var(--font-serif);
  font-size: var(--font-size-lg);
  color: var(--text-primary);
  margin: 0;
  font-weight: 400;
}

.impact-desc {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
  font-weight: 300;
}

.impact-stat-panel {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-xs);
  margin-top: var(--space-xs);
}

@media (min-width: 480px) {
  .impact-stat-panel {
    grid-template-columns: repeat(3, 1fr);
  }
}

.stat-item {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  padding: var(--space-sm);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
}

.stat-num {
  font-family: var(--font-serif);
  font-size: var(--font-size-lg);
  color: var(--accent-primary);
  font-weight: 600;
  margin-bottom: 2px;
}

.stat-label {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.2;
}

/* Polio Progress */
.polio-progress-card {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.polio-meter-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.polio-meter-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.polio-meter-value {
  font-family: var(--font-serif);
  font-size: var(--font-size-lg);
  color: var(--accent-primary);
  font-weight: 700;
}

.polio-progress-bar {
  width: 100%;
  height: 10px;
  background-color: var(--bg-obsidian);
  border-radius: 9999px;
  border: 1px solid var(--border-subtle);
  overflow: hidden;
}

.polio-progress-fill {
  height: 100%;
  background: linear-gradient(to right, var(--accent-primary), #fbbf24);
  border-radius: 9999px;
  box-shadow: 0 0 10px var(--accent-primary);
}

.polio-challenge-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
  border-top: 1px dashed var(--border-subtle);
  padding-top: var(--space-sm);
  margin-top: 4px;
}

.challenge-item {
  display: flex;
  flex-direction: column;
}

.challenge-value {
  font-family: var(--font-serif);
  font-size: var(--font-size-lg);
  color: var(--text-primary);
  font-weight: 600;
}

.challenge-label {
  font-size: 11px;
  color: var(--text-muted);
}

.partners-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: var(--space-xs);
}

.partners-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
}

.partners-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.partner-badge {
  font-size: 11px;
  background-color: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  padding: 3px 8px;
  border-radius: 4px;
}

/* Glossary Section */
.glossary-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  border-top: 1px solid var(--border-color);
  padding-top: var(--space-lg);
}

.glossary-controls {
  max-width: 600px;
}

.search-input-wrapper {
  position: relative;
  width: 100%;
}

.search-icon {
  position: absolute;
  left: var(--space-sm);
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.search-field {
  width: 100%;
  background-color: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 9999px;
  padding: 0.75rem var(--space-md) 0.75rem 2.5rem;
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  outline: none;
  font-family: var(--font-sans);
  transition: all var(--transition-fast);
}

.search-field:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 12px var(--accent-glow);
}

.glossary-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-sm);
}

@media (min-width: 768px) {
  .glossary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.glossary-card {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color var(--transition-fast);
}

.glossary-card:hover {
  border-color: var(--border-focus);
}

.glossary-card--open {
  border-color: oklch(76% 0.11 70 / 0.5);
  box-shadow: 0 4px 20px oklch(76% 0.11 70 / 0.1);
}

.glossary-card--expandable .glossary-card-header {
  cursor: pointer;
}

.glossary-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: var(--space-sm);
  width: 100%;
  background: none;
  border: none;
  color: inherit;
  font-family: inherit;
  text-align: left;
}

.glossary-card-header:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: -2px;
  border-radius: 10px;
}

.glossary-header-left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
}

.glossary-icon {
  font-size: 1.6rem;
  line-height: 1;
  flex-shrink: 0;
  margin-top: 2px;
}

.glossary-term {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--accent-primary);
  margin: 0 0 4px 0;
}

.glossary-definition {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

.glossary-chevron {
  font-size: 0.65rem;
  color: var(--text-muted);
  margin-top: 6px;
  flex-shrink: 0;
  transition: color var(--transition-fast);
}

.glossary-card--open .glossary-chevron {
  color: var(--accent-primary);
}

/* ── Insight Drawer ─────────────────────────────────── */
.glossary-drawer {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.4s var(--ease-out-expo);
  border-top: 0px solid var(--border-subtle);
  transition: grid-template-rows 0.4s var(--ease-out-expo), border-top-width 0.1s;
}

.glossary-drawer--open {
  grid-template-rows: 1fr;
  border-top-width: 1px;
}

.drawer-inner {
  overflow: hidden;
  padding: 0;
  transition: padding 0.3s var(--ease-out-expo);
}

.glossary-drawer--open .drawer-inner {
  padding: var(--space-md);
}

.drawer-section {
  margin-bottom: var(--space-md);
}

.drawer-section:last-child {
  margin-bottom: 0;
}

.drawer-overview {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.7;
  margin: 0;
  font-weight: 300;
  font-style: italic;
  border-left: 3px solid oklch(76% 0.11 70 / 0.4);
  padding-left: var(--space-sm);
}

.drawer-section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin: 0 0 8px 0;
}

.drawer-facts-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.drawer-fact-item {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.5;
  padding-left: 16px;
  position: relative;
}

.drawer-fact-item::before {
  content: '›';
  position: absolute;
  left: 0;
  color: var(--accent-primary);
  font-weight: 700;
}

.drawer-body {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
  font-weight: 300;
}

.drawer-section--highlight {
  background: oklch(76% 0.11 70 / 0.05);
  border: 1px solid oklch(76% 0.11 70 / 0.15);
  border-radius: 10px;
  padding: var(--space-sm);
}

.drawer-section--tip {
  background: oklch(60% 0.08 220 / 0.05);
  border: 1px solid oklch(60% 0.08 220 / 0.2);
  border-radius: 10px;
  padding: var(--space-sm);
}

.glossary-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: var(--space-lg);
  border: 1px dashed var(--border-subtle);
  border-radius: 16px;
  color: var(--text-muted);
  font-style: italic;
  font-size: var(--font-size-sm);
}
`;

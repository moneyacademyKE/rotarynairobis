import { component$, useStylesScoped$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { parseRiHistory, type RiHistory } from "../../domain/ri-specs";
import rawData from "../../data/ri-history.json";

// routeLoader$ to load and validate the static JSON RI History ledger
export const useRiHistory = routeLoader$((): RiHistory => {
  return parseRiHistory(rawData);
});

export default component$(() => {
  const data = useRiHistory().value;

  useStylesScoped$(STYLES);

  // Group Herbert Taylor's detailed story paragraphs into 5 logical timeline phases
  const timelineStages = [
    {
      title: "1932: The Bankruptcy Challenge",
      paragraphs: [data.fourWayTest.detailedStory[0], data.fourWayTest.detailedStory[1], data.fourWayTest.detailedStory[2]],
      icon: "📉",
    },
    {
      title: "Building Character & Service",
      paragraphs: [data.fourWayTest.detailedStory[3], data.fourWayTest.detailedStory[4]],
      icon: "🌱",
    },
    {
      title: "Formulating the Four Questions",
      paragraphs: [data.fourWayTest.detailedStory[5], data.fourWayTest.detailedStory[6]],
      icon: "📝",
    },
    {
      title: "The Desk Test & Unifying Faiths",
      paragraphs: [data.fourWayTest.detailedStory[7], data.fourWayTest.detailedStory[8]],
      icon: "🤝",
    },
    {
      title: "Applying the Philosophy & Success",
      paragraphs: [
        data.fourWayTest.detailedStory[9],
        data.fourWayTest.detailedStory[10],
        data.fourWayTest.detailedStory[11],
        data.fourWayTest.detailedStory[12],
        data.fourWayTest.detailedStory[13]
      ],
      icon: "🏆",
    }
  ];

  return (
    <div class="ri-history-page">
      {/* 1. Hero Section */}
      <section class="ri-hero">
        <h1 class="main-title gold-glow">{data.pageTitle}</h1>
        <p class="welcome-text">{data.pageSubtitle}</p>
      </section>

      {/* 2. Mottoes Section */}
      <section class="mottoes-section">
        <h2 class="section-title">{data.mottosTitle}</h2>
        <div class="mottoes-grid">
          {/* Service Above Self Card */}
          <div class="motto-card primary">
            <div class="motto-header">
              <span class="motto-badge">Principal Motto</span>
              <h3 class="motto-value">{data.mottos.collinsMotto}</h3>
            </div>
            <div class="motto-logo-wrap">
              <img src={data.images.mottoImage} alt="Service Above Self Logo" class="motto-logo-img" />
            </div>
            <p class="motto-desc">{data.mottos.collinsStory}</p>
            <p class="motto-footnote">{data.mottos.legislation1989}</p>
          </div>

          {/* He Profits Most Who Serves Best Card */}
          <div class="motto-card">
            <div class="motto-header">
              <span class="motto-badge secondary">Secondary Motto</span>
              <h3 class="motto-value">{data.mottos.sheldonMotto}</h3>
            </div>
            <p class="motto-desc">{data.mottos.sheldonMottoDescription}</p>
            <div class="divider-dashed" />
            <p class="motto-desc">{data.mottos.sheldonSpeech}</p>
            <p class="motto-footnote">{data.mottos.formalization1950}</p>
          </div>
        </div>
      </section>

      {/* 3. The Four-Way Test Timeline */}
      <section class="four-way-history-section">
        <div class="section-header-centered">
          <span class="kicker-centered">Ethical Measuring Stick</span>
          <h2 class="section-title-centered">{data.fourWayTestHistoryTitle}</h2>
          <p class="section-intro-centered">{data.fourWayTest.creatorInfo}</p>
        </div>

        {/* Full-width Banners Image */}
        <div class="banners-full-wrap">
          <img
            src={data.images.bannersImage}
            alt="Object of Rotary and Four-Way Test Banners"
            class="banners-full-img"
          />
          <span class="image-caption banners-caption">Banners displaying the Object of Rotary and The Four-Way Test principles in meetings.</span>
        </div>

        <div class="four-way-history-layout">
          {/* Timeline of detailed story */}
          <div class="history-timeline">
            {timelineStages.map((stage, sIdx) => (
              <div key={sIdx} class="timeline-item">
                <div class="timeline-marker">
                  <span class="timeline-icon">{stage.icon}</span>
                </div>
                <div class="timeline-content-card">
                  <h3 class="timeline-stage-title">{stage.title}</h3>
                  <div class="timeline-stage-body">
                    {stage.paragraphs.map((p, pIdx) => (
                      <p key={pIdx}>{p}</p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. History of the Rotary Bell & Gavel */}
      <section class="bell-history-section">
        <h2 class="section-title">{data.bellHistoryTitle}</h2>
        <div class="bell-history-grid">
          <div class="bell-text-column">
            <div class="bell-story-card">
              <div class="bell-card-header">
                <span class="bell-icon">🔔</span>
                <h3 class="bell-card-title">The Attendance Contest & Ship Bell</h3>
              </div>
              <p>{data.bell.origin1922}</p>
            </div>

            <div class="bell-story-card">
              <div class="bell-card-header">
                <span class="bell-icon">🤝</span>
                <h3 class="bell-card-title">Order, Discipline & Salutations</h3>
              </div>
              <p>{data.bell.symbolism}</p>
            </div>

            <div class="bell-story-card">
              <div class="bell-card-header">
                <span class="bell-icon">🔨</span>
                <h3 class="bell-card-title">The Gavel: Symbol of Authority</h3>
              </div>
              <p>{data.bell.gavelSymbolism}</p>
            </div>
          </div>

          <div class="bell-image-column">
            <div class="bell-image-card">
              <img src={data.images.bellImage} alt="Rotary President Bell and Gavel" class="bell-large-img" />
              <span class="image-caption-dark">The President's Bell and Gavel representing order and administrative authority transfer.</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
});

const STYLES = `
.ri-history-page {
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

.ri-hero {
  max-width: 80ch;
}

.main-title {
  font-family: var(--font-serif);
  font-size: clamp(2.5rem, 5vw + 1rem, 4.5rem);
  font-weight: 400;
  line-height: 1.05;
  letter-spacing: -0.04em;
  margin: 0 0 var(--space-xs) 0;
  color: var(--text-primary);
}

.gold-glow {
  text-shadow: 0 0 40px oklch(76% 0.11 70 / 0.25);
}

.welcome-text {
  font-size: var(--font-size-base);
  color: var(--text-secondary);
  line-height: 1.6;
  font-weight: 300;
  margin: 0;
}

/* Section Title */
.section-title {
  font-family: var(--font-serif);
  font-size: var(--font-size-xl);
  color: var(--text-primary);
  margin: 0;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: var(--space-xs);
}

/* Mottoes Grid */
.mottoes-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.mottoes-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-md);
}

@media (min-width: 768px) {
  .mottoes-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.motto-card {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  transition: transform var(--transition-fast), border-color var(--transition-fast);
  backdrop-filter: blur(12px);
}

.motto-card:hover {
  transform: translateY(-4px);
  border-color: var(--accent-primary);
  box-shadow: 0 8px 24px var(--accent-glow);
}

.motto-card.primary {
  border-color: oklch(from var(--accent-primary) l c h / 0.4);
  background: linear-gradient(135deg, var(--bg-panel) 0%, rgba(10, 30, 80, 0.9) 100%);
}

.motto-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.motto-badge {
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

.motto-badge.secondary {
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.motto-value {
  font-family: var(--font-serif);
  font-size: var(--font-size-xl);
  color: var(--accent-primary);
  margin: 4px 0 0 0;
  font-weight: 400;
  line-height: 1.1;
}

.motto-logo-wrap {
  width: 100%;
  max-width: 250px;
  margin: 0 auto;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  background: var(--bg-obsidian);
}

.motto-logo-img {
  width: 100%;
  height: auto;
  display: block;
}

.motto-desc {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
  font-weight: 300;
}

.divider-dashed {
  border-top: 1px dashed var(--border-subtle);
  width: 100%;
  margin: 4px 0;
}

.motto-footnote {
  font-size: 11px;
  color: var(--text-muted);
  font-style: italic;
  margin: auto 0 0 0;
}

/* Four Way History layout */
.four-way-history-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  border-top: 1px solid var(--border-color);
  padding-top: var(--space-lg);
}

.section-header-centered {
  text-align: center;
  max-width: 70ch;
  margin: 0 auto;
}

.kicker-centered {
  font-family: var(--font-serif);
  font-size: var(--font-size-base);
  font-style: italic;
  color: var(--accent-primary);
  display: block;
  margin-bottom: 4px;
}

.section-title-centered {
  font-family: var(--font-serif);
  font-size: var(--font-size-xl);
  color: var(--text-primary);
  margin: 0 0 var(--space-xs) 0;
}

.section-intro-centered {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
  font-weight: 300;
}

/* Full-width banners image */
.banners-full-wrap {
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
  background: var(--bg-obsidian);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm);
}

.banners-full-img {
  width: 100%;
  height: auto;
  max-height: 80vh;
  object-fit: contain;
  display: block;
  border-radius: 10px;
}

.banners-caption {
  display: block;
  text-align: center;
}

.four-way-history-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-lg);
  margin-top: var(--space-sm);
}

.history-timeline {
  display: flex;
  flex-direction: column;
  position: relative;
  padding-left: var(--space-md);
  border-left: 2px solid var(--border-subtle);
  gap: var(--space-md);
}

.timeline-item {
  position: relative;
  animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.timeline-marker {
  position: absolute;
  left: calc(-1 * var(--space-md) - 21px);
  top: 4px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--bg-obsidian);
  border: 2px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all var(--transition-fast);
}

.timeline-icon {
  font-size: 1.2rem;
}

.timeline-item:hover .timeline-marker {
  border-color: var(--accent-primary);
  transform: scale(1.05);
  box-shadow: 0 0 10px var(--accent-glow);
}

.timeline-content-card {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: var(--space-md);
  transition: border-color var(--transition-fast);
}

.timeline-item:hover .timeline-content-card {
  border-color: oklch(from var(--accent-primary) l c h / 0.5);
}

.timeline-stage-title {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--accent-primary);
  margin: 0 0 var(--space-sm) 0;
  line-height: 1.2;
}

.timeline-stage-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.timeline-stage-body p {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
  font-weight: 300;
}

.image-caption {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
  text-align: center;
  font-style: italic;
}

/* Bell history */
.bell-history-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  border-top: 1px solid var(--border-color);
  padding-top: var(--space-lg);
}

.bell-history-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-md);
}

@media (min-width: 768px) {
  .bell-history-grid {
    grid-template-columns: 1fr 320px;
  }
}

@media (min-width: 1024px) {
  .bell-history-grid {
    grid-template-columns: 1fr 400px;
  }
}

.bell-text-column {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.bell-story-card {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  transition: border-color var(--transition-fast);
}

.bell-story-card:hover {
  border-color: var(--border-focus);
}

.bell-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bell-icon {
  font-size: 1.8rem;
}

.bell-card-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--accent-primary);
  margin: 0;
}

.bell-story-card p {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
  font-weight: 300;
}

.bell-image-column {
  display: flex;
  align-items: flex-start;
}

.bell-image-card {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: var(--space-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  width: 100%;
}

.bell-large-img {
  width: 100%;
  height: auto;
  border-radius: 10px;
  display: block;
}

.image-caption-dark {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.3;
  font-style: italic;
  padding: 4px;
}
`;

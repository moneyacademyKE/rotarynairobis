import { component$, useSignal, useStylesScoped$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { parseRcnsProfile, type RcnsProfile } from "../../domain/rcns-specs";
import rawData from "../../data/rcns-profile.json";

// routeLoader$ to load and validate the static JSON profile ledger
export const useRcnsProfile = routeLoader$((): RcnsProfile => {
  return parseRcnsProfile(rawData);
});

export default component$(() => {
  const profile = useRcnsProfile().value;
  const searchMember = useSignal("");

  useStylesScoped$(STYLES);

  // Filter membership list based on real-time user search query
  const filteredMembers = profile.members.filter((m) =>
    m.name.toLowerCase().includes(searchMember.value.toLowerCase()) ||
    m.role.toLowerCase().includes(searchMember.value.toLowerCase())
  );

  // Separate officers from active members for layout visual hierarchy
  const officers = filteredMembers.filter(m => m.role !== "Active Member");
  const regularMembers = filteredMembers.filter(m => m.role === "Active Member");

  return (
    <div class="rcns-page">
      {/* 1. Hero Header Banner */}
      <section class="rcns-hero">
        <span class="charter-badge">{profile.charterBadge}</span>
        <h1 class="main-title gold-glow">{profile.welcomeTitle}</h1>
        <div class="hero-intro-text">
          <p>{profile.history.charterText}</p>
        </div>
      </section>

      {/* 2. Historical & District Facts */}
      <section class="history-grid-section">
        <div class="history-card">
          <div class="card-icon">🏛️</div>
          <h3 class="card-title">Founding & Roots</h3>
          <p>{profile.history.notableMembersText}</p>
        </div>

        <div class="history-card">
          <div class="card-icon">🌍</div>
          <h3 class="card-title">District 9212 Alignment</h3>
          <p>{profile.history.districtsText}</p>
        </div>

        <div class="history-card">
          <div class="card-icon">✨</div>
          <h3 class="card-title">Club Sustainability</h3>
          <p>{profile.history.successText}</p>
        </div>
      </section>

      {/* 3. Awards & District Recognitions */}
      <section class="awards-section">
        <h2 class="section-title">{profile.awardsTitle}</h2>
        <div class="awards-grid">
          {profile.awards.map((award, index) => (
            <div key={index} class="award-card">
              <div class="award-badge-year">{award.period}</div>
              <h3 class="award-card-title">{award.title}</h3>
              <p class="award-card-desc">{award.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. New Generation & Mentorship Programs */}
      <section class="mentorship-section">
        <div class="section-header-centered">
          <span class="kicker-centered">Our Investment in Youth</span>
          <h2 class="section-title-centered">{profile.newGenerationsTitle}</h2>
          <p class="section-intro-centered">
            {profile.newGenerations.programsText}
          </p>
        </div>

        <div class="mentorship-grid">
          {/* Rotaract Column */}
          <div class="mentorship-card">
            <div class="mentorship-header">
              <span class="card-badge rotaract">100+ Members</span>
              <h3 class="mentorship-card-title">Rotaract Club: Kenyatta University</h3>
            </div>
            <p class="mentorship-desc">{profile.newGenerations.rotaractText}</p>
          </div>

          {/* Interact Column */}
          <div class="mentorship-card">
            <div class="mentorship-header">
              <span class="card-badge interact">30 Sponsored Students</span>
              <h3 class="mentorship-card-title">Interact Clubs: State House Girls & Upper Hill</h3>
            </div>
            <p class="mentorship-desc">{profile.newGenerations.interactText}</p>
            <div class="mentorship-sub-info">
              <span class="sub-label">Mentorship Mentions:</span>
              <p class="sub-text">{profile.newGenerations.babyClubsText}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Searchable Club Members Roster */}
      <section class="roster-section">
        <div class="roster-header-row">
          <h2 class="section-title">{profile.membersTitle}</h2>
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search member name or title..."
              class="search-field"
              value={searchMember.value}
              onInput$={(e) => { searchMember.value = (e.target as HTMLInputElement).value; }}
            />
          </div>
        </div>

        {filteredMembers.length === 0 ? (
          <div class="roster-empty">
            No club members match your search criteria. Try "President" or a specific name.
          </div>
        ) : (
          <div class="roster-wrapper">
            {/* Officers Sub-grid (Highlighted in Gold Borders) */}
            {officers.length > 0 && (
              <div class="roster-group">
                <h3 class="roster-group-title">Club Officers</h3>
                <div class="roster-grid officers">
                  {officers.map((member, index) => (
                    <div key={`off-${index}`} class="member-card officer">
                      <div class="member-avatar">
                        {member.name.split(' ').map(n => n[0]).join('').replace('Rtn', '')}
                      </div>
                      <div class="member-info">
                        <h4 class="member-name">{member.name}</h4>
                        <span class="member-role officer-badge">{member.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Members Sub-grid */}
            {regularMembers.length > 0 && (
              <div class="roster-group">
                <h3 class="roster-group-title">Active Members</h3>
                <div class="roster-grid">
                  {regularMembers.map((member, index) => (
                    <div key={`mem-${index}`} class="member-card">
                      <div class="member-avatar gray">
                        {member.name.split(' ').map(n => n[0]).join('').replace('Rtn', '')}
                      </div>
                      <div class="member-info">
                        <h4 class="member-name">{member.name}</h4>
                        <span class="member-role">{member.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
});

const STYLES = `
.rcns-page {
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

.rcns-hero {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-xs);
  max-width: 90ch;
}

.charter-badge {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  background-color: oklch(from var(--accent-primary) l c h / 0.15);
  color: var(--accent-primary);
  border: 1px solid oklch(from var(--accent-primary) l c h / 0.3);
  padding: 4px 10px;
  border-radius: 9999px;
}

.main-title {
  font-family: var(--font-serif);
  font-size: clamp(2.5rem, 5vw + 1rem, 4.5rem);
  font-weight: 400;
  line-height: 1.05;
  letter-spacing: -0.04em;
  margin: 0;
  color: var(--text-primary);
}

.gold-glow {
  text-shadow: 0 0 40px oklch(76% 0.11 70 / 0.25);
}

.hero-intro-text {
  font-size: var(--font-size-base);
  color: var(--text-secondary);
  line-height: 1.6;
  font-weight: 300;
}

/* History Cards Section */
.history-grid-section {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-md);
}

@media (min-width: 768px) {
  .history-grid-section {
    grid-template-columns: repeat(3, 1fr);
  }
}

.history-card {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  transition: transform var(--transition-fast), border-color var(--transition-fast);
  backdrop-filter: blur(12px);
}

.history-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent-primary);
  box-shadow: 0 4px 12px var(--accent-glow);
}

.card-icon {
  font-size: 2rem;
  margin-bottom: 4px;
}

.card-title {
  font-family: var(--font-sans);
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--accent-primary);
  margin: 0;
}

.history-card p {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
  font-weight: 300;
}

/* Section Title layout */
.section-title {
  font-family: var(--font-serif);
  font-size: var(--font-size-xl);
  color: var(--text-primary);
  margin: 0;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: var(--space-xs);
}

/* Awards */
.awards-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.awards-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-sm);
}

@media (min-width: 640px) {
  .awards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .awards-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.award-card {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  position: relative;
  transition: all var(--transition-fast);
}

.award-card:hover {
  border-color: var(--accent-primary);
  box-shadow: 0 4px 12px var(--accent-glow);
  transform: translateY(-2px);
}

.award-badge-year {
  font-family: var(--font-serif);
  font-size: var(--font-size-lg);
  color: var(--accent-primary);
  font-weight: 600;
  margin-bottom: 2px;
}

.award-card-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.3;
}

.award-card-desc {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.4;
  margin: 0;
  font-weight: 300;
}

/* Mentorship */
.mentorship-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.section-header-centered {
  text-align: center;
  max-width: 70ch;
  margin: 0 auto var(--space-xs) auto;
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
}

.section-intro-centered {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
  font-weight: 300;
}

.mentorship-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-md);
}

@media (min-width: 1024px) {
  .mentorship-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.mentorship-card {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  backdrop-filter: blur(12px);
}

.mentorship-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card-badge {
  align-self: flex-start;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 8px;
  border-radius: 4px;
}

.card-badge.rotaract {
  background-color: rgba(147, 51, 234, 0.15);
  color: #c084fc;
  border: 1px solid rgba(147, 51, 234, 0.3);
}

.card-badge.interact {
  background-color: rgba(14, 165, 233, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(14, 165, 233, 0.3);
}

.mentorship-card-title {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.3;
}

.mentorship-desc {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
  font-weight: 300;
}

.mentorship-sub-info {
  border-top: 1px dashed var(--border-subtle);
  padding-top: var(--space-sm);
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sub-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
}

.sub-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.4;
  margin: 0;
  font-style: italic;
}

/* Roster / Members Section */
.roster-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  border-top: 1px solid var(--border-color);
  padding-top: var(--space-lg);
}

.roster-header-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

@media (min-width: 768px) {
  .roster-header-row {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-end;
  }
}

.search-input-wrapper {
  position: relative;
  width: 100%;
  max-width: 400px;
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
  padding: 0.6rem var(--space-md) 0.6rem 2.5rem;
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

.roster-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.roster-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.roster-group-title {
  font-size: var(--font-size-sm);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  border-bottom: 1px dashed var(--border-subtle);
  padding-bottom: 4px;
}

.roster-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-sm);
}

@media (min-width: 480px) {
  .roster-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 768px) {
  .roster-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .roster-grid.officers {
    grid-template-columns: repeat(4, 1fr);
  }
}

.member-card {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: var(--space-sm);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  transition: transform var(--transition-fast), border-color var(--transition-fast);
}

.member-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent-primary);
}

.member-card.officer {
  border-color: oklch(from var(--accent-primary) l c h / 0.5);
  box-shadow: 0 2px 8px oklch(from var(--accent-primary) l c h / 0.05);
}

.member-card.officer:hover {
  border-color: var(--accent-primary);
  box-shadow: 0 4px 12px var(--accent-glow);
}

.member-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background-color: var(--accent-primary);
  color: var(--bg-obsidian);
  font-weight: 700;
  font-size: var(--font-size-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.member-avatar.gray {
  background-color: var(--bg-obsidian);
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
}

.member-info {
  display: flex;
  flex-direction: column;
}

.member-name {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.member-role {
  font-size: 11px;
  color: var(--text-muted);
}

.member-role.officer-badge {
  color: var(--accent-primary);
  font-weight: 600;
}

.roster-empty {
  text-align: center;
  padding: var(--space-lg);
  border: 1px dashed var(--border-subtle);
  border-radius: 16px;
  color: var(--text-muted);
  font-style: italic;
  font-size: var(--font-size-sm);
}
`;

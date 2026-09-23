// Shared styles for the /foundation route: pageStyles for the route template,
// diagramStyles for the three SVG components (each applies it via useStylesScoped$).

export const diagramStyles = `
.fd-diagram-wrap {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.fd-diagram {
  width: 100%;
  height: auto;
  display: block;
}

.fd-diagram-caption {
  font-size: 11px;
  color: var(--text-muted);
  font-style: italic;
  line-height: 1.4;
  text-align: center;
}

.fd-box {
  fill: var(--bg-panel);
  stroke: var(--border-subtle);
  stroke-width: 1;
}

.fd-box-donor { fill: oklch(from var(--accent-primary) l c h / 0.12); }
.fd-box-share { stroke: var(--accent-primary); }

.fd-box-grant { stroke: oklch(from var(--accent-primary) l c h / 0.55); }

.fd-box-impact {
  fill: oklch(from var(--accent-primary) l c h / 0.18);
  stroke: var(--accent-primary);
}

.fd-box-note {
  fill: var(--bg-obsidian);
  stroke: var(--border-subtle);
  stroke-dasharray: 5 4;
}

.fd-box-title {
  fill: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
}

.fd-box-sub { fill: var(--text-secondary); font-size: 11px; }
.fd-box-note-title { fill: var(--text-secondary); font-size: 12px; font-weight: 600; }

.fd-arrow-line {
  stroke: var(--accent-primary);
  stroke-width: 1.6;
}

.fd-split-label { fill: var(--accent-primary); font-size: 13px; font-weight: 700; }

.fd-step {
  fill: oklch(from var(--accent-primary) l c h / 0.14);
  stroke: oklch(from var(--accent-primary) l c h / 0.5);
}

.fd-step-top {
  fill: oklch(from var(--accent-primary) l c h / 0.24);
  stroke: var(--accent-primary);
}

.fd-step-amount { fill: var(--accent-primary); font-size: 14px; font-weight: 700; }
.fd-step-name { fill: var(--text-primary); font-size: 12px; font-weight: 600; }
.fd-step-index { fill: var(--text-muted); font-size: 10px; }

.fd-ladder-base { stroke: var(--border-color); stroke-width: 1; }

.fd-bar-start { fill: oklch(from var(--accent-primary) l c h / 0.35); }
.fd-bar-end { fill: var(--accent-primary); }
.fd-bar-cases { fill: var(--text-primary); font-size: 20px; font-weight: 700; }
.fd-bar-year { fill: var(--text-secondary); font-size: 14px; font-weight: 600; }
`;

export const pageStyles = `
.foundation-page {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 var(--space-md) var(--space-lg) var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  animation: fd-page-in 0.6s var(--ease-out-expo) both;
}

@keyframes fd-page-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.fd-hero { max-width: 80ch; }
.fd-hero-title {
  font-family: var(--font-serif);
  font-size: clamp(2.5rem, 5vw + 1rem, 4.5rem);
  font-weight: 400;
  line-height: 1.05;
  letter-spacing: -0.04em;
  margin: 0 0 var(--space-xs) 0;
  color: var(--text-primary);
}
.fd-hero-sub {
  font-size: var(--font-size-base);
  color: var(--text-secondary);
  line-height: 1.6;
  font-weight: 300;
  margin: 0;
}

.fd-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-sm);
}
@media (min-width: 768px) { .fd-stats-grid { grid-template-columns: repeat(3, 1fr); } }
.fd-stat-card {
  background-color: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: var(--space-sm) var(--space-md);
  display: flex;
  flex-direction: column;
  gap: 2px;
  transition: transform var(--transition-fast), border-color var(--transition-fast);
}
.fd-stat-card:hover { transform: translateY(-3px); border-color: var(--accent-primary); }
.fd-stat-value { font-family: var(--font-serif); font-size: 1.9rem; color: var(--accent-primary); line-height: 1.1; }
.fd-stat-label { font-size: 12px; font-weight: 600; color: var(--text-primary); }
.fd-stat-detail { font-size: 11px; color: var(--text-muted); line-height: 1.4; }

.fd-section { display: flex; flex-direction: column; gap: var(--space-md); border-top: 1px solid var(--border-color); padding-top: var(--space-lg); }
.fd-section-title {
  font-family: var(--font-serif);
  font-size: var(--font-size-xl);
  color: var(--text-primary);
  margin: 0;
}
.fd-section-intro { font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.6; font-weight: 300; margin: 0; max-width: 75ch; }

.fd-origin-list { display: flex; flex-direction: column; gap: var(--space-sm); }
.fd-origin-item {
  display: grid;
  grid-template-columns: 84px 200px 1fr;
  gap: var(--space-sm);
  background-color: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: var(--space-sm) var(--space-md);
  align-items: baseline;
}
@media (max-width: 767px) { .fd-origin-item { grid-template-columns: 64px 1fr; } .fd-origin-item .fd-origin-text { grid-column: 1 / -1; } }
.fd-origin-year { font-family: var(--font-serif); font-size: 1.25rem; color: var(--accent-primary); }
.fd-origin-title { font-weight: 600; font-size: var(--font-size-sm); color: var(--text-primary); }
.fd-origin-text { font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.55; font-weight: 300; }

.fd-areas-note {
  background: linear-gradient(135deg, var(--bg-panel) 0%, rgba(10, 30, 80, 0.9) 100%);
  border: 1px solid oklch(from var(--accent-primary) l c h / 0.4);
  border-radius: 16px;
  padding: var(--space-md);
}
.fd-areas-note p { font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.6; font-weight: 300; margin: 0 0 var(--space-xs) 0; }
.fd-areas-link { color: var(--accent-primary); font-weight: 600; text-decoration: underline; }

.fd-steps { display: flex; flex-direction: column; gap: var(--space-sm); }
.fd-step-card {
  display: grid;
  grid-template-columns: 48px 220px 1fr;
  gap: var(--space-sm);
  background-color: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: var(--space-sm) var(--space-md);
  align-items: baseline;
}
@media (max-width: 767px) { .fd-step-card { grid-template-columns: 48px 1fr; } .fd-step-card .fd-step-text { grid-column: 1 / -1; } }
.fd-step-num {
  font-family: var(--font-serif);
  font-size: 1.4rem;
  color: oklch(from var(--accent-primary) l c h / 0.9);
}
.fd-step-heading { font-weight: 600; font-size: var(--font-size-sm); color: var(--text-primary); }
.fd-step-text { font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.55; font-weight: 300; }

.fd-funds-grid { display: grid; grid-template-columns: 1fr; gap: var(--space-sm); }
@media (min-width: 768px) { .fd-funds-grid { grid-template-columns: repeat(3, 1fr); } }
.fd-fund-card { background-color: var(--bg-panel); border: 1px solid var(--border-subtle); border-radius: 16px; padding: var(--space-md); display: flex; flex-direction: column; gap: 4px; }
.fd-fund-name { font-family: var(--font-serif); font-size: var(--font-size-lg); color: var(--accent-primary); }
.fd-fund-role { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; }
.fd-fund-fy { font-size: var(--font-size-base); font-weight: 600; color: var(--text-primary); }
.fd-fund-all { font-size: var(--font-size-sm); color: var(--text-secondary); }
.fd-fund-note { font-size: 11px; color: var(--text-muted); line-height: 1.45; margin-top: 4px; }

.fd-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
.fd-table th { text-align: left; color: var(--text-muted); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; padding: 6px 10px; border-bottom: 1px solid var(--border-color); }
.fd-table td { padding: 8px 10px; border-bottom: 1px solid var(--border-subtle); color: var(--text-secondary); line-height: 1.45; }
.fd-table td strong { color: var(--text-primary); }
.fd-table tr:hover td { background-color: oklch(from var(--accent-primary) l c h / 0.06); }
.fd-table-wrap { overflow-x: auto; border: 1px solid var(--border-subtle); border-radius: 12px; padding: var(--space-xs); }

.fd-example {
  background: oklch(from var(--accent-primary) l c h / 0.08);
  border-left: 3px solid var(--accent-primary);
  border-radius: 0 12px 12px 0;
  padding: var(--space-sm) var(--space-md);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.6;
}

.fd-societies-grid { display: grid; grid-template-columns: 1fr; gap: var(--space-sm); }
@media (min-width: 768px) { .fd-societies-grid { grid-template-columns: repeat(2, 1fr); } }
.fd-society-card { background-color: var(--bg-panel); border: 1px solid var(--border-subtle); border-radius: 12px; padding: var(--space-sm) var(--space-md); display: flex; flex-direction: column; gap: 2px; }
.fd-society-name { font-weight: 700; color: var(--text-primary); font-size: var(--font-size-sm); }
.fd-society-req { color: var(--accent-primary); font-size: var(--font-size-sm); font-weight: 600; }
.fd-society-note { color: var(--text-muted); font-size: 11px; line-height: 1.45; }

.fd-note { font-size: 11px; color: var(--text-muted); line-height: 1.5; font-style: italic; }

.fd-numbers-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-sm); }
@media (min-width: 768px) { .fd-numbers-grid { grid-template-columns: repeat(3, 1fr); } }
.fd-number-card { background-color: var(--bg-panel); border: 1px solid var(--border-subtle); border-radius: 12px; padding: var(--space-sm) var(--space-md); }
.fd-number-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; }
.fd-number-value { font-size: var(--font-size-base); color: var(--text-primary); font-weight: 600; line-height: 1.3; margin-top: 2px; }

.fd-kenya-list { display: flex; flex-direction: column; gap: var(--space-xs); margin: 0; padding-left: var(--space-md); }
.fd-kenya-list li { font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.55; font-weight: 300; }
.fd-kenya-list li::marker { color: var(--accent-primary); }

.fd-gates-card { background: linear-gradient(135deg, var(--bg-panel) 0%, rgba(10, 30, 80, 0.9) 100%); border: 1px solid oklch(from var(--accent-primary) l c h / 0.4); border-radius: 16px; padding: var(--space-md); }
.fd-gates-card h3 { font-family: var(--font-serif); color: var(--accent-primary); margin: 0 0 var(--space-xs) 0; font-size: var(--font-size-lg); }
.fd-gates-card p { font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.6; font-weight: 300; margin: 0; }

.fd-named-card { background-color: var(--bg-panel); border: 1px solid var(--border-subtle); border-radius: 12px; padding: var(--space-sm) var(--space-md); }
.fd-named-name { font-weight: 700; color: var(--accent-primary); font-size: var(--font-size-sm); }
.fd-named-detail { font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.55; font-weight: 300; margin-top: 4px; }

.fd-agg-list { display: flex; flex-direction: column; gap: var(--space-xs); margin: 0; padding-left: var(--space-md); }
.fd-agg-list li { font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.55; font-weight: 300; }
.fd-agg-list li::marker { color: var(--accent-primary); }

.fd-ach-list { display: flex; flex-direction: column; gap: var(--space-xs); }
.fd-ach-item {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: var(--space-sm);
  background-color: var(--bg-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: var(--space-sm) var(--space-md);
}
.fd-ach-rank { font-family: var(--font-serif); font-size: 1.5rem; color: oklch(from var(--accent-primary) l c h / 0.85); line-height: 1; }
.fd-ach-title { font-weight: 700; color: var(--text-primary); font-size: var(--font-size-sm); }
.fd-ach-year { color: var(--accent-primary); font-size: 11px; font-weight: 600; margin-left: 6px; }
.fd-ach-detail { font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.55; font-weight: 300; margin-top: 2px; }

.fd-club-callout {
  background: linear-gradient(135deg, var(--bg-panel) 0%, oklch(from var(--accent-primary) l c h / 0.14) 100%);
  border: 1px solid oklch(from var(--accent-primary) l c h / 0.5);
  border-radius: 16px;
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}
.fd-club-callout h3 { font-family: var(--font-serif); color: var(--accent-primary); margin: 0; font-size: var(--font-size-lg); }
.fd-club-callout p { font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.6; font-weight: 300; margin: 0; }
.fd-club-list { display: flex; flex-direction: column; gap: 4px; margin: 0; padding-left: var(--space-md); }
.fd-club-list li { font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.5; }
.fd-club-list li::marker { color: var(--accent-primary); }

.fd-sources-list { display: flex; flex-direction: column; gap: 2px; margin: 0; padding-left: var(--space-md); }
.fd-sources-list li { font-size: 12px; color: var(--text-muted); line-height: 1.6; }
.fd-sources-list a { color: var(--accent-primary); text-decoration: underline; }
`;

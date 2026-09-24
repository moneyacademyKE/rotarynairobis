// Styles for the Foundation page's giving-records and points sections.
// Each section component applies its own export via useStylesScoped$,
// mirroring how the SVG diagrams reuse diagramStyles from ./styles.

export const givingStyles = `
.g-title {
  font-family: var(--font-serif);
  font-size: var(--font-size-lg);
  color: var(--text-primary);
  margin: 0;
}
.g-intro { font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.6; font-weight: 300; margin: 0; max-width: 75ch; }
.g-note { font-size: 11px; color: var(--text-muted); line-height: 1.5; font-style: italic; }

.g-grid { display: grid; grid-template-columns: 1fr; gap: var(--space-sm); }
@media (min-width: 768px) { .g-grid { grid-template-columns: repeat(2, 1fr); } }

.g-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
.g-table th { text-align: left; color: var(--text-muted); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; padding: 6px 10px; border-bottom: 1px solid var(--border-color); }
.g-table td { padding: 7px 10px; border-bottom: 1px solid var(--border-subtle); color: var(--text-secondary); line-height: 1.4; }
.g-table td strong { color: var(--text-primary); }
.g-table tr:hover td { background-color: oklch(from var(--accent-primary) l c h / 0.06); }
.g-table-wrap { overflow-x: auto; border: 1px solid var(--border-subtle); border-radius: 12px; padding: var(--space-xs); }

.g-own td {
  background-color: oklch(from var(--accent-primary) l c h / 0.10);
  color: var(--text-primary);
}
.g-own td strong { color: var(--accent-primary); }
.g-own-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 7px;
  border-radius: 999px;
  border: 1px solid oklch(from var(--accent-primary) l c h / 0.6);
  color: var(--accent-primary);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.g-story {
  background: linear-gradient(135deg, var(--bg-panel) 0%, rgba(10, 30, 80, 0.9) 100%);
  border: 1px solid oklch(from var(--accent-primary) l c h / 0.4);
  border-radius: 16px;
  padding: var(--space-md);
}
.g-story h3 { font-family: var(--font-serif); color: var(--accent-primary); margin: 0 0 var(--space-xs) 0; font-size: var(--font-size-lg); }
.g-story p { font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.6; font-weight: 300; margin: 0; }

.g-block { display: flex; flex-direction: column; gap: var(--space-xs); margin: 0; }
`;

export const pointsStyles = `
.p-title {
  font-family: var(--font-serif);
  font-size: var(--font-size-lg);
  color: var(--text-primary);
  margin: 0;
}

.p-earning-grid { display: grid; grid-template-columns: 1fr; gap: var(--space-sm); }
@media (min-width: 768px) { .p-earning-grid { grid-template-columns: repeat(3, 1fr); } }
.p-earning-card { background-color: var(--bg-panel); border: 1px solid var(--border-subtle); border-radius: 12px; padding: var(--space-sm) var(--space-md); display: flex; flex-direction: column; gap: 2px; }
.p-earning-label { font-weight: 700; color: var(--text-primary); font-size: var(--font-size-sm); }
.p-earning-text { color: var(--text-muted); font-size: 11px; line-height: 1.45; }
.p-earning-zero .p-earning-label { color: var(--text-muted); text-decoration: line-through; }

.p-note { font-size: 12px; color: var(--text-secondary); line-height: 1.55; }

.p-rules { display: flex; flex-direction: column; gap: var(--space-xs); margin: 0; padding-left: var(--space-md); }
.p-rules li { font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.55; font-weight: 300; }
.p-rules li::marker { color: var(--accent-primary); }

.p-strategy {
  background: oklch(from var(--accent-primary) l c h / 0.08);
  border-left: 3px solid var(--accent-primary);
  border-radius: 0 12px 12px 0;
  padding: var(--space-sm) var(--space-md);
}
.p-strategy-title { font-weight: 700; color: var(--text-primary); font-size: var(--font-size-sm); margin: 0 0 var(--space-xs) 0; }
.p-strategy-list { display: flex; flex-direction: column; gap: var(--space-xs); margin: 0; padding-left: var(--space-md); }
.p-strategy-list li { font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.55; font-weight: 300; }
.p-strategy-list li::marker { color: var(--accent-primary); }

.p-recognition {
  background-color: var(--bg-panel);
  border: 1px dashed var(--border-subtle);
  border-radius: 12px;
  padding: var(--space-sm) var(--space-md);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.55;
}

.p-club-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
.p-club-table th { text-align: left; color: var(--text-muted); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; padding: 6px 10px; border-bottom: 1px solid var(--border-color); }
.p-club-table td { padding: 7px 10px; border-bottom: 1px solid var(--border-subtle); color: var(--text-secondary); line-height: 1.4; }
.p-club-table td strong { color: var(--text-primary); }
.p-club-table tr:hover td { background-color: oklch(from var(--accent-primary) l c h / 0.06); }
.p-club-wrap { overflow-x: auto; border: 1px solid var(--border-subtle); border-radius: 12px; padding: var(--space-xs); }

.p-block { display: flex; flex-direction: column; gap: var(--space-sm); }
`;

import { component$, useStylesScoped$ } from "@builder.io/qwik";
import type { FoundationImpactData } from "../domain/foundation-specs";
import { givingStyles } from "../routes/foundation/section-styles";

/**
 * D9212's giving records, from the district's farewell deck:
 * the 13-year top five, the final-year top twenty, the heritage
 * clubs lineage, and the Sunshine Rally origin story.
 */
export default component$(({ funders }: { funders: FoundationImpactData["funders"] }) => {
  useStylesScoped$(givingStyles);

  const dc = funders.districtClubs;
  const ld = funders.lastDance;
  const ht = funders.heritage;
  const ldFirst = ld.rows.slice(0, 10);
  const ldSecond = ld.rows.slice(10);
  const htFirst = ht.clubs.slice(0, 7);
  const htSecond = ht.clubs.slice(7);

  return (
    <div class="g-block">
      {/* 13-year top five */}
      <div class="g-block">
        <h3 class="g-title">{dc.title}</h3>
        <p class="g-intro">{dc.intro}</p>
        <div class="g-table-wrap">
          <table class="g-table">
            <thead>
              <tr><th>#</th><th>Club</th><th>Cumulative TRF giving</th></tr>
            </thead>
            <tbody>
              {dc.rows.map((r) => (
                <tr key={r.rank} class={r.own ? "g-own" : undefined}>
                  <td>{r.rank}</td>
                  <td>
                    <strong>{r.club}</strong>
                    {r.own ? <span class="g-own-tag">our club</span> : null}
                  </td>
                  <td>{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p class="g-note">{dc.note}</p>
      </div>

      {/* Final-year top twenty */}
      <div class="g-block">
        <h3 class="g-title">{ld.title}</h3>
        <p class="g-intro">{ld.intro}</p>
        <div class="g-grid">
          <div class="g-table-wrap">
            <table class="g-table">
              <thead><tr><th>#</th><th>Club</th><th>Given</th></tr></thead>
              <tbody>
                {ldFirst.map((r) => (
                  <tr key={r.rank}>
                    <td>{r.rank}</td>
                    <td><strong>{r.club}</strong></td>
                    <td>{r.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div class="g-table-wrap">
            <table class="g-table">
              <thead><tr><th>#</th><th>Club</th><th>Given</th></tr></thead>
              <tbody>
                {ldSecond.map((r) => (
                  <tr key={r.rank}>
                    <td>{r.rank}</td>
                    <td><strong>{r.club}</strong></td>
                    <td>{r.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p class="g-note">{ld.note}</p>
      </div>

      {/* Heritage lineage */}
      <div class="g-block">
        <h3 class="g-title">{ht.title}</h3>
        <p class="g-intro">{ht.intro}</p>
        <div class="g-grid">
          <div class="g-table-wrap">
            <table class="g-table">
              <thead><tr><th>#</th><th>Club</th><th>Chartered</th></tr></thead>
              <tbody>
                {htFirst.map((c) => (
                  <tr key={c.rank} class={c.own ? "g-own" : undefined}>
                    <td>{c.rank}</td>
                    <td>
                      <strong>{c.club}</strong>
                      {c.own ? <span class="g-own-tag">our club</span> : null}
                    </td>
                    <td>{c.chartered}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div class="g-table-wrap">
            <table class="g-table">
              <thead><tr><th>#</th><th>Club</th><th>Chartered</th></tr></thead>
              <tbody>
                {htSecond.map((c) => (
                  <tr key={c.rank} class={c.own ? "g-own" : undefined}>
                    <td>{c.rank}</td>
                    <td>
                      <strong>{c.club}</strong>
                      {c.own ? <span class="g-own-tag">our club</span> : null}
                    </td>
                    <td>{c.chartered}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p class="g-note">{ht.note}</p>
      </div>

      {/* Sunshine Rally story */}
      <div class="g-story">
        <h3>{funders.legacyStory.title}</h3>
        <p>{funders.legacyStory.text}</p>
      </div>
    </div>
  );
});

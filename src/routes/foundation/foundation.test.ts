import { describe, it, expect } from "vitest";
import { parseFoundationPageData, parseFoundationImpactData } from "../../domain/foundation-specs";
import rawData from "../../data/foundation.json";
import impactData from "../../data/foundation-impact.json";

describe("Foundation Page Spec Boundaries & Data Integrity", () => {
  it("should parse the Foundation mechanism JSON against the Zod schema", () => {
    const parsed = parseFoundationPageData(rawData);
    expect(parsed).toBeDefined();
    expect(parsed.pageTitle).toBe("The Rotary Foundation");
    expect(parsed.pageSubtitle).toContain("26.50");
  });

  it("should carry six at-a-glance stats and a six-entry origin timeline", () => {
    const parsed = parseFoundationPageData(rawData);
    expect(parsed.stats).toHaveLength(6);
    expect(parsed.origin.timeline).toHaveLength(6);
    expect(parsed.origin.timeline[0].year).toBe("1917");
    expect(parsed.origin.timeline[0].text).toContain("26.50");
    expect(parsed.origin.timeline[5].year).toBe("2002");
  });

  it("should pin the SHARE contract: 50/50 split, three years, 80% DDF match", () => {
    const parsed = parseFoundationPageData(rawData);
    expect(parsed.mechanism.steps).toHaveLength(5);
    const split = parsed.mechanism.steps.find((s) => s.title === "The 50/50 split");
    expect(split?.text).toContain("50% becomes the World Fund");
    expect(split?.text).toContain("District Designated Fund");
    const gg = parsed.mechanism.grantTypes.find((g) => g.name === "Global Grant");
    expect(gg?.size).toContain("$30,000");
    expect(gg?.match).toContain("80% match on DDF");
    expect(parsed.mechanism.funds).toHaveLength(3);
  });

  it("should pin the recognition ladder: PHF at $1,000 through AKS Platinum circles", () => {
    const parsed = parseFoundationPageData(rawData);
    expect(parsed.recognition.phfRows[0].amount).toBe("$1,000");
    expect(parsed.recognition.phfRows[0].recognition).toContain("Paul Harris Fellow");
    expect(parsed.recognition.societies).toHaveLength(6);
    const aks = parsed.recognition.societies.find((s) => s.name === "Arch Klumph Society");
    expect(aks?.requirement).toContain("$250,000");
    expect(parsed.recognition.aksCircles).toHaveLength(6);
    expect(parsed.recognition.aksCircles[5].range).toContain("$10,000,000");
  });

  it("should parse the impact JSON with exactly fifteen achievements per list", () => {
    const impact = parseFoundationImpactData(impactData);
    expect(impact.achievementsGlobal).toHaveLength(15);
    expect(impact.achievementsDistrict).toHaveLength(15);
    expect(impact.sources.items.length).toBeGreaterThanOrEqual(10);
  });

  it("should rank the top giving countries with the US first and note the Gates gift", () => {
    const impact = parseFoundationImpactData(impactData);
    expect(impact.funders.topCountries[0].country).toBe("United States");
    expect(impact.funders.topCountries[0].total).toContain("$197.4M");
    expect(impact.funders.countriesNote).toContain("Gates Foundation");
    expect(impact.funders.gates.text).toContain("two-to-one");
  });

  it("should name the district's verified giants and RCNS's own record", () => {
    const impact = parseFoundationImpactData(impactData);
    const names = impact.funders.districtNamed.map((d) => d.name).join(" ");
    expect(names).toContain("Manek");
    expect(names).toContain("Chandaria");
    const kikopey = impact.achievementsDistrict.find((a) => a.detail.includes("Kikopey"));
    expect(kikopey?.detail).toContain("RCNS");
    expect(impact.club.items.join(" ")).toContain("1963");
  });

  it("should chart the polio collapse honestly with three case bars", () => {
    const impact = parseFoundationImpactData(impactData);
    expect(impact.polio.caseBars).toHaveLength(3);
    expect(impact.polio.caseBars[0].cases).toBe("350,000");
    expect(impact.polio.caseBars[2].cases).toBe("52");
    expect(impact.polio.numbers.map((n) => n.value).join(" ")).toContain("$2.76B");
  });

  it("should carry the district's 13-year, final-year and heritage giving records from the farewell deck", () => {
    const impact = parseFoundationImpactData(impactData);
    expect(impact.funders.districtClubs.rows).toHaveLength(5);
    expect(impact.funders.districtClubs.rows[0].club).toContain("Muthaiga North");
    expect(impact.funders.districtClubs.rows[0].total).toBe("$293,243.31");
    const rcns = impact.funders.districtClubs.rows.find((r) => r.own);
    expect(rcns?.rank).toBe(4);
    expect(rcns?.total).toBe("$225,893.73");
    expect(impact.funders.lastDance.rows).toHaveLength(20);
    expect(impact.funders.lastDance.rows[0].club).toBe("Muthaiga");
    expect(impact.funders.lastDance.rows[19].club).toContain("Addis Ababa-West");
    expect(impact.funders.heritage.clubs).toHaveLength(14);
    expect(impact.funders.heritage.clubs[0].chartered).toBe("1930");
    const own = impact.funders.heritage.clubs.find((c) => c.own);
    expect(own?.rank).toBe(6);
    expect(own?.chartered).toBe("1963");
    expect(impact.funders.legacyStory.text).toContain("1979");
    expect(impact.funders.legacyStory.text).toContain("Chandaria");
  });

  it("should pin the points contract: $1 per $1, gated transfers, PHF minting, never Major Donor", () => {
    const parsed = parseFoundationPageData(rawData);
    const points = parsed.points;
    expect(points.earning.find((e) => e.label === "Endowment Fund")?.text).toContain("0 points");
    expect(points.transferRules.join(" ")).toContain("at least 100 points");
    expect(points.transferRules.join(" ")).toContain("Only the club president");
    expect(points.transferRules.join(" ")).toContain("Only the district governor");
    expect(points.transferRules.join(" ")).toContain("not be transferred from a person to a club or district");
    const mint = points.strategy.items[0];
    expect(mint).toContain("1,000 points");
    expect(mint).toContain("$500");
    expect(points.recognitionAmount).toContain("never count toward Major Donor");
    expect(points.clubRecognition.items.length).toBeGreaterThanOrEqual(5);
  });
});

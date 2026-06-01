import { describe, it, expect } from "vitest";
import { parseAboutPageData } from "../../domain/about-specs";
import rawData from "../../data/rotary-basics.json";

describe("About Page Spec Boundaries & Data Integrity", () => {
  it("should successfully parse the Rotary Basics JSON content against the Zod schema", () => {
    const parsed = parseAboutPageData(rawData);
    expect(parsed).toBeDefined();
    expect(parsed.welcomeTitle).toBe("Welcome to Rotary");
    expect(parsed.fourWayTestTitle).toBe("The Four-Way Test");
    expect(parsed.avenuesOfServiceTitle).toBe("Avenues of Service");
    expect(parsed.glossaryTitle).toBe("Rotary Glossary");
  });

  it("should contain exactly four elements in the Four-Way Test with insights", () => {
    const parsed = parseAboutPageData(rawData);
    expect(parsed.fourWayTest).toHaveLength(4);
    expect(parsed.fourWayTest[0].question).toContain("TRUTH");
    expect(parsed.fourWayTest[1].question).toContain("FAIR");
    expect(parsed.fourWayTest[2].question).toContain("GOODWILL");
    expect(parsed.fourWayTest[3].question).toContain("BENEFICIAL");

    expect(parsed.fourWayTest[0].insight).toBeDefined();
    expect(parsed.fourWayTest[0].insight?.overview).toContain("foundation");
  });

  it("should contain exactly five Avenues of Service with insights", () => {
    const parsed = parseAboutPageData(rawData);
    expect(parsed.avenuesOfService).toHaveLength(5);
    const ids = parsed.avenuesOfService.map((a) => a.id);
    expect(ids).toContain("club");
    expect(ids).toContain("vocational");
    expect(ids).toContain("community");
    expect(ids).toContain("international");
    expect(ids).toContain("youth");

    expect(parsed.avenuesOfService[0].insight).toBeDefined();
    expect(parsed.avenuesOfService[0].insight?.overview).toContain("Focuses on making");
  });

  it("should parse District Transition information accurately", () => {
    const parsed = parseAboutPageData(rawData);
    expect(parsed.districtTransition).toBeDefined();
    expect(parsed.districtTransition?.title).toBe("The Historic District Reorganization");
    expect(parsed.districtTransition?.effectiveDate).toBe("July 1, 2026");
    expect(parsed.districtTransition?.newDistricts).toHaveLength(2);
    expect(parsed.districtTransition?.newDistricts[0].name).toBe("District 9215");
    expect(parsed.districtTransition?.newDistricts[1].name).toBe("District 9216");
    expect(parsed.districtTransition?.rcnsAssignment).toContain("District 9215");
  });

  it("should contain all seven Areas of Focus with insight drawers", () => {
    const parsed = parseAboutPageData(rawData);
    expect(parsed.areasOfFocus).toHaveLength(7);
    const titles = parsed.areasOfFocus.map((f) => f.title);
    expect(titles).toContain("Peace & Conflict Resolution");
    expect(titles).toContain("Water & Sanitation");
    expect(titles).toContain("Supporting the Environment");

    // Verify insights exist
    const peaceFocus = parsed.areasOfFocus.find((f) => f.id === "peace");
    expect(peaceFocus?.insight).toBeDefined();
    expect(peaceFocus?.insight?.overview).toContain("grassroots");
  });

  it("should contain all seven Club Leadership and Committees", () => {
    const parsed = parseAboutPageData(rawData);
    expect(parsed.committees).toBeDefined();
    expect(parsed.committees).toHaveLength(7);
    const ids = parsed.committees!.map((c) => c.id);
    expect(ids).toContain("leadership");
    expect(ids).toContain("admin");
    expect(ids).toContain("membership");
    expect(ids).toContain("public-image");
    expect(ids).toContain("service-projects");
    expect(ids).toContain("foundation");
    expect(ids).toContain("youth");

    const membershipComm = parsed.committees!.find((c) => c.id === "membership");
    expect(membershipComm?.insight).toBeDefined();
    expect(membershipComm?.insight?.overview).toContain("lifeblood");
  });

  it("should parse Foundation and Polio statistics accurately", () => {
    const parsed = parseAboutPageData(rawData);
    expect(parsed.foundationFacts.totalContributed).toBe("$2.4 Billion");
    expect(parsed.polioEradication.casesDroppedPercentage).toBe("99%");
    expect(parsed.polioEradication.partners).toContain("World Health Organization (WHO)");
  });

  it("should contain valid terms and definitions in the glossary", () => {
    const parsed = parseAboutPageData(rawData);
    expect(parsed.glossary.length).toBeGreaterThan(5);
    const terms = parsed.glossary.map((g) => g.term);
    expect(terms).toContain("Interact");
    expect(terms).toContain("Rotaract");
    expect(terms).toContain("PolioPlus");
  });
});

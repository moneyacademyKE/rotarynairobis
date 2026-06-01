import { describe, it, expect } from "vitest";
import { parseRiHistory } from "../../domain/ri-specs";
import rawData from "../../data/ri-history.json";

describe("RI History Spec Boundaries & Data Integrity", () => {
  it("should successfully parse the RI History JSON ledger against the Zod schema", () => {
    const parsed = parseRiHistory(rawData);
    expect(parsed).toBeDefined();
    expect(parsed.pageTitle).toBe("Rotary International History");
    expect(parsed.mottosTitle).toBe("The Story of Rotary's Mottoes");
    expect(parsed.fourWayTestHistoryTitle).toBe("The History of the Four-Way Test");
    expect(parsed.bellHistoryTitle).toBe("History of the Rotary Bell & Gavel");
  });

  it("should parse motto details accurately", () => {
    const parsed = parseRiHistory(rawData);
    expect(parsed.mottos.sheldonMotto).toBe("He Profits Most Who Serves Best");
    expect(parsed.mottos.sheldonSpeech).toContain("Arthur Frederick Sheldon");
    expect(parsed.mottos.collinsMotto).toBe("Service Above Self");
    expect(parsed.mottos.collinsStory).toContain("Ben Collins");
    expect(parsed.mottos.legislation1989).toContain("1989 Council on Legislation");
  });

  it("should contain exactly fourteen detailed story paragraphs in the Four-Way Test", () => {
    const parsed = parseRiHistory(rawData);
    expect(parsed.fourWayTest.detailedStory).toHaveLength(14);
    expect(parsed.fourWayTest.detailedStory[0]).toContain("Herbert J. Taylor");
    expect(parsed.fourWayTest.detailedStory[2]).toContain("$400,000");
    expect(parsed.fourWayTest.detailedStory[13]).toContain("better citizen");
  });

  it("should parse bell history facts accurately", () => {
    const parsed = parseRiHistory(rawData);
    expect(parsed.bell.origin1922).toContain("HMS 'Victory'");
    expect(parsed.bell.symbolism).toContain("order, discipline");
    expect(parsed.bell.gavelSymbolism).toContain("authority");
  });

  it("should verify correct paths for mapped user images", () => {
    const parsed = parseRiHistory(rawData);
    expect(parsed.images.bannersImage).toBe("/images/rotary-banners.jpg");
    expect(parsed.images.bellImage).toBe("/images/rotary-bell.png");
    expect(parsed.images.mottoImage).toBe("/images/service-above-self.png");
  });
});

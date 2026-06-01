import { describe, it, expect } from "vitest";
import { parseRcnsProfile } from "../../domain/rcns-specs";
import rawData from "../../data/rcns-profile.json";

describe("RCNS Profile Spec Boundaries & Data Integrity", () => {
  it("should successfully parse the RCNS profile JSON ledger against the Zod schema", () => {
    const parsed = parseRcnsProfile(rawData);
    expect(parsed).toBeDefined();
    expect(parsed.welcomeTitle).toBe("Rotary Club of Nairobi South");
    expect(parsed.charterBadge).toBe("Chartered 1963");
    expect(parsed.awardsTitle).toBe("Awards & District Recognition");
    expect(parsed.newGenerationsTitle).toBe("New Generation Programmes");
  });

  it("should contain all historical content fields", () => {
    const parsed = parseRcnsProfile(rawData);
    expect(parsed.history.charterText).toContain("chartered in 1963");
    expect(parsed.history.notableMembersText).toContain("Pius Menezes");
    expect(parsed.history.districtsText).toContain("District 9212");
    expect(parsed.history.successText).toContain("twenty-some members");
  });

  it("should contain exactly four award items with periods and details", () => {
    const parsed = parseRcnsProfile(rawData);
    expect(parsed.awards).toHaveLength(4);
    expect(parsed.awards[0].title).toBe("Best Rotary Foundation Giving Club");
    expect(parsed.awards[0].period).toBe("2016/2017");
    expect(parsed.awards[3].title).toBe("Recognition for Public Image");
    expect(parsed.awards[3].period).toBe("2017/2018");
  });

  it("should contain exactly fifteen members in the roster list", () => {
    const parsed = parseRcnsProfile(rawData);
    expect(parsed.members).toHaveLength(15);
  });

  it("should specify correct roles for officers", () => {
    const parsed = parseRcnsProfile(rawData);
    const president = parsed.members.find(m => m.role === "President");
    expect(president).toBeDefined();
    expect(president?.name).toBe("Rtn Insight King'ori");

    const presidentElect = parsed.members.find(m => m.role === "President Elect");
    expect(presidentElect).toBeDefined();
    expect(presidentElect?.name).toBe("Rtn Fortune Nyakoe");

    const vicePresident = parsed.members.find(m => m.role === "Vice President");
    expect(vicePresident).toBeDefined();
    expect(vicePresident?.name).toBe("Rtn Fredrick Tongi");

    const ipp = parsed.members.find(m => m.role === "IPP");
    expect(ipp).toBeDefined();
    expect(ipp?.name).toBe("Rtn Faith Agnetta");
  });

  it("should parse youth program texts and mentorship details", () => {
    const parsed = parseRcnsProfile(rawData);
    expect(parsed.newGenerations.rotaractText).toContain("Kenyatta University");
    expect(parsed.newGenerations.interactText).toContain("Upper Hill Secondary");
    expect(parsed.newGenerations.babyClubsText).toContain("Kirinyaga");
  });
});

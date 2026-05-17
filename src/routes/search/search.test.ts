import { describe, it, expect } from "vitest";
import { executeSearch } from "../../lib/search-service";

const mockDbRows = [
  {
    id: 101,
    text: "Had an amazing fellowship with members of Rotary Club of Nairobi South! #Rotary #Fellowship",
    account: "RCNS",
    photos_json: "[\"photo1.jpg\"]",
    hashtags_json: "[\"Rotary\", \"Fellowship\"]"
  },
  {
    id: 102,
    text: "Successful tree planting service project at Langata Primary school today. Serving our community.",
    account: "RCNS_COMMUNITY",
    photos_json: "[\"photo2.jpg\"]",
    hashtags_json: "[\"Service\"]"
  },
  {
    id: 103,
    text: "Happy Birthday to our dynamic President! Let's celebrate together.",
    account: "RCNS_SYSTEM",
    photos_json: "[\"photo3.jpg\"]",
    hashtags_json: "[\"Birthday\"]"
  }
];

describe("Edge-Native Orama Search Service", () => {
  it("should return all posts if search term is empty or white spaces", async () => {
    const results = await executeSearch(mockDbRows, "");
    expect(results).toHaveLength(3);
    expect(results[0].id).toBe(101);
  });

  it("should find posts matching a simple keyword", async () => {
    const results = await executeSearch(mockDbRows, "tree");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(102);
    expect(results[0].photos).toContain("photo2.jpg");
  });

  it("should support fuzzy matching with typo tolerance", async () => {
    // Search with a typo: "Langata" misspelled as "Lagata"
    const results = await executeSearch(mockDbRows, "Lagata");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(102);
  });

  it("should search across both text and account name fields", async () => {
    const results = await executeSearch(mockDbRows, "COMMUNITY");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(102);
  });
});

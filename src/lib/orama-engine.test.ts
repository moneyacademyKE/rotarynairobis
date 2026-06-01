import { describe, it, expect } from "vitest";
import { getOramaIndex, indexPost, searchPosts } from "./orama-engine";

describe("Orama Search Engine Integration", () => {
  it("should initialize or return the index", async () => {
    const index = await getOramaIndex();
    expect(index).not.toBeNull();
  });

  it("should index a post and retrieve it through search", async () => {
    const post = {
      id: "999",
      text: "This is a special test event about Orama indexing in Kenya",
      account: "RCNS_TEST",
      type: "EVENT_POSTER",
      snippet: "Orama Test Snippet",
    };

    await indexPost(post);

    const searchResult = await searchPosts("Orama");
    expect(searchResult.count).toBeGreaterThanOrEqual(1);

    const hit = searchResult.hits[0];
    expect(hit.document.id).toBe("999");
    expect(hit.document.account).toBe("RCNS_TEST");
  });
});

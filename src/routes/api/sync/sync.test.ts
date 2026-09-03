import { describe, it, expect, vi, beforeEach } from "vitest";
import { onGet } from "./index";

// Mock JSON data imports
vi.mock("../../../data/rotary-basics.json", () => ({
  default: { basics: "test-basics" }
}));
vi.mock("../../../data/rcns-profile.json", () => ({
  default: { profile: "test-profile" }
}));
vi.mock("../../../data/ri-history.json", () => ({
  default: { history: "test-history" }
}));

describe("Sync API Endpoint - GET /api/sync", () => {
  let mockPostsFacts: any[];
  let mockMediaFacts: any[];
  let mockPlatform: any;
  let jsonMock: any;

  beforeEach(() => {
    mockPostsFacts = [
      { tx_id: 10, id: 1, text: "Post 1", account: "rcns", photos_json: "[]", hashtags_json: "[]", is_retraction: 0, created_at: "2026-06-01T12:00:00Z" },
      { tx_id: 11, id: 2, text: "Post 2", account: "rcns", photos_json: "[]", hashtags_json: "[]", is_retraction: 0, created_at: "2026-06-01T13:00:00Z" }
    ];

    mockMediaFacts = [
      { tx_id: 5, file_name: "media1.jpg", type: "PHOTO", snippet: "desc", raw_data: "{}", is_retraction: 0, created_at: "2026-06-01T12:05:00Z" }
    ];

    jsonMock = vi.fn();
  });

  it("should fetch all facts since default tx_id = 0", async () => {
    const bindPostsMock = vi.fn().mockReturnValue({
      all: vi.fn().mockResolvedValue({ results: mockPostsFacts })
    });
    const bindMediaMock = vi.fn().mockReturnValue({
      all: vi.fn().mockResolvedValue({ results: mockMediaFacts })
    });

    const mockDb = {
      prepare: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes("MAX(tx_id)")) {
          return {
            first: vi.fn().mockImplementation(() => {
              if (sql.includes("posts_facts")) return 11;
              if (sql.includes("media_facts")) return 5;
              return null;
            })
          };
        }
        if (sql.includes("posts_facts")) {
          return { bind: bindPostsMock };
        }
        if (sql.includes("media_facts")) {
          return { bind: bindMediaMock };
        }
        throw new Error("Unexpected query: " + sql);
      })
    };

    mockPlatform = {
      env: {
        DB: mockDb
      }
    };

    const request = new Request("http://localhost/api/sync");

    await onGet({ request, platform: mockPlatform, json: jsonMock } as any);

    expect(jsonMock).toHaveBeenCalledTimes(1);
    const [status, responseBody] = jsonMock.mock.calls[0];
    expect(status).toBe(200);

    // Verify correct D1 execution with default parameters
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("posts_facts"));
    expect(bindPostsMock).toHaveBeenCalledWith(0, 501);
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("media_facts"));
    expect(bindMediaMock).toHaveBeenCalledWith(0, 501);

    // Verify response body
    expect(responseBody.facts.posts).toEqual(mockPostsFacts);
    expect(responseBody.facts.media).toEqual(mockMediaFacts);
    expect(responseBody.static.rotaryBasics).toEqual({ basics: "test-basics" });
    expect(responseBody.meta).toBeDefined();
    expect(responseBody.meta.latest_posts_tx_id).toBe(11);
    expect(responseBody.meta.latest_media_tx_id).toBe(5);
  });

  it("should respect explicit posts_tx_id and media_tx_id parameter values", async () => {
    const bindPostsMock = vi.fn().mockReturnValue({
      all: vi.fn().mockResolvedValue({ results: [mockPostsFacts[1]] }) // only the second one is returned
    });
    const bindMediaMock = vi.fn().mockReturnValue({
      all: vi.fn().mockResolvedValue({ results: [] })
    });

    const mockDb = {
      prepare: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes("MAX(tx_id)")) {
          return {
            first: vi.fn().mockImplementation(() => {
              if (sql.includes("posts_facts")) return 11;
              if (sql.includes("media_facts")) return 5;
              return null;
            })
          };
        }
        if (sql.includes("posts_facts")) {
          return { bind: bindPostsMock };
        }
        if (sql.includes("media_facts")) {
          return { bind: bindMediaMock };
        }
        throw new Error("Unexpected query: " + sql);
      })
    };

    mockPlatform = {
      env: {
        DB: mockDb
      }
    };

    const request = new Request("http://localhost/api/sync?posts_tx_id=10&media_tx_id=5");

    await onGet({ request, platform: mockPlatform, json: jsonMock } as any);

    expect(jsonMock).toHaveBeenCalledWith(200, expect.any(Object));
    expect(bindPostsMock).toHaveBeenCalledWith(10, 501);
    expect(bindMediaMock).toHaveBeenCalledWith(5, 501);

    const responseBody = jsonMock.mock.calls[0][1];
    expect(responseBody.facts.posts).toHaveLength(1);
    expect(responseBody.facts.posts[0].tx_id).toBe(11);
    expect(responseBody.facts.media).toHaveLength(0);
    expect(responseBody.meta.latest_posts_tx_id).toBe(11);
    expect(responseBody.meta.latest_media_tx_id).toBe(5); // stays 5 since no new media records found
  });

  it("should filter facts by timestamp when since parameter is provided", async () => {
    const bindPostsMock = vi.fn().mockReturnValue({
      all: vi.fn().mockResolvedValue({ results: [mockPostsFacts[1]] })
    });
    const bindMediaMock = vi.fn().mockReturnValue({
      all: vi.fn().mockResolvedValue({ results: [] })
    });

    const mockDb = {
      prepare: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes("MAX(tx_id)")) {
          return {
            first: vi.fn().mockImplementation(() => {
              if (sql.includes("posts_facts")) return 11;
              if (sql.includes("media_facts")) return 5;
              return null;
            })
          };
        }
        if (sql.includes("posts_facts")) {
          return { bind: bindPostsMock };
        }
        if (sql.includes("media_facts")) {
          return { bind: bindMediaMock };
        }
        throw new Error("Unexpected query: " + sql);
      })
    };

    mockPlatform = {
      env: {
        DB: mockDb
      }
    };

    const request = new Request("http://localhost/api/sync?since=2026-06-01T12:30:00Z");

    await onGet({ request, platform: mockPlatform, json: jsonMock } as any);

    expect(jsonMock).toHaveBeenCalledWith(200, expect.any(Object));
    expect(bindPostsMock).toHaveBeenCalledWith("2026-06-01T12:30:00Z", 501);
    expect(bindMediaMock).toHaveBeenCalledWith("2026-06-01T12:30:00Z", 501);
  });

  it("should omit static pages when include_static is false", async () => {
    const mockDb = {
      prepare: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes("MAX(tx_id)")) {
          return {
            first: vi.fn().mockImplementation(() => {
              return null;
            })
          };
        }
        return {
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue({ results: [] })
          })
        };
      })
    };

    mockPlatform = {
      env: {
        DB: mockDb
      }
    };

    const request = new Request("http://localhost/api/sync?include_static=false");

    await onGet({ request, platform: mockPlatform, json: jsonMock } as any);

    expect(jsonMock).toHaveBeenCalledWith(200, expect.any(Object));
    const responseBody = jsonMock.mock.calls[0][1];
    expect(responseBody.static).toBeUndefined();
  });

  it("should return 500 when database queries fail", async () => {
    const mockDb = {
      prepare: vi.fn().mockImplementation(() => {
        throw new Error("D1 connection lost");
      })
    };

    mockPlatform = {
      env: {
        DB: mockDb
      }
    };

    const request = new Request("http://localhost/api/sync");

    await onGet({ request, platform: mockPlatform, json: jsonMock } as any);

    expect(jsonMock).toHaveBeenCalledWith(500, expect.objectContaining({
      error: "D1 connection lost"
    }));
  });

  it("should truncate oversized result sets and park the cursor at the last sent row", async () => {
    const oversized = Array.from({ length: 501 }, (_, i) => ({
      tx_id: i + 1, id: i + 1, text: `Post ${i + 1}`, account: "rcns",
      photos_json: "[]", hashtags_json: "[]", is_retraction: 0, created_at: "2026-06-01T12:00:00Z"
    }));
    const bindPostsMock = vi.fn().mockReturnValue({
      all: vi.fn().mockResolvedValue({ results: oversized }) // 501 rows = page cap + 1
    });
    const bindMediaMock = vi.fn().mockReturnValue({
      all: vi.fn().mockResolvedValue({ results: [] })
    });

    const mockDb = {
      prepare: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes("MAX(tx_id)")) {
          return {
            first: vi.fn().mockImplementation(() => {
              if (sql.includes("posts_facts")) return 600;
              if (sql.includes("media_facts")) return 5;
              return null;
            })
          };
        }
        if (sql.includes("posts_facts")) {
          return { bind: bindPostsMock };
        }
        if (sql.includes("media_facts")) {
          return { bind: bindMediaMock };
        }
        throw new Error("Unexpected query: " + sql);
      })
    };

    mockPlatform = {
      env: {
        DB: mockDb
      }
    };

    const request = new Request("http://localhost/api/sync");

    await onGet({ request, platform: mockPlatform, json: jsonMock } as any);

    expect(jsonMock).toHaveBeenCalledWith(200, expect.any(Object));
    // The query itself must be bounded — no unbounded full-table pulls.
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("LIMIT ?"));

    const responseBody = jsonMock.mock.calls[0][1];
    expect(responseBody.facts.posts).toHaveLength(500);
    expect(responseBody.meta.posts_truncated).toBe(true);
    expect(responseBody.meta.media_truncated).toBe(false);
    // Cursor parks at the LAST SENT row (500), not the DB max (600) —
    // otherwise the client would silently skip tx_ids 501..600.
    expect(responseBody.meta.latest_posts_tx_id).toBe(500);
    expect(responseBody.meta.latest_media_tx_id).toBe(5);
  });
});

import { describe, it, expect } from "vitest";
import { getCategoryBadge } from "../lib/gallery-utils";

describe("GalleryGrid Helper Methods & Data Integrity", () => {
  describe("getCategoryBadge", () => {
    it("should return correct emoji badge for Club Photo", () => {
      expect(getCategoryBadge("Club Photo")).toBe("📷 Club Photo");
    });

    it("should return correct emoji badge for Event Poster", () => {
      expect(getCategoryBadge("Event Poster")).toBe("📅 Event");
    });

    it("should return correct emoji badge for Birthday Celebration", () => {
      expect(getCategoryBadge("Birthday Celebration")).toBe("🎂 Birthday");
    });

    it("should return correct emoji badge for Event Recap", () => {
      expect(getCategoryBadge("Event Recap")).toBe("🎞️ Recap");
    });

    it("should fall back to raw input for unmapped categories", () => {
      expect(getCategoryBadge("Unknown Category")).toBe("Unknown Category");
      expect(getCategoryBadge("Meeting")).toBe("Meeting");
    });
  });
});

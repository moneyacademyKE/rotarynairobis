import { describe, it, expect } from "vitest";
import { parseGeminiResponse } from "./gemini-parser";

describe("Gemini Parser Certification", () => {
  it("should correctly parse a valid markdown JSON response from Gemini", () => {
    const raw = "```json\n{\"type\": \"EVENT_POSTER\", \"snippet\": \"A poster for a rotary event.\"}\n```";
    const result = parseGeminiResponse(raw);
    expect(result.type).toBe("EVENT_POSTER");
    expect(result.snippet).toBe("A poster for a rotary event.");
  });

  it("should fail validation if the type is invalid", () => {
    const raw = "```json\n{\"type\": \"INVALID_TYPE\", \"snippet\": \"Bad data.\"}\n```";
    expect(() => parseGeminiResponse(raw)).toThrow(/Failed to parse AI response/);
  });

  it("should handle plain JSON without markdown blocks", () => {
    const raw = "{\"type\": \"BIRTHDAY\", \"snippet\": \"Celebrate!\"}";
    const result = parseGeminiResponse(raw);
    expect(result.type).toBe("BIRTHDAY");
  });

  it("should throw if the JSON is malformed", () => {
    const raw = "Not JSON at all";
    expect(() => parseGeminiResponse(raw)).toThrow();
  });
});

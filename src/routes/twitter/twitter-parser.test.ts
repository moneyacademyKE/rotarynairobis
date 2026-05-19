import { describe, it, expect } from "vitest";
import { parseEventDate, reformatEventText } from "./index";

describe("Twitter Event Text Parsing & Formatting", () => {
  describe("parseEventDate", () => {
    it("should extract date from 'scheduled for 16 April 2026'", () => {
      const date = parseEventDate("scheduled for 16 April 2026");
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2026);
      expect(date!.getMonth()).toBe(3); // April is 3 (0-indexed)
      expect(date!.getDate()).toBe(16);
    });

    it("should extract date from '25th July 2026'", () => {
      const date = parseEventDate("25th July 2026");
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2026);
      expect(date!.getMonth()).toBe(6); // July is 6 (0-indexed)
      expect(date!.getDate()).toBe(25);
    });

    it("should NOT parse 'July 2026' as July 20, 2026", () => {
      const date = parseEventDate("July 2026");
      // Without day specified, it shouldn't treat 20 as the day
      if (date) {
        expect(date.getDate()).not.toBe(20);
      } else {
        expect(date).toBeNull();
      }
    });

    it("should parse numeric date formats like 09/02/2026", () => {
      const date = parseEventDate("on 09/02/2026");
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2026);
      expect(date!.getMonth()).toBe(1); // Feb is 1
      expect(date!.getDate()).toBe(9);
    });
  });

  describe("reformatEventText", () => {
    it("should format a club assembly flyer with venue and time correctly", () => {
      const text = "Rotary Club of Syokimau club assembly, members only meeting, scheduled for 16 April 2026, 7:00pm – 8:00pm at 67 Airport Hotel.";
      const formatted = reformatEventText(text, "rotaryclubofsyokimau");
      
      expect(formatted).toContain("The Rotary Club of Syokimau");
      expect(formatted).toContain("Club assembly");
      expect(formatted).toContain("at 67 Airport Hotel");
      expect(formatted).toContain("from 7:00 PM");
      expect(formatted).toContain("on Thursday, April 16, 2026");
    });

    it("should format the Jabali Installation with speaker and topic correctly", () => {
      const text = "The Jabali Installation, Rotary and Rotaract Jabali, 25th July 2026, featuring Presidents Mutie Mule and Emmah Tei";
      const formatted = reformatEventText(text, "rcns");

      expect(formatted).toContain("The Rotary Club of Nairobi South");
      expect(formatted).toContain("hosting Mutie Mule and Emmah Tei");
      expect(formatted).toContain("present on 'The Jabali Installation'");
      expect(formatted).toContain("on Saturday, July 25, 2026");
    });

    it("should preserve already formatted strings", () => {
      const text = "The Rotary Club of Nairobi will be hosting Eugene Maina to present on 'Celebrating all the love in your life' at Braeburn Theatre, Gitanga Road from 6:00 PM on Friday, February 20, 2026.";
      const formatted = reformatEventText(text, "rcns");
      expect(formatted).toBe(text);
    });
  });
});

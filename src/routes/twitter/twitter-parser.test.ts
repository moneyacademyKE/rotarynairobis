import { describe, it, expect } from "vitest";
import { parseEventDate, reformatEventText } from "../../lib/twitter-parser";

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

    it("should strip social media headers and format correctly", () => {
      const text = "'rotarymuthaiga' on Instagram\n\nIt’s time to align, connect, and move forward—together. 🔔✨\nour Club Assembly, an important moment where we reflect, plan, and strengthen the vision of the Rotary Club of Muthaiga. This is where ideas come alive, voices are heard, and impact begins.\n📍 Jacaranda Hotel, Westlands\n🗓️ 30th March 2026\n⏰ 6:00 PM – 8:00 PM";
      const formatted = reformatEventText(text, "rotarymuthaiga");
      expect(formatted).toContain("The Rotary Club of Nairobi Muthaiga");
      expect(formatted).toContain("Club assembly");
      expect(formatted).toContain("at Jacaranda Hotel, Westlands");
      expect(formatted).toContain("from 6:00 PM");
      expect(formatted).toContain("on Monday, March 30, 2026");
    });

    it("should fallback to keyword matching for common topics if regex matching fails", () => {
      const text = "We invite all members to our upcoming movie night fellowship this Saturday at K1 Parklands starting from 7 PM.";
      const formatted = reformatEventText(text, "rotarygachie");
      expect(formatted).toContain("The Rotary Club of Gachie");
      expect(formatted).toContain("Movie night fellowship");
      expect(formatted).toContain("at K1 Parklands");
      expect(formatted).toContain("from 7:00 PM");
    });

    it("should handle relative dates and cancellation format correctly", () => {
      // Mock post date is Tuesday, May 19, 2026. "this Thursday" is May 21, 2026.
      const text = "'rcngongroad' on Instagram\n\nNo fellowship this Thursday, because the Rotary Club of Ngong Road will be joining...";
      const formatted = reformatEventText(text, "rcns", "2026-05-19T12:00:00.000Z");
      expect(formatted).toContain("The Rotary Club of Ngong Road has no regular fellowship");
      expect(formatted).toContain("on Thursday, May 21, 2026");
    });

    it("should handle relative week and cancellation format correctly", () => {
      // Mock post date is Tuesday, May 19, 2026. "this week" matches Thursday, May 21, 2026.
      const text = "'rotaryclubofnairobithikard' on Instagram\n\nNo fellowship this week, People of Action. We are pausing our regular rhythm...";
      const formatted = reformatEventText(text, "rcns", "2026-05-19T12:00:00.000Z");
      expect(formatted).toContain("The Rotary Club of Nairobi Thika Road has no regular fellowship");
      expect(formatted).toContain("on Thursday, May 21, 2026");
    });
  });
});

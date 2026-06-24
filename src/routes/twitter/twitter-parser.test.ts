import { describe, it, expect } from "vitest";
import { parseEventDate, reformatEventText, extractVenue, formatExtractedDate } from "../../lib/twitter-parser";

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

  describe("extractVenue", () => {
    it("should extract venue with compound emoji and label '📍 Venue: Argyle Hotel'", () => {
      const venue = extractVenue("📍 Venue: Argyle Hotel\nDate: 27th June");
      expect(venue).toBe("Argyle Hotel");
    });

    it("should extract venue with prefix 'Venue: Bonds Garden, Upper Hill'", () => {
      const venue = extractVenue("Venue: Bonds Garden, Upper Hill\nDate: Friday");
      expect(venue).toBe("Bonds Garden, Upper Hill");
    });

    it("should extract venue with emoji '📍 Jacaranda Hotel, Westlands'", () => {
      const venue = extractVenue("📍 Jacaranda Hotel, Westlands\n🗓️ 30th March");
      expect(venue).toBe("Jacaranda Hotel, Westlands");
    });

    it("should extract venue with preposition 'at K1 Parklands'", () => {
      const venue = extractVenue("We invite all members to our fellowship at K1 Parklands starting from 7 PM.");
      expect(venue).toBe("K1 Parklands");
    });

    it("should fallback to known venue names if keywords exist in text", () => {
      const venue = extractVenue("Join us for a grand meeting at our favorite spot braeburn on Gitanga Road");
      expect(venue).toBe("Braeburn Theatre, Gitanga Road");
    });

    it("should identify virtual zoom meetings", () => {
      const venue = extractVenue("Join us online via Zoom meeting ID 123");
      expect(venue).toBe("Zoom (Virtual)");
    });

    it("should ignore generic 'our' extractions and return null", () => {
      const venue = extractVenue("Join us for the installation at our fellowship venue.");
      expect(venue).toBeNull();
    });
  });

  describe("Coverage Hardening for Twitter Parser", () => {
    it("should test formatExtractedDate directly", () => {
      expect(formatExtractedDate(null)).toBe("");
      expect(formatExtractedDate(new Date(2026, 3, 16))).toBe("April 16, 2026");
    });

    it("should test parseEventDate relative weekday shifts (diff < 0)", () => {
      // May 21, 2026 is a Thursday (4). "this Tuesday" (2) diff is 2 - 4 = -2.
      // -2 + 7 = 5. Target date is May 26, 2026.
      const date = parseEventDate("this Tuesday", "2026-05-21T12:00:00Z");
      expect(date).not.toBeNull();
      expect(date!.getDate()).toBe(26);
    });

    it("should test parseEventDate today and tomorrow keywords", () => {
      const dateToday = parseEventDate("today", "2026-05-21T12:00:00Z");
      expect(dateToday!.getDate()).toBe(21);

      const dateTomorrow = parseEventDate("tomorrow", "2026-05-21T12:00:00Z");
      expect(dateTomorrow!.getDate()).toBe(22);
    });

    it("should test parseEventDate this week keywords", () => {
      // Wednesday (3) -> Wednesday of this week (diff = 0)
      const dateWed = parseEventDate("this week", "2026-05-20T12:00:00Z");
      expect(dateWed!.getDate()).toBe(20);

      // Friday (5) -> Thursday of next week (diff = -1 -> 6 days ahead)
      const dateFri = parseEventDate("this week", "2026-05-22T12:00:00Z");
      expect(dateFri!.getDate()).toBe(28);
    });

    it("should test parseEventDate regex1 month patterns", () => {
      const date = parseEventDate("scheduled for Apr 15 2026", "2026-05-21T12:00:00Z");
      expect(date!.getMonth()).toBe(3); // April
      expect(date!.getDate()).toBe(15);
    });

    it("should parse club name starting with rotaryclubof or rotary", () => {
      // Test account starts with rotaryclubof
      const txt1 = reformatEventText("fellowship gathering", "rotarycluboflavington");
      expect(txt1).toContain("The Rotary Club of Lavington");

      // Test account starts with rotary
      const txt2 = reformatEventText("fellowship gathering", "rotarygachie");
      expect(txt2).toContain("The Rotary Club of Gachie");
    });

    it("should parse club name from body text regex matches", () => {
      const txtMetropolitan = reformatEventText("rotary club of metropolitan hosts", "rcns");
      expect(txtMetropolitan).toContain("The Rotary Club of Nairobi Metropolitan");

      const txtSouth = reformatEventText("rotary club of nairobi south will", "rcns");
      expect(txtSouth).toContain("The Rotary Club of Nairobi South");

      const txtEast = reformatEventText("rotary club of nairobi east is", "rcns");
      expect(txtEast).toContain("The Rotary Club of Nairobi East");

      const txtOther = reformatEventText("rotary club of Westlands will", "rcns");
      expect(txtOther).toContain("The Rotary Club of Westlands");
    });

    it("should extract topic using different regex patterns", () => {
      // Topic in double quotes
      const txtQuotes = reformatEventText("speaking on \"Future of AI\"", "rcns");
      expect(txtQuotes).toContain("an event on 'Future of AI'");

      // Topic using present on/speaking on
      const txtOn = reformatEventText("speaking on Future of AI", "rcns");
      expect(txtOn).toContain("an event on 'Future of AI'");

      // Fallback topic segment
      const txtFallback = reformatEventText("This is a Fellowship. Join us for tea.", "rcns");
      expect(txtFallback).toContain("Fellowship");
    });

    it("should extract date from text formatted as 'on [Date]'", () => {
      const txtDateOn = reformatEventText("fellowship gathering on April 15", "rcns", "invalid");
      expect(txtDateOn).toContain("on April 15");
    });

    it("should fallback to created_at if no date matches in text", () => {
      const txtFallbackCreated = reformatEventText("fellowship gathering", "rcns", "2026-04-15T12:00:00.000Z");
      expect(txtFallbackCreated).toContain("on Wednesday, April 15, 2026");
    });

    it("should parse cancellation for Naivasha DCA", () => {
      const txtCancel = reformatEventText("no meeting due to Naivasha DCA", "rcns", "2026-04-15T12:00:00.000Z");
      expect(txtCancel).toContain("no regular fellowship");
      expect(txtCancel).toContain("for the District Conference (DCA) in Naivasha");
    });

    it("should support fluid formatting branches for speaker and topic", () => {
      // speaker and NO topic (using weekly fellowship as forbidden topic word)
      const txtSpeakerOnly = reformatEventText("Weekly fellowship featuring John Doe", "rcns", "2026-04-15T12:00:00.000Z");
      expect(txtSpeakerOnly).toContain("will be hosting John Doe");
      expect(txtSpeakerOnly).not.toContain("present on");

      // NO speaker and special topic
      const txtSpecialTopicOnly = reformatEventText("speaking on Board assembly", "rcns", "2026-04-15T12:00:00.000Z");
      expect(txtSpecialTopicOnly).toContain("hosting the 'Board assembly' event");

      // NO speaker and non-special topic
      const txtTopicOnly = reformatEventText("speaking on Dynamic Programming", "rcns", "2026-04-15T12:00:00.000Z");
      expect(txtTopicOnly).toContain("hosting an event on 'Dynamic Programming'");
    });

    it("should ignore speakers with forbidden terms", () => {
      const txtForbiddenSpeaker = reformatEventText("featuring President Zoom", "rcns", "2026-04-15T12:00:00.000Z");
      expect(txtForbiddenSpeaker).not.toContain("hosting President Zoom");
    });

    it("should handle invalid parsed dates from 'on [Date]' regex", () => {
      const txtInvalidDate = reformatEventText("fellowship gathering on Xyz 15", "rcns", "2026-04-15T12:00:00.000Z");
      expect(txtInvalidDate).toContain("on Xyz 15");
    });

    it("should extract Lang'ata from Instagram header and ignore Upper Hill venue in text when account is rcns/null", () => {
      const text = "'rotarycluboflangata' on Instagram\n\nWeekly fellowship gathering.\nVenue: Bonds Garden, Upper Hill\nDate: 22nd May 2026";
      const formatted = reformatEventText(text, "rcns", "2026-05-19T12:00:00.000Z");
      expect(formatted).toContain("The Rotary Club of Nairobi-Lang'ata");
      expect(formatted).not.toContain("Nairobi Upper Hill");
    });

    it("should map account name 'rotarycluboflangata' to 'Nairobi-Lang'ata'", () => {
      const text = "Weekly fellowship gathering.";
      const formatted = reformatEventText(text, "rotarycluboflangata", "2026-05-19T12:00:00.000Z");
      expect(formatted).toContain("The Rotary Club of Nairobi-Lang'ata");
    });

    it("should extract Madaraka from Instagram header when account is rcns/null", () => {
      const text = "'rotary_madaraka' on Instagram\n\nWeekly fellowship gathering.";
      const formatted = reformatEventText(text, "rcns", "2026-05-19T12:00:00.000Z");
      expect(formatted).toContain("The Rotary Club of Nairobi Madaraka");
    });

    it("should resolve Kilimani Alfajiri from header text when account is null", () => {
      const text = "'rckilimanialfajiri' on Instagram\n\nWeekly fellowship gathering.";
      const formatted = reformatEventText(text, "rcns", "2026-05-19T12:00:00.000Z");
      expect(formatted).toContain("The Rotary Club of Kilimani Alfajiri");
    });

    it("should parse times containing periods correctly (e.g. 4.00pm)", () => {
      const text = "fellowship gathering on Thursday 16 April 2026 from 4.00pm at Bonds Garden";
      const formatted = reformatEventText(text, "rcns", "2026-04-15T12:00:00.000Z");
      expect(formatted).toContain("from 4:00 PM");
    });

    it("should not greedily match word contractions like 'isn't' or 'we'd' as topic quotes", () => {
      const text = "This isn't just an event; it's a celebration! Join us on Thursday 16 April 2026 at Bonds Garden from 6:00 PM.";
      const formatted = reformatEventText(text, "rcns", "2026-04-15T12:00:00.000Z");
      expect(formatted).not.toContain("isn't");
      expect(formatted).not.toContain("event");
      expect(formatted).toContain("invites you to a fellowship gathering");
    });

    it("should format installation events as invites with correct a/an articles", () => {
      const text = "'rcupperhill' on Instagram\n\nJoin us for the joint installation of our board on 11th July 2026 at 12th Floor, Anderson Center from 4.00pm.";
      const formatted = reformatEventText(text, "rcns", "2026-06-24T12:00:00Z");
      expect(formatted).toContain("invites you to a Joint Installation & Dinner Ceremony at 12th Floor, Anderson Center from 4:00 PM on Saturday, July 11, 2026");
    });

    it("should fall back to extracting venue, date, and time from snippet if missing in caption text", () => {
      const text = "'rcnairobieast' on Instagram\n\nThe stage is being set for our Installation Ceremony! See you then.";
      const snippet = "The Rotary Club of Nairobi East will be hosting the 'Installation Ceremony' event at Simba Corp Waiyaki Way from 6:00 PM on Saturday, July 4, 2026.";
      const formatted = reformatEventText(text, "rcns", "2026-06-24T12:00:00Z", snippet);
      
      expect(formatted).toContain("The Rotary Club of Nairobi East");
      expect(formatted).toContain("invites you to an Installation Ceremony");
      expect(formatted).toContain("at Simba Corp Waiyaki Way");
      expect(formatted).toContain("from 6:00 PM");
      expect(formatted).toContain("on Saturday, July 4, 2026");
    });

    it("should format digit-prefixed installation topics from snippet without article prefix", () => {
      const text = "'rcnairobieast' on Instagram\n\nThe stage is being set! See you then.";
      const snippet = "The Rotary Club of Nairobi East will be hosting the '2026/27 Installation Dinner of the Board of Directors' event at Simba Corp Waiyaki Way from 6:00 PM on Saturday, July 4, 2026.";
      const formatted = reformatEventText(text, "rcns", "2026-06-24T12:00:00Z", snippet);
      
      expect(formatted).toBe("The Rotary Club of Nairobi East invites you to 2026/27 Installation Dinner of the Board of Directors at Simba Corp Waiyaki Way from 6:00 PM on Saturday, July 4, 2026.");
    });

    it("should format 'Installation of President...' from snippet using 'the' article prefix", () => {
      const text = "'rotarycluboflangata' on Instagram\n\nAn Evening of Music. Fellowship. Purpose.\n\nJoin us for a memorable evening...";
      const snippet = "The Rotary Club of Nairobi-Lang'ata will be hosting the 'Installation of President Maina Njonjo & the 2026/2027 Board of Directors' event at Bonds Garden, Upper Hill from 6:00 PM on Friday, June 26, 2026.";
      const formatted = reformatEventText(text, "rcns", "2026-06-24T12:00:00Z", snippet);
      
      expect(formatted).toBe("The Rotary Club of Nairobi-Lang'ata invites you to the Installation of President Maina Njonjo & the 2026/2027 Board of Directors at Bonds Garden, Upper Hill from 6:00 PM on Friday, June 26, 2026.");
    });

    it("should bypass parser scaffolding and return snippet directly if it is already pre-formatted", () => {
      const text = "See you there!";
      const snippet = "The Rotary Club of Nairobi-Lang'ata invites you to the Installation of President Maina Njonjo & the 2026/2027 Board of Directors at Bonds Garden, Upper Hill from 6:00 PM on Friday, June 26, 2026.";
      const formatted = reformatEventText(text, "rcns", "2026-06-24T12:00:00Z", snippet);
      expect(formatted).toBe(snippet);
    });
  });
});





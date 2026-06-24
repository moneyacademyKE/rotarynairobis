import { SchemaType, type GenerationConfig } from "@google/generative-ai";

/**
 * Single source of truth for all Gemini image classification config.
 * Used by both the Cloudflare queue worker and the offline batch script.
 *
 * Key design decisions:
 * - `responseMimeType: "application/json"` forces the model to emit raw JSON,
 *   eliminating the markdown fence stripping hack.
 * - `responseSchema` structurally constrains the output so the model can only
 *   emit valid enum values and a string snippet — no hallucinated extra fields.
 */

export const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    type: {
      type: SchemaType.STRING,
      enum: ["EVENT_POSTER", "BIRTHDAY", "EVENT_RECAP", "PHOTO"],
      description: "The exclusive classification category for this image.",
    },
    snippet: {
      type: SchemaType.STRING,
      description:
        "A concise, human-readable summary, event sentence, or scene description.",
    },
  },
  required: ["type", "snippet"],
} as const;

export const GENERATION_CONFIG: GenerationConfig = {
  responseMimeType: "application/json",
  responseSchema: RESPONSE_SCHEMA as unknown as GenerationConfig["responseSchema"],
};

export const CLASSIFICATION_PROMPT = `You are an elite AI visual classifier and metadata extractor for the Rotary Club of Nairobi South.

Analyze the provided image and classify it into EXACTLY ONE of the following four categories:

───────────────────────────────────────────
CATEGORY DEFINITIONS
───────────────────────────────────────────

1. EVENT_POSTER
   A forward-looking graphic designed to INVITE or ANNOUNCE an upcoming activity.
   Visual signals: "Join us", "You are invited", "Register now", a future date,
   RSVP details, speaker name + topic, meeting agenda, event countdown, or ticket
   information. The primary purpose is to attract attendees to something yet to happen.

2. BIRTHDAY
   A graphic celebrating a specific member's personal milestone.
   Visual signals: a member's name or photo is prominent with a celebratory tone;
   phrases like "Happy Birthday", "Many Happy Returns", "Congratulations",
   "Wishing you"; balloon / cake / confetti motifs; or a work / club anniversary tribute.
   NOT a club project milestone or a general event celebration.

3. EVENT_RECAP
   A backward-looking graphic that CELEBRATES, REPORTS, or SUMMARISES something already done.
   Visual signals: "Thank you", "Highlights", "Moments from", "We did it", "In review",
   photo collages of people at a concluded event, award / certificate of appreciation
   presentations, fundraising leaderboards, district ranking graphics, results tables,
   or "Congratulations to…" banners.
   If the image shows a Certificate of Appreciation or award being presented → EVENT_RECAP.

4. PHOTO
   Candid or documentary photography — people talking, eating, working on a project,
   posing for a group shot, or participating in fellowship activities.
   No designed graphic elements (posters, banners, certificates, collages) dominate.
   CRITICAL: If a designed graphic is the focal point of the image, classify it into
   EVENT_POSTER, BIRTHDAY, or EVENT_RECAP — never use PHOTO for designed graphics.

───────────────────────────────────────────
DECISION TIE-BREAKERS
───────────────────────────────────────────

• EVENT_POSTER vs EVENT_RECAP → Ask: is the date shown in the FUTURE (→ EVENT_POSTER)
  or in the PAST (→ EVENT_RECAP)?

• PHOTO vs EVENT_RECAP → Ask: is a DESIGNED GRAPHIC the focal point (→ EVENT_RECAP)
  or are REAL PEOPLE the focal point (→ PHOTO)?

• BIRTHDAY vs EVENT_RECAP → Ask: does the graphic celebrate a SPECIFIC INDIVIDUAL's
  personal milestone (→ BIRTHDAY) or a CLUB / GROUP achievement (→ EVENT_RECAP)?

───────────────────────────────────────────
SNIPPET RULES & STRUCTURAL TEMPLATES
───────────────────────────────────────────

EVENT_POSTER — Generate a complete, natural English sentence summarizing the event.
  You MUST format the sentence directly matching the first applicable template below:

  a) Speaker + Topic (when both speaker and topic are present):
     "The Rotary Club of <Club Name> will be hosting <Speaker Name> to present on '<Topic>' at <Venue> from <Time> on <Weekday, Month Day, Year>."

  b) Speaker, no Topic:
     "The Rotary Club of <Club Name> will be hosting <Speaker Name> at <Venue> from <Time> on <Weekday, Month Day, Year>."

  c) Topic, no Speaker:
     - For installations, handovers, or change of leadership ceremonies (topic contains "installation", "handover", or "change of leadership"):
       * If <Topic> starts with "installation of", "of president", or "of our" (case-insensitive):
         "The Rotary Club of <Club Name> invites you to the <Topic> at <Venue> from <Time> on <Weekday, Month Day, Year>."
       * If <Topic> starts with a digit (e.g. "2026/27 Installation Dinner..."):
         "The Rotary Club of <Club Name> invites you to <Topic> at <Venue> from <Time> on <Weekday, Month Day, Year>."
       * If <Topic> starts with a vowel sound (e.g. "Induction Ceremony"):
         "The Rotary Club of <Club Name> invites you to an <Topic> at <Venue> from <Time> on <Weekday, Month Day, Year>."
       * Otherwise:
         "The Rotary Club of <Club Name> invites you to a <Topic> at <Venue> from <Time> on <Weekday, Month Day, Year>."
     
     - For other special events (topic contains "assembly", "visit", "night", "project", "celebration", "fellowship", "calendar", "board", "installation"):
       "The Rotary Club of <Club Name> will be hosting the '<Topic>' event at <Venue> from <Time> on <Weekday, Month Day, Year>."
     
     - For any other topic:
       "The Rotary Club of <Club Name> will be hosting an event on '<Topic>' at <Venue> from <Time> on <Weekday, Month Day, Year>."

  d) Neither speaker nor topic (general fellowship):
     "The Rotary Club of <Club Name> invites you to a fellowship gathering at <Venue> from <Time> on <Weekday, Month Day, Year>."

  e) Cancellation Notice (poster states "no fellowship", "no meeting", "pausing regular fellowship"):
     "Please note: The Rotary Club of <Club Name> has no regular fellowship on <Weekday, Month Day, Year> [for the District Conference (DCA) in Naivasha if relevant]."

───────────────────────────────────────────
EXTRACTION & NORMALIZATION STANDARDS
───────────────────────────────────────────

1. <Club Name> Resolution:
   Identify the hosting club name. If it is generic or not clear, fallback to "Nairobi South".
   Normalize the resolved name using the mapping below:
   • muthaiga → "Nairobi Muthaiga"
   • upper hill / upperhill → "Nairobi Upper Hill"
   • ngong → "Ngong Road"
   • syokimau → "Syokimau"
   • thika → "Nairobi Thika Road"
   • metropolitan → "Nairobi Metropolitan"
   • langata / lang'ata → "Nairobi-Lang'ata"
   • madaraka → "Nairobi Madaraka"
   • kilimani → "Kilimani Alfajiri"
   • east → "Nairobi East"
   • south → "Nairobi South"
   • nairobi → "Nairobi"

2. <Venue> Normalization:
   Extract the venue name and normalize it using this map if a match is found:
   • braeburn → "Braeburn Theatre, Gitanga Road"
   • radisson → "Radisson Blu, Upper Hill"
   • laico → "Laico Regency"
   • serena → "Nairobi Serena Hotel"
   • jacaranda → "Jacaranda Hotel, Westlands"
   • bonds garden → "Bonds Garden, Upper Hill"
   • argyle → "Argyle Hotel"
   • 67 airport → "67 Airport Hotel"
   • zoom / virtual / online → "Zoom (Virtual)"
   If missing or unreadable, default to "our fellowship venue".

3. <Time> Normalization:
   Format as "HH:MM AM/PM" (e.g. "6:00 PM", "12:30 PM"). If missing, default to "6:00 PM".

4. <Weekday, Month Day, Year> Resolution:
   Identify the absolute calendar date from the poster. 
   Format as: "Weekday, Month Day, Year" (e.g., "Friday, June 26, 2026").
   Verify the correct weekday matching that specific date (e.g., June 26, 2026 is indeed a Friday).

5. CRITICAL FOR TOPIC:
   The '<Topic>' must be the exact, complete title, theme, or heading shown on the flyer. For installations or change of leadership, always include the year prefix and board details if visible on the poster (e.g. '2026/27 Installation Dinner of the Board of Directors', not just 'Installation Dinner').

───────────────────────────────────────────
BIRTHDAY, RECAP, AND PHOTO SNIPPETS
───────────────────────────────────────────

BIRTHDAY — Write a warm, concise celebration message using the member's name if
  visible. Example: "Happy Birthday Rtn. Jane Doe! Wishing you a wonderful day." (max 120 chars)

EVENT_RECAP — Extract the main headline, award title, or summary phrase visible on
  the graphic. Example: "Top 20 Giving Clubs in District D9212 – 2025/26 Leaderboard" (max 120 chars)

PHOTO — Describe the scene concisely: who is doing what.
  Example: "Members planting trees at a community service project in Nairobi." (max 120 chars)

───────────────────────────────────────────
UNREADABLE / POOR QUALITY IMAGES
───────────────────────────────────────────

If the image is too blurry, dark, or low-resolution to classify or read reliably:
  • Classify as PHOTO.
  • Use "Rotary Club of Nairobi South fellowship event" as the snippet.
  • NEVER invent or hallucinate text that is not clearly visible in the image.`;


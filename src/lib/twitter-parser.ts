// Pure TypeScript utilities for parsing and formatting event text from social media flyers.
// Fully decoupled from Qwik/Qwik City to allow seamless testing in both Vitest and Bun Test environments.

// Helper to clean social media platform header info (e.g. 'username' on Instagram)
export function cleanPostText(text: string): string {
  if (!text) return "";
  let cleaned = text.replace(/^'[^']+'\s+on\s+(Instagram|Twitter|Telegram|Social)\s*/i, "");
  return cleaned.trim();
}

// Robust date extraction from social event flyer copy
export function parseEventDate(text: string, created_at?: string): Date | null {
  const cleaned = cleanPostText(text);
  const lowercase = cleaned.toLowerCase();
  
  // Parse baseDate from created_at or default to May 19, 2026 if none provided
  const baseDate = created_at ? new Date(created_at) : new Date(2026, 4, 19);

  // 1. Explicit Relative Weekdays (e.g., "this Thursday", "coming Wednesday", "no fellowship this Tuesday")
  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  for (let i = 0; i < weekdays.length; i++) {
    const dayName = weekdays[i];
    const regex = new RegExp(`\\b(?:this|coming|next|on|today's)\\s+${dayName}\\b`, "i");
    if (regex.test(lowercase) || lowercase.includes(`no fellowship this ${dayName}`)) {
      const baseDay = baseDate.getDay();
      let diff = i - baseDay;
      if (diff < 0) {
        diff += 7; // shift to next week
      }
      const targetDate = new Date(baseDate);
      targetDate.setDate(baseDate.getDate() + diff);
      return targetDate;
    }
  }

  // 2. Relative Keywords
  if (lowercase.includes("tomorrow")) {
    const targetDate = new Date(baseDate);
    targetDate.setDate(baseDate.getDate() + 1);
    return targetDate;
  }
  if (lowercase.includes("today")) {
    return new Date(baseDate);
  }
  if (lowercase.includes("this week") || lowercase.includes("no fellowship this week")) {
    const baseDay = baseDate.getDay();
    let targetDay = 4; // default to Thursday
    if (baseDay === 3) targetDay = 3; // if posted on Wednesday, default to Wednesday
    let diff = targetDay - baseDay;
    if (diff < 0) {
      diff += 7;
    }
    const targetDate = new Date(baseDate);
    targetDate.setDate(baseDate.getDate() + diff);
    return targetDate;
  }

  const months = [
    "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december",
    "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"
  ];
  
  // Try numeric date formats first (e.g. 09.02.2026 or 09/02/2026)
  const regexNumeric = /(\d{1,2})[./-](\d{1,2})[./-](\d{4})/;
  const matchNumeric = lowercase.match(regexNumeric);
  if (matchNumeric) {
    const day = parseInt(matchNumeric[1], 10);
    const monthIndex = parseInt(matchNumeric[2], 10) - 1;
    const year = parseInt(matchNumeric[3], 10);
    const date = new Date(year, monthIndex, day);
    if (!isNaN(date.getTime())) return date;
  }
  
  const regex1 = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?!\d)(?:st|nd|rd|th)?(?:\s*(?:,\s*)?(\d{4}))?/i;
  const match1 = lowercase.match(regex1);
  if (match1) {
    const monthStr = match1[1].slice(0, 3).toLowerCase();
    const monthIndex = months.indexOf(monthStr) % 12;
    const day = parseInt(match1[2], 10);
    const year = match1[3] ? parseInt(match1[3], 10) : baseDate.getFullYear();
    const date = new Date(year, monthIndex, day);
    if (!isNaN(date.getTime())) return date;
  }

  const regex2 = /(\d{1,2})(?!\d)(?:st|nd|rd|th)?(?:\s+of)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:\s*(?:,\s*)?(\d{4}))?/i;
  const match2 = lowercase.match(regex2);
  if (match2) {
    const day = parseInt(match2[1], 10);
    const monthStr = match2[2].slice(0, 3).toLowerCase();
    const monthIndex = months.indexOf(monthStr) % 12;
    const year = match2[3] ? parseInt(match2[3], 10) : baseDate.getFullYear();
    const date = new Date(year, monthIndex, day);
    if (!isNaN(date.getTime())) return date;
  }

  return null;
}

export function formatExtractedDate(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function reformatEventText(text: string, account: string, created_at?: string): string {
  const cleaned = cleanPostText(text);
  
  // If the text is already formatted as "The Rotary Club of ... will be hosting ..." or similar, return it directly!
  if (/^the\s+rotary\s+club\s+of\s+.*(?:will\s+be\s+hosting|invites\s+you\s+to)/i.test(cleaned.trim())) {
    const trimmed = cleaned.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  const lowercase = cleaned.toLowerCase();
  const rawTextLower = text.toLowerCase();
  
  // 1. Extract Club Name
  let derivedAccount = account || "";
  const headerMatch = text.match(/^'([^']+)'\s+on\s+(Instagram|Twitter|Telegram|Social)/i);
  if (headerMatch && headerMatch[1]) {
    const genericAccounts = ["rcns", "social", "bot", "twitter", "instagram", "telegram", "facebook"];
    const isGeneric = !derivedAccount || genericAccounts.includes(derivedAccount.toLowerCase().replace(/[^a-z0-9]/g, ''));
    if (isGeneric) {
      derivedAccount = headerMatch[1];
    }
  }

  let clubName = "Nairobi South";
  const accountClean = derivedAccount.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (accountClean.includes("muthaiga")) clubName = "Nairobi Muthaiga";
  else if (accountClean.includes("upperhill")) clubName = "Nairobi Upper Hill";
  else if (accountClean.includes("ngong")) clubName = "Ngong Road";
  else if (accountClean.includes("syokimau")) clubName = "Syokimau";
  else if (accountClean.includes("thika")) clubName = "Nairobi Thika Road";
  else if (accountClean.includes("metropolitan")) clubName = "Nairobi Metropolitan";
  else if (accountClean.includes("langata")) clubName = "Lang'ata";
  else if (accountClean.includes("madaraka")) clubName = "Nairobi Madaraka";
  else if (accountClean.includes("nairobi")) clubName = "Nairobi";
  else if (accountClean.startsWith("rotaryclubof")) {
    const rawName = accountClean.replace(/^rotaryclubof/, "");
    if (rawName.length > 2) {
      clubName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    }
  }
  else if (accountClean.startsWith("rotary")) {
    const rawName = accountClean.replace(/^rotary/, "");
    if (rawName.length > 2) {
      clubName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    }
  }

  // Fallback scan of the raw text headers for correct attribution if account is a generic bot/telegram name (e.g. rcns)
  if (accountClean === "rcns" || !derivedAccount) {
    const venueLower = (extractVenue(text) || "").toLowerCase();
    const isVenueUpperHill = venueLower.includes("upper hill") || venueLower.includes("upperhill") || venueLower.includes("bonds garden") || venueLower.includes("radisson");
    const isVenueThikaRoad = venueLower.includes("thika road") || venueLower.includes("thikard");
    const isVenueNgongRoad = venueLower.includes("ngong road");

    if (rawTextLower.includes("rcnairobieast") || rawTextLower.includes("nairobi east")) clubName = "Nairobi East";
    else if (rawTextLower.includes("rotaryclubofnairobithikard") || (!isVenueThikaRoad && rawTextLower.includes("thika road"))) clubName = "Nairobi Thika Road";
    else if (rawTextLower.includes("rcngongroad") || (!isVenueNgongRoad && rawTextLower.includes("ngong road"))) clubName = "Ngong Road";
    else if (rawTextLower.includes("rotaryjabali")) clubName = "Jabali";
    else if (rawTextLower.includes("rotarymuthaiga") || rawTextLower.includes("muthaiga")) clubName = "Nairobi Muthaiga";
    else if (rawTextLower.includes("rotary_madaraka") || rawTextLower.includes("madaraka")) clubName = "Nairobi Madaraka";
    else if (rawTextLower.includes("syokimau")) clubName = "Syokimau";
    else if (rawTextLower.includes("langata") || rawTextLower.includes("lang'ata")) clubName = "Lang'ata";
    else if (rawTextLower.includes("rcupperhill") || (!isVenueUpperHill && (rawTextLower.includes("upperhill") || rawTextLower.includes("upper hill")))) clubName = "Nairobi Upper Hill";
    else if (rawTextLower.includes("metropolitan")) clubName = "Nairobi Metropolitan";
  }
  
  // Body text scan fallback
  const clubRegex = /rotary\s+club\s+of\s+([A-Za-z\s]+?)(?:\s+hosts|\s+invites|\s+will|\s+is|\.|\n)/i;
  const clubMatch = cleaned.match(clubRegex);
  if (clubMatch && clubMatch[1].trim().length > 3 && clubMatch[1].trim().length < 30) {
    const rawClub = clubMatch[1].trim();
    const rawClubLower = rawClub.toLowerCase();
    if (rawClubLower.includes("muthaiga")) clubName = "Nairobi Muthaiga";
    else if (rawClubLower.includes("upperhill") || rawClubLower.includes("upper hill")) clubName = "Nairobi Upper Hill";
    else if (rawClubLower.includes("ngong")) clubName = "Ngong Road";
    else if (rawClubLower.includes("syokimau")) clubName = "Syokimau";
    else if (rawClubLower.includes("thika")) clubName = "Nairobi Thika Road";
    else if (rawClubLower.includes("metropolitan")) clubName = "Nairobi Metropolitan";
    else if (rawClubLower.includes("south") && rawClubLower.includes("nairobi")) clubName = "Nairobi South";
    else if (rawClubLower.includes("east") && rawClubLower.includes("nairobi")) clubName = "Nairobi East";
    else clubName = rawClub;
  }

  // 2. Extract Speaker
  let speaker = "";
  const speakerRegexes = [
    /(?:featuring|facilitated\s+by|speaker|keynote\s+by):?\s*([A-Z][a-zA-Z\s.,&]+?)(?=\s+at|\s+from|\s+on|\.|\n|$)/i
  ];
  
  for (const regex of speakerRegexes) {
    const match = cleaned.match(regex);
    if (match && match[1]) {
      let val = match[1].trim();
      val = val.replace(/^(?:presidents?|rtn\.?|dr\.?|mr\.?|mrs\.?|ms\.?|prof\.?)\s+/i, "").trim();
      const forbidden = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", 
                         "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December",
                         "Rotary", "Club", "Nairobi", "District", "Fellowship", "Join", "Zoom", "Meeting"];
      const hasForbidden = forbidden.some(word => new RegExp(`\\b${word}\\b`, "i").test(val));
      if (!hasForbidden && val.length > 2) {
        speaker = val;
        break;
      }
    }
  }

  // 3. Extract Topic
  let topic = "";
  const topicQuotesRegex = /['"“‘]([^'"”’\n]{5,100})['"”’]/;
  const topicOnRegex = /(?:present\s+on|speaking\s+on|topic:?)\s+['"“‘]?([^'"”’\n.]{5,100})['"”’]?/i;
  
  const quotesMatch = cleaned.match(topicQuotesRegex);
  if (quotesMatch && quotesMatch[1]) {
    topic = quotesMatch[1].trim();
  } else {
    const onMatch = cleaned.match(topicOnRegex);
    if (onMatch && onMatch[1]) {
      topic = onMatch[1].trim();
    } else {
      // Try keyword matching for common topics first to avoid selecting messy fallback segments
      const commonTopics = [
        { pattern: /club\s+assembly/i, label: "Club assembly" },
        { pattern: /board\s+game/i, label: "Board game fellowship" },
        { pattern: /movie\s+night/i, label: "Movie night fellowship" },
        { pattern: /sunshine\s+rally/i, label: "Sunshine rally" },
        { pattern: /koroga/i, label: "Koroga fellowship" },
        { pattern: /karaoke/i, label: "Karaoke night" },
        { pattern: /induction/i, label: "Induction ceremony" },
        { pattern: /charity\s+walk|walk\s+at/i, label: "Charity walk" },
        { pattern: /joint\s+fellowship/i, label: "Joint fellowship" },
        { pattern: /family\s+wellbeing|wellbeing/i, label: "Family wellbeing" },
        { pattern: /mental\s+health/i, label: "Mental health fellowship" },
        { pattern: /digital\s+literacy|elimika/i, label: "Digital literacy project" },
        { pattern: /blood\s+drive/i, label: "Blood donation drive" },
        { pattern: /redistricting/i, label: "Redistricting town hall" },
      ];
      for (const item of commonTopics) {
        if (item.pattern.test(cleaned)) {
          topic = item.label;
          break;
        }
      }

      if (!topic) {
        const segments = cleaned.split(/[.,\n]/).map(s => s.trim()).filter(s => s.length > 0);
        if (segments.length > 0) {
          let candidate = segments[0];
          const clubEscaped = clubName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const clubPrefixRegex = new RegExp(`^(?:the\\s+)?rotary\\s+club\\s+of\\s+(?:${clubEscaped}|[A-Za-z0-9]+)\\s*(?:to\\s+host|hosts)?`, "i");
          candidate = candidate.replace(clubPrefixRegex, "");
          candidate = candidate.trim();
          
          const forbiddenTopics = [
            "this wednesday", "this thursday", "this tuesday", "this monday", "this week",
            "no fellowship", "happy birthday", "join us", "we are", "save the date",
            "weekly fellowship", "fellowship today", "fellowship this", "headline", "it's time to"
          ];
          const isForbidden = forbiddenTopics.some(fw => candidate.toLowerCase().includes(fw));
          
          if (!isForbidden && candidate.length >= 4 && candidate.length <= 60) {
            topic = candidate.charAt(0).toUpperCase() + candidate.slice(1);
          }
        }
      }
    }
  }

  // 4. Extract Venue
  const extractedVenue = extractVenue(text);
  const venue = extractedVenue || "our fellowship venue";

  // 5. Extract Time
  let time = "6:00 PM";
  const timeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)\b/i;
  const timeMatch = cleaned.match(timeRegex);
  if (timeMatch) {
    const hours = timeMatch[1];
    const mins = timeMatch[2] || "00";
    const ampm = timeMatch[3].toUpperCase();
    time = `${hours}:${mins} ${ampm}`;
  }

  // 6. Extract Day and Date
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  let dayDate = "";
  const parsed = parseEventDate(cleaned, created_at);
  if (parsed) {
    const monthName = months[parsed.getMonth()];
    const dayOfWeek = parsed.toLocaleDateString("en-US", { weekday: 'long' });
    dayDate = `${dayOfWeek}, ${monthName} ${parsed.getDate()}, ${parsed.getFullYear()}`;
  } else {
    const dateRegex = /on\s+([A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,\s*\d{4})?)/i;
    const dateMatch = cleaned.match(dateRegex);
    if (dateMatch && dateMatch[1]) {
      const matchVal = dateMatch[1].trim();
      const parsedMatch = new Date(matchVal);
      if (!isNaN(parsedMatch.getTime())) {
        const dayOfWeek = parsedMatch.toLocaleDateString("en-US", { weekday: 'long' });
        dayDate = `${dayOfWeek}, ${matchVal}`;
      } else {
        dayDate = matchVal;
      }
    } else if (created_at) {
      const parsedFallback = new Date(created_at);
      if (!isNaN(parsedFallback.getTime())) {
        const monthName = months[parsedFallback.getMonth()];
        const dayOfWeek = parsedFallback.toLocaleDateString("en-US", { weekday: 'long' });
        dayDate = `${dayOfWeek}, ${monthName} ${parsedFallback.getDate()}, ${parsedFallback.getFullYear()}`;
      }
    }
  }
  
  if (!dayDate) {
    const defaultDate = created_at ? new Date(created_at) : new Date(2026, 4, 19);
    const monthName = months[defaultDate.getMonth()];
    const dayOfWeek = defaultDate.toLocaleDateString("en-US", { weekday: 'long' });
    dayDate = `${dayOfWeek}, ${monthName} ${defaultDate.getDate()}, ${defaultDate.getFullYear()}`;
  }

  // 7. Cancellation Notice Formatting
  const isNoFellowship = lowercase.includes("no fellowship") || lowercase.includes("no meeting") || lowercase.includes("pausing our regular");
  if (isNoFellowship) {
    let destination = "";
    if (lowercase.includes("naivasha") || lowercase.includes("dca")) {
      destination = " for the District Conference (DCA) in Naivasha";
    }
    return `Please note: The Rotary Club of ${clubName} has no regular fellowship on ${dayDate}${destination}.`;
  }

  // FLUID FORMATTING
  if (speaker && topic) {
    return `The Rotary Club of ${clubName} will be hosting ${speaker} to present on '${topic}' at ${venue} from ${time} on ${dayDate}.`;
  }
  
  if (speaker && !topic) {
    return `The Rotary Club of ${clubName} will be hosting ${speaker} at ${venue} from ${time} on ${dayDate}.`;
  }

  if (!speaker && topic) {
    const isSpecialEvent = ["assembly", "visit", "night", "project", "celebration", "fellowship", "calendar", "board", "installation"].some(w => topic.toLowerCase().includes(w));
    if (isSpecialEvent) {
      return `The Rotary Club of ${clubName} will be hosting the '${topic}' event at ${venue} from ${time} on ${dayDate}.`;
    }
    return `The Rotary Club of ${clubName} will be hosting an event on '${topic}' at ${venue} from ${time} on ${dayDate}.`;
  }

  return `The Rotary Club of ${clubName} invites you to a fellowship gathering at ${venue} from ${time} on ${dayDate}.`;
}

export function extractVenue(text: string): string | null {
  const cleaned = cleanPostText(text);
  const lowercase = cleaned.toLowerCase();
  
  if (lowercase.includes("zoom")) {
    return "Zoom (Virtual)";
  }
  
  // Look for compound location indicators (e.g. '📍 Venue:', '📍', 'Venue:', 'at')
  const venueRegex = /(?:📍\s*(?:venue\b[:\-]?\s*)?|\bvenue\b[:\-]?\s*|\bat\b\s*)([A-Z0-9][A-Za-z0-9\s,':-]{2,50}?)(?=\s+(?:\b(?:from|on|at|fellowship|date|time|kes|rotarians|starting|join|register|save|tomorrow|this)\b|🗓️|⏰)|\.|\n|$)/i;
  const venueMatch = cleaned.match(venueRegex);
  if (venueMatch && venueMatch[1]) {
    let val = venueMatch[1].trim();
    // Normalize multiple spaces
    val = val.replace(/\s+/g, " ");
    const forbidden = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Zoom", "Date", "Time", "From", "Rotarians"];
    if (!forbidden.some(word => val.toLowerCase().includes(word.toLowerCase()))) {
      const valLower = val.toLowerCase();
      if (valLower.includes("braeburn")) return "Braeburn Theatre, Gitanga Road";
      if (valLower.includes("radisson")) return "Radisson Blu, Upper Hill";
      if (valLower.includes("laico")) return "Laico Regency";
      if (valLower.includes("serena")) return "Nairobi Serena Hotel";
      if (valLower.includes("jacaranda")) return "Jacaranda Hotel, Westlands";
      if (valLower.includes("bonds garden")) return "Bonds Garden, Upper Hill";
      if (valLower.includes("argyle")) return "Argyle Hotel";
      if (valLower.includes("67 airport")) return "67 Airport Hotel";
      
      return val;
    }
  }
  
  if (lowercase.includes("braeburn")) return "Braeburn Theatre, Gitanga Road";
  if (lowercase.includes("radisson")) return "Radisson Blu, Upper Hill";
  if (lowercase.includes("laico")) return "Laico Regency";
  if (lowercase.includes("serena")) return "Nairobi Serena Hotel";
  if (lowercase.includes("jacaranda")) return "Jacaranda Hotel, Westlands";
  if (lowercase.includes("bonds garden")) return "Bonds Garden, Upper Hill";
  if (lowercase.includes("argyle")) return "Argyle Hotel";
  if (lowercase.includes("67 airport")) return "67 Airport Hotel";
  
  return null;
}

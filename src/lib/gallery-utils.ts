export function getCategoryBadge(category: string): string {
  switch (category) {
    case "Club Photo":
      return "📷 Club Photo";
    case "Event Poster":
      return "📅 Event";
    case "Birthday Celebration":
      return "🎂 Birthday";
    case "Event Recap":
      return "🎞️ Recap";
    default:
      return category;
  }
}

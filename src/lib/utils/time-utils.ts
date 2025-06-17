/**
 * Formats game time in minutes into a more readable string.
 * Example: 70 minutes -> "Jour 1, 01h10"
 * @param totalMinutes The total game time in minutes.
 * @returns A formatted string representation of the game time.
 */
export function formatGameTime(totalMinutes: number): string {
  if (isNaN(totalMinutes) || totalMinutes < 0) {
    return "Temps invalide";
  }

  const minutesInDay = 24 * 60;
  const days = Math.floor(totalMinutes / minutesInDay);
  const remainingMinutes = totalMinutes % minutesInDay;
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  const dayStr = `Jour ${days + 1}`; // Days are 1-indexed for readability
  const hourStr = hours.toString().padStart(2, '0');
  const minuteStr = minutes.toString().padStart(2, '0');

  return `${dayStr}, ${hourStr}h${minuteStr}`;
}

/**
 * Gets the current date and time as a formatted string.
 * @returns Formatted string e.g., "Jan 01, 2024, 12:00 PM"
 */
export function getCurrentDateTimeFormatted(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };
  return now.toLocaleString(undefined, options); // Use browser's default locale
}

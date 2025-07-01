
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

const dayMapping = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * Parses a day string like "Mon-Fri" or "Sat,Sun" into an array of day indices.
 * @param daysOfWeek The string to parse.
 * @returns An array of day indices (0=Sun, 1=Mon, ...).
 */
function parseDays(daysOfWeek: string): number[] {
    const activeDays: number[] = [];
    const parts = daysOfWeek.toLowerCase().split(',');
    for (const part of parts) {
        if (part.includes('-')) {
            const [start, end] = part.split('-');
            const startIndex = dayMapping.indexOf(start.trim());
            const endIndex = dayMapping.indexOf(end.trim());
            if (startIndex !== -1 && endIndex !== -1) {
                for (let i = startIndex; i <= endIndex; i++) {
                    activeDays.push(i);
                }
            }
        } else {
            const dayIndex = dayMapping.indexOf(part.trim());
            if (dayIndex !== -1) {
                activeDays.push(dayIndex);
            }
        }
    }
    return [...new Set(activeDays)];
}

/**
 * Checks if a service is available at a given game time.
 * @param totalMinutes The total game time in minutes from the start of the game.
 * @param availability An object containing openingHours and daysOfWeek strings.
 * @returns True if the service is available, false otherwise.
 */
export function isShopOpen(totalMinutes: number, availability?: { openingHours?: string; daysOfWeek?: string; }): boolean {
    if (!availability || (!availability.openingHours && !availability.daysOfWeek)) {
        return true; // Always available if no schedule is specified
    }
    
    const minutesInDay = 24 * 60;
    const currentDayIndex = new Date(new Date(0).getTime() + totalMinutes * 60000).getUTCDay(); // 0=Sun, 1=Mon...
    const currentMinuteOfDay = totalMinutes % minutesInDay;

    // Check day of week
    if (availability.daysOfWeek) {
        const openDays = parseDays(availability.daysOfWeek);
        if (openDays.length > 0 && !openDays.includes(currentDayIndex)) {
            return false;
        }
    }

    // Check opening hours
    if (availability.openingHours) {
        if (availability.openingHours.toLowerCase() === '24/7' || availability.openingHours === '00:00-23:59') return true;
        
        const parts = availability.openingHours.split('-').map(s => s.trim());
        if (parts.length !== 2) return true; // Malformed, assume open

        const [openHour, openMinute] = parts[0].split(':').map(Number);
        const [closeHour, closeMinute] = parts[1].split(':').map(Number);
        
        if (isNaN(openHour) || isNaN(openMinute) || isNaN(closeHour) || isNaN(closeMinute)) return true; // Malformed

        const openTotalMinutes = openHour * 60 + openMinute;
        const closeTotalMinutes = closeHour * 60 + closeMinute;
        
        // This simple logic doesn't handle overnight hours (e.g., 22:00-06:00) which would require more complex logic.
        // For the scope of this game, we assume shops close on the same day they open.
        if (currentMinuteOfDay < openTotalMinutes || currentMinuteOfDay >= closeTotalMinutes) {
            return false;
        }
    }
    
    return true;
}

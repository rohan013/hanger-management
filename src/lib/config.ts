export const STORAGE_CONFIG = {
  TARGET_IMAGE_WIDTH: 800,
  TARGET_IMAGE_QUALITY: 80,
};

/**
 * The single definition of "where this wardrobe is", used for both the weather
 * lookup and the date a recommendation is filed under. An explicit zone rather
 * than the host's local time: the two must agree, and the host's timezone can
 * change without anyone thinking about this app.
 */
export const APP_TIMEZONE = 'America/Los_Angeles';

/** Today's date in APP_TIMEZONE, as YYYY-MM-DD. */
export function today(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

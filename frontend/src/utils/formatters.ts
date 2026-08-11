/**
 * Formats duration given in minutes to human-readable hours string.
 * Examples:
 * - 60 => "1 hr"
 * - 120 => "2 hrs"
 * - 90 => "1.5 hrs"
 * - 30 => "0.5 hr"
 * - 45 => "0.75 hr"
 * - 180 => "3 hrs"
 */
export const formatDuration = (minutes: number | string | null | undefined): string => {
  if (minutes === null || minutes === undefined || minutes === '') return '';
  const mins = typeof minutes === 'string' ? parseFloat(minutes) : minutes;
  if (isNaN(mins) || mins <= 0) return '';

  const hours = mins / 60;

  if (hours === 1) {
    return '1 hr';
  }

  if (hours % 1 === 0) {
    return `${hours} hrs`;
  }

  const formatted = Number(hours.toFixed(2));
  return `${formatted} ${formatted <= 1 ? 'hr' : 'hrs'}`;
};

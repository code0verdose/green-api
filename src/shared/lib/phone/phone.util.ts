/**
 * Strips formatting from a phone number. A Russian number typed with the domestic
 * trunk prefix (8 XXX XXX XX XX) is converted to the international 7 XXX XXX XX XX.
 */
export function normalizePhoneDigits(input: string): string {
  const digits = input.replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('8') ? `7${digits.slice(1)}` : digits;
}

/** Display format for the numbers MAX accepts (RU, BY); anything else is shown as +digits. */
export function formatPhone(digits: string): string {
  if (!digits) return '';
  const ru = /^7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(digits);
  if (ru) return `+7 ${ru[1]} ${ru[2]}-${ru[3]}-${ru[4]}`;
  const by = /^375(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(digits);
  if (by) return `+375 ${by[1]} ${by[2]}-${by[3]}-${by[4]}`;
  return `+${digits}`;
}

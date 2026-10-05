import { formatPhone, normalizePhoneDigits } from './phone.util';

describe('normalizePhoneDigits', () => {
  it.each([
    ['+7 (999) 123-45-67', '79991234567'],
    ['8 999 123 45 67', '79991234567'],
    ['79991234567', '79991234567'],
    ['+375 29 123-45-67', '375291234567'],
    ['  +1 202 555 0100 ', '12025550100'],
    ['', ''],
    ['abc', ''],
  ])('normalizes "%s" to "%s"', (input, expected) => {
    expect(normalizePhoneDigits(input)).toBe(expected);
  });

  it('keeps a leading 8 when the number is not an 11-digit Russian one', () => {
    expect(normalizePhoneDigits('8123')).toBe('8123');
  });
});

describe('formatPhone', () => {
  it.each([
    ['79991234567', '+7 999 123-45-67'],
    ['375291234567', '+375 29 123-45-67'],
    ['12025550100', '+12025550100'],
    ['', ''],
  ])('formats "%s" as "%s"', (input, expected) => {
    expect(formatPhone(input)).toBe(expected);
  });
});

import { formatChatListTime, formatDayLabel, formatMessageTime, isSameDay } from './date.util';

// Tests run with TZ=UTC (vite.config.ts → test.env).
const NOW = Date.UTC(2026, 9, 5, 15, 30); // 5 Oct 2026, 15:30
const at = (day: number, hours: number, minutes = 0, month = 9, year = 2026) =>
  Date.UTC(year, month, day, hours, minutes);

describe('formatMessageTime', () => {
  it('shows hours and minutes', () => {
    expect(formatMessageTime(at(5, 9, 5))).toBe('09:05');
  });
});

describe('isSameDay', () => {
  it('compares calendar days, not 24-hour windows', () => {
    expect(isSameDay(at(5, 0, 1), at(5, 23, 59))).toBe(true);
    expect(isSameDay(at(4, 23, 59), at(5, 0, 1))).toBe(false);
  });
});

describe('formatDayLabel', () => {
  it.each([
    ['today', at(5, 8), 'Сегодня'],
    ['yesterday', at(4, 23), 'Вчера'],
    ['earlier this year', at(1, 12), '1 октября'],
    ['a previous year', at(31, 12, 0, 11, 2025), '31 декабря 2025 г.'],
  ])('labels %s', (_case, timestamp, expected) => {
    expect(formatDayLabel(timestamp, NOW)).toBe(expected);
  });
});

describe('formatChatListTime', () => {
  it.each([
    ['today → time', at(5, 14, 5), '14:05'],
    ['yesterday → «вчера»', at(4, 10), 'вчера'],
    ['older → short date', at(1, 10), '01.10.26'],
  ])('%s', (_case, timestamp, expected) => {
    expect(formatChatListTime(timestamp, NOW)).toBe(expected);
  });
});

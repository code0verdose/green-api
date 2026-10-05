const DAY_MS = 24 * 60 * 60 * 1000;

const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const dayMonthFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
const fullDateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const shortDateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
});

const startOfDay = (timestamp: number) => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

export const isSameDay = (a: number, b: number) => startOfDay(a) === startOfDay(b);

const isYesterday = (timestamp: number, now: number) =>
  startOfDay(timestamp) === startOfDay(startOfDay(now) - DAY_MS / 2);

/** "09:05" — time under a message bubble. */
export const formatMessageTime = (timestamp: number) => timeFormat.format(timestamp);

/** "Сегодня" / "Вчера" / "1 октября" / "31 декабря 2025 г." — separator in the message feed. */
export function formatDayLabel(timestamp: number, now: number = Date.now()): string {
  if (isSameDay(timestamp, now)) return 'Сегодня';
  if (isYesterday(timestamp, now)) return 'Вчера';
  const sameYear = new Date(timestamp).getFullYear() === new Date(now).getFullYear();
  return (sameYear ? dayMonthFormat : fullDateFormat).format(timestamp);
}

/** "14:05" / "вчера" / "01.10.26" — time of the last message in the chat list. */
export function formatChatListTime(timestamp: number, now: number = Date.now()): string {
  if (isSameDay(timestamp, now)) return formatMessageTime(timestamp);
  if (isYesterday(timestamp, now)) return 'вчера';
  return shortDateFormat.format(timestamp);
}

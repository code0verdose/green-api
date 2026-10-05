import { createAppTheme } from './mantine-theme.config';

describe('createAppTheme', () => {
  it.each([
    ['max', '#007aff'],
    ['telegram', '#3390ec'],
  ] as const)('uses the measured %s accent as the primary colour', (messenger, accent) => {
    const theme = createAppTheme(messenger);

    expect(theme.primaryColor).toBe(messenger);
    expect(theme.colors?.[messenger]?.[6]).toBe(accent);
    expect(theme.colors?.[messenger]).toHaveLength(10);
  });
});

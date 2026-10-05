import { createTheme, type MantineColorsTuple } from '@mantine/core';

import type { SharedConfig } from '@shared';

/** Shade 6 is the brand accent measured on web.max.ru (#007aff) and web.telegram.org (#3390ec). */
const PALETTES: Record<SharedConfig.Messenger, MantineColorsTuple> = {
  max: [
    '#ebf4ff',
    '#d1e7ff',
    '#a8d2ff',
    '#80bcff',
    '#52a5ff',
    '#298fff',
    '#007aff',
    '#006be0',
    '#005dc2',
    '#004ea3',
  ],
  telegram: [
    '#eff6fd',
    '#daebfc',
    '#bad9f9',
    '#99c8f6',
    '#74b4f2',
    '#54a2ef',
    '#3390ec',
    '#2d7fd0',
    '#276db3',
    '#215c97',
  ],
};

const SYSTEM_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif';

export const createAppTheme = (messenger: SharedConfig.Messenger) =>
  createTheme({
    primaryColor: messenger,
    primaryShade: 6,
    colors: PALETTES,
    fontFamily: SYSTEM_FONT,
    headings: { fontFamily: SYSTEM_FONT },
    defaultRadius: 'md',
    cursorType: 'pointer',
  });

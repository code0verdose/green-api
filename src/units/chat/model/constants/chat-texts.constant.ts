import type { SharedConfig } from '@shared';

export const NO_ACCOUNT_BY_PHONE: Record<SharedConfig.Messenger, string> = {
  max: 'У этого номера нет аккаунта MAX.',
  telegram:
    'У номера нет аккаунта Telegram или он скрыт настройками приватности. Попробуйте найти человека по @username.',
};

export const NO_ACCOUNT_BY_USERNAME = (username: string) =>
  `Пользователь ${username} не найден в Telegram.`;

export const RECIPIENT_FIELD: Record<
  SharedConfig.Messenger,
  { label: string; placeholder: string; description: string }
> = {
  max: {
    label: 'Номер телефона',
    placeholder: '+7 999 123-45-67',
    description: 'Номер России или Беларуси, на котором есть MAX',
  },
  telegram: {
    label: 'Номер телефона или @username',
    placeholder: '+7 999 123-45-67 или @username',
    description: 'Если номер скрыт настройками приватности, используйте @username',
  },
};

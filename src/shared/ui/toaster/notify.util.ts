import { type NotificationData, notifications } from '@mantine/notifications';

interface NotifyOptions {
  /** Stable id: a repeated toast with the same id is not stacked a second time. */
  id?: string;
  title?: string;
}

const show = (
  message: string,
  { id, title }: NotifyOptions,
  look: Pick<NotificationData, 'color' | 'autoClose'>,
) =>
  notifications.show({
    message,
    ...look,
    ...(id === undefined ? {} : { id }),
    ...(title === undefined ? {} : { title }),
  });

/** The only entry point for toasts; components never call the vendor API directly. */
export const notify = {
  success: (message: string, { title = 'Готово', ...options }: NotifyOptions = {}) =>
    show(message, { title, ...options }, { color: 'green', autoClose: 2500 }),
  error: (message: string, { title = 'Ошибка', ...options }: NotifyOptions = {}) =>
    show(message, { title, ...options }, { color: 'red', autoClose: 6000 }),
  info: (message: string, options: NotifyOptions = {}) =>
    show(message, options, { color: 'blue', autoClose: 4000 }),
};

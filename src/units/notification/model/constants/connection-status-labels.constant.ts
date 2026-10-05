import type { ConnectionStatus } from '../../service/stores/connection-status.store';

export type ConnectionTone = 'ok' | 'pending' | 'warning' | 'error';

export const CONNECTION_STATUS_VIEW: Record<
  ConnectionStatus,
  { label: string; tone: ConnectionTone }
> = {
  idle: { label: 'Подключение…', tone: 'pending' },
  connecting: { label: 'Подключение…', tone: 'pending' },
  online: { label: 'В сети', tone: 'ok' },
  reconnecting: { label: 'Нет связи, переподключаемся…', tone: 'warning' },
  standby: { label: 'Сообщения принимает другая вкладка', tone: 'ok' },
  stopped: { label: 'Получение сообщений остановлено', tone: 'error' },
};

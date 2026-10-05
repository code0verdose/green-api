import { CONNECTION_STATUS_VIEW } from '../../model/constants/connection-status-labels.constant';
import { useConnectionStatusStore } from '../stores/connection-status.store';

export function useConnectionStatus() {
  const status = useConnectionStatusStore((state) => state.status);
  const restart = useConnectionStatusStore((state) => state.restart);
  const { label, tone } = CONNECTION_STATUS_VIEW[status];
  return { status, label, tone, canRestart: status === 'stopped', restart };
}

import {
  IconAlertCircleFilled,
  IconCheck,
  IconChecks,
  IconClockHour4,
  type IconProps,
} from '@tabler/icons-react';
import type { ComponentType } from 'react';

import { MESSAGE_STATUS_LABEL } from '../model/constants/message-status.constant';
import type { MessageStatus } from '../types/chat.types';
import classes from './message-status-icon.module.css';

const ICONS: Record<MessageStatus, ComponentType<IconProps>> = {
  pending: IconClockHour4,
  sent: IconCheck,
  delivered: IconChecks,
  read: IconChecks,
  failed: IconAlertCircleFilled,
};

interface MessageStatusIconProps {
  status: MessageStatus;
  size?: number;
}

export function MessageStatusIcon({ status, size = 16 }: MessageStatusIconProps) {
  const Icon = ICONS[status];
  return (
    <Icon
      size={size}
      stroke={2}
      className={classes.icon}
      data-status={status}
      role="img"
      aria-label={MESSAGE_STATUS_LABEL[status]}
    />
  );
}

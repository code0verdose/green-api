import { Alert, Stack } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

import type { SharedApi } from '@shared';

import { NOTICE_COLOR } from '../model/constants/notice-color.constant';
import { useInstanceDiagnostics } from '../service/hooks/use-instance-diagnostics.hook';
import classes from './instance-banner.module.css';

interface InstanceBannerProps {
  client: SharedApi.GreenApiClient;
  idInstance: string;
}

/** Tells the user why messages may not arrive: instance state, settings, tariff quota. */
export function InstanceBanner({ client, idInstance }: InstanceBannerProps) {
  const { notices } = useInstanceDiagnostics(client, idInstance);
  if (notices.length === 0) return null;

  return (
    <Stack gap={8} className={classes.root}>
      {notices.map((notice) => (
        <Alert
          key={notice.id}
          color={NOTICE_COLOR[notice.tone]}
          title={notice.title}
          icon={<IconAlertTriangle size={18} />}
          variant="light"
          radius="md"
        >
          {notice.message}
        </Alert>
      ))}
    </Stack>
  );
}

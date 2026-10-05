import { Paper, Text, Title } from '@mantine/core';
import { getRouteApi, useNavigate } from '@tanstack/react-router';

import { SessionLib, SessionService, SessionUi } from '@units/session';
import { SharedUi } from '@shared';

import classes from './page.module.css';

const route = getRouteApi('/login');

export function LoginPage() {
  const { redirect } = route.useSearch();
  const navigate = useNavigate();
  const messenger = SessionService.useActiveMessenger();

  const goToChats = () =>
    void navigate({ href: SessionLib.resolveRedirect(redirect), replace: true });

  return (
    <main className={classes.root}>
      <Paper className={classes.card} radius="xl" shadow="md" p="xl">
        <div className={classes.brand}>
          <SharedUi.MessengerLogo messenger={messenger} size={56} />
          <Title order={1} className={classes.title}>
            Вход в чат
          </Title>
          <Text className={classes.subtitle} size="sm">
            Введите данные инстанса GREEN-API — и переписывайтесь в MAX или Telegram прямо из
            браузера.
          </Text>
        </div>
        <SessionUi.SignInForm onSignedIn={goToChats} />
      </Paper>
    </main>
  );
}

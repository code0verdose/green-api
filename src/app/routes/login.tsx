import { createFileRoute, redirect } from '@tanstack/react-router';

import { LoginPage } from '@pages/login';
import { SessionModel, SessionService } from '@units/session';

export const Route = createFileRoute('/login')({
  validateSearch: SessionModel.signInSearchSchema,
  beforeLoad: () => {
    if (SessionService.getSession()) throw redirect({ to: '/' });
  },
  component: LoginPage,
});

import { SharedApi } from '@shared';

import { describeSendFailure, UNCONFIRMED_SEND_TEXT } from './describe-send-failure.util';

describe('describeSendFailure', () => {
  it.each(['timeout', 'network', 'server'] as const)(
    'warns that a "%s" send may have gone through',
    (kind) => {
      expect(describeSendFailure(new SharedApi.GreenApiError(kind))).toBe(UNCONFIRMED_SEND_TEXT);
    },
  );

  it('explains a definite rejection as is', () => {
    expect(describeSendFailure(new SharedApi.GreenApiError('quota-exceeded'))).toMatch(
      /лимит тарифа/,
    );
  });
});

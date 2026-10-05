import { render, screen } from '@testing-library/react';

import { MessengerLogo } from './messenger-logo.component';

describe('MessengerLogo', () => {
  it.each([
    ['max', 'MAX'],
    ['telegram', 'Telegram'],
  ] as const)('draws the %s mark inline, sized as asked', (messenger, name) => {
    render(<MessengerLogo messenger={messenger} size={24} />);

    const logo = screen.getByRole('img', { name });
    expect(logo).toHaveAttribute('width', '24');
    expect(logo.tagName.toLowerCase()).toBe('svg');
  });
});

import { useId } from 'react';

import type { Messenger } from '@shared/config';

interface MessengerLogoProps {
  messenger: Messenger;
  size?: number;
}

/** Inline SVG marks: no external requests, so the strict CSP stays intact. */
export function MessengerLogo({ messenger, size = 40 }: MessengerLogoProps) {
  const gradientId = useId();

  if (messenger === 'telegram') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Telegram">
        <circle cx="12" cy="12" r="12" fill="#3390ec" />
        <path
          fill="#fff"
          d="M5.4 11.7 17.3 7c.6-.2 1 .1.9.9l-2 9.5c-.1.7-.6.8-1.1.5l-3.1-2.3-1.5 1.4c-.2.2-.3.3-.6.3l.2-3.1 5.6-5.1c.2-.2 0-.3-.4-.1l-6.9 4.4-3-.9c-.6-.2-.7-.6.1-.9Z"
        />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="MAX">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00b8ff" />
          <stop offset="1" stopColor="#b210db" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="7" fill={`url(#${gradientId})`} />
      <path
        fill="#fff"
        d="M12 5.8c-3.9 0-7 2.8-7 6.2 0 1.8.9 3.5 2.3 4.6L7 19.4l3.1-1.6c.6.1 1.2.2 1.9.2 3.9 0 7-2.8 7-6.2S15.9 5.8 12 5.8Z"
      />
    </svg>
  );
}

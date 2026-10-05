import { Avatar } from '@mantine/core';

interface ChatAvatarProps {
  initials: string;
  color: string;
  size?: number;
}

export function ChatAvatar({ initials, color, size = 48 }: ChatAvatarProps) {
  return (
    <Avatar color={color} variant="filled" radius="xl" size={size} aria-hidden>
      {initials}
    </Avatar>
  );
}

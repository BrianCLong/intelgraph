import React from 'react';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';

export interface PresenceUser {
  id: string;
  name: string;
  color?: string;
}

interface Props {
  users: PresenceUser[];
}

/**
 * PresenceAvatars renders collaborator avatars for the current session.
 */
const PresenceAvatars: React.FC<Props> = ({ users }) => (
  <Stack direction="row" spacing={1} data-testid="presence-avatars">
    {users.map(u => (
      <Avatar
        key={u.id}
        sx={{ bgcolor: u.color || 'primary.main', width: 24, height: 24 }}
        title={u.name}
      >
        {u.name.charAt(0).toUpperCase()}
      </Avatar>
    ))}
  </Stack>
);

export default PresenceAvatars;

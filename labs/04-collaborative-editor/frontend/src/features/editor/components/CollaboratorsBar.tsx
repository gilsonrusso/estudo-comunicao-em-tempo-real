import { Collaborator, RemoteCursor } from '../types/collab.types';
import { getContrastColor } from '../../../utils/color.js';
import { Users } from 'lucide-react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import Avatar from '@mui/material/Avatar';

export interface CollaboratorsBarProps {
  collaborators: Collaborator[];
  currentUserId: string;
  remoteCursors?: Map<string, RemoteCursor>;
  activeFile?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function CollaboratorsBar({
  collaborators,
  currentUserId,
  remoteCursors,
  activeFile = 'main.tex',
}: CollaboratorsBarProps) {
  return (
    <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
      <Tooltip title={`${collaborators.length} usuário(s) conectado(s)`} arrow>
        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            alignItems: 'center',
            color: 'text.secondary',
            fontSize: '0.78rem',
            fontWeight: 500,
            cursor: 'default',
          }}
        >
          <Users size={14} />
          <Typography component="span" sx={{ fontSize: '0.78rem', fontWeight: 600 }}>
            {collaborators.length}
          </Typography>
        </Stack>
      </Tooltip>

      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {collaborators.map((c, idx) => {
          const isMe = c.userId === currentUserId;
          const remoteCursor = remoteCursors?.get(c.userId);
          const currentFile = isMe ? activeFile : remoteCursor?.file || 'main.tex';
          return (
            <Tooltip
              key={c.userId}
              title={`${c.userName}${isMe ? ' (Você)' : ''} • em ${currentFile}`}
              arrow
            >
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  bgcolor: c.color,
                  color: getContrastColor(c.color),
                  border: '2px solid',
                  borderColor: 'background.paper',
                  marginLeft: idx === 0 ? 0 : '-7px',
                  boxShadow: 1,
                  cursor: 'pointer',
                  zIndex: collaborators.length - idx,
                  transition: 'transform 0.15s ease, z-index 0.15s',
                  '&:hover': {
                    transform: 'scale(1.15) translateY(-2px)',
                    zIndex: 30,
                  },
                }}
              >
                {getInitials(c.userName)}
              </Avatar>
            </Tooltip>
          );
        })}
      </Box>
    </Stack>
  );
}

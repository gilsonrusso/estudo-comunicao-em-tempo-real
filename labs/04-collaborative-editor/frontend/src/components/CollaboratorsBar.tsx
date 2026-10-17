import { Collaborator } from '../types/collab.js';
import { Users } from 'lucide-react';
import Tooltip from '@mui/material/Tooltip';

export interface CollaboratorsBarProps {
  collaborators: Collaborator[];
  currentUserId: string;
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
}: CollaboratorsBarProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
      <Tooltip title={`${collaborators.length} usuário(s) conectado(s)`} arrow>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            color: 'var(--text-muted)',
            fontSize: '0.78rem',
            fontWeight: 500,
            cursor: 'default',
          }}
        >
          <Users size={14} style={{ color: 'var(--text-dim)' }} />
          <span>{collaborators.length}</span>
        </div>
      </Tooltip>

      <div style={{ display: 'flex', alignItems: 'center' }}>
        {collaborators.map((c, idx) => {
          const isMe = c.userId === currentUserId;
          return (
            <Tooltip
              key={c.userId}
              title={`${c.userName}${isMe ? ' (Você)' : ''}`}
              arrow
            >
              <div
                style={{
                  position: 'relative',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: c.color,
                  color: '#ffffff',
                  border: '2px solid var(--border-color, #ffffff)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  marginLeft: idx === 0 ? 0 : '-7px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, z-index 0.15s',
                  zIndex: collaborators.length - idx,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.15) translateY(-2px)';
                  e.currentTarget.style.zIndex = '30';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1) translateY(0)';
                  e.currentTarget.style.zIndex = String(collaborators.length - idx);
                }}
              >
                <span>{getInitials(c.userName)}</span>
              </div>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

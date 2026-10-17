import React from 'react';
import { Collaborator } from '../types/collab.js';
import { Users } from 'lucide-react';

interface Props {
  collaborators: Collaborator[];
  currentUserId: string;
}

export const CollaboratorsBar: React.FC<Props> = ({ collaborators, currentUserId }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <Users size={16} />
        <span>{collaborators.length} online</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        {collaborators.map((c) => {
          const isMe = c.userId === currentUserId;
          return (
            <div
              key={c.userId}
              title={`${c.userName}${isMe ? ' (Você)' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: 'var(--bg-secondary)',
                border: `1px solid ${c.color}`,
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 500,
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: c.color,
                }}
              />
              <span>{c.userName}</span>
              {isMe && <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>(você)</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

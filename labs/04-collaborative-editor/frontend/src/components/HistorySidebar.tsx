import React from 'react';
import { DeltaOperation, DocumentSnapshot } from '../types/collab.js';
import { History, Database, Cpu, HardDriveDownload } from 'lucide-react';

interface Props {
  documentId: string;
  operations: DeltaOperation[];
  snapshots: DocumentSnapshot[];
  onManualFlush: () => void;
  isFlushing: boolean;
}

export const HistorySidebar: React.FC<Props> = ({
  operations,
  snapshots,
  onManualFlush,
  isFlushing,
}) => {
  return (
    <aside
      style={{
        width: '380px',
        backgroundColor: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header da Sidebar */}
      <div
        style={{
          padding: '1rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <History size={18} color="var(--accent)" />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Deltas & Persistência</h3>
        </div>

        <button
          onClick={onManualFlush}
          disabled={isFlushing}
          title="Salva um Snapshot no PostgreSQL imediatamente sem aguardar o debounce"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.65rem',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-main)',
            border: '1px solid var(--border)',
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
            fontWeight: 500,
            cursor: isFlushing ? 'not-allowed' : 'pointer',
          }}
        >
          <HardDriveDownload size={14} color="var(--green)" />
          <span>{isFlushing ? 'Salvando...' : 'Flush Snapshot'}</span>
        </button>
      </div>

      {/* Explicação Didática */}
      <div
        style={{
          margin: '0.75rem',
          padding: '0.75rem',
          backgroundColor: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: '0.5rem',
          fontSize: '0.75rem',
          lineHeight: '1.4',
          color: '#bae6fd',
        }}
      >
        <strong>Como funciona a persistência:</strong>
        <p style={{ marginTop: '0.25rem' }}>
          1. Cada tecla gera um <strong>Delta</strong> minúsculo via WebSocket (RAM).
        </p>
        <p>
          2. Após <strong>3 segundos</strong> sem digitação (debounce), o servidor grava um <strong>Snapshot</strong> consolidado no banco.
        </p>
      </div>

      {/* Seção 1: Snapshots / Checkpoints no Banco de Dados */}
      <div style={{ padding: '0 0.75rem', marginBottom: '0.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            fontWeight: 600,
            marginBottom: '0.5rem',
          }}
        >
          <Database size={14} color="var(--purple)" />
          <span>Snapshots no Banco de Dados ({snapshots.length})</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '160px', overflowY: 'auto' }}>
          {snapshots.map((s) => (
            <div
              key={s.id}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                padding: '0.5rem 0.65rem',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: 'var(--purple)' }}>Versão {s.version}</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {new Date(s.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Salvo por: <span style={{ color: 'var(--text-main)' }}>{s.savedBy}</span> ({s.reason})
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Seção 2: Stream de Operações Atômicas (Deltas em tempo real) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0.5rem 0.75rem', overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            fontWeight: 600,
            marginBottom: '0.5rem',
          }}
        >
          <Cpu size={14} color="var(--accent)" />
          <span>Stream de Deltas / Operações ({operations.length})</span>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column-reverse',
            gap: '0.35rem',
          }}
        >
          {operations.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '1rem' }}>
              Nenhuma alteração recente ainda. Comece a digitar!
            </div>
          ) : (
            operations.map((op, idx) => (
              <div
                key={idx}
                className="mono"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.25rem',
                  padding: '0.4rem 0.5rem',
                  fontSize: '0.72rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{op.userName}</span>
                  <span>{new Date(op.timestamp).toLocaleTimeString()}</span>
                </div>
                <div style={{ marginTop: '0.2rem', color: op.type === 'insert' ? 'var(--green)' : '#ef4444' }}>
                  {op.type === 'insert' ? (
                    <span>
                      + INSERT na pos <strong>{op.position}</strong>: "{op.text}"
                    </span>
                  ) : (
                    <span>
                      - DELETE na pos <strong>{op.position}</strong> (tamanho {op.length})
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
};

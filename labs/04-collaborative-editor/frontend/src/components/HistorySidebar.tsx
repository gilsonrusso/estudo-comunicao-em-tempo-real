import { DeltaOperation, DocumentSnapshot } from '../types/collab.js';
import { History, Database, Cpu, HardDriveDownload } from 'lucide-react';

export interface HistorySidebarProps {
  documentId: string;
  operations: DeltaOperation[];
  snapshots: DocumentSnapshot[];
  onManualFlush: () => void;
  isFlushing: boolean;
}

export function HistorySidebar({
  operations,
  snapshots,
  onManualFlush,
  isFlushing,
}: HistorySidebarProps) {
  return (
    <aside
      style={{
        width: '360px',
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
          height: '42px',
          padding: '0 1rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <History size={16} style={{ color: 'var(--accent)' }} />
          <h3 style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>Histórico & Deltas</h3>
        </div>

        <button
          onClick={onManualFlush}
          disabled={isFlushing}
          title="Salva um Snapshot no PostgreSQL imediatamente"
          className="btn-overleaf btn-overleaf-secondary"
          style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}
        >
          <HardDriveDownload size={13} style={{ color: 'var(--green-50)' }} />
          <span>{isFlushing ? 'Gravando...' : 'Flush'}</span>
        </button>
      </div>

      {/* Explicação Didática */}
      <div
        style={{
          margin: '0.75rem',
          padding: '0.65rem 0.75rem',
          backgroundColor: 'rgba(54, 108, 191, 0.08)',
          border: '1px solid rgba(54, 108, 191, 0.25)',
          borderRadius: 'var(--radius-base)',
          fontSize: '0.73rem',
          lineHeight: '1.45',
          color: 'var(--text-main)',
        }}
      >
        <strong style={{ color: 'var(--blue-50)' }}>Arquitetura Overleaf:</strong>
        <p style={{ marginTop: '0.2rem' }}>
          1. Cada tecla gera um <strong>Delta</strong> minúsculo via WebSocket (RAM / Redis).
        </p>
        <p>
          2. Após <strong>3 segundos</strong> sem digitação (debounce), o servidor consolida o <strong>Snapshot</strong> no banco.
        </p>
      </div>

      {/* Seção 1: Snapshots / Checkpoints no Banco de Dados */}
      <div style={{ padding: '0 0.75rem', marginBottom: '0.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            color: 'var(--text-muted)',
            fontWeight: 600,
            marginBottom: '0.4rem',
          }}
        >
          <Database size={13} style={{ color: 'var(--blue-40)' }} />
          <span>Snapshots no Banco ({snapshots.length})</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '160px', overflowY: 'auto' }}>
          {snapshots.map((s) => (
            <div
              key={s.id}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-base)',
                padding: '0.45rem 0.6rem',
                fontSize: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: 'var(--blue-50)' }}>Versão {s.version}</strong>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {new Date(s.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Salvo por: <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{s.savedBy}</span> ({s.reason})
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Seção 2: Stream de Operações Atômicas */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0.5rem 0.75rem', overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            color: 'var(--text-muted)',
            fontWeight: 600,
            marginBottom: '0.4rem',
          }}
        >
          <Cpu size={13} style={{ color: 'var(--accent)' }} />
          <span>Stream de Deltas ({operations.length})</span>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column-reverse',
            gap: '0.3rem',
          }}
        >
          {operations.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', padding: '1rem' }}>
              Nenhuma alteração recente ainda. Comece a digitar!
            </div>
          ) : (
            operations.map((op, idx) => (
              <div
                key={idx}
                className="mono"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '0.35rem 0.5rem',
                  fontSize: '0.7rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{op.userName}</span>
                  <span>{new Date(op.timestamp).toLocaleTimeString()}</span>
                </div>
                <div style={{ marginTop: '0.2rem', color: op.type === 'insert' ? 'var(--green-50)' : 'var(--red-50)' }}>
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

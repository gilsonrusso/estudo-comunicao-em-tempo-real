import React from 'react';
import { RefreshCw, ExternalLink, AlertTriangle, FileCheck, Download } from 'lucide-react';

interface Props {
  pdfBlobUrl: string | null;
  isCompiling: boolean;
  compileError: string | null;
  lastCompiledAt: string | null;
  onRecompile: () => void;
}

export const PdfPreview: React.FC<Props> = ({
  pdfBlobUrl,
  isCompiling,
  compileError,
  lastCompiledAt,
  onRecompile,
}) => {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#1e293b',
        borderLeft: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      {/* Barra de Ações do PDF */}
      <div
        style={{
          padding: '0.6rem 1rem',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            onClick={onRecompile}
            disabled={isCompiling}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              backgroundColor: isCompiling ? 'var(--border)' : 'var(--accent)',
              color: '#0b0f19',
              fontWeight: 700,
              fontSize: '0.78rem',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: isCompiling ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <RefreshCw size={13} className={isCompiling ? 'spin' : ''} />
            <span>{isCompiling ? 'Compilando no TeX Live...' : 'Recompilar PDF'}</span>
          </button>

          {lastCompiledAt && !compileError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--green)', fontSize: '0.75rem' }}>
              <FileCheck size={14} />
              <span>PDF atualizado às {lastCompiledAt}</span>
            </div>
          )}
        </div>

        {pdfBlobUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <a
              href={pdfBlobUrl}
              download="artigo-colaborativo.pdf"
              title="Baixar PDF gerado"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.25rem 0.5rem',
                backgroundColor: 'transparent',
                color: 'var(--text-main)',
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                fontSize: '0.72rem',
                textDecoration: 'none',
              }}
            >
              <Download size={12} />
              <span>Baixar</span>
            </a>

            <a
              href={pdfBlobUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir PDF em nova aba"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.25rem 0.5rem',
                backgroundColor: 'transparent',
                color: 'var(--text-main)',
                border: '1px solid var(--border)',
                borderRadius: '0.375rem',
                fontSize: '0.72rem',
                textDecoration: 'none',
              }}
            >
              <ExternalLink size={12} />
              <span>Nova Aba</span>
            </a>
          </div>
        )}
      </div>

      {/* Área de Visualização */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {compileError ? (
          <div
            style={{
              padding: '1.25rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderBottom: '1px solid #ef4444',
              margin: '1rem',
              borderRadius: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 600, marginBottom: '0.5rem' }}>
              <AlertTriangle size={18} />
              <span>Falha de Compilação do LaTeX</span>
            </div>
            <pre
              style={{
                backgroundColor: '#0a0d14',
                color: '#fca5a5',
                padding: '0.75rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                lineHeight: '1.5',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                maxHeight: '300px',
              }}
            >
              {compileError}
            </pre>
          </div>
        ) : null}

        {pdfBlobUrl ? (
          <iframe
            src={`${pdfBlobUrl}#toolbar=1&navpanes=0`}
            title="Pré-visualização do PDF"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: '#525659',
            }}
          />
        ) : !isCompiling ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              gap: '0.75rem',
              padding: '2rem',
              textAlign: 'center',
            }}
          >
            <FileCheck size={40} color="var(--border)" />
            <p style={{ fontSize: '0.9rem' }}>Nenhum PDF compilado ainda.</p>
            <p style={{ fontSize: '0.75rem', maxWidth: '300px' }}>
              Clique no botão <strong>Recompilar PDF</strong> acima para compilar o código LaTeX no micro-serviço TeX Live.
            </p>
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
              gap: '0.75rem',
            }}
          >
            <RefreshCw size={32} className="spin" />
            <span style={{ fontSize: '0.85rem' }}>Compilando documento via pdflatex...</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

import { RefreshCw, ExternalLink, AlertTriangle, FileCheck, Download } from 'lucide-react';

export interface PdfPreviewProps {
  pdfBlobUrl: string | null;
  isCompiling: boolean;
  compileError: string | null;
  lastCompiledAt: string | null;
  onRecompile: () => void;
}

export function PdfPreview({
  pdfBlobUrl,
  isCompiling,
  compileError,
  lastCompiledAt,
  onRecompile,
}: PdfPreviewProps) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-pdf)',
        borderLeft: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      {/* Barra de Ações do PDF (Estilo Overleaf) */}
      <div
        style={{
          height: '42px',
          padding: '0 1rem',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={onRecompile}
            disabled={isCompiling}
            className="btn-overleaf btn-overleaf-primary"
            title="Recompilar código LaTeX no servidor TeX Live (Ctrl+Enter)"
          >
            <RefreshCw size={13} className={isCompiling ? 'spin' : ''} />
            <span>{isCompiling ? 'Compilando...' : 'Recompile'}</span>
          </button>

          {lastCompiledAt && !compileError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: 'var(--green-50)',
                fontSize: '0.75rem',
                fontWeight: 500,
              }}
            >
              <FileCheck size={14} />
              <span>PDF atualizado ({lastCompiledAt})</span>
            </div>
          )}
        </div>

        {pdfBlobUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <a
              href={pdfBlobUrl}
              download="artigo-overleaf.pdf"
              title="Baixar PDF gerado"
              className="btn-overleaf btn-overleaf-secondary"
            >
              <Download size={13} />
              <span>Baixar</span>
            </a>

            <a
              href={pdfBlobUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir PDF em nova aba"
              className="btn-overleaf btn-overleaf-secondary"
            >
              <ExternalLink size={13} />
              <span>Nova Aba</span>
            </a>
          </div>
        )}
      </div>

      {/* Área de Visualização com suporte a Light e Dark */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {compileError ? (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'rgba(184, 58, 51, 0.08)',
              border: '1px solid var(--red-50)',
              margin: '1rem',
              borderRadius: 'var(--radius-medium)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--red-50)', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.85rem' }}>
              <AlertTriangle size={16} />
              <span>Falha de Compilação do LaTeX</span>
            </div>
            <pre
              style={{
                backgroundColor: 'var(--bg-editor)',
                color: 'var(--red-40)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-base)',
                fontSize: '0.75rem',
                lineHeight: '1.5',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                fontFamily: 'var(--font-mono)',
                maxHeight: '280px',
                border: '1px solid var(--border)',
              }}
            >
              {compileError}
            </pre>
          </div>
        ) : null}

        {pdfBlobUrl ? (
          <div style={{ flex: 1, width: '100%', height: '100%', padding: '0.5rem', display: 'flex', justifyContent: 'center' }}>
            <iframe
              src={`${pdfBlobUrl}#toolbar=1&navpanes=0`}
              title="Pré-visualização do PDF"
              style={{
                width: '100%',
                height: '100%',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-base)',
                boxShadow: 'var(--pdf-shadow)',
                backgroundColor: 'var(--white)',
              }}
            />
          </div>
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
            <FileCheck size={38} style={{ color: 'var(--text-dim)' }} />
            <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>Nenhum PDF compilado ainda</p>
            <p style={{ fontSize: '0.78rem', maxWidth: '300px', lineHeight: '1.4' }}>
              Clique em <strong>Recompile</strong> acima para compilar o código LaTeX no micro-serviço TeX Live.
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
            <RefreshCw size={28} className="spin" />
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>Compilando documento via pdflatex...</span>
          </div>
        )}
      </div>
    </div>
  );
};

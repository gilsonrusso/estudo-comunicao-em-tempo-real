CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    version INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_operations (
    id VARCHAR(100) PRIMARY KEY,
    document_id VARCHAR(100) REFERENCES documents(id) ON DELETE CASCADE,
    user_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    position INT NOT NULL,
    text TEXT,
    length INT,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_snapshots (
    id VARCHAR(100) PRIMARY KEY,
    document_id VARCHAR(100) REFERENCES documents(id) ON DELETE CASCADE,
    version INT NOT NULL,
    content TEXT NOT NULL,
    saved_by VARCHAR(100) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_files (
    id VARCHAR(100) PRIMARY KEY,
    document_id VARCHAR(100) REFERENCES documents(id) ON DELETE CASCADE,
    path VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_key VARCHAR(500),
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(document_id, path)
);

-- Seed do documento padrão (Artigo Científico em LaTeX)
INSERT INTO documents (id, title, content, version, updated_at)
VALUES (
    'doc-1',
    'Artigo Científico em LaTeX: Sistemas Distribuídos em Tempo Real',
    '\documentclass{article}
\usepackage[utf8]{inputenc}
\usepackage{amsmath}
\usepackage{graphicx}
\usepackage{geometry}
\geometry{a4paper, margin=1in}

\title{Distributed Real-Time Systems: A Study on Collaborative Editing and TeX Compilation}
\author{Alice Silva \and Bob Santos}
\date{\today}

\begin{document}

\maketitle

\begin{abstract}
Este artigo investiga os mecanismos de sincronização colaborativa em tempo real com Transformação Operacional (OT) e persistência de duas camadas (Redis + PostgreSQL). Demonstramos o desacoplamento de alta frequência via WebSockets e a compilação isolada de documentos LaTeX em um micro-serviço TeX Live dedicado com suporte a imagens no bucket MinIO.
\end{abstract}

\section{Introdução}
Plataformas como o Overleaf revolucionaram a escrita científica ao permitir que múltiplos pesquisadores editem o mesmo documento simultaneamente. O desafio central reside em garantir a convergência das edições sem sobrecarregar o compilador.

\section{Fundamentação Teórica}
A convergência de operações concorrentes é garantida pelo modelo de Transformação Operacional:
\begin{equation}
  T(op_1, op_2) = (op''_1, op''_2) \quad \text{onde} \quad op_1 \circ op''_2 \equiv op_2 \circ op''_1
\end{equation}

Quando o usuário para de digitar, um gatilho de debounce consolida as operações atômicas em um snapshot persistido.

\section{Arquitetura e Suporte a Múltiplos Ativos}
A separação do compilador em um pool elástico de contêineres permite que ativos binários (figuras, fontes, pacotes de estilo) sejam armazenados em Object Storage (MinIO) e injetados de forma sob demanda no sandbox de compilação:

\begin{figure}[htbp]
  \centering
  \includegraphics[width=0.75\linewidth]{architecture.png}
  \caption{Topologia de microsserviços com bucket MinIO e compilador isolado em sandbox efêmero.}
  \label{fig:architecture}
\end{figure}

\section{Resultados e Conclusão}
A integração entre OT via WebSockets, bucket MinIO e o micro-serviço TeX Live atinge latência inferior a 10ms para broadcast de cursores remotos, gerando PDFs vetoriais com figuras de alta qualidade sem sobrecarregar o banco de dados principal.

\end{document}',
    1,
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    content = EXCLUDED.content;

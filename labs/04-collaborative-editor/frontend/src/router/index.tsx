import { Routes, Route, Navigate } from 'react-router';
import { ArticlesDashboardPage } from '../features/articles/pages/ArticlesDashboardPage';
import { EditorPage } from '../features/editor/pages/EditorPage';

export function AppRoutes() {
  return (
    <Routes>
      {/* 1. Página Inicial: Dashboard com Tabela DataGrid e Criação de Artigos */}
      <Route path="/" element={<ArticlesDashboardPage />} />

      {/* 2. IDE do Editor Colaborativo em LaTeX com roteamento por documentId */}
      <Route path="/editor/:documentId" element={<EditorPage />} />
      <Route path="/editor" element={<Navigate to="/editor/doc-1" replace />} />

      {/* Rota Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

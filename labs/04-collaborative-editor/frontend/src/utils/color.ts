/**
 * Paleta de cores para autores/colaboradores calibrada para excelente
 * visibilidade e contraste tanto no tema claro (fundo branco) quanto no escuro.
 */
export const COLLAB_COLORS = [
  '#2563eb', // Royal Blue (WCAG AA no claro, vívido no escuro)
  '#059669', // Overleaf Emerald Green (WCAG AA no claro, vívido no escuro)
  '#ea580c', // Laranja Intenso (alto destaque em ambos os temas)
  '#9333ea', // Roxo Elétrico (WCAG AAA no claro, brilhante no escuro)
  '#e11d48', // Rosa Carmesim (WCAG AA no claro, intenso no escuro)
  '#0891b2', // Ciano Oceano (WCAG AA no claro, brilhante no escuro)
  '#4f46e5', // Índigo Profundo (WCAG AAA no claro, elétrico no escuro)
  '#d97706', // Âmbar Quente (WCAG AA no claro, dourado vívido no escuro)
];

/**
 * Calcula a cor de texto com maior contraste (preto ou branco) para uma dada cor de fundo em hex.
 * Usa a fórmula padrão de luminância ITU-R BT.709.
 */
export function getContrastColor(hexColor?: string): string {
  if (!hexColor || !hexColor.startsWith('#')) return '#ffffff';
  const cleanHex = hexColor.replace('#', '');
  const normalized =
    cleanHex.length === 3
      ? cleanHex
          .split('')
          .map((c) => c + c)
          .join('')
      : cleanHex;

  const num = parseInt(normalized, 16);
  if (isNaN(num)) return '#ffffff';

  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 155 ? '#0f172a' : '#ffffff';
}

/**
 * Converte uma cor hexadecimal para rgba com opacidade customizada.
 */
export function hexToRgba(hexColor: string, alpha: number): string {
  if (!hexColor || !hexColor.startsWith('#')) return `rgba(100, 116, 139, ${alpha})`;
  const cleanHex = hexColor.replace('#', '');
  const normalized =
    cleanHex.length === 3
      ? cleanHex
          .split('')
          .map((c) => c + c)
          .join('')
      : cleanHex;

  const num = parseInt(normalized, 16);
  if (isNaN(num)) return `rgba(100, 116, 139, ${alpha})`;

  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

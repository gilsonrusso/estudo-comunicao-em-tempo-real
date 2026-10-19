import { useEffect, useRef, useState, useCallback } from 'react';

export interface ElementDimensions {
  width: number;
  height: number;
}

export interface UseResizeObserverOptions {
  /**
   * Callback opcional disparado quando as dimensões do elemento mudam.
   */
  onResize?: (dimensions: ElementDimensions) => void;
  /**
   * Se true, desativa o observer.
   */
  disabled?: boolean;
}

export interface UseResizeObserverResult<T extends HTMLElement> {
  ref: (node: T | null) => void;
  dimensions: ElementDimensions;
}

/**
 * Hook reutilizável e type-safe que monitora alterações de tamanho de um elemento DOM
 * utilizando ResizeObserver com requestAnimationFrame para evitar loops de renderização.
 */
export function useResizeObserver<T extends HTMLElement = HTMLDivElement>(
  options?: UseResizeObserverOptions
): UseResizeObserverResult<T> {
  const { onResize, disabled = false } = options ?? {};
  const [dimensions, setDimensions] = useState<ElementDimensions>({ width: 0, height: 0 });
  const elementRef = useRef<T | null>(null);
  const frameIdRef = useRef<number | null>(null);
  const onResizeRef = useRef(onResize);

  useEffect(() => {
    onResizeRef.current = onResize;
  }, [onResize]);

  const ref = useCallback(
    (node: T | null) => {
      elementRef.current = node;
    },
    []
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!element || disabled || typeof window === 'undefined' || !('ResizeObserver' in window)) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;

      // Cancelar frame anterior pendente para evitar repaints desnecessários
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
      }

      frameIdRef.current = requestAnimationFrame(() => {
        setDimensions({ width, height });
        onResizeRef.current?.({ width, height });
      });
    });

    observer.observe(element);

    return () => {
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
      }
      observer.disconnect();
    };
  }, [disabled]);

  return { ref, dimensions };
}

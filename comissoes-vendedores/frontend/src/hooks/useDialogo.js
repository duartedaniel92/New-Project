import { useEffect, useRef } from "react";

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Comportamento de diálogo modal para a gaveta e o modal de cadastro.
 *
 * A versão anterior só ouvia o Esc. Faltava o resto do que um modal precisa
 * para ser usável no teclado e por leitor de tela:
 *
 *  - foco vai para dentro do diálogo ao abrir e volta para onde estava ao fechar;
 *  - Tab circula dentro do diálogo em vez de passear pela página atrás dele;
 *  - a rolagem do fundo trava enquanto o diálogo está aberto.
 *
 * @param {() => void} aoFechar
 * @returns {import("react").RefObject<HTMLElement>} ref para o elemento do diálogo
 */
export function useDialogo(aoFechar) {
  const refDialogo = useRef(null);
  const elementoAnterior = useRef(null);

  useEffect(() => {
    elementoAnterior.current = document.activeElement;

    const primeiro = refDialogo.current?.querySelector(FOCAVEIS);
    (primeiro || refDialogo.current)?.focus();

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflowAnterior;
      elementoAnterior.current?.focus?.();
    };
  }, []);

  useEffect(() => {
    const aoTeclar = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        aoFechar();
        return;
      }

      if (e.key !== "Tab" || !refDialogo.current) return;

      const focaveis = [...refDialogo.current.querySelectorAll(FOCAVEIS)].filter(
        (el) => el.offsetParent !== null
      );
      if (focaveis.length === 0) return;

      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];

      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  return refDialogo;
}

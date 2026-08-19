import { createContext, useContext } from "react";
import { aplicarTema, carregarTema } from "../theme.js";

/**
 * O contexto e o hook ficam fora do arquivo do provider de propósito: um módulo
 * que exporta componente e não-componente ao mesmo tempo derruba o Fast Refresh
 * do Vite, e cada alteração no arquivo recarregaria a página inteira.
 */
export const TemaContext = createContext(null);

export function useTema() {
  const contexto = useContext(TemaContext);
  if (!contexto) throw new Error("useTema precisa estar dentro de <TemaProvider>");
  return contexto;
}

/** Aplica o tema salvo antes do primeiro render, evitando piscar a cor padrão. */
export function aplicarTemaInicial() {
  aplicarTema(carregarTema());
}

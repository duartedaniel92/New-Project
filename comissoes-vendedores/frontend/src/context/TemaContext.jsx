import { useCallback, useMemo, useState } from "react";
import { TEMA_PADRAO, carregarTema, salvarTema } from "../theme.js";
import { TemaContext } from "./temaContexto.js";

/**
 * O tema vive em um contexto porque ele é global: aplicar uma paleta muda as
 * variáveis CSS de toda a página. Antes o estado ficava dentro do
 * `ThemeCustomizer`, então trocar de tela e voltar mostrava as cores antigas
 * nos seletores, mesmo com a página já pintada com as novas.
 */
export function TemaProvider({ children }) {
  const [tema, setTema] = useState(carregarTema);

  const definirTema = useCallback((novo) => {
    setTema(salvarTema(novo));
  }, []);

  const atualizarCor = useCallback((campo, valor) => {
    setTema((atual) => salvarTema({ ...atual, [campo]: valor }));
  }, []);

  const restaurarPadrao = useCallback(() => {
    setTema(salvarTema(TEMA_PADRAO));
  }, []);

  const valor = useMemo(
    () => ({ tema, definirTema, atualizarCor, restaurarPadrao }),
    [tema, definirTema, atualizarCor, restaurarPadrao]
  );

  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}

export default TemaProvider;

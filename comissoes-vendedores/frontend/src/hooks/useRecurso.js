import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Carrega um recurso da API cuidando de três coisas que estavam repetidas (e
 * incompletas) em cada tela:
 *
 *  - **estado de carregamento e erro** — antes cada componente reimplementava;
 *  - **cancelamento ao desmontar** — evita `setState` em componente que já saiu
 *    da tela;
 *  - **resposta fora de ordem** — ao digitar na busca, a resposta da consulta
 *    "car" podia chegar depois da de "carla" e sobrescrever a lista certa pela
 *    errada. Cada carga recebe um número de sequência e só a mais recente pode
 *    escrever no estado.
 *
 * @param {(opcoes:{signal:AbortSignal}) => Promise<any>} carregador
 * @param {Array} deps - dependências que disparam uma nova carga
 */
export function useRecurso(carregador, deps = []) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  const sequencia = useRef(0);
  const controleAtual = useRef(null);
  const carregadorRef = useRef(carregador);
  carregadorRef.current = carregador;

  const recarregar = useCallback(() => {
    const minhaVez = ++sequencia.current;

    controleAtual.current?.abort();
    const controle = new AbortController();
    controleAtual.current = controle;

    setCarregando(true);

    carregadorRef
      .current({ signal: controle.signal })
      .then((resultado) => {
        if (minhaVez !== sequencia.current) return; // uma carga mais nova já assumiu
        setDados(resultado);
        setErro("");
      })
      .catch((e) => {
        if (controle.signal.aborted || minhaVez !== sequencia.current) return;
        setErro(e.message);
      })
      .finally(() => {
        if (minhaVez === sequencia.current) setCarregando(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    recarregar();
    return () => controleAtual.current?.abort();
  }, [recarregar]);

  return { dados, erro, carregando, recarregar, setDados };
}

/**
 * Atrasa a propagação de um valor. Usado na busca da Mesa de Performance: sem
 * isso, cada tecla digitada virava uma requisição.
 */
export function useDebounce(valor, atraso = 300) {
  const [valorAtrasado, setValorAtrasado] = useState(valor);

  useEffect(() => {
    const id = setTimeout(() => setValorAtrasado(valor), atraso);
    return () => clearTimeout(id);
  }, [valor, atraso]);

  return valorAtrasado;
}

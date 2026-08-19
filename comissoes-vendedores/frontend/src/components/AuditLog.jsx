import { useCallback, useState } from "react";
import { api } from "../api.js";
import { useDebounce, useRecurso } from "../hooks/useRecurso.js";
import { formatarDataHora } from "../utils/format.js";
import EstadoErro from "./EstadoErro.jsx";

const POR_PAGINA = 25;

export default function AuditLog() {
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const buscaAtrasada = useDebounce(busca, 300);

  const carregador = useCallback(
    (opcoes) => api.getAudit({ busca: buscaAtrasada, pagina, limite: POR_PAGINA }, opcoes),
    [buscaAtrasada, pagina]
  );

  const { dados, erro, carregando, recarregar } = useRecurso(carregador, [carregador]);

  const eventos = dados?.eventos ?? [];
  const total = dados?.total ?? 0;
  const ultimaPagina = Math.max(1, Math.ceil(total / POR_PAGINA));

  const trocarBusca = (valor) => {
    setBusca(valor);
    setPagina(1); // filtrar sem voltar para a primeira página mostrava "nada encontrado"
  };

  return (
    <>
      <div className="page-header">
        <h1>Auditoria</h1>
        <p>Histórico de alterações em vendas e regras — evita fraudes e desentendimentos.</p>
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Buscar por usuário ou ação..."
          value={busca}
          onChange={(e) => trocarBusca(e.target.value)}
          aria-label="Buscar na auditoria"
        />
      </div>

      {erro && (
        <EstadoErro
          titulo="Não consegui carregar a auditoria."
          mensagem={erro}
          aoTentarNovamente={recarregar}
        />
      )}

      {!erro && (
        <div className="panel" aria-busy={carregando}>
          {eventos.length === 0 && !carregando && (
            <p className="texto-vazio">
              {busca
                ? `Nenhum evento encontrado para "${busca}".`
                : "Nenhum evento registrado ainda. Alterações de regras e de cadastro aparecem aqui."}
            </p>
          )}

          {eventos.map((item) => (
            <div className="audit-item" key={item.id}>
              <div className="dot" />
              <div>
                <div className="when">{formatarDataHora(item.data)}</div>
                <div className="who">{item.usuario}</div>
                <div className="what">{item.acao}</div>
              </div>
            </div>
          ))}

          {total > POR_PAGINA && (
            <nav className="paginacao" aria-label="Paginação da auditoria">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina <= 1}
              >
                ‹ Anteriores
              </button>
              <span className="sub" style={{ margin: 0 }}>
                Página {pagina} de {ultimaPagina} · {total} eventos
              </span>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setPagina((p) => Math.min(ultimaPagina, p + 1))}
                disabled={pagina >= ultimaPagina}
              >
                Próximos ›
              </button>
            </nav>
          )}
        </div>
      )}
    </>
  );
}

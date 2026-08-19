import { useCallback, useState } from "react";
import { api } from "../api.js";
import { useDebounce, useRecurso } from "../hooks/useRecurso.js";
import { formatarMoeda, formatarPercentual, formatarPercentualDecimal } from "../utils/format.js";
import SellerDrawer from "./SellerDrawer.jsx";
import NovoVendedorModal from "./NovoVendedorModal.jsx";
import EstadoErro from "./EstadoErro.jsx";

const COLUNAS = [
  { key: "nome", label: "Vendedor" },
  { key: "funcao", label: "Função" },
  { key: "filial", label: "Filial" },
  { key: "faturamentoMes", label: "Faturamento (mês)" },
  { key: "percentualMeta", label: "% da meta" },
  { key: "comissaoAcumulada", label: "Comissão" },
  { key: "conversao", label: "Conversão" },
];

const TOTAL_COLUNAS = COLUNAS.length + 2;

export default function SellersTable() {
  const [busca, setBusca] = useState("");
  const [ordenarPor, setOrdenarPor] = useState("faturamentoMes");
  const [direcao, setDirecao] = useState("desc");
  const [incluirInativos, setIncluirInativos] = useState(false);
  const [selecionado, setSelecionado] = useState(null);
  const [mostrarNovo, setMostrarNovo] = useState(false);

  // sem o debounce, cada tecla digitada virava uma requisição; o useRecurso
  // ainda descarta respostas fora de ordem, caso duas se cruzem
  const buscaAtrasada = useDebounce(busca, 300);

  const carregador = useCallback(
    (opcoes) =>
      api.getSellers(
        { busca: buscaAtrasada, ordenarPor, direcao, incluirInativos: String(incluirInativos) },
        opcoes
      ),
    [buscaAtrasada, ordenarPor, direcao, incluirInativos]
  );

  const { dados, erro, carregando, recarregar } = useRecurso(carregador, [carregador]);
  const vendedores = dados ?? [];

  const alternarOrdenacao = (coluna) => {
    if (ordenarPor === coluna) {
      setDirecao((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setOrdenarPor(coluna);
      setDirecao("desc");
    }
  };

  const fecharGaveta = useCallback(() => setSelecionado(null), []);
  const fecharModal = useCallback(() => setMostrarNovo(false), []);

  return (
    <>
      <div className="page-header">
        <h1>Mesa de Performance</h1>
        <p>Edite os dados da equipe, cadastre ou remova vendedores — tudo fica registrado.</p>
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Buscar por vendedor, função ou filial..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar vendedores"
        />
        <label className="checkbox-inativos">
          <input
            type="checkbox"
            checked={incluirInativos}
            onChange={(e) => setIncluirInativos(e.target.checked)}
          />
          Mostrar inativos
        </label>
        <button type="button" className="btn" onClick={() => setMostrarNovo(true)}>
          + Novo vendedor
        </button>
      </div>

      {erro ? (
        <EstadoErro
          titulo="Não consegui carregar a equipe."
          mensagem={erro}
          aoTentarNovamente={recarregar}
        />
      ) : (
        <div className="panel sem-padding">
          <div className="tabela-rolavel">
            <table aria-busy={carregando}>
              <caption className="sr-only">
                Equipe de vendas com faturamento, meta e comissão. Clique em um vendedor para
                editar.
              </caption>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="sr-only">Status da meta</span>
                  </th>
                  {COLUNAS.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={
                        ordenarPor === c.key
                          ? direcao === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        className="th-ordenar"
                        onClick={() => alternarOrdenacao(c.key)}
                      >
                        {c.label}
                        <span aria-hidden="true">
                          {ordenarPor === c.key ? (direcao === "asc" ? " ↑" : " ↓") : ""}
                        </span>
                      </button>
                    </th>
                  ))}
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {vendedores.map((v) => (
                  <tr key={v.id} className={`seller-row ${v.ativo === false ? "inativo" : ""}`}>
                    <td>
                      <span
                        className={`status-dot ${v.status}`}
                        title={`Meta: ${formatarPercentual(v.percentualMeta)}`}
                      />
                    </td>
                    <td>
                      {v.nome}
                      {v.ativo === false && <span className="tag-inativo">inativo</span>}
                    </td>
                    <td>{v.funcao}</td>
                    <td>{v.filial}</td>
                    <td>{formatarMoeda(v.faturamentoMes)}</td>
                    <td>{formatarPercentual(v.percentualMeta)}</td>
                    <td>{formatarMoeda(v.comissaoAcumulada)}</td>
                    <td>{formatarPercentualDecimal(v.conversao)}</td>
                    <td>
                      {/* botão de verdade em vez de onClick na linha: a linha
                          inteira não era alcançável pelo teclado */}
                      <button
                        type="button"
                        className="acao-editar"
                        onClick={() => setSelecionado(v.id)}
                        aria-label={`Editar ${v.nome}`}
                      >
                        <span aria-hidden="true">editar ›</span>
                      </button>
                    </td>
                  </tr>
                ))}

                {vendedores.length === 0 && !carregando && (
                  <tr>
                    <td colSpan={TOTAL_COLUNAS} className="tabela-vazia">
                      {busca
                        ? `Nenhum vendedor encontrado para "${busca}".`
                        : "Nenhum vendedor cadastrado. Use o botão “+ Novo vendedor” para começar."}
                    </td>
                  </tr>
                )}

                {carregando && vendedores.length === 0 && (
                  <tr>
                    <td colSpan={TOTAL_COLUNAS} className="tabela-vazia">
                      Carregando equipe...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selecionado && (
        <SellerDrawer sellerId={selecionado} onClose={fecharGaveta} onAlterado={recarregar} />
      )}

      {mostrarNovo && <NovoVendedorModal onClose={fecharModal} onCriado={recarregar} />}
    </>
  );
}

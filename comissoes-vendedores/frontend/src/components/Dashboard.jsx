import { useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { api } from "../api.js";
import { useRecurso } from "../hooks/useRecurso.js";
import { formatarCompacto, formatarMoeda, formatarPercentual } from "../utils/format.js";
import ThemeCustomizer from "./ThemeCustomizer.jsx";
import EstadoErro from "./EstadoErro.jsx";

/** Quantos pontos finais do dia recebem a linha de projeção. */
const PONTOS_PROJETADOS = 3;
/** Ritmo esperado para o fim do dia, sobre o realizado até agora. */
const FATOR_PROJECAO = 1.08;

/**
 * Monta a série da projeção.
 *
 * O ponto de emenda (o último ponto realizado) entra na série da projeção com o
 * valor real. Sem isso a linha tracejada nascia solta no meio do gráfico, como
 * se o dia tivesse dois começos.
 */
function montarSerie(tendencia = []) {
  const primeiroProjetado = Math.max(0, tendencia.length - PONTOS_PROJETADOS);

  return tendencia.map((ponto, i) => ({
    ...ponto,
    projecao:
      i < primeiroProjetado
        ? null
        : i === primeiroProjetado
          ? ponto.hoje
          : ponto.hoje * FATOR_PROJECAO,
  }));
}

export default function Dashboard() {
  const carregador = useCallback((opcoes) => api.getDashboard(opcoes), []);
  const { dados, erro, carregando, recarregar } = useRecurso(carregador, []);

  if (erro && !dados) {
    return (
      <EstadoErro
        titulo="Não consegui carregar o painel."
        mensagem={erro}
        aoTentarNovamente={recarregar}
      />
    );
  }

  if (!dados) return <div className="loading">Carregando painel...</div>;

  const { cards, tendenciaIntradia, previsao, vendedores } = dados;
  const serie = montarSerie(tendenciaIntradia);

  return (
    <>
      <div className="page-header">
        <h1>Painel Principal</h1>
        <p>Visão geral da operação — respostas em segundos, não em relatórios.</p>
      </div>

      <ThemeCustomizer />

      {erro && <EstadoErro titulo="Os dados podem estar desatualizados." mensagem={erro} />}

      <div className="cards-grid" aria-busy={carregando}>
        <Card label="Faturamento bruto do dia" valor={cards.faturamentoBrutoDia} />
        <Card label="Comissões geradas (mês)" valor={cards.totalComissoesMes} destaque />
        <Card label="Lucro líquido estimado" valor={cards.lucroLiquidoEstimado} />
        <Card label="Ticket médio" valor={cards.ticketMedio} />
      </div>

      <div className="panel">
        <h2>Tendência intradia</h2>
        <p className="sub">
          Comparado à mesma semana anterior · projeção tracejada para o fechamento do dia
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={serie}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="hora" stroke="var(--text-muted)" fontSize={12} />
            <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={formatarCompacto} />
            <Tooltip
              contentStyle={{
                background: "var(--panel)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                fontSize: 13,
              }}
              formatter={(v) => (v == null ? "—" : formatarMoeda(v))}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="semanaAnterior"
              name="Semana anterior"
              stroke="var(--text-muted)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="hoje"
              name="Hoje"
              stroke="var(--accent)"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="projecao"
              name="Projeção"
              stroke="var(--amber)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="panel">
        <h2>Previsão de fechamento do mês</h2>
        <p className="sub">
          Projeção dos {previsao.diasUteisRestantes} dias úteis que ainda restam no mês, com a regra
          de comissão atual reaplicada sobre o faturamento projetado de cada vendedor
        </p>
        <div className="cards-grid duas-colunas">
          <Card label="Faturamento projetado" valor={previsao.faturamentoMes} />
          <Card label="Custo de comissão projetado" valor={previsao.comissaoMes} destaque />
        </div>
      </div>

      <div className="panel sem-padding">
        <div className="panel-cabecalho">
          <h2>Vendedores — desempenho e comissão</h2>
          <p className="sub">Faturamento, % da meta e comissão de cada vendedor em um só lugar</p>
        </div>
        <div className="tabela-rolavel">
          <table>
            <caption className="sr-only">
              Desempenho e comissão por vendedor no mês corrente
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Status da meta</span>
                </th>
                <th scope="col">Vendedor</th>
                <th scope="col">Função</th>
                <th scope="col">Faturamento (mês)</th>
                <th scope="col">% da meta</th>
                <th scope="col">Taxa aplicada</th>
                <th scope="col">Bônus fixo</th>
                <th scope="col">Comissão total</th>
              </tr>
            </thead>
            <tbody>
              {vendedores.map((v) => (
                <tr key={v.id}>
                  <td>
                    <span className={`status-dot ${v.status}`} />
                  </td>
                  <td>{v.nome}</td>
                  <td>{v.funcao}</td>
                  <td>{formatarMoeda(v.faturamentoMes)}</td>
                  <td>{formatarPercentual(v.percentualMeta)}</td>
                  <td>{formatarPercentual(v.taxaAplicada, 2)}</td>
                  <td>{v.bonusFixo > 0 ? formatarMoeda(v.bonusFixo) : "—"}</td>
                  <td className="celula-comissao">{formatarMoeda(v.comissaoTotal)}</td>
                </tr>
              ))}
              {vendedores.length === 0 && (
                <tr>
                  <td colSpan={8} className="tabela-vazia">
                    Nenhum vendedor ativo. Cadastre a equipe na Mesa de Performance.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Card({ label, valor, destaque }) {
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className={`value ${destaque ? "accent" : ""}`}>{formatarMoeda(valor)}</div>
    </div>
  );
}

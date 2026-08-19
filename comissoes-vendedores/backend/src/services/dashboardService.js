/**
 * Monta os números do painel principal.
 *
 * Detalhe importante da projeção: o acréscimo previsto é distribuído entre os
 * vendedores na mesma proporção do que cada um já vendeu, e então a REGRA REAL
 * de comissão é reaplicada sobre o faturamento projetado de cada um. Assim a
 * previsão acompanha qualquer mudança feita na Central de Regras, em vez de
 * usar uma taxa média chutada.
 *
 * Os dias úteis restantes saem do calendário (ver utils/dates.js). Na versão
 * anterior eram dez fixos no código, então no fim do mês o painel projetava
 * faturamento de dias que já tinham passado.
 */

import { vendedores, vendasIntradia, regraComissaoMeta } from "../data/seed.js";
import { calcularComissaoPorMeta, numeroSeguro, emCentavos } from "../utils/commission.js";
import { diasUteisRestantesNoMes } from "../utils/dates.js";
import { config } from "../config.js";

function status(v) {
  const meta = numeroSeguro(v.metaMensal);
  const progresso = meta > 0 ? numeroSeguro(v.faturamentoMes) / meta : 0;
  if (progresso >= 1) return "verde";
  if (progresso >= 0.6) return "amarelo";
  return "vermelho";
}

/**
 * @param {Date} [hoje] - injetável para os testes conseguirem fixar a data
 */
export function montarDashboard(hoje = new Date()) {
  const ativos = vendedores.filter((v) => v.ativo !== false);
  const diasUteisRestantes = diasUteisRestantesNoMes(hoje);

  const somar = (campo) => ativos.reduce((acc, v) => acc + numeroSeguro(v[campo]), 0);

  const faturamentoBrutoDia = somar("faturamentoDia");
  const faturamentoMesAtual = somar("faturamentoMes");
  const totalAtendimentos = somar("atendimentosDia");

  const comissoes = ativos.map((v) => ({
    vendedor: v,
    ...calcularComissaoPorMeta(v.faturamentoMes, v.metaMensal, regraComissaoMeta),
  }));

  const totalComissoesMes = comissoes.reduce((acc, c) => acc + c.comissaoTotal, 0);
  const custoComissaoDoDia = totalComissoesMes / config.diasUteisNoMes;
  const lucroLiquidoEstimado = faturamentoBrutoDia * config.margemEstimada - custoComissaoDoDia;
  const ticketMedio = totalAtendimentos > 0 ? faturamentoBrutoDia / totalAtendimentos : 0;

  const acrescimoProjetado = faturamentoBrutoDia * diasUteisRestantes;
  const previsaoFaturamentoMes = faturamentoMesAtual + acrescimoProjetado;

  const previsaoComissaoMes = ativos.reduce((acc, v) => {
    const faturamento = numeroSeguro(v.faturamentoMes);
    // sem faturamento no mês ainda, ninguém tem participação: divide por igual
    const participacao =
      faturamentoMesAtual > 0 ? faturamento / faturamentoMesAtual : 1 / (ativos.length || 1);
    const projetado = faturamento + acrescimoProjetado * participacao;
    return acc + calcularComissaoPorMeta(projetado, v.metaMensal, regraComissaoMeta).comissaoTotal;
  }, 0);

  const vendedoresResumo = comissoes
    .map((c) => ({
      id: c.vendedor.id,
      nome: c.vendedor.nome,
      funcao: c.vendedor.funcao,
      filial: c.vendedor.filial,
      faturamentoDia: c.vendedor.faturamentoDia,
      faturamentoMes: c.vendedor.faturamentoMes,
      metaMensal: c.vendedor.metaMensal,
      percentualMeta: c.percentualMeta,
      taxaAplicada: c.taxaAplicada,
      bonusFixo: c.bonusFixo,
      comissaoTotal: c.comissaoTotal,
      status: status(c.vendedor),
    }))
    .sort((a, b) => numeroSeguro(b.faturamentoMes) - numeroSeguro(a.faturamentoMes));

  return {
    cards: {
      faturamentoBrutoDia: emCentavos(faturamentoBrutoDia),
      totalComissoesMes: emCentavos(totalComissoesMes),
      lucroLiquidoEstimado: emCentavos(lucroLiquidoEstimado),
      ticketMedio: emCentavos(ticketMedio),
    },
    tendenciaIntradia: vendasIntradia,
    previsao: {
      faturamentoMes: emCentavos(previsaoFaturamentoMes),
      comissaoMes: emCentavos(previsaoComissaoMes),
      diasUteisRestantes,
    },
    vendedores: vendedoresResumo,
    equipe: { ativos: ativos.length },
  };
}

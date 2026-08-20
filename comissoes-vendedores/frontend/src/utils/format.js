/**
 * Formatadores compartilhados.
 *
 * Antes cada tela declarava o seu próprio `fmt` com `Intl.NumberFormat`. Além
 * da duplicação, isso criava um formatador novo a cada render — e `Intl` é
 * caro o suficiente para aparecer no perfil de uma tabela grande. Aqui os
 * formatadores são criados uma vez e reaproveitados.
 */

const MOEDA = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const NUMERO = new Intl.NumberFormat("pt-BR");
const DATA_HORA = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

const numero = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
};

/** R$ 1.234,50 */
export const formatarMoeda = (valor) => MOEDA.format(numero(valor));

/** 1.234,5 */
export const formatarNumero = (valor) => NUMERO.format(numero(valor));

/** 42% a partir de 0.42 */
export const formatarPercentualDecimal = (valor) => `${Math.round(numero(valor) * 100)}%`;

/** 110,5% a partir de 110.5 */
export const formatarPercentual = (valor, casas = 1) =>
  `${numero(valor).toLocaleString("pt-BR", { maximumFractionDigits: casas })}%`;

/** 19/08/26 15:40 — devolve "—" para data ausente ou inválida. */
export function formatarDataHora(valor) {
  if (!valor) return "—";
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? "—" : DATA_HORA.format(data);
}

/** Valores em milhares para os eixos do gráfico: 6300 → "6,3k" */
export function formatarCompacto(valor) {
  const n = numero(valor);
  if (Math.abs(n) < 1000) return NUMERO.format(n);
  return `${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
}

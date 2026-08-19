/**
 * Contas de calendário usadas na projeção do painel.
 *
 * Antes o painel usava um "faltam 10 dias úteis" fixo no código: no dia 28 do
 * mês a previsão continuava somando dez dias que não existiam mais, inflando o
 * custo de comissão projetado. Aqui os dias saem do calendário de verdade.
 */

const SABADO = 6;
const DOMINGO = 0;

/** Segunda a sexta conta como dia útil. Feriado ainda não é tratado. */
export function ehDiaUtil(data) {
  const dia = data.getDay();
  return dia !== SABADO && dia !== DOMINGO;
}

/**
 * Dias úteis que ainda faltam no mês da data informada, contando o próprio dia
 * de hoje só se ele for útil (o faturamento de hoje ainda está sendo feito).
 *
 * @param {Date} [hoje] - referência; o padrão é o momento da chamada
 * @returns {number} quantidade de dias úteis restantes (nunca negativa)
 */
export function diasUteisRestantesNoMes(hoje = new Date()) {
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();

  let total = 0;
  for (let dia = hoje.getDate(); dia <= ultimoDia; dia += 1) {
    if (ehDiaUtil(new Date(ano, mes, dia))) total += 1;
  }
  return total;
}

/**
 * Dias úteis já decorridos no mês, incluindo hoje. Serve para transformar o
 * faturamento do dia em uma média confiável quando for preciso.
 */
export function diasUteisDecorridosNoMes(hoje = new Date()) {
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();

  let total = 0;
  for (let dia = 1; dia <= hoje.getDate(); dia += 1) {
    if (ehDiaUtil(new Date(ano, mes, dia))) total += 1;
  }
  return total;
}

/** Valida uma data no formato ISO curto (AAAA-MM-DD) sem virar 32/13. */
export function ehDataISOValida(valor) {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [ano, mes, dia] = valor.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
  );
}

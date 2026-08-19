/**
 * Cálculo da comissão. É a parte do sistema que define quanto cada pessoa
 * recebe, então é propositalmente simples, pura (sem estado, sem I/O) e
 * coberta por testes.
 */

/**
 * Converte com segurança um valor vindo do formulário/API para número.
 * Retorna `padrao` se o valor for vazio, inválido ou não numérico.
 *
 * Cuidados que importam aqui: `Number("")`, `Number("   ")`, `Number(true)` e
 * `Number([])` valem 0 em JavaScript. Aceitar isso silenciosamente colocaria
 * zero na folha de pagamento sem ninguém perceber — por isso só string com
 * conteúdo numérico e number de verdade passam.
 */
export function numeroSeguro(valor, padrao = 0) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : padrao;
  if (typeof valor !== "string") return padrao;
  const texto = valor.trim();
  if (texto === "") return padrao;
  const n = Number(texto);
  return Number.isFinite(n) ? n : padrao;
}

/** Arredonda para centavos, evitando o resíduo binário do ponto flutuante. */
export function emCentavos(valor) {
  return Math.round((numeroSeguro(valor) + Number.EPSILON) * 100) / 100;
}

/**
 * Calcula a comissão de um vendedor com base no percentual de atingimento
 * da meta individual dele — não pelo valor absoluto vendido.
 *
 * Regras:
 *  - abaixo de 100% da meta  → taxaAbaixoMeta (ex.: 1%)
 *  - a partir de 100%        → taxaNaMeta (ex.: 2%)
 *  - a partir de cada faixa em faixasBonus (ex.: 110%, 120%, 130%)
 *    → taxa daquela faixa sobre o total vendido + bônus fixo em R$
 *
 * IMPORTANTE: a comparação das faixas usa o percentual EXATO, não o
 * percentual arredondado que é exibido na tela. Quem vendeu 109,99% da
 * meta não recebe o bônus de 110%, mesmo que a interface mostre "110%".
 *
 * @param {number} faturamentoMes - total vendido pelo vendedor no mês
 * @param {number} metaMensal - meta individual do vendedor
 * @param {{taxaAbaixoMeta:number, taxaNaMeta:number, faixasBonus:Array<{percentualMeta:number, taxa:number, bonusFixo:number}>}} regra
 */
export function calcularComissaoPorMeta(faturamentoMes, metaMensal, regra) {
  const faturamento = numeroSeguro(faturamentoMes, 0);
  const meta = numeroSeguro(metaMensal, 0);

  const vazio = {
    percentualMeta: 0,
    percentualMetaExato: 0,
    taxaAplicada: 0,
    bonusFixo: 0,
    comissaoVariavel: 0,
    comissaoTotal: 0,
    faixaAtingida: null,
  };

  if (meta <= 0 || faturamento < 0 || !regra) return vazio;

  // percentual exato — usado para decidir a faixa
  const percentualExato = (faturamento / meta) * 100;
  // percentual arredondado — usado apenas para exibição
  const percentualMeta = Number(percentualExato.toFixed(1));

  let taxaAplicada =
    percentualExato >= 100
      ? numeroSeguro(regra.taxaNaMeta, 0)
      : numeroSeguro(regra.taxaAbaixoMeta, 0);
  let bonusFixo = 0;
  let faixaAtingida = null;

  const faixasOrdenadas = [...(regra.faixasBonus || [])]
    .filter((f) => f && Number.isFinite(Number(f.percentualMeta)))
    .sort((a, b) => Number(a.percentualMeta) - Number(b.percentualMeta));

  for (const faixa of faixasOrdenadas) {
    if (percentualExato >= Number(faixa.percentualMeta)) {
      taxaAplicada = numeroSeguro(faixa.taxa, taxaAplicada);
      bonusFixo = numeroSeguro(faixa.bonusFixo, 0);
      // cópia: devolver a referência viva deixaria quem consome o cálculo
      // alterar a regra de comissão de toda a equipe sem passar pela validação
      faixaAtingida = { ...faixa };
    }
  }

  const comissaoVariavel = emCentavos(faturamento * (taxaAplicada / 100));
  const comissaoTotal = emCentavos(comissaoVariavel + bonusFixo);

  return {
    percentualMeta,
    percentualMetaExato: percentualExato,
    taxaAplicada,
    bonusFixo,
    comissaoVariavel,
    comissaoTotal,
    faixaAtingida,
  };
}

/**
 * Comissão de referência por categoria do produto ("se a categoria for X, o
 * item vale Y%"). Serve apenas como informação por item no extrato do
 * vendedor — não entra no cálculo da comissão total, que segue a meta.
 */
export function calcularComissaoPorCategoria(valorVenda, categoria, regrasCategoria) {
  if (!Array.isArray(regrasCategoria)) return null;
  const regra = regrasCategoria.find((r) => r.categoria === categoria);
  if (!regra) return null;
  return emCentavos(numeroSeguro(valorVenda, 0) * (numeroSeguro(regra.taxa, 0) / 100));
}

/**
 * Prévia de folha em CSV, pronta para contabilidade/RH.
 * A montagem do arquivo em si (escape e proteção contra fórmula) fica em
 * ../utils/csv.js.
 */

import { vendedores, regraComissaoMeta } from "../data/seed.js";
import { calcularComissaoPorMeta } from "../utils/commission.js";
import { montarCsv, numeroBr } from "../utils/csv.js";

export const NOME_ARQUIVO_FOLHA = "previa-folha-comissoes.csv";

const CABECALHO = [
  "Vendedor",
  "Função",
  "Filial",
  "Meta Mensal",
  "Faturamento no Mês",
  "% da Meta",
  "Taxa Aplicada (%)",
  "Bônus Fixo",
  "Comissão Total",
];

export function gerarFolhaCsv() {
  const ativos = vendedores.filter((v) => v.ativo !== false);

  const linhas = ativos.map((v) => {
    const c = calcularComissaoPorMeta(v.faturamentoMes, v.metaMensal, regraComissaoMeta);
    return [
      v.nome,
      v.funcao,
      v.filial,
      numeroBr(v.metaMensal),
      numeroBr(v.faturamentoMes),
      `${numeroBr(c.percentualMeta, 1)}%`,
      numeroBr(c.taxaAplicada, 2),
      numeroBr(c.bonusFixo),
      numeroBr(c.comissaoTotal),
    ];
  });

  return montarCsv(CABECALHO, linhas);
}

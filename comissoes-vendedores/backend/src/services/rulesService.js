/**
 * Regras de negócio da comissão. Sem Express aqui — ver sellersService.js.
 * Uma regra inválida gravada nesta camada afeta o pagamento de toda a equipe
 * de uma vez, então a validação é rígida de propósito.
 */

import {
  regraComissaoMeta,
  regrasCategoria,
  campanhas,
  proximoId,
  registrarAuditoria,
} from "../data/seed.js";
import { ehDataISOValida } from "../utils/dates.js";

/** Teto de faixas: acima disso a tabela vira ilegível e ninguém confere. */
const MAXIMO_FAIXAS = 12;

/** Tipos de campanha que o cálculo sabe interpretar. */
export const TIPOS_CAMPANHA = ["bonus_fixo", "multiplicador", "meta_extra"];

export function obterRegras() {
  return { regraComissaoMeta, regrasCategoria, campanhas };
}

export function atualizarRegraMeta(
  { taxaAbaixoMeta, taxaNaMeta, faixasBonus } = {},
  usuario = "Gestor"
) {
  const erros = [];
  const taxaBase = Number(taxaAbaixoMeta);
  const taxaCheia = Number(taxaNaMeta);

  if (!Number.isFinite(taxaBase) || taxaBase < 0 || taxaBase > 100) {
    erros.push("Taxa abaixo da meta deve ser um número entre 0 e 100");
  }
  if (!Number.isFinite(taxaCheia) || taxaCheia < 0 || taxaCheia > 100) {
    erros.push("Taxa ao atingir a meta deve ser um número entre 0 e 100");
  }
  if (!Array.isArray(faixasBonus)) {
    erros.push("Faixas de bônus inválidas");
  } else if (faixasBonus.length > MAXIMO_FAIXAS) {
    erros.push(`No máximo ${MAXIMO_FAIXAS} faixas de superação`);
  }

  const faixasNormalizadas = [];
  if (Array.isArray(faixasBonus)) {
    const percentuaisVistos = new Set();

    faixasBonus.forEach((f, i) => {
      const posicao = `Faixa ${i + 1}`;
      const percentual = Number(f?.percentualMeta);
      const taxa = Number(f?.taxa);
      const bonus = Number(f?.bonusFixo);

      if (!Number.isFinite(percentual) || percentual <= 0) {
        return erros.push(`${posicao}: % da meta deve ser maior que zero`);
      }
      if (percentual < 100) {
        return erros.push(`${posicao}: só faz sentido premiar a partir de 100% da meta`);
      }
      if (percentuaisVistos.has(percentual)) {
        return erros.push(`${posicao}: já existe outra faixa em ${percentual}%`);
      }
      if (!Number.isFinite(taxa) || taxa < 0 || taxa > 100) {
        return erros.push(`${posicao}: taxa deve ser um número entre 0 e 100`);
      }
      if (!Number.isFinite(bonus) || bonus < 0) {
        return erros.push(`${posicao}: bônus fixo não pode ser negativo`);
      }

      percentuaisVistos.add(percentual);
      faixasNormalizadas.push({
        id: f?.id || proximoId("b"),
        percentualMeta: percentual,
        taxa,
        bonusFixo: bonus,
      });
    });
  }

  if (erros.length > 0) return { erro: erros.join(". "), status: 400 };

  faixasNormalizadas.sort((a, b) => a.percentualMeta - b.percentualMeta);

  regraComissaoMeta.taxaAbaixoMeta = taxaBase;
  regraComissaoMeta.taxaNaMeta = taxaCheia;
  regraComissaoMeta.faixasBonus = faixasNormalizadas;

  registrarAuditoria(
    usuario,
    `Atualizou a regra de comissão: ${taxaBase}% abaixo da meta, ${taxaCheia}% na meta, ${faixasNormalizadas.length} faixa(s) de bônus`
  );

  return { regraComissaoMeta };
}

export function atualizarCategoria({ categoria, taxa } = {}, usuario = "Gestor") {
  const valor = Number(taxa);

  if (typeof categoria !== "string" || categoria.trim() === "") {
    return { erro: "Categoria é obrigatória", status: 400 };
  }
  if (categoria.trim().length > 60) {
    return { erro: "Categoria deve ter no máximo 60 caracteres", status: 400 };
  }
  if (!Number.isFinite(valor) || valor < 0 || valor > 100) {
    return { erro: "Taxa deve ser um número entre 0 e 100", status: 400 };
  }

  const nome = String(categoria).trim();
  const existente = regrasCategoria.find((r) => r.categoria === nome);
  const taxaAntiga = existente ? existente.taxa : null;

  if (existente) existente.taxa = valor;
  else regrasCategoria.push({ id: proximoId("c"), categoria: nome, taxa: valor });

  registrarAuditoria(
    usuario,
    taxaAntiga === null
      ? `Criou referência de comissão para "${nome}" (${valor}%)`
      : `Alterou a referência de "${nome}" de ${taxaAntiga}% para ${valor}%`
  );

  return { regrasCategoria };
}

export function criarCampanha({ nome, data, tipo, valor } = {}, usuario = "Gestor") {
  const quantia = Number(valor);
  const erros = [];

  if (typeof nome !== "string" || nome.trim() === "") erros.push("Nome da campanha é obrigatório");
  if (!ehDataISOValida(data)) erros.push("Data da campanha deve estar no formato AAAA-MM-DD");
  if (!TIPOS_CAMPANHA.includes(tipo)) {
    erros.push(`Tipo deve ser um destes: ${TIPOS_CAMPANHA.join(", ")}`);
  }
  if (!Number.isFinite(quantia) || quantia < 0) {
    erros.push("Valor da campanha precisa ser um número não negativo");
  }

  if (erros.length > 0) return { erro: erros.join(". "), status: 400 };

  const nova = {
    id: proximoId("camp"),
    nome: nome.trim(),
    data,
    tipo,
    valor: quantia,
    ativo: true,
  };
  campanhas.push(nova);

  registrarAuditoria(usuario, `Criou a campanha "${nova.nome}" para ${data}`);

  return { campanha: nova };
}

/**
 * Regras de negócio dos vendedores.
 *
 * Fica separado das rotas de propósito: aqui não existe req/res nem Express.
 * São funções puras de entrada/saída, o que deixa a parte que mexe em dinheiro
 * e histórico fácil de testar sem subir servidor.
 *
 * Convenção: toda função devolve { erro, status } quando a operação não pode
 * seguir, e a rota traduz isso para o código HTTP correspondente.
 */

import {
  vendedores,
  vendasPorVendedor,
  regrasCategoria,
  regraComissaoMeta,
  historicoVendedores,
  proximoId,
  registrarAuditoria,
} from "../data/seed.js";
import {
  calcularComissaoPorMeta,
  calcularComissaoPorCategoria,
  numeroSeguro,
} from "../utils/commission.js";
import { ehDataISOValida } from "../utils/dates.js";
import { config } from "../config.js";

const CAMPOS_TEXTO = ["nome", "funcao", "filial", "dataInicio"];
const CAMPOS_NUMERICOS = [
  "metaMensal",
  "faturamentoDia",
  "faturamentoMes",
  "atendimentosDia",
  "conversao",
  "pa",
];
export const CAMPOS_EDITAVEIS = [...CAMPOS_TEXTO, ...CAMPOS_NUMERICOS];

const LABEL_CAMPO = {
  nome: "Nome",
  funcao: "Função",
  filial: "Filial",
  dataInicio: "Data de início",
  metaMensal: "Meta mensal",
  faturamentoDia: "Faturamento do dia",
  faturamentoMes: "Faturamento do mês",
  atendimentosDia: "Atendimentos do dia",
  conversao: "Conversão",
  pa: "Peças por atendimento",
};

/** Limites por campo. Sem teto, um zero a mais no formulário vira folha de milhões. */
const LIMITES = {
  metaMensal: { max: 100_000_000 },
  faturamentoDia: { max: 100_000_000 },
  faturamentoMes: { max: 1_000_000_000 },
  atendimentosDia: { max: 1000, inteiro: true },
  conversao: { max: 1 },
  pa: { max: 100 },
};

const TAMANHO_MAXIMO_TEXTO = 120;
const CAMPOS_OBRIGATORIOS = ["nome", "filial"];

/**
 * Colunas pelas quais a listagem aceita ordenar. Sem essa lista, um
 * `?ordenarPor=constructor` faria a API ordenar por uma propriedade herdada do
 * prototype — nada quebrava na hora, mas a lista voltava em ordem aleatória.
 */
export const COLUNAS_ORDENAVEIS = [
  "nome",
  "funcao",
  "filial",
  "dataInicio",
  "metaMensal",
  "faturamentoDia",
  "faturamentoMes",
  "atendimentosDia",
  "conversao",
  "pa",
  "comissaoAcumulada",
  "percentualMeta",
  "progressoMes",
  "status",
];

const moeda = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numeroSeguro(v));

function formatarValor(campo, valor) {
  if (["metaMensal", "faturamentoDia", "faturamentoMes"].includes(campo)) return moeda(valor);
  if (campo === "conversao") return `${(numeroSeguro(valor) * 100).toFixed(0)}%`;
  return String(valor);
}

/** Remove acentos para que "senior" também encontre "Sênior". */
function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function montarStatus(v) {
  const meta = numeroSeguro(v.metaMensal);
  const progresso = meta > 0 ? numeroSeguro(v.faturamentoMes) / meta : 0;
  if (progresso >= 1) return "verde";
  if (progresso >= 0.6) return "amarelo";
  return "vermelho";
}

/** Acrescenta os dados calculados (comissão, % da meta, status) ao vendedor. */
export function enriquecer(v) {
  const c = calcularComissaoPorMeta(v.faturamentoMes, v.metaMensal, regraComissaoMeta);
  const meta = numeroSeguro(v.metaMensal);
  const metaDiaria = meta > 0 ? meta / config.diasUteisNoMes : 0;

  return {
    ...v,
    comissaoAcumulada: c.comissaoTotal,
    comissaoVariavel: c.comissaoVariavel,
    bonusFixo: c.bonusFixo,
    taxaAtual: c.taxaAplicada,
    percentualMeta: c.percentualMeta,
    progressoMes: meta > 0 ? Number((numeroSeguro(v.faturamentoMes) / meta).toFixed(3)) : 0,
    progressoDia:
      metaDiaria > 0 ? Number((numeroSeguro(v.faturamentoDia) / metaDiaria).toFixed(3)) : 0,
    status: montarStatus(v),
  };
}

/**
 * Converte um valor de campo numérico vindo do formulário.
 * Devolve `null` quando o valor não é aceitável — e "não aceitável" inclui
 * `true`, `[]` e `"   "`, que o `Number()` do JavaScript converteria para 0 ou 1
 * sem reclamar e gravaria silenciosamente na folha.
 */
function lerNumero(valor) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  if (typeof valor !== "string") return null;
  const texto = valor.trim();
  if (texto === "") return null;
  const n = Number(texto);
  return Number.isFinite(n) ? n : null;
}

/** Valida e normaliza os campos vindos do formulário. Nada é gravado se houver erro. */
export function validarCampos(dados = {}, { exigirObrigatorios } = {}) {
  const valores = {};
  const erros = [];

  if (dados === null || typeof dados !== "object" || Array.isArray(dados)) {
    return { valores, erros: ["Dados do vendedor inválidos"] };
  }

  for (const campo of CAMPOS_TEXTO) {
    if (dados[campo] === undefined) continue;
    const bruto = dados[campo];

    if (typeof bruto !== "string") {
      erros.push(`${LABEL_CAMPO[campo]} precisa ser um texto`);
      continue;
    }

    const texto = bruto.trim();

    if (CAMPOS_OBRIGATORIOS.includes(campo) && texto === "") {
      erros.push(`${LABEL_CAMPO[campo]} não pode ficar em branco`);
      continue;
    }
    if (texto.length > TAMANHO_MAXIMO_TEXTO) {
      erros.push(`${LABEL_CAMPO[campo]} deve ter no máximo ${TAMANHO_MAXIMO_TEXTO} caracteres`);
      continue;
    }
    if (campo === "dataInicio" && texto !== "" && !ehDataISOValida(texto)) {
      erros.push("Data de início deve estar no formato AAAA-MM-DD");
      continue;
    }

    valores[campo] = texto;
  }

  for (const campo of CAMPOS_NUMERICOS) {
    if (dados[campo] === undefined) continue;

    const n = lerNumero(dados[campo]);
    const limite = LIMITES[campo] || {};

    if (n === null) {
      erros.push(`${LABEL_CAMPO[campo]} precisa ser um número válido`);
      continue;
    }
    if (n < 0) {
      erros.push(`${LABEL_CAMPO[campo]} não pode ser negativo`);
      continue;
    }
    if (limite.inteiro && !Number.isInteger(n)) {
      erros.push(`${LABEL_CAMPO[campo]} precisa ser um número inteiro`);
      continue;
    }
    if (limite.max !== undefined && n > limite.max) {
      erros.push(
        campo === "conversao"
          ? "Conversão deve ficar entre 0 e 1 (ex.: 0,35 para 35%)"
          : `${LABEL_CAMPO[campo]} não pode passar de ${limite.max.toLocaleString("pt-BR")}`
      );
      continue;
    }

    valores[campo] = n;
  }

  if (exigirObrigatorios) {
    if (!valores.nome) erros.push("Nome é obrigatório");
    if (!valores.filial) erros.push("Filial é obrigatória");
  }

  return { valores, erros };
}

// ---------- Consultas ----------

function querEhVerdadeiro(valor) {
  return valor === true || valor === "true" || valor === "1";
}

export function listar({ busca, ordenarPor, direcao, incluirInativos } = {}) {
  let lista = vendedores
    .filter((v) => querEhVerdadeiro(incluirInativos) || v.ativo !== false)
    .map(enriquecer);

  if (busca) {
    const termo = normalizar(busca);
    lista = lista.filter((v) =>
      [v.nome, v.filial, v.funcao].some((campo) => normalizar(campo).includes(termo))
    );
  }

  // só ordena por colunas conhecidas: um parâmetro inválido não pode bagunçar a lista
  if (ordenarPor && COLUNAS_ORDENAVEIS.includes(ordenarPor)) {
    const desc = direcao === "desc";
    lista.sort((a, b) => {
      const va = a[ordenarPor];
      const vb = b[ordenarPor];
      const cmp =
        typeof va === "string" || typeof vb === "string"
          ? String(va ?? "").localeCompare(String(vb ?? ""), "pt-BR")
          : numeroSeguro(va) - numeroSeguro(vb);
      return desc ? -cmp : cmp;
    });
  }

  return lista;
}

export function buscarPorId(id) {
  const vendedor = vendedores.find((v) => v.id === id);
  if (!vendedor) return { erro: "Vendedor não encontrado", status: 404 };

  const vendas = (vendasPorVendedor[vendedor.id] || []).map((venda) => ({
    ...venda,
    comissaoItem: calcularComissaoPorCategoria(venda.valor, venda.categoria, regrasCategoria),
  }));

  const historico = historicoVendedores
    .filter((h) => h.vendedorId === vendedor.id)
    .sort((a, b) => new Date(b.data) - new Date(a.data));

  return { vendedor: { ...enriquecer(vendedor), vendas, historico } };
}

// ---------- Escrita ----------

function registrarHistorico(vendedorId, usuario, acao, detalhe, data = new Date().toISOString()) {
  const registro = { id: proximoId("h"), vendedorId, data, usuario, acao, detalhe };
  historicoVendedores.push(registro);
  return registro;
}

export function criar(dados = {}, usuario = "Gestor") {
  const { valores, erros } = validarCampos(dados, { exigirObrigatorios: true });
  if (erros.length > 0) return { erro: erros.join(". "), status: 400 };

  const novo = {
    id: proximoId("v"),
    nome: valores.nome,
    funcao: valores.funcao || "Vendedor(a)",
    filial: valores.filial,
    dataInicio: valores.dataInicio || new Date().toISOString().slice(0, 10),
    metaMensal: valores.metaMensal ?? 0,
    faturamentoDia: valores.faturamentoDia ?? 0,
    faturamentoMes: valores.faturamentoMes ?? 0,
    atendimentosDia: valores.atendimentosDia ?? 0,
    conversao: valores.conversao ?? 0,
    pa: valores.pa ?? 0,
    ativo: true,
  };

  vendedores.push(novo);
  vendasPorVendedor[novo.id] = [];

  registrarHistorico(novo.id, usuario, "criacao", `Vendedor "${novo.nome}" foi cadastrado`);
  registrarAuditoria(usuario, `Cadastrou o vendedor "${novo.nome}" (${novo.filial})`);

  return { vendedor: enriquecer(novo) };
}

export function atualizar(id, dados = {}, usuario = "Gestor") {
  const vendedor = vendedores.find((v) => v.id === id);
  if (!vendedor) return { erro: "Vendedor não encontrado", status: 404 };
  if (vendedor.ativo === false) {
    return { erro: "Vendedor está inativo. Restaure o cadastro antes de editar.", status: 409 };
  }

  const { valores, erros } = validarCampos(dados, { exigirObrigatorios: false });
  if (erros.length > 0) return { erro: erros.join(". "), status: 400 };

  const alteracoes = [];
  for (const campo of CAMPOS_EDITAVEIS) {
    if (valores[campo] === undefined) continue;
    if (valores[campo] !== vendedor[campo]) {
      alteracoes.push({ campo, valorAntigo: vendedor[campo], valorNovo: valores[campo] });
      vendedor[campo] = valores[campo];
    }
  }

  if (alteracoes.length > 0) {
    const data = new Date().toISOString();
    for (const alt of alteracoes) {
      registrarHistorico(
        vendedor.id,
        usuario,
        "edicao",
        `${LABEL_CAMPO[alt.campo]}: ${formatarValor(alt.campo, alt.valorAntigo)} → ${formatarValor(alt.campo, alt.valorNovo)}`,
        data
      );
    }
    registrarAuditoria(
      usuario,
      `Editou "${vendedor.nome}" (${alteracoes.map((a) => LABEL_CAMPO[a.campo]).join(", ")})`,
      data
    );
  }

  return { vendedor: { ...enriquecer(vendedor), alteracoes: alteracoes.length } };
}

/**
 * Exclusão suave: o vendedor sai das listagens, mas o cadastro e o histórico
 * continuam no banco. Comissão é dinheiro pago a pessoas — apagar o registro
 * destruiria a rastreabilidade dos meses já fechados.
 */
export function excluir(id, usuario = "Gestor") {
  const vendedor = vendedores.find((v) => v.id === id);
  if (!vendedor) return { erro: "Vendedor não encontrado", status: 404 };
  if (vendedor.ativo === false) return { erro: "Vendedor já está inativo", status: 409 };

  vendedor.ativo = false;

  registrarHistorico(
    vendedor.id,
    usuario,
    "exclusao",
    `Vendedor "${vendedor.nome}" foi removido da equipe ativa`
  );
  registrarAuditoria(usuario, `Removeu o vendedor "${vendedor.nome}" (histórico preservado)`);

  return { ok: true };
}

export function restaurar(id, usuario = "Gestor") {
  const vendedor = vendedores.find((v) => v.id === id);
  if (!vendedor) return { erro: "Vendedor não encontrado", status: 404 };
  if (vendedor.ativo !== false) return { erro: "Vendedor já está ativo", status: 409 };

  vendedor.ativo = true;

  registrarHistorico(
    vendedor.id,
    usuario,
    "restauracao",
    `Vendedor "${vendedor.nome}" foi restaurado para a equipe ativa`
  );
  registrarAuditoria(usuario, `Restaurou o vendedor "${vendedor.nome}"`);

  return { vendedor: enriquecer(vendedor) };
}

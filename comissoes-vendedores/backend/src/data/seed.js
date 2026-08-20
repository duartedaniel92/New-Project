// Base de dados em memória. Em produção isso seria substituído por
// PostgreSQL/MySQL (dados relacionais de vendas/comissões) — ver README.
// Nada aqui é removido de verdade: exclusões e edições viram histórico.
//
// As coleções são exportadas como constantes e SEMPRE alteradas no lugar
// (push/splice/Object.assign). Reatribuir (`vendedores = []`) quebraria a
// referência que os serviços já capturaram no import.

/** Estado inicial, usado no boot e em `resetarDados()`. */
function dadosIniciais() {
  return {
    regraComissaoMeta: {
      taxaAbaixoMeta: 1, // %
      taxaNaMeta: 2, // %
      faixasBonus: [
        { id: "b1", percentualMeta: 110, taxa: 2, bonusFixo: 500 },
        { id: "b2", percentualMeta: 120, taxa: 2, bonusFixo: 650 },
        { id: "b3", percentualMeta: 130, taxa: 2, bonusFixo: 800 },
      ],
    },

    regrasCategoria: [
      { id: "c1", categoria: "Eletrônicos", taxa: 3 },
      { id: "c2", categoria: "Calçados", taxa: 5 },
      { id: "c3", categoria: "Acessórios", taxa: 4 },
    ],

    campanhas: [
      {
        id: "camp1",
        nome: "Sábado em dobro — Tênis encalhados",
        data: "2026-08-22",
        tipo: "bonus_fixo",
        valor: 50,
        ativo: true,
      },
    ],

    vendedores: [
      {
        id: "v1",
        nome: "Carla Menezes",
        funcao: "Vendedora Sênior",
        filial: "Shopping Center Norte",
        dataInicio: "2026-08-01",
        metaMensal: 30000,
        faturamentoDia: 2150,
        faturamentoMes: 18400,
        atendimentosDia: 14,
        conversao: 0.42,
        pa: 1.8, // peças por atendimento
        ativo: true,
      },
      {
        id: "v2",
        nome: "Bruno Aparecido",
        funcao: "Vendedor",
        filial: "Shopping Center Norte",
        dataInicio: "2026-08-10",
        metaMensal: 30000,
        faturamentoDia: 980,
        faturamentoMes: 9200,
        atendimentosDia: 9,
        conversao: 0.31,
        pa: 1.2,
        ativo: true,
      },
      {
        id: "v3",
        nome: "Fernanda Lima",
        funcao: "Vendedora Sênior",
        filial: "Shopping Iguatemi",
        dataInicio: "2026-08-01",
        metaMensal: 25000,
        faturamentoDia: 3400,
        faturamentoMes: 32750,
        atendimentosDia: 18,
        conversao: 0.51,
        pa: 2.1,
        ativo: true,
      },
      {
        id: "v4",
        nome: "Diego Ramos",
        funcao: "Vendedor Júnior",
        filial: "Shopping Iguatemi",
        dataInicio: "2026-08-05",
        metaMensal: 20000,
        faturamentoDia: 1400,
        faturamentoMes: 11750,
        atendimentosDia: 11,
        conversao: 0.28,
        pa: 1.4,
        ativo: true,
      },
    ],

    vendasPorVendedor: {
      v1: [
        { id: "s1", produto: "Tênis Runner Pro", categoria: "Calçados", valor: 450, hora: "09:15" },
        {
          id: "s2",
          produto: "Fone Bluetooth X2",
          categoria: "Eletrônicos",
          valor: 320,
          hora: "10:40",
        },
        {
          id: "s3",
          produto: "Meia Esportiva (kit)",
          categoria: "Acessórios",
          valor: 80,
          hora: "11:05",
        },
      ],
      v2: [
        {
          id: "s4",
          produto: "Tênis Casual Classic",
          categoria: "Calçados",
          valor: 380,
          hora: "09:50",
        },
      ],
      v3: [
        { id: "s5", produto: "Tênis Trail X", categoria: "Calçados", valor: 520, hora: "08:30" },
        {
          id: "s6",
          produto: "Smartwatch Fit",
          categoria: "Eletrônicos",
          valor: 690,
          hora: "13:20",
        },
      ],
      v4: [
        { id: "s7", produto: "Boné Aba Reta", categoria: "Acessórios", valor: 90, hora: "14:10" },
      ],
    },

    auditLog: [
      {
        id: "a1",
        data: "2026-08-18T15:40:00-03:00",
        usuario: "Gestor Carlos",
        acao: "Alterou a comissão da venda #s2 de 3% para 5%",
      },
    ],

    // Série horária para o gráfico de tendência intradia (loja toda)
    vendasIntradia: [
      { hora: "08h", hoje: 400, semanaAnterior: 350 },
      { hora: "09h", hoje: 1200, semanaAnterior: 900 },
      { hora: "10h", hoje: 2100, semanaAnterior: 1800 },
      { hora: "11h", hoje: 3400, semanaAnterior: 3100 },
      { hora: "12h", hoje: 3900, semanaAnterior: 3600 },
      { hora: "13h", hoje: 4800, semanaAnterior: 4200 },
      { hora: "14h", hoje: 5600, semanaAnterior: 5000 },
      { hora: "15h", hoje: 6300, semanaAnterior: 5700 },
    ],
  };
}

const inicial = dadosIniciais();

// ---------- Coleções vivas ----------

export const regraComissaoMeta = inicial.regraComissaoMeta;
export const regrasCategoria = inicial.regrasCategoria;
export const campanhas = inicial.campanhas;
export const vendedores = inicial.vendedores;
export const vendasPorVendedor = inicial.vendasPorVendedor;
export const auditLog = inicial.auditLog;
export const vendasIntradia = inicial.vendasIntradia;

// Histórico de alterações por vendedor — nunca é apagado, mesmo que o
// vendedor seja excluído (o registro do vendedor apenas fica inativo).
export const historicoVendedores = [];

// ---------- Utilitários de escrita ----------

const contadores = new Map();

/**
 * Gera IDs únicos por prefixo. Usar o tamanho do array como ID é perigoso:
 * quando o array encolhe ou é reordenado, IDs se repetem e o histórico
 * passa a apontar para o registro errado.
 */
export function proximoId(prefixo) {
  const proximo = (contadores.get(prefixo) || 0) + 1;
  contadores.set(prefixo, proximo);
  return `${prefixo}${Date.now().toString(36)}${proximo}`;
}

/** Registra um evento na auditoria geral (mais recente primeiro). */
export function registrarAuditoria(usuario, acao, data = new Date().toISOString()) {
  const evento = { id: proximoId("a"), data, usuario: usuario || "Gestor", acao };
  auditLog.unshift(evento);
  return evento;
}

/**
 * Devolve o banco em memória ao estado inicial, sem trocar as referências que
 * os serviços já importaram. Existe para os testes: cada arquivo de teste
 * cadastra, edita e exclui vendedores, e sem isso um teste passaria a
 * depender do que o anterior deixou para trás.
 */
export function resetarDados() {
  const novo = dadosIniciais();

  Object.assign(regraComissaoMeta, novo.regraComissaoMeta);
  regraComissaoMeta.faixasBonus = novo.regraComissaoMeta.faixasBonus;

  regrasCategoria.splice(0, regrasCategoria.length, ...novo.regrasCategoria);
  campanhas.splice(0, campanhas.length, ...novo.campanhas);
  vendedores.splice(0, vendedores.length, ...novo.vendedores);
  auditLog.splice(0, auditLog.length, ...novo.auditLog);
  vendasIntradia.splice(0, vendasIntradia.length, ...novo.vendasIntradia);
  historicoVendedores.splice(0, historicoVendedores.length);

  for (const chave of Object.keys(vendasPorVendedor)) delete vendasPorVendedor[chave];
  Object.assign(vendasPorVendedor, novo.vendasPorVendedor);

  // Os contadores de ID NÃO são zerados de propósito: se fossem, dois registros
  // criados no mesmo milissegundo antes e depois de um reset receberiam o mesmo
  // ID, e o histórico passaria a apontar para o vendedor errado.
}

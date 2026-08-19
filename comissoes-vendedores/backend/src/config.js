/**
 * Configuração central da API.
 *
 * Tudo que muda entre a máquina do desenvolvedor e o servidor da loja fica
 * aqui, lido de variáveis de ambiente com um padrão seguro. Nada de número
 * mágico espalhado pelo código: quem precisar ajustar a margem ou a porta
 * mexe em um lugar só (ou no `.env`).
 */

function numero(valor, padrao) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : padrao;
}

function lista(valor) {
  return String(valor ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const origensPermitidas = lista(process.env.CORS_ORIGIN);

export const config = {
  ambiente: process.env.NODE_ENV || "development",
  porta: numero(process.env.PORT, 3001),

  /**
   * Origens liberadas no CORS. Vazio = libera qualquer origem, que é o
   * comportamento adequado só em desenvolvimento (o Vite chama a API pelo
   * proxy). Em produção defina CORS_ORIGIN com o domínio do painel.
   */
  origensPermitidas,

  /** Margem bruta estimada usada no cálculo do lucro líquido do painel. */
  margemEstimada: numero(process.env.MARGEM_ESTIMADA, 0.55),

  /** Dias úteis considerados em um mês comercial. */
  diasUteisNoMes: numero(process.env.DIAS_UTEIS_NO_MES, 22),

  /** Teto de eventos devolvidos pela auditoria em uma única página. */
  limiteAuditoria: numero(process.env.LIMITE_AUDITORIA, 100),

  /** Tamanho máximo aceito no corpo das requisições. */
  limiteCorpo: process.env.LIMITE_CORPO || "100kb",

  get emProducao() {
    return this.ambiente === "production";
  },
};

export default config;

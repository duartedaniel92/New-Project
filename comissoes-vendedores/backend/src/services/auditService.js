/**
 * Consulta da auditoria.
 *
 * A rota antiga devolvia o log inteiro em toda chamada. Em memória isso é
 * inofensivo, mas depois de alguns meses de uso real (uma linha por edição de
 * cadastro e por mudança de regra) a tela de auditoria passaria a baixar
 * dezenas de milhares de registros para mostrar os vinte primeiros.
 */

import { auditLog } from "../data/seed.js";
import { config } from "../config.js";

function inteiroPositivo(valor, padrao) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : padrao;
}

/**
 * @param {{limite?:number|string, pagina?:number|string, busca?:string}} filtros
 */
export function listarAuditoria({ limite, pagina, busca } = {}) {
  const porPagina = Math.min(inteiroPositivo(limite, 50), config.limiteAuditoria);
  const paginaAtual = inteiroPositivo(pagina, 1);

  let eventos = auditLog;

  if (typeof busca === "string" && busca.trim() !== "") {
    const termo = busca.trim().toLowerCase();
    eventos = eventos.filter((e) => `${e.usuario} ${e.acao}`.toLowerCase().includes(termo));
  }

  const inicio = (paginaAtual - 1) * porPagina;

  return {
    total: eventos.length,
    pagina: paginaAtual,
    porPagina,
    eventos: eventos.slice(inicio, inicio + porPagina),
  };
}

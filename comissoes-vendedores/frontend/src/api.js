/**
 * Cliente da API.
 *
 * Três coisas que a versão anterior não tratava:
 *  - **cancelamento**: cada chamada aceita um `signal`, para a tela poder
 *    descartar a resposta de uma busca que já ficou obsoleta;
 *  - **timeout**: sem ele, uma API pendurada deixava a tela em "Carregando..."
 *    para sempre;
 *  - **resposta sem corpo**: um 204 fazia `res.json()` estourar um erro de
 *    parse que aparecia para o usuário como se a operação tivesse falhado.
 */

const BASE = import.meta.env?.VITE_API_URL || "/api";
const TIMEOUT_PADRAO = 15000;

/** Erro de API com o status HTTP junto, para a tela decidir o que mostrar. */
export class ApiError extends Error {
  constructor(mensagem, status) {
    super(mensagem);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Junta o cancelamento pedido pela tela com o timeout interno. */
function montarSinal(signal, timeout) {
  const sinais = [AbortSignal.timeout(timeout)];
  if (signal) sinais.push(signal);
  return AbortSignal.any(sinais);
}

async function request(path, { signal, timeout = TIMEOUT_PADRAO, body, ...options } = {}) {
  let res;

  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      body,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      signal: montarSinal(signal, timeout),
    });
  } catch (e) {
    // cancelamento pedido pela própria tela: propaga sem virar mensagem de erro
    if (e.name === "AbortError" && signal?.aborted) throw e;
    if (e.name === "TimeoutError") {
      throw new ApiError("A API demorou demais para responder. Tente novamente.", 0);
    }
    // erro de rede: quase sempre a janela da API foi fechada
    throw new ApiError(
      "Não consegui falar com a API. Confira se a janela do servidor continua aberta.",
      0
    );
  }

  if (res.status === 204) return null;

  const corpo = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(corpo?.erro || `Erro ${res.status} ao acessar o servidor`, res.status);
  }

  return corpo;
}

/** Monta a query string ignorando parâmetros vazios. */
function query(params = {}) {
  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params)) {
    if (valor !== undefined && valor !== null && valor !== "") busca.set(chave, String(valor));
  }
  const qs = busca.toString();
  return qs ? `?${qs}` : "";
}

const json = (dados) => JSON.stringify(dados);

export const api = {
  getDashboard: (opcoes) => request("/dashboard", opcoes),

  getSellers: (params = {}, opcoes) => request(`/sellers${query(params)}`, opcoes),
  getSeller: (id, opcoes) => request(`/sellers/${encodeURIComponent(id)}`, opcoes),
  createSeller: (dados, usuario, opcoes) =>
    request("/sellers", { ...opcoes, method: "POST", body: json({ ...dados, usuario }) }),
  updateSeller: (id, dados, usuario, opcoes) =>
    request(`/sellers/${encodeURIComponent(id)}`, {
      ...opcoes,
      method: "PUT",
      body: json({ ...dados, usuario }),
    }),
  deleteSeller: (id, usuario, opcoes) =>
    request(`/sellers/${encodeURIComponent(id)}`, {
      ...opcoes,
      method: "DELETE",
      body: json({ usuario }),
    }),
  restoreSeller: (id, usuario, opcoes) =>
    request(`/sellers/${encodeURIComponent(id)}/restaurar`, {
      ...opcoes,
      method: "POST",
      body: json({ usuario }),
    }),

  getRules: (opcoes) => request("/rules", opcoes),
  updateRegraMeta: (regra, usuario, opcoes) =>
    request("/rules/meta", { ...opcoes, method: "PUT", body: json({ ...regra, usuario }) }),
  updateCategoria: (categoria, taxa, usuario, opcoes) =>
    request("/rules/categoria", {
      ...opcoes,
      method: "PUT",
      body: json({ categoria, taxa, usuario }),
    }),
  createCampanha: (payload, opcoes) =>
    request("/rules/campanhas", { ...opcoes, method: "POST", body: json(payload) }),

  getAudit: (params = {}, opcoes) => request(`/audit${query(params)}`, opcoes),
};

/** URL de download da folha — usada direto em um link, sem passar por fetch. */
export const urlFolhaCsv = `${BASE}/export/folha.csv`;

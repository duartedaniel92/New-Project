import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "../api.js";

function respostaJson(corpo, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => corpo,
  };
}

describe("cliente da API", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it("erro do servidor vira a mensagem que a API mandou", async () => {
    fetch.mockResolvedValue(
      respostaJson({ erro: "Meta mensal não pode ser negativa" }, { status: 400 })
    );

    await expect(api.getDashboard()).rejects.toThrow("Meta mensal não pode ser negativa");
  });

  it("erro carrega o status HTTP para a tela decidir o que fazer", async () => {
    fetch.mockResolvedValue(respostaJson({ erro: "Vendedor não encontrado" }, { status: 404 }));

    await expect(api.getSeller("x")).rejects.toMatchObject({ status: 404, name: "ApiError" });
  });

  it("erro de rede vira mensagem explicando que a API pode estar fechada", async () => {
    fetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(api.getDashboard()).rejects.toThrow(/janela do servidor/i);
  });

  it("resposta 204 devolve null em vez de estourar erro de parse", async () => {
    fetch.mockResolvedValue({ ok: true, status: 204, headers: new Headers() });

    await expect(api.deleteSeller("v1", "Gestor")).resolves.toBeNull();
  });

  it("resposta de erro sem corpo JSON ainda produz mensagem legível", async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      json: async () => {
        throw new Error("não é json");
      },
    });

    await expect(api.getRules()).rejects.toThrow(/Erro 500/);
  });

  it("parâmetros vazios não entram na query string", async () => {
    fetch.mockResolvedValue(respostaJson([]));

    await api.getSellers({ busca: "", ordenarPor: "nome", direcao: undefined });

    expect(fetch.mock.calls[0][0]).toBe("/api/sellers?ordenarPor=nome");
  });

  it("id do vendedor é escapado na URL", async () => {
    fetch.mockResolvedValue(respostaJson({}));

    await api.getSeller("id com espaço/../..");

    expect(fetch.mock.calls[0][0]).not.toContain("../");
  });

  it("cancelamento pedido pela tela propaga AbortError, não uma mensagem de falha", async () => {
    const controle = new AbortController();
    controle.abort();

    fetch.mockRejectedValue(Object.assign(new Error("abortado"), { name: "AbortError" }));

    await expect(api.getDashboard({ signal: controle.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("timeout vira mensagem própria em vez de erro genérico", async () => {
    fetch.mockRejectedValue(Object.assign(new Error("timeout"), { name: "TimeoutError" }));

    await expect(api.getDashboard()).rejects.toThrow(/demorou demais/i);
  });

  it("ApiError continua sendo um Error de verdade", () => {
    const erro = new ApiError("falhou", 400);
    expect(erro).toBeInstanceOf(Error);
    expect(erro.status).toBe(400);
  });
});

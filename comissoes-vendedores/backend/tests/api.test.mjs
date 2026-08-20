/**
 * Testes de integração: sobem o Express de verdade e batem via HTTP.
 *
 * Os testes de serviço garantem a regra de negócio; estes garantem o contrato
 * da API — código de status, formato do JSON e cabeçalhos —, que é o que o
 * frontend realmente consome.
 */

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { comServidor } from "./helpers/servidor.mjs";
import { resetarDados } from "../src/data/seed.js";

beforeEach(resetarDados);

test("health check responde ok", async () => {
  await comServidor(async ({ chamar }) => {
    const { status, corpo } = await chamar("/api/health");
    assert.equal(status, 200);
    assert.equal(corpo.status, "ok");
  });
});

test("rota inexistente na API devolve JSON de erro, não HTML", async () => {
  await comServidor(async ({ chamar }) => {
    const { status, corpo } = await chamar("/api/nao-existe");
    assert.equal(status, 404);
    assert.ok(corpo.erro);
  });
});

test("JSON malformado devolve 400 legível em vez de derrubar o servidor", async () => {
  await comServidor(async ({ chamar }) => {
    const { status, corpo } = await chamar("/api/sellers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{isso não é json",
    });
    assert.equal(status, 400);
    assert.match(corpo.erro, /dados enviados/i);

    // e a API continua de pé depois disso
    const depois = await chamar("/api/health");
    assert.equal(depois.status, 200);
  });
});

test("ciclo completo do vendedor: cria, edita, exclui e restaura", async () => {
  await comServidor(async ({ chamar }) => {
    const criado = await chamar("/api/sellers", {
      method: "POST",
      body: JSON.stringify({
        nome: "Vendedor Integração",
        filial: "Loja Teste",
        metaMensal: 20000,
        usuario: "Daniel",
      }),
    });
    assert.equal(criado.status, 201);
    const { id } = criado.corpo;

    const editado = await chamar(`/api/sellers/${id}`, {
      method: "PUT",
      body: JSON.stringify({ faturamentoMes: 22000, usuario: "Daniel" }),
    });
    assert.equal(editado.status, 200);
    assert.equal(editado.corpo.faturamentoMes, 22000);
    assert.equal(editado.corpo.taxaAtual, 2); // passou de 100% da meta

    const excluido = await chamar(`/api/sellers/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ usuario: "Daniel" }),
    });
    assert.equal(excluido.status, 200);

    const listaPadrao = await chamar("/api/sellers");
    assert.ok(!listaPadrao.corpo.some((v) => v.id === id));

    const restaurado = await chamar(`/api/sellers/${id}/restaurar`, {
      method: "POST",
      body: JSON.stringify({ usuario: "Daniel" }),
    });
    assert.equal(restaurado.status, 200);
    assert.equal(restaurado.corpo.ativo, true);
  });
});

test("erro de validação vira 400 com a mensagem do serviço", async () => {
  await comServidor(async ({ chamar }) => {
    const { status, corpo } = await chamar("/api/sellers", {
      method: "POST",
      body: JSON.stringify({ nome: "  ", filial: "Loja" }),
    });
    assert.equal(status, 400);
    assert.match(corpo.erro, /branco|obrigat/i);
  });
});

test("vendedor inexistente devolve 404", async () => {
  await comServidor(async ({ chamar }) => {
    const { status } = await chamar("/api/sellers/id-inventado");
    assert.equal(status, 404);
  });
});

test("editar vendedor inativo devolve 409", async () => {
  await comServidor(async ({ chamar }) => {
    const { corpo } = await chamar("/api/sellers", {
      method: "POST",
      body: JSON.stringify({ nome: "Vai Sair", filial: "Loja", metaMensal: 1000 }),
    });
    await chamar(`/api/sellers/${corpo.id}`, { method: "DELETE" });

    const { status } = await chamar(`/api/sellers/${corpo.id}`, {
      method: "PUT",
      body: JSON.stringify({ nome: "Tentando" }),
    });
    assert.equal(status, 409);
  });
});

test("regra inválida devolve 400 e não altera a regra vigente", async () => {
  await comServidor(async ({ chamar }) => {
    const antes = await chamar("/api/rules");

    const { status } = await chamar("/api/rules/meta", {
      method: "PUT",
      body: JSON.stringify({
        taxaAbaixoMeta: 1,
        taxaNaMeta: 2,
        faixasBonus: [{ percentualMeta: 50 }],
      }),
    });
    assert.equal(status, 400);

    const depois = await chamar("/api/rules");
    assert.deepEqual(depois.corpo.regraComissaoMeta, antes.corpo.regraComissaoMeta);
  });
});

test("auditoria vem paginada com total", async () => {
  await comServidor(async ({ chamar }) => {
    const { status, corpo } = await chamar("/api/audit?limite=1");
    assert.equal(status, 200);
    assert.equal(corpo.eventos.length, 1);
    assert.equal(corpo.porPagina, 1);
    assert.ok(Number.isInteger(corpo.total));
  });
});

test("auditoria ignora limite absurdo em vez de devolver o log inteiro", async () => {
  await comServidor(async ({ chamar }) => {
    const { corpo } = await chamar("/api/audit?limite=999999");
    assert.ok(corpo.porPagina <= 100);
  });
});

test("exportação devolve CSV com cabeçalho de download", async () => {
  await comServidor(async ({ chamar }) => {
    const { status, corpo, headers } = await chamar("/api/export/folha.csv");
    assert.equal(status, 200);
    assert.match(headers.get("content-type"), /text\/csv/);
    assert.match(headers.get("content-disposition"), /previa-folha-comissoes\.csv/);
    assert.match(corpo, /Vendedor/);
  });
});

test("painel responde com cards, previsão e lista de vendedores", async () => {
  await comServidor(async ({ chamar }) => {
    const { status, corpo } = await chamar("/api/dashboard");
    assert.equal(status, 200);
    assert.ok(Number.isFinite(corpo.cards.faturamentoBrutoDia));
    assert.ok(Number.isInteger(corpo.previsao.diasUteisRestantes));
    assert.ok(Array.isArray(corpo.vendedores));
  });
});

test("a API não expõe o cabeçalho X-Powered-By", async () => {
  await comServidor(async ({ chamar }) => {
    const { headers } = await chamar("/api/health");
    assert.equal(headers.get("x-powered-by"), null);
  });
});

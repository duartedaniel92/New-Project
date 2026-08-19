// Testes das regras de vendedores: validação, histórico, exclusão suave e busca.
// Rode com: npm test
// Não sobe servidor HTTP nem depende do Express — testa a camada de serviço direto.

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import * as service from "../src/services/sellersService.js";
import { vendedores, historicoVendedores, auditLog, resetarDados } from "../src/data/seed.js";

// Cada teste começa do mesmo banco: sem isso um teste passa a depender do que o
// anterior cadastrou ou excluiu, e a suíte quebra ao mudar a ordem dos casos.
beforeEach(resetarDados);

const criarValido = (extra = {}) =>
  service.criar(
    { nome: "Vendedor Teste", filial: "Loja Teste", metaMensal: 20000, ...extra },
    "Daniel"
  );

// ---------- Validação de cadastro ----------

test("cadastro rejeita nome em branco", () => {
  const r = service.criar({ nome: "   ", filial: "Loja 1" });
  assert.equal(r.status, 400);
  assert.match(r.erro, /branco|obrigatório/i);
});

test("cadastro rejeita filial ausente", () => {
  assert.equal(service.criar({ nome: "Alguém" }).status, 400);
});

test("cadastro rejeita meta negativa", () => {
  const r = service.criar({ nome: "X", filial: "Loja", metaMensal: -100 });
  assert.match(r.erro, /negativ/i);
});

test("cadastro rejeita conversão acima de 1 (45 em vez de 0,45)", () => {
  const r = service.criar({ nome: "X", filial: "Loja", conversao: 45 });
  assert.match(r.erro, /Conversão/i);
});

test("cadastro rejeita texto em campo numérico", () => {
  const r = service.criar({ nome: "X", filial: "Loja", metaMensal: "vinte mil" });
  assert.equal(r.status, 400);
});

test("cadastro válido cria vendedor ativo e registra histórico e auditoria", () => {
  const antes = vendedores.length;
  const r = criarValido({ nome: "Cadastro OK" });
  assert.ok(!r.erro);
  assert.equal(vendedores.length, antes + 1);
  assert.equal(r.vendedor.ativo, true);
  assert.ok(
    historicoVendedores.some((h) => h.vendedorId === r.vendedor.id && h.acao === "criacao")
  );
  assert.ok(auditLog.some((a) => a.acao.includes("Cadastro OK")));
});

// ---------- Edição ----------

test("edição rejeita valor inválido sem alterar o cadastro", () => {
  const { vendedor } = criarValido({ nome: "Edicao Invalida" });
  const metaAntes = vendedor.metaMensal;
  const r = service.atualizar(vendedor.id, { metaMensal: "abc" });
  assert.equal(r.status, 400);
  assert.equal(vendedores.find((v) => v.id === vendedor.id).metaMensal, metaAntes);
});

test("campo numérico vazio é recusado em vez de virar NaN", () => {
  const { vendedor } = criarValido({ nome: "Campo Vazio" });
  const r = service.atualizar(vendedor.id, { faturamentoMes: "" });
  assert.equal(r.status, 400);
  assert.ok(Number.isFinite(vendedores.find((v) => v.id === vendedor.id).faturamentoMes));
});

test("edição válida guarda no histórico o valor antes e depois", () => {
  const { vendedor } = criarValido({ nome: "Historico OK" });
  service.atualizar(vendedor.id, { metaMensal: 25000 }, "Daniel");
  const h = historicoVendedores
    .filter((x) => x.vendedorId === vendedor.id && x.acao === "edicao")
    .pop();
  assert.match(h.detalhe, /Meta mensal/);
  assert.match(h.detalhe, /→/);
  assert.equal(h.usuario, "Daniel");
});

test("todos os campos são editáveis, inclusive nome e função", () => {
  const { vendedor } = criarValido({ nome: "Antigo Nome" });
  const r = service.atualizar(vendedor.id, { nome: "Nome Novo", funcao: "Gerente de Loja" });
  assert.equal(r.vendedor.nome, "Nome Novo");
  assert.equal(r.vendedor.funcao, "Gerente de Loja");
});

test("salvar sem mudar nada não polui o histórico", () => {
  const { vendedor } = criarValido({ nome: "Sem Mudanca" });
  const antes = historicoVendedores.filter((h) => h.vendedorId === vendedor.id).length;
  service.atualizar(vendedor.id, { metaMensal: vendedor.metaMensal, nome: vendedor.nome });
  assert.equal(historicoVendedores.filter((h) => h.vendedorId === vendedor.id).length, antes);
});

test("editar vendedor inexistente retorna 404", () => {
  assert.equal(service.atualizar("id-que-nao-existe", { nome: "X" }).status, 404);
});

// ---------- Exclusão e restauração ----------

test("exclusão é suave: cadastro e histórico continuam guardados", () => {
  const { vendedor } = criarValido({ nome: "Para Excluir" });
  const historicoAntes = historicoVendedores.filter((h) => h.vendedorId === vendedor.id).length;

  assert.ok(service.excluir(vendedor.id, "Daniel").ok);

  const registro = vendedores.find((v) => v.id === vendedor.id);
  assert.ok(registro, "o registro não pode sumir do banco");
  assert.equal(registro.ativo, false);
  assert.ok(
    historicoVendedores.filter((h) => h.vendedorId === vendedor.id).length > historicoAntes
  );
});

test("vendedor inativo sai da listagem padrão e volta com incluirInativos", () => {
  const { vendedor } = criarValido({ nome: "Sumido da Lista" });
  service.excluir(vendedor.id);

  const padrao = service.listar({});
  const comInativos = service.listar({ incluirInativos: "true" });

  assert.ok(!padrao.some((v) => v.id === vendedor.id));
  assert.ok(comInativos.some((v) => v.id === vendedor.id));
});

test("não dá para editar vendedor inativo sem restaurar antes", () => {
  const { vendedor } = criarValido({ nome: "Inativo Travado" });
  service.excluir(vendedor.id);
  assert.equal(service.atualizar(vendedor.id, { nome: "Tentando" }).status, 409);
});

test("excluir duas vezes não duplica o registro de exclusão", () => {
  const { vendedor } = criarValido({ nome: "Exclusao Dupla" });
  service.excluir(vendedor.id);
  assert.equal(service.excluir(vendedor.id).status, 409);
  const exclusoes = historicoVendedores.filter(
    (h) => h.vendedorId === vendedor.id && h.acao === "exclusao"
  );
  assert.equal(exclusoes.length, 1);
});

test("restauração devolve o vendedor à equipe ativa", () => {
  const { vendedor } = criarValido({ nome: "Para Restaurar" });
  service.excluir(vendedor.id);
  const r = service.restaurar(vendedor.id, "Daniel");
  assert.ok(!r.erro);
  assert.equal(vendedores.find((v) => v.id === vendedor.id).ativo, true);
});

// ---------- Listagem ----------

test("ordenar por coluna inexistente não quebra a listagem", () => {
  const lista = service.listar({ ordenarPor: "coluna_inventada", direcao: "desc" });
  assert.ok(Array.isArray(lista));
  assert.ok(lista.length > 0);
});

test("ordenação numérica decrescente funciona", () => {
  const lista = service.listar({ ordenarPor: "faturamentoMes", direcao: "desc" });
  for (let i = 1; i < lista.length; i++) {
    assert.ok(lista[i - 1].faturamentoMes >= lista[i].faturamentoMes);
  }
});

test("busca encontra por função, não só por nome", () => {
  assert.ok(service.listar({ busca: "sênior" }).length > 0);
});

test("busca sem resultado devolve lista vazia em vez de erro", () => {
  assert.deepEqual(service.listar({ busca: "zzzzzz-inexistente" }), []);
});

// ---------- Integridade ----------

test("IDs gerados nunca se repetem", () => {
  const ids = [
    ...vendedores.map((v) => v.id),
    ...historicoVendedores.map((h) => h.id),
    ...auditLog.map((a) => a.id),
  ];
  assert.equal(new Set(ids).size, ids.length, "há IDs duplicados");
});

test("vendedor sem meta não gera comissão NaN na listagem", () => {
  const { vendedor } = service.criar({ nome: "Sem Meta", filial: "Loja", metaMensal: 0 });
  const naLista = service.listar({}).find((v) => v.id === vendedor.id);
  assert.ok(Number.isFinite(naLista.comissaoAcumulada));
  assert.equal(naLista.comissaoAcumulada, 0);
});

/**
 * Testes da exportação. Um CSV de folha de pagamento é aberto no Excel por
 * alguém do RH: precisa chegar com o dado exato e sem executar nada.
 */

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { campoCsv, montarCsv, numeroBr, protegerContraFormula } from "../src/utils/csv.js";
import { gerarFolhaCsv } from "../src/services/exportService.js";
import * as sellers from "../src/services/sellersService.js";
import { resetarDados } from "../src/data/seed.js";

beforeEach(resetarDados);

test("campo com o separador não quebra as colunas nem adultera o texto", () => {
  assert.equal(campoCsv("Loja Centro; Filial 2"), '"Loja Centro; Filial 2"');
});

test("aspas dentro do texto são duplicadas conforme a RFC 4180", () => {
  assert.equal(campoCsv('Loja "Kings"'), '"Loja ""Kings"""');
});

test("quebra de linha dentro do campo continua dentro das aspas", () => {
  assert.equal(campoCsv("linha1\nlinha2"), '"linha1\nlinha2"');
});

test("campo que começa com = vira texto, não fórmula do Excel", () => {
  assert.equal(protegerContraFormula("=1+1"), "'=1+1");
  assert.equal(protegerContraFormula("@SUM(A1:A9)"), "'@SUM(A1:A9)");
  assert.equal(protegerContraFormula("+55 11 99999"), "'+55 11 99999");
});

test("texto comum não é alterado", () => {
  assert.equal(protegerContraFormula("Carla Menezes"), "Carla Menezes");
});

test("número sai com vírgula decimal, como o Excel pt-BR espera", () => {
  assert.equal(numeroBr(1234.5), "1234,50");
  assert.equal(numeroBr("abc"), "0,00");
});

test("CSV completo usa CRLF e começa com BOM", () => {
  const csv = montarCsv(["a", "b"], [["1", "2"]]);
  assert.ok(csv.startsWith("﻿"));
  assert.ok(csv.includes("\r\n"));
});

test("folha exporta um vendedor cadastrado com fórmula no nome de forma segura", () => {
  sellers.criar({ nome: "=CMD()", filial: "Loja", metaMensal: 10000, faturamentoMes: 12000 });
  const csv = gerarFolhaCsv();
  assert.ok(csv.includes(`"'=CMD()"`), "o nome deveria ter sido neutralizado");
});

test("folha não inclui vendedor inativo", () => {
  const { vendedor } = sellers.criar({ nome: "Some da Folha", filial: "Loja", metaMensal: 1000 });
  sellers.excluir(vendedor.id);
  assert.ok(!gerarFolhaCsv().includes("Some da Folha"));
});

test("folha tem uma linha por vendedor ativo, além do cabeçalho", () => {
  const linhas = gerarFolhaCsv().trim().split("\r\n");
  assert.equal(linhas.length, sellers.listar({}).length + 1);
});

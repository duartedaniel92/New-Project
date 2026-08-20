/**
 * Testes do calendário usado na projeção do painel.
 * Antes o "faltam N dias úteis" era um 10 fixo no código; no fim do mês isso
 * inflava a previsão de custo de comissão.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  diasUteisRestantesNoMes,
  diasUteisDecorridosNoMes,
  ehDiaUtil,
  ehDataISOValida,
} from "../src/utils/dates.js";

test("sábado e domingo não são dias úteis", () => {
  assert.equal(ehDiaUtil(new Date(2026, 7, 22)), false); // sábado
  assert.equal(ehDiaUtil(new Date(2026, 7, 23)), false); // domingo
  assert.equal(ehDiaUtil(new Date(2026, 7, 24)), true); // segunda
});

test("no último dia do mês não sobram dias úteis futuros", () => {
  // 31/08/2026 é uma segunda-feira: sobra só o próprio dia
  assert.equal(diasUteisRestantesNoMes(new Date(2026, 7, 31)), 1);
});

test("no último domingo do mês a projeção não soma nenhum dia", () => {
  // 30/08/2026 é domingo e 31 é segunda
  assert.equal(diasUteisRestantesNoMes(new Date(2026, 7, 30)), 1);
});

test("agosto de 2026 tem 21 dias úteis contados do dia 1", () => {
  assert.equal(diasUteisRestantesNoMes(new Date(2026, 7, 1)), 21);
});

test("decorridos + restantes cobrem o mês inteiro sem contar o dia duas vezes", () => {
  const hoje = new Date(2026, 7, 19);
  const total = diasUteisDecorridosNoMes(hoje) + diasUteisRestantesNoMes(hoje);
  assert.equal(total, diasUteisRestantesNoMes(new Date(2026, 7, 1)) + 1); // hoje conta nos dois
});

test("dias restantes nunca é negativo", () => {
  for (const dia of [1, 15, 28, 31]) {
    assert.ok(diasUteisRestantesNoMes(new Date(2026, 0, dia)) >= 0);
  }
});

test("data ISO inválida é recusada", () => {
  assert.equal(ehDataISOValida("2026-02-30"), false);
  assert.equal(ehDataISOValida("30/08/2026"), false);
  assert.equal(ehDataISOValida("2026-13-01"), false);
  assert.equal(ehDataISOValida(""), false);
  assert.equal(ehDataISOValida(null), false);
});

test("data ISO válida é aceita", () => {
  assert.equal(ehDataISOValida("2026-08-19"), true);
  assert.equal(ehDataISOValida("2024-02-29"), true); // ano bissexto
});

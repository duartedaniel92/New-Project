// Testes da regra de comissão. Rode com: npm test
// Usa o test runner nativo do Node 18+ — não precisa instalar nada.

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  calcularComissaoPorMeta,
  calcularComissaoPorCategoria,
  numeroSeguro,
} from "../src/utils/commission.js";
import { regraComissaoMeta as regra, regrasCategoria, resetarDados } from "../src/data/seed.js";

beforeEach(resetarDados);

// ---------- Faixas da regra ----------

const casos = [
  { desc: "abaixo da meta (60%)", fat: 18000, meta: 30000, taxa: 1, bonus: 0 },
  { desc: "99% da meta ainda é taxa base", fat: 29700, meta: 30000, taxa: 1, bonus: 0 },
  { desc: "exatamente 100% vira taxa cheia", fat: 30000, meta: 30000, taxa: 2, bonus: 0 },
  { desc: "105% sem bônus ainda", fat: 31500, meta: 30000, taxa: 2, bonus: 0 },
  { desc: "110% ativa o primeiro bônus", fat: 33000, meta: 30000, taxa: 2, bonus: 500 },
  { desc: "115% mantém o bônus de 110%", fat: 34500, meta: 30000, taxa: 2, bonus: 500 },
  { desc: "120% ativa o segundo bônus", fat: 36000, meta: 30000, taxa: 2, bonus: 650 },
  { desc: "130% ativa o terceiro bônus", fat: 39000, meta: 30000, taxa: 2, bonus: 800 },
  { desc: "acima de 130% mantém o último bônus", fat: 45000, meta: 30000, taxa: 2, bonus: 800 },
];

for (const c of casos) {
  test(c.desc, () => {
    const res = calcularComissaoPorMeta(c.fat, c.meta, regra);
    assert.equal(res.taxaAplicada, c.taxa);
    assert.equal(res.bonusFixo, c.bonus);
    assert.equal(res.comissaoTotal, Number((c.fat * (c.taxa / 100) + c.bonus).toFixed(2)));
  });
}

// ---------- Bordas de arredondamento (bug corrigido) ----------

test("109,99% da meta NÃO recebe o bônus de 110%, mesmo exibindo 110%", () => {
  const res = calcularComissaoPorMeta(32999, 30000, regra);
  assert.equal(res.percentualMeta, 110); // o que aparece na tela
  assert.equal(res.bonusFixo, 0); // o que realmente é pago
});

test("129,99% da meta NÃO recebe o bônus de 130%", () => {
  const res = calcularComissaoPorMeta(38999, 30000, regra);
  assert.equal(res.bonusFixo, 650); // continua na faixa de 120%
});

test("99,99% da meta ainda é taxa base, não taxa cheia", () => {
  const res = calcularComissaoPorMeta(29999, 30000, regra);
  assert.equal(res.taxaAplicada, 1);
});

test("R$ 0,01 acima do gatilho já vale o bônus", () => {
  const res = calcularComissaoPorMeta(33000.01, 30000, regra);
  assert.equal(res.bonusFixo, 500);
});

// ---------- Entradas inválidas ----------

test("meta zerada não quebra o cálculo", () => {
  assert.equal(calcularComissaoPorMeta(5000, 0, regra).comissaoTotal, 0);
});

test("valores inválidos (texto, null, NaN) não geram NaN na comissão", () => {
  for (const entrada of ["abc", null, undefined, NaN]) {
    const res = calcularComissaoPorMeta(entrada, 30000, regra);
    assert.ok(Number.isFinite(res.comissaoTotal), `quebrou com ${entrada}`);
  }
  const semMeta = calcularComissaoPorMeta(30000, "abc", regra);
  assert.equal(semMeta.comissaoTotal, 0);
});

test("faturamento negativo não gera comissão negativa por engano", () => {
  const res = calcularComissaoPorMeta(-5000, 30000, regra);
  assert.equal(res.comissaoTotal, 0);
});

test("faixas fora de ordem no cadastro ainda são avaliadas corretamente", () => {
  const regraBagunçada = {
    taxaAbaixoMeta: 1,
    taxaNaMeta: 2,
    faixasBonus: [
      { percentualMeta: 130, taxa: 2, bonusFixo: 800 },
      { percentualMeta: 110, taxa: 2, bonusFixo: 500 },
      { percentualMeta: 120, taxa: 2, bonusFixo: 650 },
    ],
  };
  assert.equal(calcularComissaoPorMeta(36000, 30000, regraBagunçada).bonusFixo, 650);
});

test("regra sem faixas de bônus continua pagando a taxa por meta", () => {
  const semFaixas = { taxaAbaixoMeta: 1, taxaNaMeta: 2, faixasBonus: [] };
  const res = calcularComissaoPorMeta(45000, 30000, semFaixas);
  assert.equal(res.taxaAplicada, 2);
  assert.equal(res.bonusFixo, 0);
});

// ---------- Regra de negócio central ----------

test("comissão é individual: mesmo faturamento com metas diferentes gera valores diferentes", () => {
  const a = calcularComissaoPorMeta(30000, 30000, regra); // 100% da meta
  const b = calcularComissaoPorMeta(30000, 20000, regra); // 150% da meta
  assert.equal(a.bonusFixo, 0);
  assert.equal(b.bonusFixo, 800);
  assert.ok(b.comissaoTotal > a.comissaoTotal);
});

// ---------- Comissão de referência por categoria ----------

test("categoria inexistente retorna null em vez de quebrar", () => {
  assert.equal(calcularComissaoPorCategoria(100, "Categoria Fantasma", regrasCategoria), null);
});

test("categoria conhecida calcula o percentual do item", () => {
  assert.equal(calcularComissaoPorCategoria(450, "Calçados", regrasCategoria), 22.5);
});

// ---------- Utilitário ----------

test("numeroSeguro converte entradas de formulário sem gerar NaN", () => {
  assert.equal(numeroSeguro("1500"), 1500);
  assert.equal(numeroSeguro(""), 0);
  assert.equal(numeroSeguro("abc"), 0);
  assert.equal(numeroSeguro(null, 10), 10);
});

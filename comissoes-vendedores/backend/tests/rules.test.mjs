// Testes das regras de comissão editáveis e do painel principal.
// Rode com: npm test

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import * as rules from "../src/services/rulesService.js";
import { montarDashboard } from "../src/services/dashboardService.js";
import { regraComissaoMeta, resetarDados } from "../src/data/seed.js";

beforeEach(resetarDados);

const regraPadrao = {
  taxaAbaixoMeta: 1,
  taxaNaMeta: 2,
  faixasBonus: [
    { percentualMeta: 110, taxa: 2, bonusFixo: 500 },
    { percentualMeta: 120, taxa: 2, bonusFixo: 650 },
    { percentualMeta: 130, taxa: 2, bonusFixo: 800 },
  ],
};

// ---------- Validação das regras ----------

test("recusa faixa de bônus abaixo de 100% da meta", () => {
  const r = rules.atualizarRegraMeta({
    ...regraPadrao,
    faixasBonus: [{ percentualMeta: 80, taxa: 2, bonusFixo: 500 }],
  });
  assert.equal(r.status, 400);
});

test("recusa duas faixas no mesmo percentual", () => {
  const r = rules.atualizarRegraMeta({
    ...regraPadrao,
    faixasBonus: [
      { percentualMeta: 110, taxa: 2, bonusFixo: 500 },
      { percentualMeta: 110, taxa: 2, bonusFixo: 900 },
    ],
  });
  assert.match(r.erro, /já existe/i);
});

test("recusa bônus negativo", () => {
  const r = rules.atualizarRegraMeta({
    ...regraPadrao,
    faixasBonus: [{ percentualMeta: 110, taxa: 2, bonusFixo: -50 }],
  });
  assert.equal(r.status, 400);
});

test("recusa taxa acima de 100%", () => {
  assert.equal(rules.atualizarRegraMeta({ ...regraPadrao, taxaNaMeta: 150 }).status, 400);
});

test("recusa taxa em texto", () => {
  assert.equal(rules.atualizarRegraMeta({ ...regraPadrao, taxaAbaixoMeta: "um" }).status, 400);
});

test("uma regra inválida não sobrescreve a regra que já estava valendo", () => {
  rules.atualizarRegraMeta(regraPadrao, "Daniel");
  const antes = JSON.stringify(regraComissaoMeta);
  rules.atualizarRegraMeta({ ...regraPadrao, taxaNaMeta: -5 });
  assert.equal(JSON.stringify(regraComissaoMeta), antes);
});

// ---------- Gravação ----------

test("salva as faixas já ordenadas mesmo se vierem fora de ordem", () => {
  const r = rules.atualizarRegraMeta(
    {
      taxaAbaixoMeta: 1,
      taxaNaMeta: 2,
      faixasBonus: [
        { percentualMeta: 130, taxa: 2, bonusFixo: 800 },
        { percentualMeta: 110, taxa: 2, bonusFixo: 500 },
        { percentualMeta: 120, taxa: 2, bonusFixo: 650 },
      ],
    },
    "Daniel"
  );
  assert.ok(!r.erro);
  assert.deepEqual(
    r.regraComissaoMeta.faixasBonus.map((f) => f.percentualMeta),
    [110, 120, 130]
  );
});

test("aceita regra sem nenhuma faixa de bônus", () => {
  const r = rules.atualizarRegraMeta({ taxaAbaixoMeta: 1, taxaNaMeta: 2, faixasBonus: [] });
  assert.ok(!r.erro);
  rules.atualizarRegraMeta(regraPadrao, "Daniel"); // restaura para os demais testes
});

test("categoria recusa taxa fora do intervalo", () => {
  assert.equal(rules.atualizarCategoria({ categoria: "Calçados", taxa: 500 }).status, 400);
});

test("categoria nova é criada com ID próprio", () => {
  const r = rules.atualizarCategoria({ categoria: "Bonés", taxa: 4 }, "Daniel");
  assert.ok(r.regrasCategoria.some((c) => c.categoria === "Bonés" && c.id));
});

test("campanha recusa valor negativo", () => {
  const r = rules.criarCampanha({ nome: "X", data: "2026-09-01", tipo: "bonus_fixo", valor: -10 });
  assert.equal(r.status, 400);
});

// ---------- Painel principal ----------

test("dashboard devolve cards numéricos válidos", () => {
  const d = montarDashboard();
  for (const [chave, valor] of Object.entries(d.cards)) {
    assert.ok(Number.isFinite(valor), `${chave} não é número`);
  }
});

test("dashboard traz a lista de vendedores com comissão calculada", () => {
  const d = montarDashboard();
  assert.ok(d.vendedores.length > 0);
  for (const v of d.vendedores) {
    assert.ok(Number.isFinite(v.comissaoTotal));
    assert.ok(Number.isFinite(v.percentualMeta));
    assert.ok(["verde", "amarelo", "vermelho"].includes(v.status));
  }
});

test("vendedores do painel vêm ordenados por faturamento", () => {
  const lista = montarDashboard().vendedores;
  for (let i = 1; i < lista.length; i++) {
    assert.ok(lista[i - 1].faturamentoMes >= lista[i].faturamentoMes);
  }
});

test("a projeção nunca fica abaixo do que já foi realizado", () => {
  const d = montarDashboard();
  assert.ok(d.previsao.comissaoMes >= d.cards.totalComissoesMes);
});

test("a projeção acompanha a regra: dobrar as taxas aumenta a comissão projetada", () => {
  const antes = montarDashboard().previsao.comissaoMes;
  rules.atualizarRegraMeta({ taxaAbaixoMeta: 2, taxaNaMeta: 4, faixasBonus: [] }, "Daniel");
  const depois = montarDashboard().previsao.comissaoMes;
  rules.atualizarRegraMeta(regraPadrao, "Daniel"); // restaura
  assert.ok(depois > antes, "a previsão ignorou a mudança de regra");
});

test("o total de comissões do painel bate com a soma por vendedor", () => {
  const d = montarDashboard();
  const soma = d.vendedores.reduce((acc, v) => acc + v.comissaoTotal, 0);
  assert.ok(Math.abs(soma - d.cards.totalComissoesMes) < 0.02);
});

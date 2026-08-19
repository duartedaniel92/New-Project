/**
 * Buracos de validação que o `Number()` do JavaScript abria sem avisar.
 *
 * `Number(true)` é 1, `Number([])` é 0, `Number("   ")` é 0 e `Number(["5"])` é
 * 5. Todos passavam pela validação antiga e gravavam um valor que ninguém
 * digitou — em uma folha de comissão, isso é dinheiro errado no fim do mês.
 */

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import * as service from "../src/services/sellersService.js";
import * as rules from "../src/services/rulesService.js";
import { resetarDados, vendedores } from "../src/data/seed.js";
import { numeroSeguro } from "../src/utils/commission.js";

beforeEach(resetarDados);

const base = { nome: "Fulano", filial: "Loja", metaMensal: 10000 };

test("booleano em campo numérico é recusado (Number(true) valeria 1)", () => {
  const r = service.criar({ ...base, faturamentoMes: true });
  assert.equal(r.status, 400);
});

test("array em campo numérico é recusado (Number([]) valeria 0)", () => {
  assert.equal(service.criar({ ...base, faturamentoMes: [] }).status, 400);
  assert.equal(service.criar({ ...base, faturamentoMes: ["5000"] }).status, 400);
});

test("apenas espaços em campo numérico é recusado (Number('  ') valeria 0)", () => {
  assert.equal(service.criar({ ...base, faturamentoMes: "   " }).status, 400);
});

test("objeto em campo de texto não vira '[object Object]' no cadastro", () => {
  const r = service.criar({ ...base, funcao: { cargo: "Gerente" } });
  assert.equal(r.status, 400);
  assert.ok(!vendedores.some((v) => String(v.funcao).includes("object Object")));
});

test("atendimentos no dia precisa ser inteiro", () => {
  assert.equal(service.criar({ ...base, atendimentosDia: 3.5 }).status, 400);
  assert.ok(!service.criar({ ...base, atendimentosDia: 3 }).erro);
});

test("valor absurdo (zero a mais no formulário) é barrado", () => {
  const r = service.criar({ ...base, metaMensal: 999_999_999_999 });
  assert.equal(r.status, 400);
});

test("data de início inválida é recusada", () => {
  assert.equal(service.criar({ ...base, dataInicio: "30/08/2026" }).status, 400);
  assert.equal(service.criar({ ...base, dataInicio: "2026-02-30" }).status, 400);
});

test("nome absurdamente longo é recusado", () => {
  assert.equal(service.criar({ ...base, nome: "a".repeat(500) }).status, 400);
});

test("corpo que não é objeto não derruba a validação", () => {
  for (const entrada of [null, "texto", 42, []]) {
    assert.equal(service.criar(entrada).status, 400, `passou com ${JSON.stringify(entrada)}`);
  }
});

test("ordenar por propriedade herdada do prototype não é aceito", () => {
  const lista = service.listar({ ordenarPor: "constructor", direcao: "desc" });
  const padrao = service.listar({});
  assert.deepEqual(
    lista.map((v) => v.id),
    padrao.map((v) => v.id)
  );
});

test("ordenar por coluna permitida continua funcionando", () => {
  const lista = service.listar({ ordenarPor: "nome", direcao: "asc" });
  const nomes = lista.map((v) => v.nome);
  assert.deepEqual(
    nomes,
    [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"))
  );
});

test("busca ignora acento: 'senior' encontra 'Sênior'", () => {
  assert.ok(service.listar({ busca: "senior" }).length > 0);
});

test("numeroSeguro recusa booleano e array em vez de convertê-los", () => {
  assert.equal(numeroSeguro(true, -1), -1);
  assert.equal(numeroSeguro([], -1), -1);
  assert.equal(numeroSeguro("   ", -1), -1);
  assert.equal(numeroSeguro("1500"), 1500);
});

test("a faixa devolvida pelo cálculo é uma cópia: alterá-la não muda a regra vigente", () => {
  const { vendedor } = service.criar({ ...base, faturamentoMes: 12000 }); // 120% da meta
  const antes = JSON.stringify(rules.obterRegras().regraComissaoMeta);

  const enriquecido = service.buscarPorId(vendedor.id).vendedor;
  assert.equal(enriquecido.bonusFixo, 650);

  assert.equal(JSON.stringify(rules.obterRegras().regraComissaoMeta), antes);
});

test("campanha com tipo desconhecido é recusada", () => {
  const r = rules.criarCampanha({
    nome: "Campanha X",
    data: "2026-09-01",
    tipo: "tipo_inventado",
    valor: 100,
  });
  assert.equal(r.status, 400);
  assert.match(r.erro, /Tipo/);
});

test("campanha com data inválida é recusada", () => {
  const r = rules.criarCampanha({
    nome: "Campanha X",
    data: "amanhã",
    tipo: "bonus_fixo",
    valor: 100,
  });
  assert.equal(r.status, 400);
});

test("campanha válida é criada", () => {
  const r = rules.criarCampanha(
    { nome: "Sexta dobrada", data: "2026-09-04", tipo: "bonus_fixo", valor: 80 },
    "Daniel"
  );
  assert.ok(!r.erro);
  assert.equal(r.campanha.ativo, true);
});

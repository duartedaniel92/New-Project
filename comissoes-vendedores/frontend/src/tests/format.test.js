import { describe, expect, it } from "vitest";
import {
  formatarCompacto,
  formatarDataHora,
  formatarMoeda,
  formatarPercentual,
  formatarPercentualDecimal,
} from "../utils/format.js";

describe("formatarMoeda", () => {
  it("formata em reais", () => {
    expect(formatarMoeda(1234.5).replace(/\s/g, " ")).toBe("R$ 1.234,50");
  });

  it("valor ausente ou inválido vira zero em vez de 'R$ NaN'", () => {
    for (const entrada of [null, undefined, "abc", NaN]) {
      expect(formatarMoeda(entrada)).not.toMatch(/NaN/);
    }
  });
});

describe("formatarPercentual", () => {
  it("mostra a casa decimal quando existe", () => {
    expect(formatarPercentual(110.5)).toBe("110,5%");
    expect(formatarPercentual(110)).toBe("110%");
  });

  it("converte decimal para percentual inteiro", () => {
    expect(formatarPercentualDecimal(0.42)).toBe("42%");
    expect(formatarPercentualDecimal(null)).toBe("0%");
  });
});

describe("formatarDataHora", () => {
  it("data inválida não vira 'Invalid Date' na tela", () => {
    expect(formatarDataHora("não é data")).toBe("—");
    expect(formatarDataHora(null)).toBe("—");
  });

  it("data ISO vira formato brasileiro", () => {
    expect(formatarDataHora("2026-08-19T15:40:00Z")).toMatch(/\d{2}\/\d{2}\/\d{2,4}/);
  });
});

describe("formatarCompacto", () => {
  it("abrevia milhares no eixo do gráfico", () => {
    expect(formatarCompacto(6300)).toBe("6,3k");
    expect(formatarCompacto(900)).toBe("900");
  });
});

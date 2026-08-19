import { describe, expect, it, vi } from "vitest";
import {
  TEMA_PADRAO,
  aplicarTema,
  carregarTema,
  ehHexValido,
  hexParaRgb,
  luminancia,
  normalizarTema,
  salvarTema,
} from "../theme.js";

describe("validação de cor", () => {
  it("aceita hex de 3 e 6 dígitos", () => {
    expect(ehHexValido("#fff")).toBe(true);
    expect(ehHexValido("#34D399")).toBe(true);
  });

  it("recusa qualquer outra coisa", () => {
    for (const entrada of ["azul", "#12345", "", null, 42, "rgb(0,0,0)"]) {
      expect(ehHexValido(entrada)).toBe(false);
    }
  });

  it("hex inválido não gera '#NaNNaNNaN' (o bug que apagava a interface)", () => {
    expect(hexParaRgb("não é cor")).toEqual({ r: 0, g: 0, b: 0 });
  });
});

describe("normalizarTema", () => {
  it("cai no padrão quando a cor salva é inválida", () => {
    const tema = normalizarTema({ accent: "banana", bg: "#000000" });
    expect(tema.accent).toBe(TEMA_PADRAO.accent);
    expect(tema.bg).toBe("#000000");
  });

  it("descarta chaves desconhecidas vindas do localStorage", () => {
    expect(normalizarTema({ accent: "#ffffff", script: "<img onerror>" })).not.toHaveProperty(
      "script"
    );
  });

  it("entrada que não é objeto devolve o tema padrão", () => {
    expect(normalizarTema("texto")).toEqual({ ...TEMA_PADRAO });
    expect(normalizarTema(null)).toEqual({ ...TEMA_PADRAO });
  });
});

describe("persistência", () => {
  it("tema salvo é recuperado depois", () => {
    salvarTema({ ...TEMA_PADRAO, accent: "#ff0000" });
    expect(carregarTema().accent).toBe("#ff0000");
  });

  it("JSON corrompido no localStorage não quebra o carregamento", () => {
    localStorage.setItem("comissoes-vendedores:tema", "{quebrado");
    expect(carregarTema()).toEqual({ ...TEMA_PADRAO });
  });

  it("localStorage indisponível não impede aplicar o tema", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("cota cheia");
    });
    expect(() => salvarTema({ ...TEMA_PADRAO, accent: "#00ff00" })).not.toThrow();
  });
});

describe("contraste", () => {
  it("luminância vai de 0 (preto) a 1 (branco)", () => {
    expect(luminancia("#000000")).toBeCloseTo(0, 3);
    expect(luminancia("#ffffff")).toBeCloseTo(1, 3);
  });

  it("destaque claro pede texto escuro no botão, e vice-versa", () => {
    aplicarTema({ ...TEMA_PADRAO, accent: "#ffffff" });
    const claro = document.documentElement.style.getPropertyValue("--btn-text");

    aplicarTema({ ...TEMA_PADRAO, accent: "#1a1a1a" });
    const escuro = document.documentElement.style.getPropertyValue("--btn-text");

    expect(claro).not.toBe(escuro);
    expect(escuro).toBe("#ffffff");
  });

  it("fundo claro troca a cor do texto da interface", () => {
    aplicarTema({ ...TEMA_PADRAO, bg: "#ffffff" });
    expect(document.documentElement.style.getPropertyValue("--text")).toBe("#141a24");

    aplicarTema({ ...TEMA_PADRAO, bg: "#0b1220" });
    expect(document.documentElement.style.getPropertyValue("--text")).toBe("#e7ecf5");
  });
});

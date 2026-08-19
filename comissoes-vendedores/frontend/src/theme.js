/**
 * Tema customizável, gravado no navegador.
 *
 * Correções em relação à versão anterior:
 *  - um hex inválido no localStorage (editado à mão, ou salvo por uma versão
 *    antiga) gerava `#NaNNaNNaN` e a interface ficava sem cor nenhuma. Agora
 *    todo valor é validado antes de ser aplicado;
 *  - o contraste do texto sobre o destaque usa luminância relativa (WCAG) em
 *    vez de uma média ponderada aproximada;
 *  - `localStorage` pode lançar (modo privado, cota cheia) — salvar não pode
 *    derrubar a tela.
 */

const CHAVE_STORAGE = "comissoes-vendedores:tema";
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export const TEMA_PADRAO = Object.freeze({
  accent: "#34d399",
  bg: "#0b1220",
  panel: "#121b2e",
  amber: "#f5b93d",
  danger: "#f0645c",
});

export const PRESETS = Object.freeze([
  { nome: "Verde (padrão)", accent: "#34d399", bg: "#0b1220", panel: "#121b2e" },
  { nome: "Azul corporativo", accent: "#3b82f6", bg: "#0a0f1e", panel: "#101a30" },
  { nome: "Roxo", accent: "#a78bfa", bg: "#100b1e", panel: "#1a1330" },
  { nome: "Laranja Kings", accent: "#f59e0b", bg: "#1a1108", panel: "#241a0e" },
  { nome: "Claro", accent: "#0d9488", bg: "#f4f6fa", panel: "#ffffff" },
]);

export const ehHexValido = (valor) => typeof valor === "string" && HEX.test(valor.trim());

/** Descarta chaves desconhecidas e cores inválidas, caindo no padrão. */
export function normalizarTema(bruto) {
  const tema = { ...TEMA_PADRAO };
  if (!bruto || typeof bruto !== "object") return tema;

  for (const chave of Object.keys(TEMA_PADRAO)) {
    if (ehHexValido(bruto[chave])) tema[chave] = bruto[chave].trim().toLowerCase();
  }
  return tema;
}

export function carregarTema() {
  try {
    return normalizarTema(JSON.parse(localStorage.getItem(CHAVE_STORAGE)));
  } catch {
    return { ...TEMA_PADRAO };
  }
}

export function salvarTema(tema) {
  const normalizado = normalizarTema(tema);
  try {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(normalizado));
  } catch {
    // modo privado ou cota cheia: aplica mesmo assim, só não persiste
  }
  aplicarTema(normalizado);
  return normalizado;
}

export function aplicarTema(temaBruto) {
  const tema = normalizarTema(temaBruto);
  const root = document.documentElement;

  root.style.setProperty("--accent", tema.accent);
  root.style.setProperty("--bg", tema.bg);
  root.style.setProperty("--panel", tema.panel);
  root.style.setProperty("--amber", tema.amber);
  root.style.setProperty("--danger", tema.danger);

  // deriva tons auxiliares a partir do accent/panel para manter contraste coerente
  const fundoEscuro = luminancia(tema.bg) < 0.4;

  root.style.setProperty("--accent-dim", sombrear(tema.accent, 0.55));
  // texto do botão acompanha o destaque: destaque claro pede texto escuro e vice-versa
  root.style.setProperty("--btn-text", luminancia(tema.accent) > 0.4 ? "#0b1a14" : "#ffffff");
  root.style.setProperty(
    "--panel-alt",
    fundoEscuro ? clarear(tema.panel, 0.06) : sombrear(tema.panel, 0.04)
  );
  root.style.setProperty("--text", fundoEscuro ? "#e7ecf5" : "#141a24");
  root.style.setProperty("--text-muted", fundoEscuro ? "#8f9db6" : "#4d5666");
  root.style.setProperty("--border", fundoEscuro ? "#22304a" : "#dfe4ee");
  root.style.setProperty("color-scheme", fundoEscuro ? "dark" : "light");

  return tema;
}

// ---------- Utilitários de cor ----------

export function hexParaRgb(hex) {
  if (!ehHexValido(hex)) return { r: 0, g: 0, b: 0 };

  const limpo = hex.trim().replace("#", "");
  const completo = limpo.length === 3 ? limpo.replace(/(.)/g, "$1$1") : limpo;
  const inteiro = parseInt(completo, 16);

  return { r: (inteiro >> 16) & 255, g: (inteiro >> 8) & 255, b: inteiro & 255 };
}

export function rgbParaHex({ r, g, b }) {
  const canal = (v) => {
    const n = Number.isFinite(v) ? v : 0;
    return Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  };
  return `#${canal(r)}${canal(g)}${canal(b)}`;
}

/** Luminância relativa (WCAG 2.1), de 0 (preto) a 1 (branco). */
export function luminancia(hex) {
  const { r, g, b } = hexParaRgb(hex);
  const canal = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

export function sombrear(hex, fator) {
  const { r, g, b } = hexParaRgb(hex);
  return rgbParaHex({ r: r * (1 - fator), g: g * (1 - fator), b: b * (1 - fator) });
}

export function clarear(hex, fator) {
  const { r, g, b } = hexParaRgb(hex);
  return rgbParaHex({
    r: r + (255 - r) * fator,
    g: g + (255 - g) * fator,
    b: b + (255 - b) * fator,
  });
}

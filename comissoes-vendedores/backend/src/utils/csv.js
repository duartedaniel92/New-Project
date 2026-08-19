/**
 * Geração de CSV segura.
 *
 * Dois cuidados que a versão anterior não tinha:
 *
 * 1. **Escape correto (RFC 4180)** — antes o código trocava `;` por `,` dentro
 *    do texto. Isso não quebrava as colunas, mas adulterava o dado exportado
 *    (o nome da filial saía diferente do cadastro). Agora o campo é envolvido
 *    em aspas e as aspas internas são duplicadas: o dado chega intacto.
 *
 * 2. **Injeção de fórmula** — um vendedor cadastrado como `=1+1` ou
 *    `@SUM(...)` vira fórmula executável quando o CSV é aberto no Excel ou no
 *    LibreOffice. É um vetor real de ataque em planilha de folha de pagamento,
 *    então prefixamos esses campos com um apóstrofo.
 */

const SEPARADOR = ";";
const INICIOS_PERIGOSOS = ["=", "+", "-", "@", "\t", "\r"];

/** Neutraliza um campo de texto que o Excel interpretaria como fórmula. */
export function protegerContraFormula(texto) {
  if (texto.length > 0 && INICIOS_PERIGOSOS.includes(texto[0])) return `'${texto}`;
  return texto;
}

/** Formata um valor único como campo CSV: sempre entre aspas, sempre íntegro. */
export function campoCsv(valor) {
  const texto = protegerContraFormula(String(valor ?? ""));
  return `"${texto.replace(/"/g, '""')}"`;
}

/** Monta uma linha CSV a partir de um array de valores. */
export function linhaCsv(valores) {
  return valores.map(campoCsv).join(SEPARADOR);
}

/**
 * Monta o documento CSV completo.
 *
 * @param {string[]} cabecalho
 * @param {Array<Array<string|number>>} linhas
 * @returns {string} CSV com CRLF (o que o Excel espera) e BOM para acentuação
 */
export function montarCsv(cabecalho, linhas) {
  const corpo = [linhaCsv(cabecalho), ...linhas.map(linhaCsv)].join("\r\n");
  return `\uFEFF${corpo}\r\n`; // BOM: sem ele o Excel abre os acentos quebrados
}

/** Número com vírgula decimal — como o Excel em pt-BR espera receber. */
export function numeroBr(valor, casas = 2) {
  const n = Number(valor);
  return (Number.isFinite(n) ? n : 0).toFixed(casas).replace(".", ",");
}

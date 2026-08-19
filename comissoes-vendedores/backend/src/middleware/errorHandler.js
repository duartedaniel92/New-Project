/**
 * Tratamento centralizado de erro.
 *
 * Duas garantias: o cliente nunca recebe stack trace (que entrega caminhos de
 * arquivo e versões de dependência), e o servidor não cai por causa de uma
 * requisição malformada.
 */

import { config } from "../config.js";

/** JSON malformado no corpo vira mensagem legível em vez de stack trace. */
export function corpoInvalido(err, req, res, next) {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ erro: "Não consegui ler os dados enviados. Tente novamente." });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ erro: "Os dados enviados são grandes demais." });
  }
  return next(err);
}

/** Rota inexistente dentro de /api. */
export function naoEncontrado(req, res) {
  res.status(404).json({ erro: "Endereço não encontrado na API" });
}

/**
 * Último recurso: qualquer erro não tratado nas rotas cai aqui.
 * O quarto parâmetro (`next`) é o que faz o Express reconhecer a função como
 * tratador de erro — some daqui e todo erro vira a página HTML padrão.
 */
export function erroInterno(err, req, res, next) {
  console.error("Erro não tratado:", err);

  res.status(err?.status || 500).json({
    erro: "Erro interno no servidor. Confira o terminal da API.",
    ...(config.emProducao ? {} : { detalhe: err?.message }),
  });
}

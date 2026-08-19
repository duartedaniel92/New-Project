/**
 * Ponto de entrada da API: só sobe o servidor e cuida do desligamento limpo.
 * A montagem do Express está em src/app.js.
 */

import { criarApp } from "./src/app.js";
import { config } from "./src/config.js";

const app = criarApp();

const servidor = app.listen(config.porta, () => {
  console.log(`API rodando em http://localhost:${config.porta} (${config.ambiente})`);
});

/**
 * Desligamento limpo: sem isso, um Ctrl+C no meio de uma requisição derrubava a
 * conexão do navegador no meio da resposta e o `node --watch` reiniciava com a
 * porta ainda ocupada.
 */
function encerrar(sinal) {
  console.log(`\n${sinal} recebido, encerrando a API...`);
  servidor.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGINT", () => encerrar("SIGINT"));
process.on("SIGTERM", () => encerrar("SIGTERM"));

process.on("unhandledRejection", (motivo) => {
  console.error("Promise rejeitada sem tratamento:", motivo);
});

export default servidor;

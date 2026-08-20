/**
 * Sobe a API em uma porta efêmera para os testes de integração.
 * Porta 0 = o sistema operacional escolhe uma livre, então a suíte roda mesmo
 * com o `npm run dev` aberto em outra janela.
 */

import { criarApp } from "../../src/app.js";

export async function comServidor(callback) {
  const servidor = criarApp().listen(0);
  await new Promise((resolve) => servidor.once("listening", resolve));

  const { port } = servidor.address();
  const base = `http://127.0.0.1:${port}`;

  /** fetch já apontado para a API, devolvendo status e corpo juntos. */
  const chamar = async (caminho, opcoes = {}) => {
    const res = await fetch(`${base}${caminho}`, {
      ...opcoes,
      headers: {
        ...(opcoes.body ? { "Content-Type": "application/json" } : {}),
        ...opcoes.headers,
      },
    });

    const tipo = res.headers.get("content-type") || "";
    const corpo = tipo.includes("application/json") ? await res.json() : await res.text();

    return { status: res.status, corpo, headers: res.headers };
  };

  try {
    return await callback({ chamar, base });
  } finally {
    await new Promise((resolve) => servidor.close(resolve));
  }
}

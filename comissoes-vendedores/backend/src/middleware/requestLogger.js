/**
 * Log de requisição enxuto, sem dependência externa.
 * Fica quieto durante os testes para não poluir a saída.
 */

import { config } from "../config.js";

export function requestLogger(req, res, next) {
  if (config.ambiente === "test") return next();

  const inicio = process.hrtime.bigint();

  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} · ${ms.toFixed(1)}ms`);
  });

  next();
}

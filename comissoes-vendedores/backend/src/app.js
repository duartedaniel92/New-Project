/**
 * Montagem do aplicativo Express.
 *
 * Separado do `server.js` de propósito: aqui não se abre porta nenhuma, então
 * os testes conseguem levantar a API em uma porta efêmera (ou nem levantar) sem
 * conflitar com o servidor que o desenvolvedor deixou rodando.
 */

import express from "express";
import cors from "cors";

import dashboardRoutes from "./routes/dashboard.js";
import sellersRoutes from "./routes/sellers.js";
import rulesRoutes from "./routes/rules.js";
import auditRoutes from "./routes/audit.js";
import exportRoutes from "./routes/export.js";

import { requestLogger } from "./middleware/requestLogger.js";
import { corpoInvalido, naoEncontrado, erroInterno } from "./middleware/errorHandler.js";
import { config } from "./config.js";

export function criarApp() {
  const app = express();

  app.disable("x-powered-by");

  app.use(
    cors({
      // lista vazia = qualquer origem, aceitável só em desenvolvimento
      origin: config.origensPermitidas.length > 0 ? config.origensPermitidas : true,
    })
  );
  app.use(express.json({ limit: config.limiteCorpo }));
  app.use(corpoInvalido);
  app.use(requestLogger);

  app.get("/api/health", (req, res) =>
    res.json({ status: "ok", ambiente: config.ambiente, versao: process.env.npm_package_version })
  );

  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/sellers", sellersRoutes);
  app.use("/api/rules", rulesRoutes);
  app.use("/api/audit", auditRoutes);
  app.use("/api/export", exportRoutes);

  app.use("/api", naoEncontrado);
  app.use(erroInterno);

  return app;
}

export default criarApp;

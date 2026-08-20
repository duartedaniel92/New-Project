// Camada HTTP: a montagem do arquivo está em ../services/exportService.js
import { Router } from "express";
import { gerarFolhaCsv, NOME_ARQUIVO_FOLHA } from "../services/exportService.js";

const router = Router();

router.get("/folha.csv", (req, res) => {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${NOME_ARQUIVO_FOLHA}"`);
  res.send(gerarFolhaCsv());
});

export default router;

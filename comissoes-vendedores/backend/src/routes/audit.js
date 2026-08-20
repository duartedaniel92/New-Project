// Camada HTTP: a consulta está em ../services/auditService.js
import { Router } from "express";
import { listarAuditoria } from "../services/auditService.js";

const router = Router();

router.get("/", (req, res) => {
  res.json(listarAuditoria(req.query));
});

export default router;

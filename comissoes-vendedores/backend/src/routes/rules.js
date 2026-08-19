// Camada HTTP: a regra de negócio está em ../services/rulesService.js
import { Router } from "express";
import * as service from "../services/rulesService.js";

const router = Router();

function responder(res, resultado, dado) {
  if (resultado.erro) return res.status(resultado.status || 400).json({ erro: resultado.erro });
  return res.json(dado(resultado));
}

router.get("/", (req, res) => {
  res.json(service.obterRegras());
});

router.put("/meta", (req, res) => {
  const { usuario, ...dados } = req.body || {};
  responder(res, service.atualizarRegraMeta(dados, usuario), (r) => ({
    ok: true,
    regraComissaoMeta: r.regraComissaoMeta,
  }));
});

router.put("/categoria", (req, res) => {
  const { usuario, ...dados } = req.body || {};
  responder(res, service.atualizarCategoria(dados, usuario), (r) => ({
    ok: true,
    regrasCategoria: r.regrasCategoria,
  }));
});

router.post("/campanhas", (req, res) => {
  const { usuario, ...dados } = req.body || {};
  responder(res, service.criarCampanha(dados, usuario), (r) => ({
    ok: true,
    campanha: r.campanha,
  }));
});

export default router;

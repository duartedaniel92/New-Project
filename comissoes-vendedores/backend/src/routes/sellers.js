// Camada HTTP: só traduz requisição -> serviço -> resposta.
// Toda a regra de negócio está em ../services/sellersService.js
import { Router } from "express";
import * as service from "../services/sellersService.js";

const router = Router();

// Envia o resultado do serviço, usando o status de erro que ele indicar
function responder(res, resultado, dado, statusOk = 200) {
  if (resultado.erro) return res.status(resultado.status || 400).json({ erro: resultado.erro });
  return res.status(statusOk).json(dado(resultado));
}

router.get("/", (req, res) => {
  res.json(service.listar(req.query));
});

router.get("/:id", (req, res) => {
  responder(res, service.buscarPorId(req.params.id), (r) => r.vendedor);
});

router.post("/", (req, res) => {
  const { usuario, ...dados } = req.body || {};
  responder(res, service.criar(dados, usuario), (r) => r.vendedor, 201);
});

router.put("/:id", (req, res) => {
  const { usuario, ...dados } = req.body || {};
  responder(res, service.atualizar(req.params.id, dados, usuario), (r) => r.vendedor);
});

router.delete("/:id", (req, res) => {
  const usuario = req.body?.usuario || req.query?.usuario;
  responder(res, service.excluir(req.params.id, usuario), () => ({ ok: true }));
});

router.post("/:id/restaurar", (req, res) => {
  responder(res, service.restaurar(req.params.id, req.body?.usuario), (r) => r.vendedor);
});

export default router;

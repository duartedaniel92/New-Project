// Camada HTTP: os cálculos estão em ../services/dashboardService.js
import { Router } from "express";
import { montarDashboard } from "../services/dashboardService.js";

const router = Router();

router.get("/", (req, res) => {
  res.json(montarDashboard());
});

export default router;

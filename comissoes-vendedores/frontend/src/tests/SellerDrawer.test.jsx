import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SellerDrawer from "../components/SellerDrawer.jsx";
import { api } from "../api.js";

const VENDEDOR = {
  id: "v1",
  nome: "Carla Menezes",
  funcao: "Vendedora Sênior",
  filial: "Center Norte",
  dataInicio: "2026-08-01",
  metaMensal: 30000,
  faturamentoDia: 2150,
  faturamentoMes: 18400,
  atendimentosDia: 14,
  conversao: 0.42,
  pa: 1.8,
  ativo: true,
  percentualMeta: 61.3,
  taxaAtual: 1,
  bonusFixo: 0,
  comissaoAcumulada: 184,
  vendas: [],
  historico: [],
};

describe("gaveta do vendedor", () => {
  beforeEach(() => {
    vi.spyOn(api, "getSeller").mockResolvedValue(VENDEDOR);
    vi.spyOn(api, "updateSeller").mockResolvedValue(VENDEDOR);
  });

  it("é anunciada como diálogo com o nome do vendedor", async () => {
    render(<SellerDrawer sellerId="v1" onClose={() => {}} />);
    expect(await screen.findByRole("dialog", { name: "Carla Menezes" })).toBeInTheDocument();
  });

  it("Esc fecha a gaveta", async () => {
    const aoFechar = vi.fn();
    const usuario = userEvent.setup();
    render(<SellerDrawer sellerId="v1" onClose={aoFechar} />);
    await screen.findByRole("dialog");

    await usuario.keyboard("{Escape}");
    expect(aoFechar).toHaveBeenCalled();
  });

  it("o foco entra na gaveta ao abrir, em vez de ficar na página atrás", async () => {
    render(<SellerDrawer sellerId="v1" onClose={() => {}} />);
    const dialogo = await screen.findByRole("dialog");

    await waitFor(() => expect(dialogo.contains(document.activeElement)).toBe(true));
  });

  it("botão de salvar fica desabilitado enquanto nada mudou", async () => {
    render(<SellerDrawer sellerId="v1" onClose={() => {}} />);
    expect(await screen.findByRole("button", { name: "Nada alterado" })).toBeDisabled();
  });

  it("habilita o salvar quando um campo muda e envia o formulário completo", async () => {
    const usuario = userEvent.setup();
    const aoAlterar = vi.fn();
    render(<SellerDrawer sellerId="v1" onClose={() => {}} onAlterado={aoAlterar} />);

    const meta = await screen.findByLabelText("Meta mensal (R$)");
    await usuario.clear(meta);
    await usuario.type(meta, "25000");

    const salvar = await screen.findByRole("button", { name: "Salvar alterações" });
    await usuario.click(salvar);

    await waitFor(() => expect(api.updateSeller).toHaveBeenCalled());
    expect(api.updateSeller.mock.calls[0][1].metaMensal).toBe("25000");
    expect(aoAlterar).toHaveBeenCalled();
  });

  it("erro ao salvar aparece como alerta e não some sozinho", async () => {
    api.updateSeller.mockRejectedValue(new Error("Meta mensal não pode ser negativa"));
    const usuario = userEvent.setup();
    render(<SellerDrawer sellerId="v1" onClose={() => {}} />);

    const meta = await screen.findByLabelText("Meta mensal (R$)");
    await usuario.clear(meta);
    await usuario.type(meta, "-5");
    await usuario.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Meta mensal não pode ser negativa");
  });

  it("vendedor inativo não pode ser editado e oferece restaurar", async () => {
    api.getSeller.mockResolvedValue({ ...VENDEDOR, ativo: false });
    render(<SellerDrawer sellerId="v1" onClose={() => {}} />);

    expect(await screen.findByRole("button", { name: "Restaurar vendedor" })).toBeInTheDocument();
    expect(screen.getByLabelText("Meta mensal (R$)")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Excluir vendedor" })).not.toBeInTheDocument();
  });
});

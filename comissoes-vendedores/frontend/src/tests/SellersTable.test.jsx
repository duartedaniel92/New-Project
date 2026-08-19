import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SellersTable from "../components/SellersTable.jsx";
import { api } from "../api.js";

const VENDEDOR = {
  id: "v1",
  nome: "Carla Menezes",
  funcao: "Vendedora Sênior",
  filial: "Center Norte",
  faturamentoMes: 18400,
  percentualMeta: 61.3,
  comissaoAcumulada: 184,
  conversao: 0.42,
  status: "amarelo",
  ativo: true,
};

describe("Mesa de Performance", () => {
  beforeEach(() => {
    vi.spyOn(api, "getSellers").mockResolvedValue([VENDEDOR]);
  });

  it("mostra a equipe carregada", async () => {
    render(<SellersTable />);
    expect(await screen.findByText("Carla Menezes")).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
  });

  it("não dispara uma requisição por tecla digitada na busca", async () => {
    const usuario = userEvent.setup();
    render(<SellersTable />);
    await screen.findByText("Carla Menezes");

    api.getSellers.mockClear();
    await usuario.type(screen.getByLabelText("Buscar vendedores"), "carla");

    // com o debounce, as cinco teclas viram uma consulta só
    await waitFor(() => expect(api.getSellers).toHaveBeenCalledTimes(1), { timeout: 2000 });
    expect(api.getSellers.mock.calls[0][0].busca).toBe("carla");
  });

  it("respostas fora de ordem não sobrescrevem a lista mais recente", async () => {
    const usuario = userEvent.setup();

    // a primeira consulta responde depois da segunda, como acontece na rede real
    let primeiraResolve;
    api.getSellers
      .mockImplementationOnce(() => new Promise((r) => (primeiraResolve = r)))
      .mockResolvedValue([{ ...VENDEDOR, id: "v9", nome: "Resultado Recente" }]);

    render(<SellersTable />);
    await usuario.type(screen.getByLabelText("Buscar vendedores"), "re");

    await screen.findByText("Resultado Recente", undefined, { timeout: 2000 });
    primeiraResolve?.([{ ...VENDEDOR, nome: "Resultado Antigo" }]);

    await waitFor(() => expect(screen.queryByText("Resultado Antigo")).not.toBeInTheDocument());
    expect(screen.getByText("Resultado Recente")).toBeInTheDocument();
  });

  it("cabeçalho ordenável é um botão e anuncia a direção", async () => {
    const usuario = userEvent.setup();
    render(<SellersTable />);
    await screen.findByText("Carla Menezes");

    const cabecalho = screen.getByRole("button", { name: /Vendedor/ });
    await usuario.click(cabecalho);

    await waitFor(() => expect(cabecalho.closest("th")).toHaveAttribute("aria-sort", "descending"));
  });

  it("falha da API mostra o erro com opção de tentar de novo", async () => {
    api.getSellers.mockRejectedValue(new Error("API fora do ar"));
    render(<SellersTable />);

    expect(await screen.findByRole("alert")).toHaveTextContent("API fora do ar");
    expect(screen.getByRole("button", { name: /Tentar novamente/ })).toBeInTheDocument();
  });

  it("lista vazia explica o que fazer em vez de mostrar tabela em branco", async () => {
    api.getSellers.mockResolvedValue([]);
    render(<SellersTable />);

    expect(await screen.findByText(/Nenhum vendedor cadastrado/)).toBeInTheDocument();
  });
});

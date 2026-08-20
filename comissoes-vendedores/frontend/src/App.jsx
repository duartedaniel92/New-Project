import { useState } from "react";
import Dashboard from "./components/Dashboard.jsx";
import SellersTable from "./components/SellersTable.jsx";
import RulesEditor from "./components/RulesEditor.jsx";
import AuditLog from "./components/AuditLog.jsx";
import Export from "./components/Export.jsx";

const PAGINAS = [
  { id: "dashboard", label: "Painel Principal", passo: "01", Componente: Dashboard },
  { id: "sellers", label: "Vendedores", passo: "02", Componente: SellersTable },
  { id: "rules", label: "Regras de Comissão", passo: "03", Componente: RulesEditor },
  { id: "audit", label: "Auditoria", passo: "04", Componente: AuditLog },
  { id: "export", label: "Exportação", passo: "05", Componente: Export },
];

export default function App() {
  const [paginaAtual, setPaginaAtual] = useState(PAGINAS[0].id);
  const { Componente } = PAGINAS.find((p) => p.id === paginaAtual) ?? PAGINAS[0];

  return (
    <div className="app-shell">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>

      <aside className="sidebar">
        <div className="brand">
          Comissões
          <br />
          Vendedores
          <span>Painel de Gestão</span>
        </div>

        <nav className="nav" aria-label="Navegação principal">
          {PAGINAS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`nav-item ${paginaAtual === p.id ? "active" : ""}`}
              aria-current={paginaAtual === p.id ? "page" : undefined}
              onClick={() => setPaginaAtual(p.id)}
            >
              <span className="step" aria-hidden="true">
                {p.passo}
              </span>
              {p.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          Kings Sneakers
          <br />
          dados de demonstração
        </div>
      </aside>

      {/* key força o remonte ao trocar de tela: sem isso a tela nova herdava o
          estado de carregamento da anterior em uma navegação rápida */}
      <main className="main" id="conteudo">
        <Componente key={paginaAtual} />
      </main>
    </div>
  );
}

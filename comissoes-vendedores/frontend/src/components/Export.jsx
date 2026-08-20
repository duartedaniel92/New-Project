import { urlFolhaCsv } from "../api.js";

export default function Export() {
  return (
    <>
      <div className="page-header">
        <h1>Fechamento e Exportação</h1>
        <p>Da conferência diária ao pagamento final, em um clique.</p>
      </div>

      <div className="panel">
        <h2>Prévia de folha do mês</h2>
        <p className="sub">Comissões acumuladas por vendedor, prontas para contabilidade/RH.</p>

        <div className="export-row">
          <div>
            <div className="title">Prévia de folha (CSV)</div>
            <div className="desc">
              Comissão por vendedor, filial e taxa aplicada — abre direto no Excel, com acentuação e
              vírgula decimal corretas.
            </div>
          </div>
          <a className="btn" href={urlFolhaCsv} download>
            Exportar CSV
          </a>
        </div>

        <div className="export-row">
          <div>
            <div className="title">Recibo em PDF por vendedor</div>
            <div className="desc">Documento para o vendedor assinar como recibo de comissão.</div>
          </div>
          <button type="button" className="btn secondary" disabled title="Em desenvolvimento">
            Em breve
          </button>
        </div>
      </div>
    </>
  );
}

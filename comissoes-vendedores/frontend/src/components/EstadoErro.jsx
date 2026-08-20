/**
 * Bloco de erro com botão de nova tentativa, usado por todas as telas.
 * Antes cada uma repetia a mesma marcação — e só algumas marcavam o bloco como
 * `role="alert"`, então o leitor de tela anunciava a falha em umas e em outras não.
 */
export default function EstadoErro({ titulo, mensagem, aoTentarNovamente }) {
  return (
    <div className="panel erro-painel" role="alert">
      <strong>{titulo}</strong>
      <p className="sub" style={{ margin: "6px 0 12px" }}>
        {mensagem}
      </p>
      {aoTentarNovamente && (
        <button type="button" className="btn" onClick={aoTentarNovamente}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}

import { Component } from "react";

/**
 * Rede de segurança da interface.
 *
 * Sem isso, um erro de render em qualquer componente derrubava a árvore inteira
 * e o usuário ficava com uma tela branca, sem nem saber que precisa recarregar.
 */
export default class ErrorBoundary extends Component {
  state = { erro: null };

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    console.error("Falha ao renderizar a interface:", erro, info);
  }

  render() {
    if (!this.state.erro) return this.props.children;

    return (
      <div className="panel erro-painel" role="alert" style={{ margin: 32 }}>
        <strong>Alguma coisa quebrou nesta tela.</strong>
        <p className="sub" style={{ margin: "6px 0 12px" }}>
          Os dados no servidor não foram afetados. Recarregue a página para continuar.
        </p>
        <p className="sub" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
          {this.state.erro.message}
        </p>
        <button className="btn" onClick={() => window.location.reload()}>
          Recarregar
        </button>
      </div>
    );
  }
}

import { useId, useState } from "react";
import { PRESETS, ehHexValido } from "../theme.js";
import { useTema } from "../context/temaContexto.js";

export default function ThemeCustomizer() {
  const { tema, definirTema, atualizarCor, restaurarPadrao } = useTema();
  const [aberto, setAberto] = useState(false);
  const idConteudo = useId();

  const aplicarPreset = (preset) =>
    definirTema({ ...tema, accent: preset.accent, bg: preset.bg, panel: preset.panel });

  return (
    <div className="panel">
      <button
        type="button"
        className="painel-toggle"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        aria-controls={idConteudo}
      >
        <span>
          <span className="painel-toggle-titulo">Personalizar cores</span>
          <span className="sub" style={{ display: "block", margin: 0 }}>
            Deixe o painel com a cara da sua loja
          </span>
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
          {aberto ? "fechar ▲" : "abrir ▼"}
        </span>
      </button>

      {aberto && (
        <div id={idConteudo} style={{ marginTop: 18 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
            {PRESETS.map((p) => (
              <button
                key={p.nome}
                type="button"
                className="btn secondary"
                style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}
                onClick={() => aplicarPreset(p)}
                aria-pressed={tema.accent === p.accent && tema.bg === p.bg}
              >
                <span className="bolinha-cor" style={{ background: p.accent }} />
                {p.nome}
              </button>
            ))}
          </div>

          <div className="grade-cores">
            <CampoCor
              label="Cor de destaque"
              valor={tema.accent}
              onChange={(v) => atualizarCor("accent", v)}
            />
            <CampoCor label="Fundo" valor={tema.bg} onChange={(v) => atualizarCor("bg", v)} />
            <CampoCor
              label="Painéis"
              valor={tema.panel}
              onChange={(v) => atualizarCor("panel", v)}
            />
          </div>

          <button
            type="button"
            className="btn secondary"
            style={{ marginTop: 16 }}
            onClick={restaurarPadrao}
          >
            Restaurar cores padrão
          </button>
        </div>
      )}
    </div>
  );
}

function CampoCor({ label, valor, onChange }) {
  const id = useId();

  return (
    <div className="campo-cor">
      <label htmlFor={id}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          id={id}
          type="color"
          value={ehHexValido(valor) ? valor : "#000000"}
          onChange={(e) => onChange(e.target.value)}
        />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text)" }}>
          {valor}
        </span>
      </div>
    </div>
  );
}

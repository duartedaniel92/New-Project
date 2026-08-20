import { useId, useState } from "react";
import { api } from "../api.js";
import { useDialogo } from "../hooks/useDialogo.js";

const USUARIO = "Gestor Carlos";

const CAMPOS = [
  { key: "nome", label: "Nome", tipo: "text", obrigatorio: true },
  { key: "funcao", label: "Função", tipo: "text" },
  { key: "filial", label: "Filial", tipo: "text", obrigatorio: true },
  { key: "dataInicio", label: "Data de início", tipo: "date" },
  { key: "metaMensal", label: "Meta mensal (R$)", tipo: "number", step: "100", obrigatorio: true },
  { key: "faturamentoDia", label: "Faturamento do dia (R$)", tipo: "number", step: "10" },
  { key: "faturamentoMes", label: "Faturamento do mês (R$)", tipo: "number", step: "100" },
  { key: "atendimentosDia", label: "Atendimentos no dia", tipo: "number", step: "1" },
  { key: "conversao", label: "Conversão (0 a 1 — ex.: 0,35 = 35%)", tipo: "number", step: "0.01" },
  { key: "pa", label: "PA (peças por atendimento)", tipo: "number", step: "0.1" },
];

const formularioVazio = () => ({
  nome: "",
  funcao: "Vendedor(a)",
  filial: "",
  dataInicio: new Date().toISOString().slice(0, 10),
  metaMensal: "",
  faturamentoDia: "0",
  faturamentoMes: "0",
  atendimentosDia: "0",
  conversao: "0",
  pa: "0",
});

export default function NovoVendedorModal({ onClose, onCriado }) {
  const [form, setForm] = useState(formularioVazio);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const idTitulo = useId();
  const refDialogo = useDialogo(onClose);

  const atualizar = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const salvar = async (evento) => {
    evento.preventDefault();

    if (!form.nome.trim() || !form.filial.trim()) {
      setErro("Preencha o nome e a filial do vendedor.");
      return;
    }
    if (!form.metaMensal || Number(form.metaMensal) <= 0) {
      setErro("Defina a meta mensal — é ela que determina a comissão do vendedor.");
      return;
    }

    setSalvando(true);
    setErro("");
    try {
      await api.createSeller(form, USUARIO);
      onCriado?.();
      onClose();
    } catch (e) {
      setErro(e.message);
      setSalvando(false);
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <form
        className="drawer"
        ref={refDialogo}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onSubmit={salvar}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
      >
        <div className="drawer-header">
          <div>
            <h2 id={idTitulo}>Novo vendedor</h2>
            <div className="filial">Cadastro de colaborador</div>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        {CAMPOS.map((c) => (
          <Campo key={c.key} campo={c} valor={form[c.key]} onChange={(v) => atualizar(c.key, v)} />
        ))}

        {erro && (
          <div className="save-hint erro" role="alert" style={{ marginBottom: 12 }}>
            {erro}
          </div>
        )}

        {/* submit de verdade: o formulário também envia com Enter */}
        <button
          type="submit"
          className="btn"
          disabled={salvando}
          style={{ width: "100%", marginTop: 8 }}
        >
          {salvando ? "Salvando..." : "Cadastrar vendedor"}
        </button>
      </form>
    </div>
  );
}

function Campo({ campo, valor, onChange }) {
  const id = useId();

  return (
    <div className="campo">
      <label htmlFor={id}>
        {campo.label}
        {campo.obrigatorio && <span aria-hidden="true"> *</span>}
      </label>
      <input
        id={id}
        type={campo.tipo}
        step={campo.step}
        min={campo.tipo === "number" ? "0" : undefined}
        required={campo.obrigatorio}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

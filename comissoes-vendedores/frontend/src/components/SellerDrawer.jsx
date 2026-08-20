import { useCallback, useEffect, useId, useState } from "react";
import { api } from "../api.js";
import { useRecurso } from "../hooks/useRecurso.js";
import { useDialogo } from "../hooks/useDialogo.js";
import { formatarDataHora, formatarMoeda, formatarPercentual } from "../utils/format.js";

const USUARIO = "Gestor Carlos";

const CAMPOS = [
  { key: "nome", label: "Nome", tipo: "text" },
  { key: "funcao", label: "Função", tipo: "text" },
  { key: "filial", label: "Filial", tipo: "text" },
  { key: "dataInicio", label: "Data de início", tipo: "date" },
  { key: "metaMensal", label: "Meta mensal (R$)", tipo: "number", step: "100" },
  { key: "faturamentoDia", label: "Faturamento do dia (R$)", tipo: "number", step: "10" },
  { key: "faturamentoMes", label: "Faturamento do mês (R$)", tipo: "number", step: "100" },
  { key: "atendimentosDia", label: "Atendimentos no dia", tipo: "number", step: "1" },
  { key: "conversao", label: "Conversão (0 a 1 — ex.: 0,35 = 35%)", tipo: "number", step: "0.01" },
  { key: "pa", label: "PA (peças por atendimento)", tipo: "number", step: "0.1" },
];

export default function SellerDrawer({ sellerId, onClose, onAlterado }) {
  const [form, setForm] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erroAcao, setErroAcao] = useState("");
  const [abaHistorico, setAbaHistorico] = useState(false);

  const idTitulo = useId();
  const refDialogo = useDialogo(onClose);

  const carregador = useCallback((opcoes) => api.getSeller(sellerId, opcoes), [sellerId]);
  const { dados: vendedor, erro, recarregar } = useRecurso(carregador, [carregador]);

  // o formulário espelha o vendedor carregado; recarregar após salvar traz os
  // valores já normalizados pelo servidor
  useEffect(() => {
    if (vendedor) setForm(Object.fromEntries(CAMPOS.map((c) => [c.key, vendedor[c.key] ?? ""])));
  }, [vendedor]);

  // a mensagem de sucesso some sozinha; o timer é limpo se a gaveta fechar antes
  useEffect(() => {
    if (!mensagem) return undefined;
    const id = setTimeout(() => setMensagem(""), 2500);
    return () => clearTimeout(id);
  }, [mensagem]);

  const atualizarCampo = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const alterouAlgo =
    form &&
    vendedor &&
    CAMPOS.some((c) => String(form[c.key] ?? "") !== String(vendedor[c.key] ?? ""));

  const inativo = vendedor?.ativo === false;

  const salvar = async () => {
    setSalvando(true);
    setMensagem("");
    setErroAcao("");
    try {
      const payload = Object.fromEntries(CAMPOS.map((c) => [c.key, form[c.key]]));
      await api.updateSeller(sellerId, payload, USUARIO);
      setMensagem("Alterações salvas.");
      recarregar();
      onAlterado?.();
    } catch (e) {
      setErroAcao(e.message);
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async () => {
    const confirmado = window.confirm(
      `Remover ${vendedor.nome} da equipe ativa?\n\nO cadastro e todo o histórico continuam guardados — dá para restaurar depois.`
    );
    if (!confirmado) return;

    setExcluindo(true);
    setErroAcao("");
    try {
      await api.deleteSeller(sellerId, USUARIO);
      onAlterado?.();
      onClose();
    } catch (e) {
      setErroAcao(e.message);
      setExcluindo(false);
    }
  };

  const restaurar = async () => {
    setErroAcao("");
    try {
      await api.restoreSeller(sellerId, USUARIO);
      recarregar();
      onAlterado?.();
    } catch (e) {
      setErroAcao(e.message);
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div
        className="drawer"
        ref={refDialogo}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
      >
        {erro && !vendedor ? (
          <>
            <div className="drawer-header">
              <h2 id={idTitulo}>Não consegui carregar</h2>
              <button type="button" className="close-btn" onClick={onClose} aria-label="Fechar">
                ×
              </button>
            </div>
            <p className="sub" role="alert">
              {erro}
            </p>
            <button type="button" className="btn" onClick={recarregar}>
              Tentar novamente
            </button>
          </>
        ) : !vendedor || !form ? (
          <div className="loading">Carregando...</div>
        ) : (
          <>
            <div className="drawer-header">
              <div>
                <h2 id={idTitulo}>{vendedor.nome}</h2>
                <div className="filial">
                  {vendedor.funcao} · {vendedor.filial}
                </div>
              </div>
              <button type="button" className="close-btn" onClick={onClose} aria-label="Fechar">
                ×
              </button>
            </div>

            {inativo && (
              <div className="aviso-inativo">
                Este vendedor está inativo. O histórico segue guardado, mas ele não entra nos
                painéis nem na folha.
                <button
                  type="button"
                  className="btn"
                  style={{ marginTop: 10, width: "100%" }}
                  onClick={restaurar}
                >
                  Restaurar vendedor
                </button>
              </div>
            )}

            <div className="abas" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={!abaHistorico}
                className={`btn ${abaHistorico ? "secondary" : ""}`}
                onClick={() => setAbaHistorico(false)}
              >
                Dados e vendas
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={abaHistorico}
                className={`btn ${!abaHistorico ? "secondary" : ""}`}
                onClick={() => setAbaHistorico(true)}
              >
                Histórico ({vendedor.historico?.length || 0})
              </button>
            </div>

            {!abaHistorico ? (
              <div role="tabpanel">
                <Linha
                  rotulo="% da meta atingido"
                  valor={formatarPercentual(vendedor.percentualMeta)}
                />
                <Linha
                  rotulo="Taxa de comissão aplicada"
                  valor={formatarPercentual(vendedor.taxaAtual, 2)}
                />
                <Linha
                  rotulo="Bônus fixo"
                  valor={vendedor.bonusFixo > 0 ? formatarMoeda(vendedor.bonusFixo) : "—"}
                />
                <Linha
                  rotulo="Comissão total"
                  valor={formatarMoeda(vendedor.comissaoAcumulada)}
                  destaque
                />

                <h2 className="titulo-secao">Editar dados</h2>
                {CAMPOS.map((c) => (
                  <div key={c.key} className="campo">
                    <label htmlFor={`campo-${c.key}`}>{c.label}</label>
                    <input
                      id={`campo-${c.key}`}
                      type={c.tipo}
                      step={c.step}
                      min={c.tipo === "number" ? "0" : undefined}
                      disabled={inativo}
                      value={form[c.key] ?? ""}
                      onChange={(e) => atualizarCampo(c.key, e.target.value)}
                    />
                  </div>
                ))}

                <button
                  type="button"
                  className="btn"
                  onClick={salvar}
                  disabled={salvando || !alterouAlgo || inativo}
                  style={{ width: "100%", marginTop: 6 }}
                >
                  {salvando ? "Salvando..." : alterouAlgo ? "Salvar alterações" : "Nada alterado"}
                </button>

                <div className="save-hint" aria-live="polite">
                  {mensagem}
                </div>
                {erroAcao && (
                  <div className="save-hint erro" role="alert">
                    {erroAcao}
                  </div>
                )}

                {!inativo && (
                  <button
                    type="button"
                    className="btn secondary perigo"
                    onClick={excluir}
                    disabled={excluindo}
                    style={{ width: "100%", marginTop: 10 }}
                  >
                    {excluindo ? "Removendo..." : "Excluir vendedor"}
                  </button>
                )}

                <h2 className="titulo-secao">Vendas do dia</h2>
                {vendedor.vendas?.length === 0 ? (
                  <p className="texto-vazio">Nenhuma venda registrada hoje.</p>
                ) : (
                  vendedor.vendas?.map((venda) => (
                    <div className="sale-item" key={venda.id}>
                      <div>
                        <div>{venda.produto}</div>
                        <div className="meta">
                          {venda.categoria} · {venda.hora}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div>{formatarMoeda(venda.valor)}</div>
                        <div className="meta">
                          {venda.comissaoItem != null
                            ? `ref.: ${formatarMoeda(venda.comissaoItem)}`
                            : "—"}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div role="tabpanel">
                {(vendedor.historico || []).length === 0 ? (
                  <p className="texto-vazio">
                    Nenhuma alteração registrada ainda. Toda edição feita aqui aparece nesta lista.
                  </p>
                ) : (
                  vendedor.historico.map((h) => (
                    <div className="audit-item" key={h.id}>
                      <div className={`dot ${h.acao}`} />
                      <div>
                        <div className="when">{formatarDataHora(h.data)}</div>
                        <div className="who">{h.usuario}</div>
                        <div className="what">{h.detalhe}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Linha({ rotulo, valor, destaque }) {
  return (
    <div className="drawer-stat-row">
      <span>{rotulo}</span>
      <span className={`v ${destaque ? "destaque" : ""}`}>{valor}</span>
    </div>
  );
}

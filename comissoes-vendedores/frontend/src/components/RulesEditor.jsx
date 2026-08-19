import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { useRecurso } from "../hooks/useRecurso.js";
import { formatarMoeda, formatarPercentual } from "../utils/format.js";
import EstadoErro from "./EstadoErro.jsx";

const USUARIO = "Gestor Carlos";
const PREFIXO_NOVA_FAIXA = "nova-";

export default function RulesEditor() {
  const carregador = useCallback((opcoes) => api.getRules(opcoes), []);
  const { dados, erro, recarregar } = useRecurso(carregador, []);

  const [regra, setRegra] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [salvandoMeta, setSalvandoMeta] = useState(false);
  const [salvandoCategoria, setSalvandoCategoria] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [erroAcao, setErroAcao] = useState("");

  // contador em vez de Date.now(): duas faixas adicionadas no mesmo
  // milissegundo recebiam a mesma key e o React embaralhava os campos
  const proximaFaixa = useRef(0);

  useEffect(() => {
    if (!dados) return;
    setRegra(dados.regraComissaoMeta);
    setCategorias(dados.regrasCategoria);
  }, [dados]);

  useEffect(() => {
    if (!mensagem) return undefined;
    const id = setTimeout(() => setMensagem(""), 4000);
    return () => clearTimeout(id);
  }, [mensagem]);

  const atualizarBase = (campo, valor) => setRegra((r) => ({ ...r, [campo]: valor }));

  const atualizarFaixa = (id, campo, valor) => {
    setRegra((r) => ({
      ...r,
      faixasBonus: r.faixasBonus.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)),
    }));
  };

  const adicionarFaixa = () => {
    setRegra((r) => {
      const ultima = r.faixasBonus[r.faixasBonus.length - 1];
      const proximoPercentual = ultima ? Number(ultima.percentualMeta) + 10 : 110;
      proximaFaixa.current += 1;

      return {
        ...r,
        faixasBonus: [
          ...r.faixasBonus,
          {
            id: `${PREFIXO_NOVA_FAIXA}${proximaFaixa.current}`,
            percentualMeta: proximoPercentual,
            taxa: r.taxaNaMeta,
            bonusFixo: 0,
          },
        ],
      };
    });
  };

  const removerFaixa = (id) =>
    setRegra((r) => ({ ...r, faixasBonus: r.faixasBonus.filter((f) => f.id !== id) }));

  const salvar = async () => {
    setSalvandoMeta(true);
    setErroAcao("");
    setMensagem("");
    try {
      const payload = {
        taxaAbaixoMeta: Number(regra.taxaAbaixoMeta),
        taxaNaMeta: Number(regra.taxaNaMeta),
        faixasBonus: regra.faixasBonus.map((f) => ({
          // faixa recém-criada vai sem id: quem gera o definitivo é o servidor
          ...(String(f.id).startsWith(PREFIXO_NOVA_FAIXA) ? {} : { id: f.id }),
          percentualMeta: Number(f.percentualMeta),
          taxa: Number(f.taxa),
          bonusFixo: Number(f.bonusFixo),
        })),
      };

      const res = await api.updateRegraMeta(payload, USUARIO);
      setRegra(res.regraComissaoMeta);
      setMensagem("Regra de comissão atualizada. O painel e a folha já usam os novos valores.");
    } catch (e) {
      setErroAcao(e.message);
    } finally {
      setSalvandoMeta(false);
    }
  };

  const atualizarCategoria = async (categoria, taxa) => {
    setSalvandoCategoria(categoria);
    setErroAcao("");
    try {
      const res = await api.updateCategoria(categoria, Number(taxa), USUARIO);
      setCategorias(res.regrasCategoria);
    } catch (e) {
      setErroAcao(e.message);
      recarregar(); // devolve o campo ao valor que está realmente valendo
    } finally {
      setSalvandoCategoria(null);
    }
  };

  if (erro && !regra) {
    return (
      <EstadoErro
        titulo="Não consegui carregar as regras"
        mensagem={`${erro} Confira se a janela da API continua aberta.`}
        aoTentarNovamente={recarregar}
      />
    );
  }

  if (!regra) return <div className="loading">Carregando regras...</div>;

  const faixasOrdenadas = [...regra.faixasBonus].sort(
    (a, b) => Number(a.percentualMeta) - Number(b.percentualMeta)
  );

  return (
    <>
      <div className="page-header">
        <h1>Regras de Comissão</h1>
        <p>A comissão é calculada pelo % da meta individual que cada vendedor atingiu.</p>
      </div>

      <div className="panel">
        <h2>Comissão por atingimento de meta</h2>
        <p className="sub">
          Abaixo de 100% da meta vale a taxa base. A partir de 100% vale a taxa cheia, e cada faixa
          de superação soma um bônus fixo em reais.
        </p>

        <div className="tier-stairs" aria-hidden="true">
          <div className="tier-step" style={{ height: "42px" }}>
            <div className="taxa">{formatarPercentual(regra.taxaAbaixoMeta, 2)}</div>
            <div className="faixa-label">abaixo de 100%</div>
          </div>
          <div className="tier-step active" style={{ height: "62px" }}>
            <div className="taxa">{formatarPercentual(regra.taxaNaMeta, 2)}</div>
            <div className="faixa-label">100% da meta</div>
          </div>
          {faixasOrdenadas.map((f, i) => (
            <div key={f.id} className="tier-step active" style={{ height: `${82 + i * 20}px` }}>
              <div className="taxa">{formatarPercentual(f.taxa, 2)}</div>
              <div className="faixa-label">
                {formatarPercentual(f.percentualMeta)} · +{formatarMoeda(f.bonusFixo)}
              </div>
            </div>
          ))}
        </div>

        <div className="tier-row">
          <div className="campo">
            <label htmlFor="taxa-abaixo">Taxa abaixo da meta (%)</label>
            <input
              id="taxa-abaixo"
              type="number"
              step="0.5"
              min="0"
              max="100"
              value={regra.taxaAbaixoMeta}
              onChange={(e) => atualizarBase("taxaAbaixoMeta", e.target.value)}
            />
          </div>
          <div className="campo">
            <label htmlFor="taxa-meta">Taxa ao atingir 100% (%)</label>
            <input
              id="taxa-meta"
              type="number"
              step="0.5"
              min="0"
              max="100"
              value={regra.taxaNaMeta}
              onChange={(e) => atualizarBase("taxaNaMeta", e.target.value)}
            />
          </div>
          <div />
        </div>

        <h2 className="titulo-secao">Faixas de superação</h2>
        <p className="sub">% da meta que ativa a faixa, taxa sobre o total vendido e bônus fixo</p>

        {regra.faixasBonus.length === 0 && (
          <p className="texto-vazio">
            Nenhuma faixa de bônus. Sem elas, quem bate a meta recebe apenas a taxa cheia.
          </p>
        )}

        {regra.faixasBonus.map((f, i) => (
          <div key={f.id} className="faixa-row">
            <div className="campo">
              <label htmlFor={`faixa-pct-${f.id}`}>% da meta</label>
              <input
                id={`faixa-pct-${f.id}`}
                type="number"
                min="100"
                value={f.percentualMeta}
                onChange={(e) => atualizarFaixa(f.id, "percentualMeta", e.target.value)}
              />
            </div>
            <div className="campo">
              <label htmlFor={`faixa-taxa-${f.id}`}>Taxa (%)</label>
              <input
                id={`faixa-taxa-${f.id}`}
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={f.taxa}
                onChange={(e) => atualizarFaixa(f.id, "taxa", e.target.value)}
              />
            </div>
            <div className="campo">
              <label htmlFor={`faixa-bonus-${f.id}`}>Bônus fixo (R$)</label>
              <input
                id={`faixa-bonus-${f.id}`}
                type="number"
                step="50"
                min="0"
                value={f.bonusFixo}
                onChange={(e) => atualizarFaixa(f.id, "bonusFixo", e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn secondary remover-faixa"
              onClick={() => removerFaixa(f.id)}
            >
              Remover
              <span className="sr-only"> a faixa {i + 1}</span>
            </button>
          </div>
        ))}

        <div className="acoes-linha">
          <button type="button" className="btn" onClick={salvar} disabled={salvandoMeta}>
            {salvandoMeta ? "Salvando..." : "Salvar regra de comissão"}
          </button>
          <button type="button" className="btn secondary" onClick={adicionarFaixa}>
            + Adicionar faixa
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={recarregar}
            disabled={salvandoMeta}
          >
            Descartar alterações
          </button>
        </div>

        <div className="save-hint" aria-live="polite">
          {mensagem}
        </div>
        {erroAcao && (
          <div className="save-hint erro" role="alert">
            {erroAcao}
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Referência por categoria de produto</h2>
        <p className="sub">
          Aparece como informação por item no extrato do vendedor. Não altera a comissão total, que
          segue sempre a meta individual.
        </p>

        {categorias.map((c) => (
          <CategoriaRow
            key={c.id}
            categoria={c}
            salvando={salvandoCategoria === c.categoria}
            onSalvar={atualizarCategoria}
          />
        ))}
      </div>

      <div className="panel">
        <h2>Onde ficam as metas</h2>
        <p className="sub" style={{ marginBottom: 0 }}>
          A meta de cada vendedor é individual e se edita na Mesa de Performance: clique em “editar”
          na linha do vendedor e ajuste o campo “Meta mensal”.
        </p>
      </div>
    </>
  );
}

/**
 * A taxa da categoria é salva ao sair do campo. O input é controlado e
 * sincronizado com a prop: antes ele era `defaultValue`, então quando o
 * servidor recusava o valor o campo continuava exibindo o número recusado como
 * se ele estivesse valendo.
 */
function CategoriaRow({ categoria, salvando, onSalvar }) {
  const [valor, setValor] = useState(String(categoria.taxa));

  useEffect(() => {
    setValor(String(categoria.taxa));
  }, [categoria.taxa]);

  const id = `categoria-${categoria.id}`;

  return (
    <div className="category-row">
      <label htmlFor={id}>{categoria.categoria}</label>
      <input
        id={id}
        type="number"
        step="0.5"
        min="0"
        max="100"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={() => {
          if (Number(valor) !== categoria.taxa) onSalvar(categoria.categoria, valor);
        }}
      />
      <div className="categoria-status" aria-live="polite">
        {salvando ? "salvando..." : "% do item"}
      </div>
    </div>
  );
}

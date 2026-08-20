# Comissões Vendedores

Plataforma web de controle de comissões para equipes de vendas no varejo — pensada a partir da rotina de uma loja como a Kings Sneakers, onde o gestor precisa acompanhar faturamento, metas e comissão de cada vendedor em tempo real, sem depender de planilhas manuais.

## Qual problema ela resolve

Hoje esse controle costuma ser feito em planilha: cálculo manual de comissão por vendedor, sem histórico de quem mudou o quê, sem visão consolidada do dia e sem previsão de fechamento do mês. Isso gera três dores recorrentes:

1. **Erro de cálculo** — principalmente quando a comissão é escalonada por faixa e precisa ser aplicada individualmente por vendedor (não pelo resultado da loja).
2. **Falta de visibilidade em tempo real** — o gestor só descobre que a equipe está abaixo do ritmo no fechamento do mês, quando já é tarde para agir.
3. **Ausência de rastreabilidade** — quando uma comissão é ajustada manualmente, ninguém sabe quem alterou, quando e por quê.

A aplicação resolve isso com: cálculo automático da comissão em cascata por vendedor, painel executivo com tendência e previsão, e um log de auditoria que registra toda alteração de regra.

## Stack tecnológica

| Camada    | Tecnologia                                                                 |
| --------- | -------------------------------------------------------------------------- |
| Frontend  | React 19 + Vite 7, gráficos com Recharts 3                                 |
| Backend   | Node.js 20.19+ e Express 5 (API REST)                                      |
| Dados     | Em memória (`seed.js`) — pronto para trocar por PostgreSQL/MySQL           |
| Estilo    | CSS puro (design system próprio, sem framework de UI)                      |
| Qualidade | ESLint 9 (flat config), Prettier, Node Test Runner, Vitest, GitHub Actions |

> **Sobre a camada de dados:** para este MVP os dados ficam em memória no backend (reiniciam ao reiniciar o servidor), o que facilita rodar o projeto sem depender de instalar banco de dados. A estrutura de rotas e funções em `backend/src/` já está organizada para trocar isso por um banco relacional (Postgres é a recomendação, pelas relações entre vendedor → venda → comissão) sem precisar reescrever a lógica de negócio.

## Estrutura de pastas

O repositório é um monorepo com **workspaces do npm**: um único `npm install` na raiz instala a API e a aplicação.

```
comissoes-vendedores/
├── package.json                   # workspaces + scripts (dev, test, lint, build)
├── eslint.config.js               # ESLint 9 flat config para os dois pacotes
├── backend/
│   ├── server.js                  # bootstrap: sobe a porta e desliga limpo
│   ├── src/
│   │   ├── app.js                 # montagem do Express (sem abrir porta)
│   │   ├── config.js              # configuração por variável de ambiente
│   │   ├── data/seed.js           # dados de demonstração + IDs + reset para testes
│   │   ├── middleware/            # log de requisição e tratamento de erro
│   │   ├── routes/                # camada HTTP (fina): requisição → serviço → resposta
│   │   ├── services/              # regras de negócio (vendedores, comissão, painel, folha)
│   │   └── utils/                 # cálculo de comissão, CSV e calendário
│   ├── tests/                     # 110 testes (serviço + integração HTTP)
│   └── package.json
├── frontend/
│   ├── index.html
│   ├── src/
│   │   ├── App.jsx                # navegação entre as 5 telas
│   │   ├── api.js                 # cliente da API (cancelamento, timeout, erros)
│   │   ├── index.css              # design system (cores, tipografia, componentes)
│   │   ├── theme.js               # tema customizável, validado e salvo no navegador
│   │   ├── context/               # provider do tema
│   │   ├── hooks/                 # useRecurso, useDebounce, useDialogo
│   │   ├── utils/format.js        # formatadores compartilhados
│   │   ├── tests/                 # 42 testes com Vitest + Testing Library
│   │   └── components/
│   │       ├── Dashboard.jsx      # painel principal + tabela de vendedores
│   │       ├── ThemeCustomizer.jsx# personalização de cores
│   │       ├── SellersTable.jsx   # mesa de performance
│   │       ├── SellerDrawer.jsx   # edição do vendedor + histórico
│   │       ├── NovoVendedorModal.jsx # cadastro de vendedor
│   │       ├── RulesEditor.jsx    # central de regras de comissão
│   │       ├── AuditLog.jsx       # histórico de alterações
│   │       ├── Export.jsx         # exportação da folha
│   │       ├── EstadoErro.jsx     # bloco de erro reaproveitado
│   │       └── ErrorBoundary.jsx  # rede de segurança da interface
│   └── package.json
└── README.md
```

## Como rodar o projeto

Pré-requisito: **Node.js 20.19+ ou 22.12+** (é o que o Vite 7 exige; a versão usada no desenvolvimento está no `.nvmrc`).

### Opção rápida (Windows) — recomendada para o dia a dia da loja

1. Dê **dois cliques** no arquivo `iniciar.bat`, na pasta raiz do projeto.
2. Na primeira vez, ele instala tudo sozinho (pode demorar um pouco). Nas próximas, abre direto.
3. O navegador abre automaticamente em `http://localhost:5173`.
4. Para encerrar, dê dois cliques em `parar.bat` (ou feche a janela preta e pressione Ctrl+C).

> Não feche a janela preta chamada "Comissões Vendedores" enquanto estiver usando o sistema — é nela que a API e a aplicação ficam rodando.

No Linux e no macOS o equivalente é `./iniciar.sh`.

### Opção manual (qualquer sistema operacional)

```bash
npm install     # instala backend e frontend de uma vez (workspaces)
npm run dev     # sobe a API (3001) e a aplicação (5173) juntas
```

A aplicação abre em `http://localhost:5173`; o Vite já redireciona as chamadas `/api` para a API em `http://localhost:3001`.

Para subir só um lado: `npm run dev:backend` ou `npm run dev:frontend`.

### Configuração

Nada é obrigatório — todos os valores têm um padrão seguro. Para ajustar, copie os arquivos de exemplo:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

| Variável            | Onde     | Para quê                                                       |
| ------------------- | -------- | -------------------------------------------------------------- |
| `PORT`              | backend  | Porta da API (padrão 3001)                                     |
| `CORS_ORIGIN`       | backend  | Domínios liberados em produção; vazio libera todos (só em dev) |
| `MARGEM_ESTIMADA`   | backend  | Margem usada no card de lucro líquido                          |
| `DIAS_UTEIS_NO_MES` | backend  | Dias úteis de um mês comercial                                 |
| `LIMITE_AUDITORIA`  | backend  | Teto de eventos por página na auditoria                        |
| `VITE_PROXY_TARGET` | frontend | Onde o Vite procura a API em desenvolvimento                   |
| `VITE_API_URL`      | frontend | URL da API quando o front é servido por outro domínio          |

## Comandos disponíveis

Todos rodam a partir da pasta raiz do projeto:

| Comando                 | O que faz                                        |
| ----------------------- | ------------------------------------------------ |
| `npm run dev`           | Sobe API e aplicação juntas                      |
| `npm test`              | Roda os testes dos dois pacotes                  |
| `npm run test:backend`  | Só os 110 testes da API                          |
| `npm run test:frontend` | Só os 42 testes da interface                     |
| `npm run lint`          | ESLint no projeto inteiro                        |
| `npm run format`        | Prettier no projeto inteiro                      |
| `npm run build`         | Build de produção do frontend em `frontend/dist` |
| `npm run verificar`     | Lint + testes + build — o mesmo que a CI executa |

## Funcionalidades implementadas

### 1. Painel Principal

- Cards com faturamento do dia, comissões geradas no mês, lucro líquido estimado e ticket médio.
- Gráfico de tendência intradia comparando hoje com a semana anterior, com linha de projeção emendada no último ponto real.
- Previsão de faturamento e custo de comissão para o fechamento do mês, usando os **dias úteis que realmente faltam** no calendário.
- **Tabela de vendedores** com faturamento, % da meta atingida, taxa aplicada, bônus fixo e comissão total de cada um.
- **Personalização de cores**: paletas prontas (verde, azul, roxo, laranja, claro) ou escolha livre das cores de destaque, fundo e painéis. A preferência fica salva no navegador e o texto se ajusta automaticamente para manter a leitura confortável em fundos claros ou escuros.

### 2. Mesa de Performance (Vendedores)

- Tabela ordenável por qualquer coluna e busca por nome, função ou filial — **sem depender de acento** ("senior" encontra "Sênior").
- Indicador visual de status (verde / amarelo / vermelho) conforme o progresso da meta.
- **Cadastro de novos vendedores** pelo botão "+ Novo vendedor".
- **Edição completa**: ao clicar em "editar", a gaveta lateral abre um formulário onde todos os dados são editáveis — nome, função, filial, data de início, meta mensal, faturamento do dia e do mês, atendimentos, conversão e PA.
- **Exclusão com histórico preservado**: remover um vendedor apenas o tira das listagens ativas. Nenhum dado é apagado — o registro e todo o histórico continuam consultáveis.
- **Restaurar vendedor**: marque "Mostrar inativos" na busca, clique em "editar" e use "Restaurar vendedor".
- **Aba de histórico por vendedor**: cada campo alterado gera um registro com data, usuário e o valor antes e depois (ex.: _"Meta mensal alterada de 30000 para 25000"_).

### 3. Central de Regras de Comissão

Comissão calculada pelo **percentual de atingimento da meta individual** de cada vendedor:

| Atingimento da meta | Comissão                 |
| ------------------- | ------------------------ |
| Abaixo de 100%      | 1% sobre o valor vendido |
| 100% da meta        | 2% sobre o valor vendido |
| 110% da meta        | 2% + R$ 500,00           |
| 120% da meta        | 2% + R$ 650,00           |
| 130% da meta        | 2% + R$ 800,00           |

- Todas as taxas, percentuais de faixa e valores de bônus são **editáveis pela interface**, sem mexer em código. Também dá para **adicionar ou remover faixas** de superação.
- A **meta de cada vendedor é editável individualmente** na Mesa de Performance.
- **Regra de negócio central:** o cálculo é sempre individual. Dois vendedores que faturaram o mesmo valor recebem comissões diferentes se as metas deles forem diferentes.
- Toda alteração de regra gera registro automático na auditoria.

### 4. Auditoria

- Linha do tempo com toda alteração de regra, cadastro, edição e exclusão de vendedor, com usuário e data/hora.
- Busca por usuário ou ação e **paginação** — a tela não baixa o log inteiro para mostrar os primeiros eventos.

### 5. Exportação

- Prévia de folha em CSV com meta, faturamento, % da meta, taxa aplicada, bônus e comissão total por vendedor, no formato que o Excel em português espera (acentuação, vírgula decimal e escape correto).

## Testes

A parte que lida com dinheiro é coberta por **110 testes no backend** e **42 no frontend**:

```bash
npm test                # tudo
npm run test:backend    # só a API
npm run test:frontend   # só a interface
```

O backend usa o test runner nativo do Node (sem biblioteca extra); o frontend usa Vitest + Testing Library.

> O script do backend é `node --test` sem argumento, deixando a descoberta dos arquivos por conta do runner. Passar `"tests/**/*.test.mjs"` só funciona no Node 22+ (o Node 20 não expande o glob) e no Windows, onde o shell também não expande.

O que está coberto:

- **Faixas da comissão**: 99%, 100%, 105%, 110%, 115%, 120%, 130% e acima de 130%.
- **Bordas de arredondamento**: quem vendeu 109,99% da meta não recebe o bônus de 110%, mesmo que a tela mostre "110%".
- **Entradas inválidas**: texto, campo vazio, valor negativo, booleano, array e meta zerada não podem gerar `NaN` na folha.
- **Cadastro e edição**: campos obrigatórios, meta negativa, conversão fora do intervalo, data inválida, valor absurdo e campo não inteiro.
- **Histórico**: toda edição registra valor antes e depois; salvar sem mudar nada não polui o histórico.
- **Exclusão suave**: o cadastro e o histórico continuam no banco; excluir duas vezes não duplica registro.
- **Regras**: faixa abaixo de 100%, faixas duplicadas e bônus negativo são recusados, e uma regra inválida nunca sobrescreve a que já estava valendo.
- **Projeção do painel**: acompanha a regra vigente (mudar as taxas muda a previsão) e nunca fica abaixo do realizado.
- **Contrato HTTP**: status corretos (201, 400, 404, 409), JSON malformado não derruba o servidor, cabeçalhos da exportação.
- **CSV**: escape RFC 4180 e proteção contra injeção de fórmula no Excel.
- **Calendário**: dias úteis restantes no fim do mês, fim de semana e datas inválidas.
- **Interface**: busca com debounce, descarte de resposta fora de ordem, estados de erro, acessibilidade da gaveta e formatação de valores.

## Correções e melhorias desta versão

Levantamento feito sobre a versão anterior do projeto. Cada item abaixo tem teste cobrindo a regressão.

### Bugs corrigidos

| Onde                   | Problema                                                                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Validação de vendedor  | `Number(true)`, `Number([])` e `Number("   ")` valem 1 ou 0 em JavaScript — booleano, array e espaços em branco entravam como valor na folha  |
| Validação de vendedor  | Objeto em campo de texto virava `"[object Object]"` no cadastro; data de início não era validada; não havia teto de valor nem casas inteiras  |
| Listagem de vendedores | `?ordenarPor=constructor` passava pela checagem (`in` enxerga o prototype) e devolvia a lista em ordem imprevisível                           |
| Exportação CSV         | Nome começando com `=`, `+` ou `@` virava fórmula executável ao abrir no Excel — injeção de fórmula em planilha de folha de pagamento         |
| Exportação CSV         | O `;` dentro de um texto era trocado por `,`, adulterando o dado exportado em vez de escapá-lo                                                |
| Projeção do painel     | "Faltam 10 dias úteis" estava fixo no código: no dia 28 o painel projetava dias que já tinham passado                                         |
| Cálculo de comissão    | `faixaAtingida` devolvia a referência viva da regra — quem consumisse o resultado podia alterar a comissão da equipe sem passar por validação |
| Busca da Mesa          | Uma requisição por tecla digitada, sem cancelamento: a resposta de "car" podia chegar depois de "carla" e sobrescrever a lista certa          |
| Tema                   | Um hex inválido no `localStorage` gerava `#NaNNaNNaN` e a interface ficava sem cores; `localStorage` indisponível derrubava o salvamento      |
| Tema                   | O estado ficava dentro do `ThemeCustomizer`: sair da tela e voltar mostrava as cores antigas nos seletores                                    |
| Editor de regras       | Faixas criadas no mesmo milissegundo recebiam a mesma `key` e o React embaralhava os campos                                                   |
| Editor de regras       | A taxa por categoria era um campo não controlado: quando o servidor recusava, o campo seguia exibindo o valor recusado                        |
| Cliente da API         | Sem timeout (uma API pendurada deixava a tela em "Carregando..." para sempre) e um 204 estourava erro de parse                                |
| Interface              | Sem `ErrorBoundary`: um erro de render derrubava a tela inteira e o usuário via só uma página branca                                          |
| Gráfico intradia       | A linha de projeção nascia solta no meio do gráfico, sem emendar no último ponto real                                                         |

### Padronização e melhorias

- **Monorepo com workspaces do npm** — um `npm install` e um `npm run dev` para o projeto inteiro, em qualquer sistema operacional.
- **Dependências atualizadas** — Express 4 → 5, React 18 → 19, Vite 5 → 7, Recharts 2 → 3.
- **ESLint 9 (flat config) + Prettier + EditorConfig + `.nvmrc`** — o projeto não tinha linter nem formatador.
- **CI no GitHub Actions** — formatação, lint, testes e build a cada push, em Node 20 e 22.
- **`app.js` separado de `server.js`** — os testes sobem a API em porta efêmera sem conflitar com o `npm run dev` aberto.
- **Configuração por variável de ambiente** (`src/config.js`) — nada de número mágico espalhado pelo código.
- **Desligamento limpo** (SIGINT/SIGTERM) e `x-powered-by` desabilitado.
- **Paginação na auditoria** — a rota devolvia o log inteiro a cada chamada.
- **Reset do banco em memória entre testes** — antes um teste dependia do que o anterior tinha deixado.
- **Acessibilidade**: foco preso e devolvido nos diálogos, cabeçalhos de ordenação como botões com `aria-sort`, "pular para o conteúdo", mensagens com `role="alert"` e `aria-live`, ação de editar alcançável pelo teclado.
- **Menos duplicação**: formatadores compartilhados (`utils/format.js`), hooks `useRecurso`/`useDebounce`/`useDialogo` e componente `EstadoErro` no lugar do mesmo código repetido em cinco telas.

## O que ainda não está implementado (próximos passos)

Para manter o escopo do MVP realista, ficaram de fora — mas a arquitetura já foi pensada para receber:

- Persistência em banco de dados real (Postgres) no lugar dos dados em memória.
- Autenticação e permissões por perfil (gestor vs. vendedor) — hoje toda ação é registrada como "Gestor Carlos".
- Modo Transmissão (tela cheia para TV/painel de parede).
- Fluxo de aprovação manual de vendas fora do padrão.
- Exportação em PDF do recibo individual de comissão.
- Integração real com sistema de PDV/ERP (hoje os dados são simulados em `seed.js`).
- Lançamento de vendas individuais pela interface.
- Fechamento de período: hoje os valores são sempre "do mês corrente", sem travar o mês já pago.
- Feriados no cálculo de dias úteis (hoje só sábado e domingo são descontados).

## Decisões técnicas relevantes

- **Regra de negócio separada da camada HTTP** — as rotas em `src/routes/` só traduzem requisição em chamada de serviço; toda a lógica vive em `src/services/`. Isso permite testar cadastro, edição, exclusão e cálculo de comissão sem subir servidor, e deixa a troca do Express (ou a migração para outro framework) sem impacto nas regras.
- **Comparação de faixa pelo percentual exato, não pelo arredondado** — a tela mostra "110%" para quem atingiu 109,99%, mas o pagamento usa o valor exato. Arredondar antes de comparar fazia o sistema pagar bônus indevido.
- **Validação no servidor, não só no formulário** — campo vazio, texto em campo numérico, booleano, array e valor negativo são recusados pela API. O front pode ter falha; a regra que define pagamento não pode.
- **Exclusão suave (soft delete)** — vendedores removidos ganham `ativo: false` em vez de sumirem do array. Como comissão é dinheiro pago a pessoas, apagar registro de verdade destruiria a rastreabilidade de meses anteriores.
- **Tema via CSS custom properties** — trocar a cor do painel é só reescrever as variáveis no `:root`, sem recompilar nada nem duplicar folhas de estilo.
- **Uma rota por módulo** (`dashboard`, `sellers`, `rules`, `audit`, `export`) em vez de um arquivo único de rotas — facilita achar e evoluir cada parte sem mexer nas outras.
- **CSS puro sem framework de UI** — o design foi construído com um sistema de tokens próprio (cores, tipografia, espaçamento) para manter a interface leve e sem dependências desnecessárias no frontend.
- **Contadores de ID não são zerados no reset dos testes** — se fossem, dois registros criados no mesmo milissegundo antes e depois de um reset receberiam o mesmo ID e o histórico apontaria para o vendedor errado.

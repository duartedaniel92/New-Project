# CodeClub Convert Money

Conversor de moedas em HTML, CSS e JavaScript puro (sem dependências e sem build).
Converte um valor em Reais para **Dólar Americano**, **Euro** ou **Bitcoin** usando
cotações em tempo real da [AwesomeAPI](https://docs.awesomeapi.com.br/api-de-moedas).

**[Ver o site ao vivo »](https://duartedaniel92.github.io/New-Project/)**

## Como rodar

O projeto é 100% estático — basta abrir o `index.html` no navegador.

Para evitar restrições do protocolo `file://`, prefira servir por HTTP:

```bash
# Python 3
python3 -m http.server 8000

# ou Node
npx serve .
```

Depois acesse `http://localhost:8000`.

## Deploy (GitHub Pages)

O site é estático e o `index.html` está na raiz, então o Pages publica direto da
branch, sem workflow. Para ativar, em `Settings` → `Pages`:

| Campo | Valor |
| --- | --- |
| Source | Deploy from a branch |
| Branch | `main` |
| Folder | `/ (root)` |

Todos os caminhos do projeto são relativos (`./assets/...`), então o site também
funciona servido em subpasta, que é como o Pages o publica.

## Estrutura

```
├── index.html      # marcação da página
├── styles.css      # estilos (design tokens em :root)
├── scripts.js      # busca das cotações e lógica de conversão
└── assets/         # bandeiras e ícones
```

## Como adicionar uma nova moeda

A lógica é orientada a dados: não há `if` por moeda. Para incluir mais uma:

1. Acrescente uma entrada no objeto `CURRENCIES`, em `scripts.js`, usando o código
   ISO da moeda (o par `<CODIGO>-BRL` precisa existir na AwesomeAPI):

   ```js
   GBP: {
       name: 'Libra Esterlina',
       locale: 'en-GB',
       flag: './assets/gbp.png',
       flagAlt: 'Bandeira do Reino Unido',
   },
   ```

2. Adicione o `<option value="GBP">` correspondente no `index.html`.

A URL da API e todo o restante se ajustam sozinhos.

## Decisões técnicas

- **Cotação `bid`, não `high`** — `high` é a maior cotação do dia; `bid` é a cotação
  de compra atual, que é a correta para converter valores.
- **Cache de 60s** — as cotações são reaproveitadas por um minuto, então trocar a
  moeda no seletor não dispara uma nova requisição de rede.
- **Falhas são visíveis** — erro de rede, resposta HTTP inválida ou cotação ausente
  exibem uma mensagem com `role="alert"` em vez de falhar silenciosamente.
- **Acessibilidade** — contraste mínimo de 4.5:1 em todos os textos, foco visível
  via `:focus-visible` e resultado anunciado por leitores de tela com `aria-live`.

## Próximos passos

- Conversão bidirecional (o seletor "Converter de" ainda é fixo em Real).
- Testes automatizados da função de conversão.

## Créditos

Projeto baseado na aula de conversor de moedas do CodeClub, com melhorias de
correção, acessibilidade e responsividade.

## Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE) para o texto completo.

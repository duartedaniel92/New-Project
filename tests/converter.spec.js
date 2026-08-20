import { test, expect } from '@playwright/test'

/**
 * Cotações fixas: os testes verificam a lógica de conversão, não a API.
 * `high` propositalmente diferente de `bid` para flagrar a regressão de
 * voltar a usar a máxima do dia no lugar da cotação atual.
 */
const COTACOES = {
    USDBRL: { bid: '5.50', high: '9.99' },
    EURBRL: { bid: '6.00', high: '9.99' },
    BTCBRL: { bid: '350000', high: '999999' },
}

/** Intercepta a API e conta as chamadas. */
async function interceptarApi(page, { falhar = false } = {}) {
    const estado = { chamadas: 0 }

    await page.route('**/economia.awesomeapi.com.br/**', (route) => {
        estado.chamadas++
        return falhar
            ? route.abort('failed')
            : route.fulfill({
                  status: 200,
                  contentType: 'application/json',
                  body: JSON.stringify(COTACOES),
              })
    })

    return estado
}

/** Intl usa espaço não-quebrável; normalizamos para comparar. */
const texto = async (page, seletor) =>
    (await page.textContent(seletor)).replace(/ /g, ' ').trim()

const converter = async (page, valor) => {
    await page.fill('#input-real', valor)
    await page.click('#convert-button')
}

test.describe('conversão', () => {
    test('usa a cotação bid, não a máxima do dia', async ({ page }) => {
        await interceptarApi(page)
        await page.goto('/')
        await converter(page, '100')

        // 100 / 5.50 = 18.18 (com `high` daria 10.01)
        await expect(page.locator('#currency-value-text')).toHaveText('$18.18')
        expect(await texto(page, '#real-value-text')).toBe('R$ 100,00')
    })

    test('formata o Euro no padrão da moeda', async ({ page }) => {
        await interceptarApi(page)
        await page.goto('/')
        await page.selectOption('#currency-select', 'EUR')
        await converter(page, '100')

        expect(await texto(page, '#currency-value-text')).toBe('16,67 €')
    })

    test('formata o Bitcoin com 8 casas decimais', async ({ page }) => {
        await interceptarApi(page)
        await page.goto('/')
        await page.selectOption('#currency-select', 'BTC')
        await converter(page, '100')

        expect(await texto(page, '#currency-value-text')).toBe('BTC 0,00028571')
    })
})

test.describe('rede', () => {
    test('não chama a API ao carregar a página', async ({ page }) => {
        const api = await interceptarApi(page)
        await page.goto('/')

        expect(api.chamadas).toBe(0)
    })

    test('reaproveita as cotações ao trocar de moeda', async ({ page }) => {
        const api = await interceptarApi(page)
        await page.goto('/')
        await converter(page, '100')
        await expect(page.locator('#currency-value-text')).toHaveText('$18.18')

        await page.selectOption('#currency-select', 'EUR')
        await expect(page.locator('#currency-name')).toHaveText('Euro')

        expect(api.chamadas).toBe(1)
    })
})

test.describe('validação', () => {
    test('exige um valor antes de converter, sem ir à rede', async ({ page }) => {
        const api = await interceptarApi(page)
        await page.goto('/')
        await page.click('#convert-button')

        await expect(page.locator('#error-message')).toHaveText(
            'Digite um valor em Reais para converter.',
        )
        expect(api.chamadas).toBe(0)
    })

    test('recusa valores negativos', async ({ page }) => {
        await interceptarApi(page)
        await page.goto('/')
        await converter(page, '-5')

        await expect(page.locator('#error-message')).toHaveText(
            'O valor não pode ser negativo.',
        )
    })
})

test.describe('falha da API', () => {
    test('mostra mensagem e devolve o botão ao estado normal', async ({ page }) => {
        await interceptarApi(page, { falhar: true })
        await page.goto('/')
        await converter(page, '100')

        await expect(page.locator('#error-message')).toBeVisible()
        await expect(page.locator('#error-message')).toHaveText(
            'Não foi possível obter as cotações agora. Verifique sua conexão e tente novamente.',
        )
        await expect(page.locator('#convert-button')).toBeEnabled()
        await expect(page.locator('#convert-button')).toHaveText('Converter')
    })
})

test.describe('interface', () => {
    test('troca bandeira e texto alternativo junto com a moeda', async ({ page }) => {
        await interceptarApi(page)
        await page.goto('/')
        await page.selectOption('#currency-select', 'EUR')

        const bandeira = page.locator('#currency-img')
        await expect(bandeira).toHaveAttribute('src', './assets/eur.png')
        await expect(bandeira).toHaveAttribute('alt', 'Bandeira da União Europeia')
    })

    test('não gera scroll horizontal em telas de 320px', async ({ page }) => {
        await interceptarApi(page)
        await page.setViewportSize({ width: 320, height: 700 })
        await page.goto('/')

        const estourou = await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth,
        )
        expect(estourou).toBe(false)
    })

    test('serve corretamente a partir de uma subpasta, como o GitHub Pages', async ({ page }) => {
        const erros = []
        page.on('pageerror', (e) => erros.push(e.message))
        page.on('response', (r) => r.status() >= 400 && erros.push(`${r.status()} ${r.url()}`))

        await interceptarApi(page)
        await page.goto('/index.html')
        await converter(page, '100')

        await expect(page.locator('#currency-value-text')).toHaveText('$18.18')
        expect(erros).toEqual([])
    })
})

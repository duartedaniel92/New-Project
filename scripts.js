'use strict'

/**
 * Cada moeda de destino é descrita uma única vez aqui.
 * Para adicionar uma nova moeda basta acrescentar uma entrada
 * (o código precisa existir na AwesomeAPI no par <CODIGO>-BRL)
 * e o <option> correspondente no index.html.
 */
const CURRENCIES = {
    USD: {
        name: 'Dólar Americano',
        locale: 'en-US',
        flag: './assets/eua.png',
        flagAlt: 'Bandeira dos Estados Unidos',
    },
    EUR: {
        name: 'Euro',
        locale: 'de-DE',
        flag: './assets/eur.png',
        flagAlt: 'Bandeira da União Europeia',
    },
    BTC: {
        name: 'Bitcoin',
        locale: 'pt-BR',
        flag: './assets/btc.png',
        flagAlt: 'Símbolo do Bitcoin',
        formatOptions: { maximumFractionDigits: 8 },
    },
}

const API_URL = `https://economia.awesomeapi.com.br/last/${Object.keys(CURRENCIES)
    .map((code) => `${code}-BRL`)
    .join(',')}`

/** Cotações mudam devagar: reaproveitamos a resposta por 60s. */
const RATES_TTL_MS = 60_000

const button = document.getElementById('convert-button')
const select = document.getElementById('currency-select')
const inputReal = document.getElementById('input-real')
const realValueText = document.getElementById('real-value-text')
const currencyValueText = document.getElementById('currency-value-text')
const currencyName = document.getElementById('currency-name')
const currencyImg = document.getElementById('currency-img')
const errorMessage = document.getElementById('error-message')
const result = document.getElementById('result')

let ratesCache = null

const formatCurrency = (value, code, locale, formatOptions = {}) =>
    new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        ...formatOptions,
    }).format(value)

const showError = (message) => {
    errorMessage.textContent = message
    errorMessage.hidden = false
}

const clearError = () => {
    errorMessage.textContent = ''
    errorMessage.hidden = true
}

const setLoading = (isLoading) => {
    button.disabled = isLoading
    button.textContent = isLoading ? 'Convertendo...' : 'Converter'
    result.setAttribute('aria-busy', String(isLoading))
}

/**
 * Busca as cotações de compra (bid) de todas as moedas configuradas.
 * O campo `high` da API é a maior cotação do dia, não a atual — usar
 * `bid` é o que produz uma conversão correta.
 */
const getRates = async () => {
    if (ratesCache && Date.now() - ratesCache.fetchedAt < RATES_TTL_MS) {
        return ratesCache.rates
    }

    const response = await fetch(API_URL)

    if (!response.ok) {
        throw new Error(`O serviço de cotações respondeu com status ${response.status}.`)
    }

    const data = await response.json()
    const rates = {}

    for (const code of Object.keys(CURRENCIES)) {
        const bid = Number(data?.[`${code}BRL`]?.bid)

        if (!Number.isFinite(bid) || bid <= 0) {
            throw new Error(`A cotação de ${code} não veio na resposta do serviço.`)
        }

        rates[code] = bid
    }

    ratesCache = { rates, fetchedAt: Date.now() }
    return rates
}

/** Lê o campo de valor e devolve um número válido, ou null. */
const readAmount = () => {
    const raw = inputReal.value.trim()

    if (raw === '') {
        showError('Digite um valor em Reais para converter.')
        return null
    }

    const amount = Number(raw)

    if (!Number.isFinite(amount)) {
        showError('Digite um valor numérico válido.')
        return null
    }

    if (amount < 0) {
        showError('O valor não pode ser negativo.')
        return null
    }

    return amount
}

const convertValues = async () => {
    clearError()

    const amount = readAmount()
    if (amount === null) return

    const code = select.value
    const currency = CURRENCIES[code]

    setLoading(true)

    try {
        const rates = await getRates()

        realValueText.textContent = formatCurrency(amount, 'BRL', 'pt-BR')
        currencyValueText.textContent = formatCurrency(
            amount / rates[code],
            code,
            currency.locale,
            currency.formatOptions,
        )
    } catch (error) {
        console.error(error)
        showError(
            'Não foi possível obter as cotações agora. Verifique sua conexão e tente novamente.',
        )
    } finally {
        setLoading(false)
    }
}

const changeCurrency = () => {
    const code = select.value
    const currency = CURRENCIES[code]

    currencyName.textContent = currency.name
    currencyImg.src = currency.flag
    currencyImg.alt = currency.flagAlt

    // Sem valor digitado não há motivo para converter (nem para ir à rede).
    if (inputReal.value.trim() === '') {
        clearError()
        currencyValueText.textContent = formatCurrency(0, code, currency.locale, currency.formatOptions)
        return
    }

    convertValues()
}

button.addEventListener('click', convertValues)
select.addEventListener('change', changeCurrency)
inputReal.addEventListener('input', clearError)

// Deixa o rótulo inicial coerente com a moeda selecionada.
changeCurrency()

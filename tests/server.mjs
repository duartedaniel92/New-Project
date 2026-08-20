/**
 * Servidor estático mínimo usado pelos testes.
 * Evita uma dependência extra só para servir três arquivos.
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const PORT = Number(process.env.PORT ?? 8123)

const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
}

createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    // normalize + prefixo impedem sair da raiz do projeto via "../"
    const target = normalize(join(ROOT, path.endsWith('/') ? `${path}index.html` : path))

    if (!target.startsWith(ROOT)) {
        res.writeHead(403).end('Forbidden')
        return
    }

    try {
        const body = await readFile(target)
        res.writeHead(200, { 'content-type': TYPES[extname(target)] ?? 'application/octet-stream' })
        res.end(body)
    } catch {
        res.writeHead(404).end('Not found')
    }
}).listen(PORT, '127.0.0.1', () => {
    console.log(`servindo ${ROOT} em http://127.0.0.1:${PORT}`)
})

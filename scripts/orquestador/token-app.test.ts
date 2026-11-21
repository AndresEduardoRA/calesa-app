import { execFileSync, spawnSync } from 'node:child_process'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// token-app.sh (README.md › «Como la app de GitHub»): firma el JWT de la app con su clave, pide el token de instalación y lo guarda en
// caché. Sin red: una clave RSA generada aquí, `curl` falso (prueba/curl-falso.sh) y un `gh` falso para el respaldo del helper de git.
// Nunca lee ~/.config/orquestador: HOME y XDG_CACHE_HOME son temporales.
const GUION = resolve('scripts/orquestador/token-app.sh')
const CURL_FALSO = resolve('scripts/orquestador/prueba/curl-falso.sh')
const TOKEN = 'ghs_falsoUno'
const ACCESO = 'POST /app/installations/77/access_tokens'

let raiz = ''
let clave = ''
let publica = ''
let bin = ''

beforeAll(() => {
  raiz = mkdtempSync(join(tmpdir(), 'token-app-'))
  clave = join(raiz, 'clave.pem')
  publica = join(raiz, 'publica.pem')
  execFileSync(
    'openssl',
    ['genpkey', '-algorithm', 'RSA', '-pkeyopt', 'rsa_keygen_bits:2048', '-out', clave],
    { stdio: 'ignore' },
  )
  execFileSync('openssl', ['pkey', '-in', clave, '-pubout', '-out', publica])
  chmodSync(clave, 0o600)
  bin = join(raiz, 'bin')
  mkdirSync(bin)
  writeFileSync(join(bin, 'curl'), `#!/usr/bin/env bash\nexec bash ${CURL_FALSO} "$@"\n`, {
    mode: 0o755,
  })
  // La sesión de gh de la máquina, para el respaldo del helper.
  writeFileSync(
    join(bin, 'gh'),
    '#!/usr/bin/env bash\ncat >/dev/null\n[ "$*" = "auth git-credential get" ] && printf "username=persona\\npassword=tok-persona\\n"\n',
    { mode: 0o755 },
  )
})
afterAll(() => rmSync(raiz, { recursive: true, force: true }))

const enSegundos = (s: number) => new Date(Date.now() + s * 1000).toISOString()
const feliz = (token = TOKEN, vence = 3600) => ({
  [ACCESO]: {
    status: 201,
    body: {
      token,
      expires_at: enSegundos(vence),
      permissions: { issues: 'write', metadata: 'read' },
    },
  },
  'GET /app': { status: 200, body: { slug: 'mi-app' } },
})

/** Un HOME, una caché y unas respuestas de GitHub nuevos. */
function caso(respuestas: object = feliz()) {
  const home = mkdtempSync(join(raiz, 'home-'))
  const falso = join(home, 'curl')
  mkdirSync(falso)
  const responder = (r: object) => writeFileSync(join(falso, 'respuestas.json'), JSON.stringify(r))
  responder(respuestas)
  const cache = join(home, 'cache')
  const correr = (
    args: string[] = [],
    { env = {}, input }: { env?: Record<string, string>; input?: string } = {},
  ) => {
    const r = spawnSync('bash', [GUION, ...args], {
      encoding: 'utf8',
      input: input ?? '',
      env: {
        NODE_ENV: 'test',
        PATH: `${bin}:${process.env['PATH'] ?? ''}`,
        HOME: home,
        XDG_CACHE_HOME: cache,
        CURL_FALSO: falso,
        APP_ID: '123',
        APP_INSTALACION: '77',
        APP_CLAVE: clave,
        APP_API: 'http://github.falso',
        ...env,
      },
    })
    return { estado: r.status, stdout: r.stdout, stderr: r.stderr }
  }
  const llamadas = (): { argv: string[]; stdin: string }[] =>
    existsSync(join(falso, 'llamadas.log'))
      ? readFileSync(join(falso, 'llamadas.log'), 'utf8')
          .trim()
          .split('\n')
          .filter(Boolean)
          .map((l) => JSON.parse(l) as { argv: string[]; stdin: string })
      : []
  return { home, cache, correr, llamadas, responder }
}

const jwtDe = (stdin: string) => /Bearer ([\w.-]+)/.exec(stdin)?.[1] ?? ''
const decodificar = (parte: string) =>
  JSON.parse(Buffer.from(parte, 'base64url').toString('utf8')) as Record<string, unknown>

/** Ni la clave ni el JWT salen por ningún lado; el token, sólo por el stdout del caso feliz. */
function sinSecretos(
  r: { stdout: string; stderr: string },
  jwts: string[],
  tokenPermitido = false,
) {
  const lineas = readFileSync(clave, 'utf8').split('\n')
  const deLaClave = lineas[Math.floor(lineas.length / 2)] ?? ''
  for (const texto of [r.stdout, r.stderr]) {
    expect(texto).not.toContain('PRIVATE KEY')
    expect(texto).not.toContain(deLaClave)
    for (const j of jwts) if (j) expect(texto).not.toContain(j)
  }
  expect(r.stderr).not.toContain(TOKEN)
  if (!tokenPermitido) expect(r.stdout).not.toContain(TOKEN)
}

describe('token-app.sh', () => {
  it('firma un JWT RS256 con la clave, lo manda por el stdin de curl y imprime sólo el token', () => {
    const c = caso()
    const r = c.correr()
    expect(r).toMatchObject({ estado: 0, stdout: `${TOKEN}\n` })
    const pedido = c.llamadas()[0]
    expect(pedido?.argv).toEqual(expect.arrayContaining(['-X', 'POST', '--config', '-']))
    expect(pedido?.argv.at(-1)).toBe('http://github.falso/app/installations/77/access_tokens')
    const jwt = jwtDe(pedido?.stdin ?? '')
    expect(jwt.split('.')).toHaveLength(3)
    expect(pedido?.argv.join(' ')).not.toContain(jwt)
    const [cab = '', carga = '', firma = ''] = jwt.split('.')
    expect(decodificar(cab)).toEqual({ alg: 'RS256', typ: 'JWT' })
    const p = decodificar(carga) as { iss: string; iat: number; exp: number }
    const ahora = Math.floor(Date.now() / 1000)
    expect(p.iss).toBe('123')
    expect(p.iat).toBeLessThanOrEqual(ahora - 30)
    expect(p.exp - p.iat).toBeLessThanOrEqual(600)
    expect(p.exp).toBeGreaterThan(ahora)
    const datos = join(c.home, 'datos')
    const sig = join(c.home, 'firma')
    writeFileSync(datos, `${cab}.${carga}`)
    writeFileSync(sig, Buffer.from(firma, 'base64url'))
    const v = spawnSync(
      'openssl',
      ['dgst', '-sha256', '-verify', publica, '-signature', sig, datos],
      {
        encoding: 'utf8',
      },
    )
    expect(v.stdout).toContain('Verified OK')
    sinSecretos(r, [jwt], true)
  })

  it('la caché queda con modo 600 en una carpeta 700, y la segunda llamada no le pide nada a GitHub', () => {
    const c = caso()
    c.correr()
    const archivo = join(c.cache, 'orquestador/app-77')
    expect(statSync(archivo).mode & 0o777).toBe(0o600)
    expect(statSync(join(c.cache, 'orquestador')).mode & 0o777).toBe(0o700)
    const antes = c.llamadas().length
    expect(antes).toBe(2) // el token y, una vez, GET /app
    expect(c.correr().stdout).toBe(`${TOKEN}\n`)
    expect(c.llamadas()).toHaveLength(antes)
  })

  it('a menos de 300 s del vencimiento, renueva', () => {
    const c = caso(feliz(TOKEN, 200))
    c.correr()
    c.responder(feliz('ghs_falsoDos'))
    expect(c.correr().stdout).toBe('ghs_falsoDos\n')
    expect(c.llamadas().filter((l) => l.argv.includes('POST'))).toHaveLength(2)
    // El login de la app ya estaba: no se vuelve a pedir.
    expect(c.llamadas().filter((l) => l.argv.at(-1)?.endsWith('/app'))).toHaveLength(1)
  })

  it('sin APP_ID (o con ORQ_SIN_APP=1) sale con 3, callado y sin llamar a nadie', () => {
    const c = caso()
    expect(c.correr([], { env: { APP_ID: '' } })).toEqual({ estado: 3, stdout: '', stderr: '' })
    expect(c.correr([], { env: { ORQ_SIN_APP: '1' } }).estado).toBe(3)
    expect(c.llamadas()).toEqual([])
  })
})

describe('token-app.sh: lo que sale mal', () => {
  it('una clave ausente, ilegible o que no es una clave sale con 4 y la ruta', () => {
    const c = caso()
    const ausente = join(c.home, 'no-esta.pem')
    const r = c.correr([], { env: { APP_CLAVE: ausente } })
    expect(r.estado).toBe(4)
    expect(r.stderr).toContain(ausente)
    const basura = join(c.home, 'basura.pem')
    writeFileSync(basura, 'no soy una clave\n')
    expect(c.correr([], { env: { APP_CLAVE: basura } }).estado).toBe(4)
    if (process.getuid?.() !== 0) {
      const cerrada = join(c.home, 'cerrada.pem')
      writeFileSync(cerrada, readFileSync(clave))
      chmodSync(cerrada, 0o000)
      const r2 = c.correr([], { env: { APP_CLAVE: cerrada } })
      expect(r2.estado).toBe(4)
      expect(r2.stderr).toContain(cerrada)
      sinSecretos(r2, [])
    }
    expect(c.llamadas()).toEqual([])
    sinSecretos(r, [])
  })

  it('un 401 con el reloj corrido sale con 5 y lo dice; un 404, con 6 y el message; sin red, con 1', () => {
    const reloj = caso({
      [ACCESO]: {
        status: 401,
        fecha: new Date(Date.now() - 600_000).toUTCString(),
        body: { message: "'Expiration time' claim ('exp') is too far in the future" },
      },
    })
    const r1 = reloj.correr()
    expect(r1.estado).toBe(5)
    expect(r1.stderr).toMatch(/reloj.*corrido (59\d|60\d) s/)
    sinSecretos(
      r1,
      reloj.llamadas().map((l) => jwtDe(l.stdin)),
    )

    const sinInstalar = caso({ [ACCESO]: { status: 404, body: { message: 'Not Found' } } })
    const r2 = sinInstalar.correr()
    expect(r2.estado).toBe(6)
    expect(r2.stderr).toContain('HTTP 404')
    expect(r2.stderr).toContain('Not Found')
    expect(r2.stderr).toContain('APP_INSTALACION=77')
    sinSecretos(
      r2,
      sinInstalar.llamadas().map((l) => jwtDe(l.stdin)),
    )

    const r3 = caso({ sinRed: true }).correr()
    expect(r3.estado).toBe(1)
    sinSecretos(r3, [])
  })

  it('un 401 con el reloj bien es un rechazo de GitHub (6), no del reloj', () => {
    const r = caso({ [ACCESO]: { status: 401, body: { message: 'Bad credentials' } } }).correr()
    expect(r.estado).toBe(6)
    expect(r.stderr).toContain('Bad credentials')
    expect(r.stderr).not.toContain('reloj')
  })
})

describe('token-app.sh: el helper de git y lo que lee de la caché', () => {
  it('credencial get: el token para github.com por https, nada para otro host, y la sesión de gh si la clave falla', () => {
    const c = caso()
    const pedir = 'protocol=https\nhost=github.com\n\n'
    const r = c.correr(['credencial', 'get'], { input: pedir })
    expect(r).toMatchObject({
      estado: 0,
      stdout: `username=x-access-token\npassword=${TOKEN}\n`,
    })
    const antes = c.llamadas().length
    const otro = c.correr(['credencial', 'get'], {
      input: 'protocol=https\nhost=gitlab.com\n\n',
    })
    expect(otro).toMatchObject({ estado: 0, stdout: '' })
    expect(c.correr(['credencial', 'store'], { input: pedir }).stdout).toBe('')
    expect(c.llamadas()).toHaveLength(antes)

    const rota = caso().correr(['credencial', 'get'], {
      input: pedir,
      env: { APP_CLAVE: join(raiz, 'no-esta.pem') },
    })
    expect(rota.stdout).toBe('username=persona\npassword=tok-persona\n')
  })

  it('--bot, --permisos y --vence leen de la caché', () => {
    const c = caso()
    expect(c.correr(['--bot']).stdout).toBe('mi-app[bot]\n')
    const antes = c.llamadas().length
    expect(JSON.parse(c.correr(['--permisos']).stdout)).toEqual({
      issues: 'write',
      metadata: 'read',
    })
    const vence = Number(c.correr(['--vence']).stdout)
    expect(vence - Date.now() / 1000).toBeGreaterThan(3500)
    expect(c.llamadas()).toHaveLength(antes)
  })
})

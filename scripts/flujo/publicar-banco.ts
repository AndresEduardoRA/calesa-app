import { execFileSync, spawnSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeEach } from 'vitest'

// El banco de las pruebas de `publicar.sh` (publicar.test.ts, publicar-ci.test.ts): `publicar.sh` publica la rama como un PR con auto-merge (docs/FLUJO.md). Se prueba con un repo temporal, un `origin` de verdad
// (bare) y `gh` y `pnpm` falsos que registran lo que se les pide: lo que niega (main, árbol sucio, sin commits, título inválido) y el
// camino feliz (empuja sin forzar, abre el PR con el título, enciende el auto-merge y, ya integrado, vuelve a main). El guion se
// ubica por su propia carpeta: se copia al repo temporal (con la biblioteca de la cola de integración) y se corre desde ahí, como en
// un proyecto. El `gh` falso de siempre no responde nada a `api graphql`, `rules` ni `run`: «sin cola» es el camino por defecto.
const GUION_DEL_KIT = resolve('scripts/flujo/publicar.sh')
const COLA_DEL_KIT = resolve('scripts/flujo/cola-de-integracion.sh')
const raices: string[] = []
export let raiz = ''
export let repo = ''

export const git = (...args: string[]) =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@ejemplo.test', ...args], {
    cwd: repo,
    encoding: 'utf8',
  }).trim()

export function falso(nombre: string, cuerpo: string) {
  writeFileSync(
    join(raiz, 'bin', nombre),
    `#!/usr/bin/env bash\necho "${nombre} $*" >> "${join(raiz, 'llamadas.txt')}"\n${cuerpo}\n`,
  )
  chmodSync(join(raiz, 'bin', nombre), 0o755)
}

beforeEach(() => {
  raiz = mkdtempSync(join(tmpdir(), 'publicar-'))
  raices.push(raiz)
  repo = join(raiz, 'repo')
  mkdirSync(join(raiz, 'bin'))
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', join(raiz, 'origin.git')])
  execFileSync('git', ['init', '-q', '-b', 'main', repo])
  git('remote', 'add', 'origin', join(raiz, 'origin.git'))
  writeFileSync(join(repo, 'a.txt'), 'a\n')
  mkdirSync(join(repo, 'scripts/flujo'), { recursive: true })
  writeFileSync(join(repo, 'scripts/flujo/limpiar-ramas.mjs'), 'console.log("limpiar")\n')
  copyFileSync(GUION_DEL_KIT, join(repo, 'scripts/flujo/publicar.sh'))
  copyFileSync(COLA_DEL_KIT, join(repo, 'scripts/flujo/cola-de-integracion.sh'))
  git('add', '.')
  git('commit', '-q', '-m', 'chore: inicio')
  git('push', '-q', '-u', 'origin', 'main')
  // `pnpm exec commitlint`: acepta un título con forma de commit convencional.
  falso('pnpm', `grep -qE '^(feat|fix|chore|docs)(\\([a-z]+\\))?: [a-z]' || exit 1`)
  // `gh`: sin PR hasta que se crea; después lo da por integrado.
  falso(
    'gh',
    `case "$1 $2" in
  "auth token") exit 1 ;;
  "pr create") touch "${join(raiz, 'pr-creado')}" ;;
  "pr view")
    [ -f "${join(raiz, 'pr-creado')}" ] || exit 1
    case "$*" in
      *statusCheckRollup*) echo '{"state":"MERGED","mergeable":"UNKNOWN","statusCheckRollup":[]}' ;;
      *) echo 7 ;;
    esac ;;
esac
exit 0`,
  )
})
afterAll(() => {
  for (const r of raices) rmSync(r, { recursive: true, force: true })
})

export function publicarDesde(cwd: string, ...args: string[]) {
  return publicarConEntorno(cwd, {}, ...args)
}
export function publicarConEntorno(cwd: string, extra: Record<string, string>, ...args: string[]) {
  const r = spawnSync('bash', [join(repo, 'scripts/flujo/publicar.sh'), ...args], {
    cwd,
    encoding: 'utf8',
    env: {
      NODE_ENV: 'test',
      HOME: raiz,
      PATH: `${join(raiz, 'bin')}:${process.env['PATH'] ?? ''}`,
      ESPERA_PASO: '0',
      ...extra,
    },
  })
  return { estado: r.status, stderr: r.stderr, stdout: r.stdout }
}
export const publicar = (...args: string[]) => publicarDesde(repo, ...args)
export const llamadas = () =>
  existsSync(join(raiz, 'llamadas.txt')) ? readFileSync(join(raiz, 'llamadas.txt'), 'utf8') : ''

export function ramaConUnCommit(asunto = 'feat(leads): algo nuevo') {
  git('switch', '-q', '-c', 'feat/algo')
  writeFileSync(join(repo, 'b.txt'), 'b\n')
  git('add', '.')
  git('commit', '-q', '-m', asunto)
}

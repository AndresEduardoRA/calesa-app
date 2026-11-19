import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll } from 'vitest'

// El banco de las pruebas de sin-sesion.sh (sin-sesion.test.ts, sin-sesion-ci.test.ts): lo que el orquestador arregla sin abrir una sesión. Se carga con `source` en un bash con lo mínimo de orquestador.sh
// (estado en archivos, `log` a un archivo, `ghr` falso que responde desde archivos) y se llama a cada función.
const GUION = resolve('scripts/orquestador/sin-sesion.sh')
const raices: string[] = []
afterAll(() => {
  for (const r of raices) rmSync(r, { recursive: true, force: true })
})

export function nuevaRaiz() {
  const raiz = mkdtempSync(join(tmpdir(), 'sin-sesion-'))
  raices.push(raiz)
  for (const d of ['est', 'wts', 'gh', 'cola']) mkdirSync(join(raiz, d))
  return raiz
}

// Corre `cuerpo` con las funciones del orquestador que usa sin-sesion.sh. `ghr` responde: `pr view` con gh/files, `run view` con
// gh/log-<run> y `run rerun` anota en gh/rerun.
export function correr(raiz: string, cuerpo: string) {
  const preludio = `
set -uo pipefail
EST=${JSON.stringify(join(raiz, 'est'))}; WTS=${JSON.stringify(join(raiz, 'wts'))}; COLA=${JSON.stringify(join(raiz, 'cola'))}
G=${JSON.stringify(join(raiz, 'gh'))}
log() { printf '%s\\n' "$*" >>"$EST/log"; }
est_get() { cat "$EST/$1/$2" 2>/dev/null || true; }
est_set() { mkdir -p "$EST/$1"; printf '%s\\n' "$3" >"$EST/$1/$2"; }
campo() { sed -n "s/^$2: *//p" "$1" | head -n 1; }
spec_de() { echo "$COLA/$1.md"; }
ghr() {
  case "$1 $2" in
    "pr view") cat "$G/files" ;;
    "run view") if [ "$3" = --job ]; then cat "$G/log-job-$4" 2>/dev/null; else cat "$G/log-$3" 2>/dev/null; fi ;;
    "run rerun") echo "$3" >>"$G/rerun" ;;
  esac
}
source ${JSON.stringify(GUION)}
`
  return spawnSync('bash', ['-c', preludio + cuerpo], { encoding: 'utf8' })
}

export const leer = (f: string) => {
  try {
    return readFileSync(f, 'utf8')
  } catch {
    return ''
  }
}

export function prJson(caidos: { nombre: string; run: number; job?: number }[], sha = 'abc123') {
  return JSON.stringify({
    headRefOid: sha,
    statusCheckRollup: [
      ...caidos.map((c) => ({
        __typename: 'CheckRun',
        name: c.nombre,
        conclusion: 'FAILURE',
        detailsUrl: `https://github.com/o/r/actions/runs/${String(c.run)}/job/${String(c.job ?? 1)}`,
      })),
      {
        __typename: 'CheckRun',
        name: 'Listo · todo en verde',
        conclusion: 'FAILURE',
        detailsUrl: '',
      },
    ],
  })
}

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

// main-en-tanda.sh: integrar sin la rama al día. Se carga con `source` en un bash con lo mínimo de orquestador.sh (estado en archivos,
// `log` a un archivo, `git`, `ghr` y `ghc` falsos que responden desde archivos de gh/) y se llama a cada función.
const ORQ = resolve('scripts/orquestador')
const raices: string[] = []
afterAll(() => {
  for (const r of raices) rmSync(r, { recursive: true, force: true })
})

function nuevaRaiz() {
  const raiz = mkdtempSync(join(tmpdir(), 'main-en-tanda-'))
  raices.push(raiz)
  for (const d of ['est', 'gh']) mkdirSync(join(raiz, d))
  return raiz
}

function correr(raiz: string, cuerpo: string) {
  const preludio = `
set -uo pipefail
EST=${JSON.stringify(join(raiz, 'est'))}; ORQ=${JSON.stringify(ORQ)}; REPO=/nada; REPO_GH=o/r
G=${JSON.stringify(join(raiz, 'gh'))}
log() { printf '%s\\n' "$*" >>"$EST/log"; }
avisar() { :; }
enlace_issue() { :; }
est_get() { cat "$EST/$1/$2" 2>/dev/null || true; }
est_set() { mkdir -p "$EST/$1"; printf '%s\\n' "$3" >"$EST/$1/$2"; }
git() { cat "$G/main"; }
caidos_de() { echo "- e2e/x.spec.ts"; }
urgente() { grep -q '^urgente: si' "$1"; }
migraciones_tras_main() { return 1; }
publicar_entrada() { cp "$1" "$G/publicada.md"; PUBLICADA=T900; }
ghr() {
  case "$*" in
    "api --paginate repos/{owner}/{repo}/pulls/"*) cat "$G/files" ;;
    "api repos/{owner}/{repo}/compare/"*) cat "$G/atras" ;;
    "pr merge"*) echo "$*" >>"$G/merge" ;;
    "api -X PUT"*) echo "$*" >>"$G/put" ;;
  esac
}
ghc() { cat "$G/runs"; }
source ${JSON.stringify(join(ORQ, 'main-en-tanda.sh'))}
`
  return spawnSync('bash', ['-c', preludio + cuerpo], { encoding: 'utf8' })
}

const leer = (f: string) => (existsSync(f) ? readFileSync(f, 'utf8') : '')
const MAIN = 'a'.repeat(40)
const pr = (sha = 'abc') => JSON.stringify({ headRefOid: sha })

describe('integrar_con_migraciones', () => {
  it('con_migraciones mira si el PR agrega algo en supabase/migrations/', () => {
    const raiz = nuevaRaiz()
    writeFileSync(join(raiz, 'gh/files'), 'src/a.ts\nsupabase/migrations/20261119000000_x.sql\n')
    expect(correr(raiz, 'con_migraciones 9 && echo si').stdout).toContain('si')
    writeFileSync(join(raiz, 'gh/files'), 'src/a.ts\n')
    expect(correr(raiz, 'con_migraciones 9 || echo no').stdout).toContain('no')
  })

  it('en verde y al día con main, lo integra con la punta probada', () => {
    const raiz = nuevaRaiz()
    writeFileSync(join(raiz, 'gh/atras'), '0\n')
    correr(raiz, `integrar_con_migraciones T1 9 '${pr()}'`)
    expect(leer(join(raiz, 'gh/merge'))).toBe('pr merge 9 --squash --match-head-commit abc\n')
    expect(leer(join(raiz, 'gh/put'))).toBe('')
  })

  it('atrás de main, lo pone al día (una vez cada 15 min) y no lo integra', () => {
    const raiz = nuevaRaiz()
    writeFileSync(join(raiz, 'gh/atras'), '3\n')
    correr(raiz, `integrar_con_migraciones T1 9 '${pr()}'`)
    correr(raiz, `integrar_con_migraciones T1 9 '${pr()}'`)
    expect(leer(join(raiz, 'gh/merge'))).toBe('')
    expect(leer(join(raiz, 'gh/put')).trim().split('\n')).toHaveLength(1)
    expect(leer(join(raiz, 'est/log'))).toContain('3 commits atrás de main')
  })
})

describe('vigilar_main', () => {
  const corrida = (conclusion: string, sha = MAIN) =>
    JSON.stringify([{ databaseId: 77, headSha: sha, status: 'completed', conclusion }])

  it('el CI de main en rojo frena lo nuevo y encola una vez la urgente; en verde lo suelta', () => {
    const raiz = nuevaRaiz()
    writeFileSync(join(raiz, 'gh/main'), `${MAIN}\n`)
    writeFileSync(join(raiz, 'gh/runs'), corrida('failure'))
    expect(correr(raiz, 'vigilar_main; main_rojo && echo rojo').stdout).toContain('rojo')
    const tarea = leer(join(raiz, 'gh/publicada.md'))
    expect(tarea).toContain('urgente: si')
    expect(tarea).toContain(`titulo: dejar verde main (${MAIN.slice(0, 7)})`)
    expect(tarea).toContain('https://github.com/o/r/actions/runs/77')
    expect(tarea).toContain('- e2e/x.spec.ts')
    expect(tarea).not.toContain('{{')
    // La misma punta en la vuelta siguiente: no encola otra.
    rmSync(join(raiz, 'gh/publicada.md'))
    rmSync(join(raiz, 'est/.main-visto'))
    correr(raiz, 'vigilar_main')
    expect(leer(join(raiz, 'gh/publicada.md'))).toBe('')
    // Main en verde: suelta lo nuevo.
    writeFileSync(join(raiz, 'gh/runs'), corrida('success'))
    rmSync(join(raiz, 'est/.main-visto'))
    expect(correr(raiz, 'vigilar_main; main_rojo || echo verde').stdout).toContain('verde')
  })

  it('una corrida de otro sha o todavía en curso no decide nada', () => {
    const raiz = nuevaRaiz()
    writeFileSync(join(raiz, 'gh/main'), `${MAIN}\n`)
    writeFileSync(join(raiz, 'gh/runs'), corrida('failure', 'b'.repeat(40)))
    expect(correr(raiz, 'vigilar_main; main_rojo || echo nada').stdout).toContain('nada')
    writeFileSync(
      join(raiz, 'gh/runs'),
      JSON.stringify([{ databaseId: 78, headSha: MAIN, status: 'in_progress', conclusion: '' }]),
    )
    rmSync(join(raiz, 'est/.main-visto'))
    expect(correr(raiz, 'vigilar_main; main_rojo || echo nada').stdout).toContain('nada')
  })

  it('con main en rojo sólo arranca una tarea urgente', () => {
    const raiz = nuevaRaiz()
    writeFileSync(join(raiz, 'normal.md'), '---\nid: T1\n---\n')
    writeFileSync(join(raiz, 'urgente.md'), '---\nid: T2\nurgente: si\n---\n')
    const frena = (spec: string) =>
      correr(raiz, `frena_lo_nuevo ${join(raiz, spec)} && echo frena || echo arranca`).stdout.trim()
    expect(frena('normal.md')).toBe('arranca')
    writeFileSync(join(raiz, 'est/.main-rojo'), `${MAIN}\n`)
    expect(frena('normal.md')).toBe('frena')
    expect(frena('urgente.md')).toBe('arranca')
  })

  it('mira el CI una vez cada MAIN_VISTO_CADA_S', () => {
    const raiz = nuevaRaiz()
    writeFileSync(join(raiz, 'gh/main'), `${MAIN}\n`)
    writeFileSync(join(raiz, 'gh/runs'), corrida('success'))
    correr(raiz, 'vigilar_main')
    writeFileSync(join(raiz, 'gh/runs'), corrida('failure'))
    expect(correr(raiz, 'vigilar_main; main_rojo || echo todavia').stdout).toContain('todavia')
  })
})

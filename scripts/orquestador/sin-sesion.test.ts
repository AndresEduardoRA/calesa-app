import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

// sin-sesion.sh: lo que el orquestador arregla sin abrir una sesión. Se carga con `source` en un bash con lo mínimo de orquestador.sh
// (estado en archivos, `log` a un archivo, `ghr` falso que responde desde archivos) y se llama a cada función.
const GUION = resolve('scripts/orquestador/sin-sesion.sh')
const raices: string[] = []
afterAll(() => {
  for (const r of raices) rmSync(r, { recursive: true, force: true })
})

function nuevaRaiz() {
  const raiz = mkdtempSync(join(tmpdir(), 'sin-sesion-'))
  raices.push(raiz)
  for (const d of ['est', 'wts', 'gh', 'cola']) mkdirSync(join(raiz, d))
  return raiz
}

// Corre `cuerpo` con las funciones del orquestador que usa sin-sesion.sh. `ghr` responde: `pr view` con gh/files, `run view` con
// gh/log-<run> y `run rerun` anota en gh/rerun.
function correr(raiz: string, cuerpo: string) {
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
    "run view") cat "$G/log-$3" 2>/dev/null ;;
    "run rerun") echo "$3" >>"$G/rerun" ;;
  esac
}
source ${JSON.stringify(GUION)}
`
  return spawnSync('bash', ['-c', preludio + cuerpo], { encoding: 'utf8' })
}

const leer = (f: string) => {
  try {
    return readFileSync(f, 'utf8')
  } catch {
    return ''
  }
}

function prJson(caidos: { nombre: string; run: number }[], sha = 'abc123') {
  return JSON.stringify({
    headRefOid: sha,
    statusCheckRollup: [
      ...caidos.map((c) => ({
        __typename: 'CheckRun',
        name: c.nombre,
        conclusion: 'FAILURE',
        detailsUrl: `https://github.com/o/r/actions/runs/${String(c.run)}/job/1`,
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

describe('reintentar_ci_una_vez', () => {
  it('relanza una vez lo caído si sólo cayeron bloques de e2e en specs que el PR no toca', () => {
    const raiz = nuevaRaiz()
    writeFileSync(join(raiz, 'gh/files'), 'src/a.tsx\ne2e/mio.spec.ts\n')
    writeFileSync(join(raiz, 'gh/log-77'), '  1) [escritorio] › e2e/ajeno.spec.ts:10:5 › algo\n')
    const j = prJson([{ nombre: 'e2e · bloque 2 de 4', run: 77 }])
    const r = correr(raiz, `reintentar_ci_una_vez T1 9 '${j}'; echo "rc=$?"`)
    expect(r.stdout).toContain('rc=0')
    expect(leer(join(raiz, 'gh/rerun'))).toBe('77\n')
    expect(leer(join(raiz, 'est/log'))).toContain('relanzo lo caído una vez')
    // La misma punta, recién relanzada: espera sin abrir sesión ni relanzar de nuevo.
    const otra = correr(raiz, `reintentar_ci_una_vez T1 9 '${j}'; echo "rc=$?"`)
    expect(otra.stdout).toContain('rc=0')
    expect(leer(join(raiz, 'gh/rerun'))).toBe('77\n')
    // Pasados los 10 minutos, el rojo de esa punta va a la sesión.
    writeFileSync(join(raiz, 'est/T1/reintento_ci_en'), '0\n')
    expect(correr(raiz, `reintentar_ci_una_vez T1 9 '${j}'; echo "rc=$?"`).stdout).toContain('rc=1')
  })

  it('no relanza si cayó un spec que el PR toca', () => {
    const raiz = nuevaRaiz()
    writeFileSync(join(raiz, 'gh/files'), 'e2e/mio.spec.ts\n')
    writeFileSync(join(raiz, 'gh/log-5'), '  1) [escritorio] › e2e/mio.spec.ts:3:1 › lo mío\n')
    const j = prJson([{ nombre: 'e2e · bloque 1 de 4', run: 5 }])
    expect(correr(raiz, `reintentar_ci_una_vez T1 9 '${j}'; echo "rc=$?"`).stdout).toContain('rc=1')
    expect(leer(join(raiz, 'gh/rerun'))).toBe('')
  })

  it('no relanza si cayó algo que no es un bloque de e2e', () => {
    const raiz = nuevaRaiz()
    writeFileSync(join(raiz, 'gh/files'), 'src/a.ts\n')
    const j = prJson([
      { nombre: 'e2e · bloque 1 de 4', run: 5 },
      { nombre: 'Nivel 1 · tests, parte 2 de 3', run: 5 },
    ])
    expect(correr(raiz, `reintentar_ci_una_vez T1 9 '${j}'; echo "rc=$?"`).stdout).toContain('rc=1')
    expect(leer(join(raiz, 'gh/rerun'))).toBe('')
  })
})

describe('fusionar_docs', () => {
  // Un origin desnudo con main, la rama de la tarea en su worktree ($WTS/T1) y main que avanzó después tocando lo mismo.
  function escenario(raiz: string, tambienCodigo: boolean) {
    const git = (cwd: string, ...args: string[]) =>
      execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@ejemplo.test', ...args], {
        cwd,
        encoding: 'utf8',
      })
    const origin = join(raiz, 'origin.git')
    const otro = join(raiz, 'otro')
    const wt = join(raiz, 'wts', 'T1')
    execFileSync('git', ['init', '-q', '--bare', '-b', 'main', origin])
    execFileSync('git', ['clone', '-q', origin, otro])
    mkdirSync(join(otro, 'docs'))
    mkdirSync(join(otro, 'src'))
    writeFileSync(join(otro, 'docs/PENDIENTES.md'), '# Pendientes\n\n- uno\n')
    writeFileSync(join(otro, 'src/a.ts'), 'export const a = 1\n')
    git(otro, 'add', '.')
    git(otro, 'commit', '-q', '-m', 'inicio')
    git(otro, 'push', '-q', 'origin', 'main')
    execFileSync('git', ['clone', '-q', origin, wt])
    git(wt, 'switch', '-q', '-c', 'feat/x')
    writeFileSync(join(wt, 'docs/PENDIENTES.md'), '# Pendientes\n\n- uno\n- de la tarea\n')
    if (tambienCodigo) writeFileSync(join(wt, 'src/a.ts'), 'export const a = 2\n')
    git(wt, 'commit', '-q', '-am', 'tarea')
    git(wt, 'push', '-q', '-u', 'origin', 'feat/x')
    writeFileSync(join(otro, 'docs/PENDIENTES.md'), '# Pendientes\n\n- uno\n- de main\n')
    if (tambienCodigo) writeFileSync(join(otro, 'src/a.ts'), 'export const a = 3\n')
    git(otro, 'commit', '-q', '-am', 'main avanza')
    git(otro, 'push', '-q', 'origin', 'main')
    writeFileSync(join(raiz, 'cola/T1.md'), '---\nid: T1\nrama: feat/x\n---\n')
    return { origin, wt }
  }

  it('choque sólo en docs: une las dos partes, commitea y empuja', () => {
    const raiz = nuevaRaiz()
    const { origin, wt } = escenario(raiz, false)
    const r = correr(raiz, `fusionar_docs T1 9; echo "rc=$?"`)
    expect(r.stdout).toContain('rc=0')
    const empujado = execFileSync('git', ['show', 'feat/x:docs/PENDIENTES.md'], {
      cwd: origin,
      encoding: 'utf8',
    })
    expect(empujado).toContain('- de la tarea')
    expect(empujado).toContain('- de main')
    expect(empujado).not.toContain('<<<<<<<')
    expect(execFileSync('git', ['status', '--porcelain'], { cwd: wt, encoding: 'utf8' })).toBe('')
    expect(leer(join(raiz, 'est/log'))).toContain('sólo en docs')
  })

  it('choque también en código: deja el worktree como estaba y va la sesión', () => {
    const raiz = nuevaRaiz()
    const { origin, wt } = escenario(raiz, true)
    const antes = execFileSync('git', ['rev-parse', 'feat/x'], { cwd: origin, encoding: 'utf8' })
    const r = correr(raiz, `fusionar_docs T1 9; echo "rc=$?"`)
    expect(r.stdout).toContain('rc=1')
    expect(execFileSync('git', ['rev-parse', 'feat/x'], { cwd: origin, encoding: 'utf8' })).toBe(
      antes,
    )
    expect(execFileSync('git', ['status', '--porcelain'], { cwd: wt, encoding: 'utf8' })).toBe('')
  })
})

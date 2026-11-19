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
    "run view") if [ "$3" = --job ]; then cat "$G/log-job-$4" 2>/dev/null; else cat "$G/log-$3" 2>/dev/null; fi ;;
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

function prJson(caidos: { nombre: string; run: number; job?: number }[], sha = 'abc123') {
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

describe('reintentar_ci_ajeno', () => {
  const reintentar = (raiz: string, j: string) =>
    correr(raiz, `reintentar_ci_ajeno T1 9 '${j}'; echo "rc=$?"`).stdout

  it('relanza lo caído si sólo cayeron bloques de e2e en specs que el PR no toca, hasta dos veces por punta', () => {
    const raiz = nuevaRaiz()
    writeFileSync(join(raiz, 'gh/files'), 'src/a.tsx\ne2e/mio.spec.ts\n')
    writeFileSync(join(raiz, 'gh/log-job-1'), '  1) [escritorio] › e2e/ajeno.spec.ts:10:5 › algo\n')
    const j = prJson([{ nombre: 'e2e · bloque 2 de 4', run: 77 }])
    expect(reintentar(raiz, j)).toContain('rc=0')
    expect(leer(join(raiz, 'gh/rerun'))).toBe('77\n')
    expect(leer(join(raiz, 'est/log'))).toContain('relanzo lo caído (1 de 2 en esta punta)')
    // La misma punta, recién relanzada: espera sin abrir sesión ni relanzar de nuevo.
    expect(reintentar(raiz, j)).toContain('rc=0')
    expect(leer(join(raiz, 'gh/rerun'))).toBe('77\n')
    // Pasados los 10 minutos, el segundo relanzamiento; y pasados otros 10, el rojo de esa punta va a la sesión.
    writeFileSync(join(raiz, 'est/T1/reintento_ci_en'), '0\n')
    expect(reintentar(raiz, j)).toContain('rc=0')
    expect(leer(join(raiz, 'gh/rerun'))).toBe('77\n77\n')
    writeFileSync(join(raiz, 'est/T1/reintento_ci_en'), '0\n')
    expect(reintentar(raiz, j)).toContain('rc=1')
    // Una punta nueva vuelve a empezar la cuenta.
    expect(
      reintentar(raiz, prJson([{ nombre: 'e2e · bloque 2 de 4', run: 78 }], 'otro')),
    ).toContain('rc=0')
  })

  it('no relanza si cayó un spec que el PR toca', () => {
    const raiz = nuevaRaiz()
    writeFileSync(join(raiz, 'gh/files'), 'e2e/mio.spec.ts\n')
    writeFileSync(join(raiz, 'gh/log-job-1'), '  1) [escritorio] › e2e/mio.spec.ts:3:1 › lo mío\n')
    expect(reintentar(raiz, prJson([{ nombre: 'e2e · bloque 1 de 4', run: 5 }]))).toContain('rc=1')
    expect(leer(join(raiz, 'gh/rerun'))).toBe('')
  })

  it('no relanza si cayó algo que no es un bloque de e2e sin la firma de la máquina del CI', () => {
    const raiz = nuevaRaiz()
    writeFileSync(join(raiz, 'gh/files'), 'src/a.ts\n')
    writeFileSync(
      join(raiz, 'gh/log-job-2'),
      'FAIL src/a.test.ts > suma\nAssertionError: expected 3\n',
    )
    const j = prJson([
      { nombre: 'e2e · bloque 1 de 4', run: 5 },
      { nombre: 'Nivel 1 · tests, parte 2 de 3', run: 5, job: 2 },
    ])
    expect(reintentar(raiz, j)).toContain('rc=1')
    expect(leer(join(raiz, 'gh/rerun'))).toBe('')
  })

  it('relanza un job que no es de e2e si su log tiene la firma de la máquina del CI', () => {
    const raiz = nuevaRaiz()
    writeFileSync(join(raiz, 'gh/files'), 'supabase/migrations/20261118000000_x.sql\n')
    writeFileSync(
      join(raiz, 'gh/log-job-3'),
      'Base\tsupabase start\tError: failed to start containers: supabase_db_app\n',
    )
    const j = prJson([{ nombre: 'Base · reset, tipos, probar, lint y advisors', run: 9, job: 3 }])
    expect(reintentar(raiz, j)).toContain('rc=0')
    expect(leer(join(raiz, 'gh/rerun'))).toBe('9\n')
    expect(leer(join(raiz, 'est/log'))).toContain('(la máquina del CI)')
  })
})

describe('cayo_lo_del_pr: el rojo sin esperar a «Listo»', () => {
  const cayo = (raiz: string, j: string) =>
    correr(raiz, `cayo_lo_del_pr T1 '${j}'; echo "rc=$?"`).stdout

  it('un job que no es un bloque de e2e, caído sin la firma de la máquina, ya es el rojo del PR', () => {
    const raiz = nuevaRaiz()
    writeFileSync(join(raiz, 'gh/log-job-2'), "error TS2307: Cannot find module './soporte/x'\n")
    expect(
      cayo(raiz, prJson([{ nombre: 'Nivel 1 · lint, tipos, test:kit y mapa', run: 5, job: 2 }])),
    ).toContain('rc=0')
  })

  it('un bloque de e2e caído espera a «Listo»: relanzar lo ajeno pide la corrida terminada', () => {
    const raiz = nuevaRaiz()
    writeFileSync(join(raiz, 'gh/log-job-1'), '  1) [escritorio] › e2e/x.spec.ts:1:1 › algo\n')
    expect(cayo(raiz, prJson([{ nombre: 'e2e · bloque 1 de 4', run: 5 }]))).toContain('rc=1')
  })

  it('lo caído por la máquina del CI espera a «Listo», y su log se lee una sola vez', () => {
    const raiz = nuevaRaiz()
    writeFileSync(
      join(raiz, 'gh/log-job-3'),
      'Error: failed to start containers: supabase_db_app\n',
    )
    const j = prJson([{ nombre: 'Base · reset, tipos, probar, lint y advisors', run: 5, job: 3 }])
    expect(cayo(raiz, j)).toContain('rc=1')
    // Ya juzgado: aunque el log ahora dijera otra cosa, no se vuelve a leer.
    writeFileSync(join(raiz, 'gh/log-job-3'), 'FAIL algo\n')
    expect(cayo(raiz, j)).toContain('rc=1')
  })
})

describe('motivo de un job: log_del_job', () => {
  it('lee el log del job caído, no el de toda la corrida', () => {
    const raiz = nuevaRaiz()
    writeFileSync(join(raiz, 'gh/log-job-4'), 'lo del job\n')
    writeFileSync(join(raiz, 'gh/log-9'), 'lo del agregador\n')
    expect(correr(raiz, 'log_del_job 4 9').stdout).toBe('lo del job\n')
    expect(correr(raiz, "log_del_job '' 9").stdout).toBe('lo del agregador\n')
  })
})

describe('poner_al_dia_sin_sesion', () => {
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
    // poner_al_dia_sin_sesion commitea con la identidad del repo, como en la máquina del orquestador (en CI no hay una global).
    git(wt, 'config', 'user.name', 't')
    git(wt, 'config', 'user.email', 't@ejemplo.test')
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
    const r = correr(raiz, `poner_al_dia_sin_sesion T1 9; echo "rc=$?"`)
    expect(r.stdout).toContain('rc=0')
    const empujado = execFileSync('git', ['show', 'feat/x:docs/PENDIENTES.md'], {
      cwd: origin,
      encoding: 'utf8',
    })
    expect(empujado).toContain('- de la tarea')
    expect(empujado).toContain('- de main')
    expect(empujado).not.toContain('<<<<<<<')
    expect(execFileSync('git', ['status', '--porcelain'], { cwd: wt, encoding: 'utf8' })).toBe('')
    expect(leer(join(raiz, 'est/log'))).toContain(
      'los docs que chocaban (docs/PENDIENTES.md) unidos',
    )
  })

  it('choque también en código: deja el worktree como estaba y va la sesión', () => {
    const raiz = nuevaRaiz()
    const { origin, wt } = escenario(raiz, true)
    const antes = execFileSync('git', ['rev-parse', 'feat/x'], { cwd: origin, encoding: 'utf8' })
    const r = correr(raiz, `poner_al_dia_sin_sesion T1 9; echo "rc=$?"`)
    expect(r.stdout).toContain('rc=1')
    expect(execFileSync('git', ['rev-parse', 'feat/x'], { cwd: origin, encoding: 'utf8' })).toBe(
      antes,
    )
    expect(execFileSync('git', ['status', '--porcelain'], { cwd: wt, encoding: 'utf8' })).toBe('')
  })
})

describe('migraciones_tras_main', () => {
  const git = (cwd: string, ...args: string[]) =>
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@ejemplo.test', ...args], {
      cwd,
      encoding: 'utf8',
    })
  const M = 'supabase/migrations'

  // main con la base; la rama con dos migraciones propias; main que después integra `deMain` (o nada).
  function escenario(raiz: string, deMain: string | null) {
    const origin = join(raiz, 'origin.git')
    const otro = join(raiz, 'otro')
    const wt = join(raiz, 'wts', 'T1')
    execFileSync('git', ['init', '-q', '--bare', '-b', 'main', origin])
    execFileSync('git', ['clone', '-q', origin, otro])
    mkdirSync(join(otro, M), { recursive: true })
    writeFileSync(join(otro, M, '20261117104552_base.sql'), 'select 1;\n')
    git(otro, 'add', '.')
    git(otro, 'commit', '-q', '-m', 'inicio')
    git(otro, 'push', '-q', 'origin', 'main')
    execFileSync('git', ['clone', '-q', origin, wt])
    git(wt, 'config', 'user.name', 't')
    git(wt, 'config', 'user.email', 't@ejemplo.test')
    git(wt, 'switch', '-q', '-c', 'feat/x')
    writeFileSync(join(wt, M, '20261118100000_mia.sql'), 'select 2;\n')
    writeFileSync(join(wt, M, '20261118100005_otra.sql'), 'select 3;\n')
    git(wt, 'add', '.')
    git(wt, 'commit', '-q', '-m', 'tarea')
    git(wt, 'push', '-q', '-u', 'origin', 'feat/x')
    if (deMain) {
      writeFileSync(join(otro, M, deMain), 'select 4;\n')
      git(otro, 'add', '.')
      git(otro, 'commit', '-q', '-m', 'main integra otra migración')
      git(otro, 'push', '-q', 'origin', 'main')
    }
    writeFileSync(join(raiz, 'cola/T1.md'), '---\nid: T1\nrama: feat/x\n---\n')
    return { origin, wt }
  }
  const enLaRama = (origin: string) =>
    git(origin, 'ls-tree', '--name-only', 'feat/x', `${M}/`)
      .split('\n')
      .filter(Boolean)
      .map((r) => r.replace(`${M}/`, ''))

  it('main integró una más nueva: merge y las de la rama después, en su orden, empujadas', () => {
    const raiz = nuevaRaiz()
    // Una de main «del futuro»: las renombradas salen un segundo después de ella (el reloj de esta máquina queda atrás).
    const { origin, wt } = escenario(raiz, '20991231000000_de_main.sql')
    const r = correr(raiz, `migraciones_tras_main T1 9; echo "rc=$?"`)
    expect(r.stdout).toContain('rc=0')
    expect(enLaRama(origin)).toEqual([
      '20261117104552_base.sql',
      '20991231000000_de_main.sql',
      '20991231000001_mia.sql',
      '20991231000002_otra.sql',
    ])
    expect(git(origin, 'log', '-1', '--format=%s', 'feat/x').trim()).toBe(
      'chore(db): llevar las migraciones de la rama después de las de main',
    )
    expect(git(wt, 'status', '--porcelain')).toBe('')
    expect(leer(join(raiz, 'est/log'))).toContain(
      '2 migraciones renombradas después de las de main',
    )
  })

  it('las de la rama ya van después: no toca nada y sigue lo de siempre', () => {
    const raiz = nuevaRaiz()
    const { origin } = escenario(raiz, '20261118090000_anterior.sql')
    const antes = git(origin, 'rev-parse', 'feat/x')
    expect(correr(raiz, `migraciones_tras_main T1 9; echo "rc=$?"`).stdout).toContain('rc=1')
    expect(git(origin, 'rev-parse', 'feat/x')).toBe(antes)
  })

  it('sin migraciones nuevas en main: no toca nada', () => {
    const raiz = nuevaRaiz()
    const { origin } = escenario(raiz, null)
    const antes = git(origin, 'rev-parse', 'feat/x')
    expect(correr(raiz, `migraciones_tras_main T1 9; echo "rc=$?"`).stdout).toContain('rc=1')
    expect(git(origin, 'rev-parse', 'feat/x')).toBe(antes)
  })
})

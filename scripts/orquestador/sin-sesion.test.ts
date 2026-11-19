import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { correr, leer, nuevaRaiz } from './sin-sesion-banco'

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

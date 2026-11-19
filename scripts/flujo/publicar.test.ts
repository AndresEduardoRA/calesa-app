import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  falso,
  git,
  llamadas,
  publicar,
  publicarDesde,
  raiz,
  ramaConUnCommit,
  repo,
} from './publicar-banco'

describe('publicar.sh › lo que niega', () => {
  it('desde main no publica', () => {
    const r = publicar()
    expect(r.estado).toBe(64)
    expect(r.stderr).toContain('estás en main')
    expect(llamadas()).not.toContain('gh pr')
  })

  it('con cambios sin commitear no publica', () => {
    ramaConUnCommit()
    writeFileSync(join(repo, 'c.txt'), 'c\n')
    expect(publicar().stderr).toContain('sin commitear')
  })

  it('una rama sin commits propios no publica', () => {
    git('switch', '-q', '-c', 'feat/vacia')
    expect(publicar().stderr).toContain('no tiene commits propios')
  })

  it('con más de un commit pide el título, y un título que no es convencional se rechaza', () => {
    ramaConUnCommit()
    writeFileSync(join(repo, 'c.txt'), 'c\n')
    git('add', '.')
    git('commit', '-q', '-m', 'fix(leads): otra cosa')
    expect(publicar().stderr).toContain('pasa --titulo')
    const r = publicar('--titulo', 'Arreglos Varios')
    expect(r.estado).toBe(64)
    expect(r.stderr).toContain('no es un commit convencional')
    expect(llamadas()).not.toContain('gh pr create')
  })
})

describe('publicar.sh › el camino feliz', () => {
  it('empuja la rama, abre el PR con el asunto del commit, enciende el auto-merge y vuelve a main', () => {
    ramaConUnCommit()
    const r = publicar()
    expect(r.estado, r.stderr).toBe(0)
    expect(git('ls-remote', '--heads', 'origin', 'feat/algo')).toContain('refs/heads/feat/algo')
    expect(llamadas()).toContain(
      'gh pr create --base main --head feat/algo --title feat(leads): algo nuevo',
    )
    expect(llamadas()).toContain('gh pr merge 7 --auto --squash')
    expect(r.stdout).toContain('PR #7 integrado en main')
    expect(git('symbolic-ref', '--short', 'HEAD')).toBe('main')
    expect(r.stdout).toContain('limpiar')
  })
})

describe('publicar.sh › desde otra carpeta', () => {
  it('corrido desde fuera del repo (proyectos/) publica el repo del guion', () => {
    ramaConUnCommit()
    const r = publicarDesde(raiz, '--sin-esperar')
    expect(r.estado, r.stderr).toBe(0)
    expect(git('ls-remote', '--heads', 'origin', 'feat/algo')).toContain('refs/heads/feat/algo')
    expect(llamadas()).toContain('gh pr merge 7 --auto --squash')
  })
})

describe('publicar.sh › en un worktree', () => {
  it('desde un worktree, ya integrado, queda suelto en origin/main (main es de la principal)', () => {
    const wt = join(raiz, 'wt')
    git('worktree', 'add', '-q', '-b', 'feat/algo', wt, 'main')
    writeFileSync(join(wt, 'b.txt'), 'b\n')
    execFileSync('git', ['add', 'b.txt'], { cwd: wt })
    execFileSync(
      'git',
      [
        '-c',
        'user.name=t',
        '-c',
        'user.email=t@ejemplo.test',
        'commit',
        '-q',
        '-m',
        'feat(leads): algo nuevo',
      ],
      { cwd: wt },
    )
    const r = spawnSync('bash', [join(wt, 'scripts/flujo/publicar.sh')], {
      cwd: wt,
      encoding: 'utf8',
      env: {
        NODE_ENV: 'test',
        HOME: raiz,
        PATH: `${join(raiz, 'bin')}:${process.env['PATH'] ?? ''}`,
        ESPERA_PASO: '0',
      },
    })
    expect(r.status, r.stderr).toBe(0)
    expect(r.stdout).toContain('PR #7 integrado en main')
    const suelto = spawnSync('git', ['symbolic-ref', '-q', 'HEAD'], { cwd: wt })
    expect(suelto.status).not.toBe(0)
    expect(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: wt, encoding: 'utf8' })).toBe(
      execFileSync('git', ['rev-parse', 'origin/main'], { cwd: repo, encoding: 'utf8' }),
    )
  })
})

describe('publicar.sh › una punta ya integrada', () => {
  it('si esta misma punta ya se integró, no empuja ni abre otro PR', () => {
    ramaConUnCommit()
    falso(
      'gh',
      `case "$1 $2" in
  "auth token") exit 1 ;;
  "pr list") echo 5 ;;
esac
exit 0`,
    )
    const r = publicar('--sin-esperar')
    expect(r.estado, r.stderr).toBe(0)
    expect(r.stdout).toContain('PR #5 ya integrado')
    expect(llamadas()).not.toContain('gh pr create')
    expect(git('ls-remote', '--heads', 'origin', 'feat/algo')).toBe('')
  })

  it('con --sin-esperar sale tras encender el auto-merge, sin moverse de la rama', () => {
    ramaConUnCommit()
    const r = publicar('--sin-esperar')
    expect(r.estado, r.stderr).toBe(0)
    expect(llamadas()).toContain('gh pr merge 7 --auto --squash')
    expect(git('symbolic-ref', '--short', 'HEAD')).toBe('feat/algo')
  })
})

// La cuenta de GitHub es la del manifiesto (.proyecto/proyecto.yaml); sin manifiesto, la del remoto (el `origin` de estas pruebas es
// una ruta local: no hay cuenta, y `gh auth token` ni se pide).
describe('publicar.sh › la cuenta del manifiesto', () => {
  const manifiesto = (cuenta: string) => `esquema: proyecto/v1
proyecto: tienda
nombre: Tienda
semilla: null
repos:
  - { rol: app, nombre: tienda-app, github: ${cuenta}/tienda-app, etapa: construccion, semilla: null, puertos: { bloque: 6 } }
contratos: []
`
  function conManifiesto(texto: string) {
    mkdirSync(join(repo, 'scripts/proyecto'), { recursive: true })
    mkdirSync(join(repo, '.proyecto'))
    copyFileSync(
      resolve('scripts/proyecto/manifiesto.mjs'),
      join(repo, 'scripts/proyecto/manifiesto.mjs'),
    )
    symlinkSync(resolve('node_modules'), join(repo, 'node_modules'))
    writeFileSync(join(repo, '.gitignore'), 'node_modules\n')
    writeFileSync(join(repo, '.proyecto/proyecto.yaml'), texto)
    git('add', '.')
    git('commit', '-q', '-m', 'chore: manifiesto')
    git('push', '-q', 'origin', 'main')
  }

  it('pide el token de la cuenta del manifiesto', () => {
    conManifiesto(manifiesto('CuentaDelManifiesto'))
    ramaConUnCommit()
    const r = publicar()
    expect(r.estado, r.stderr).toBe(0)
    expect(llamadas()).toContain('gh auth token --user CuentaDelManifiesto')
  })

  it('sin manifiesto no pide ningún token (el remoto es una ruta local)', () => {
    ramaConUnCommit()
    expect(publicar().estado).toBe(0)
    expect(llamadas()).not.toContain('gh auth token')
  })

  it('un manifiesto inválido corta antes de empujar, con el campo y el comando del validador', () => {
    conManifiesto(manifiesto('Cuenta').replace('esquema: proyecto/v1', 'esquema: v0'))
    ramaConUnCommit()
    const r = publicar()
    expect(r.estado).toBe(64)
    expect(r.stderr).toContain('esquema: debe ser proyecto/v1')
    expect(r.stderr).toContain('validar_semilla.py --manifiesto')
    expect(git('ls-remote', '--heads', 'origin', 'feat/algo')).toBe('')
  })
})

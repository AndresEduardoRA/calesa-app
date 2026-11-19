import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  falso,
  git,
  llamadas,
  publicar,
  publicarConEntorno,
  raiz,
  ramaConUnCommit,
  repo,
} from './publicar-banco'

// `publicar.sh` mientras espera al CI: la rama atrasada respecto de main y el rojo que no espera a «Listo».
describe('publicar.sh › main que avanza', () => {
  it('si main avanzó y la rama quedó atrás, la pone al día por la API (update-branch) y sigue esperando', () => {
    ramaConUnCommit()
    const vueltas = join(raiz, 'vueltas')
    falso(
      'gh',
      `case "$1 $2" in
  "auth token") exit 1 ;;
  "pr create") touch "${join(raiz, 'pr-creado')}" ;;
  "pr view")
    [ -f "${join(raiz, 'pr-creado')}" ] || exit 1
    case "$*" in
      *statusCheckRollup*)
        echo x >> "${vueltas}"
        if [ "$(wc -l < "${vueltas}")" -lt 2 ]; then
          echo '{"state":"OPEN","mergeable":"MERGEABLE","mergeStateStatus":"BEHIND","statusCheckRollup":[]}'
        else
          echo '{"state":"MERGED","mergeable":"UNKNOWN","mergeStateStatus":"UNKNOWN","statusCheckRollup":[]}'
        fi ;;
      *) echo 7 ;;
    esac ;;
esac
exit 0`,
    )
    const r = publicar()
    expect(r.estado, r.stderr).toBe(0)
    expect(llamadas()).toContain('gh api -X PUT repos/{owner}/{repo}/pulls/7/update-branch')
    expect(r.stdout).toContain('rama puesta al día')
    expect(r.stdout).toContain('PR #7 integrado en main')
  })
})

describe('publicar.sh › el rojo temprano', () => {
  // gh que responde a cada vuelta con el rollup dado (el CI sigue corriendo: «Listo» todavía no está).
  const conRollup = (rollup: object[]) =>
    falso(
      'gh',
      `case "$1 $2" in
  "auth token") exit 1 ;;
  "pr create") touch "${join(raiz, 'pr-creado')}" ;;
  "pr view")
    [ -f "${join(raiz, 'pr-creado')}" ] || exit 1
    case "$*" in
      *statusCheckRollup*) echo '${JSON.stringify({ state: 'OPEN', mergeable: 'MERGEABLE', mergeStateStatus: 'BLOCKED', statusCheckRollup: rollup })}' ;;
      *) echo 7 ;;
    esac ;;
esac
exit 0`,
    )

  it('un job que no es e2e caído es el rojo, sin esperar a «Listo»', () => {
    ramaConUnCommit()
    conRollup([
      {
        __typename: 'CheckRun',
        name: 'Nivel 1 · lint, tipos, test:kit y mapa',
        conclusion: 'FAILURE',
        detailsUrl: 'u1',
      },
      { __typename: 'CheckRun', name: 'e2e · bloque 1 de 4', conclusion: null },
    ])
    const r = publicarConEntorno(repo, { ESPERA_MAX: '0' })
    expect(r.estado).toBe(1)
    expect(r.stderr).toContain('Nivel 1 · lint, tipos, test:kit y mapa')
  })

  it('un bloque de e2e caído espera a «Listo» (lo ajeno se relanza con la corrida terminada)', () => {
    ramaConUnCommit()
    conRollup([
      {
        __typename: 'CheckRun',
        name: 'e2e · bloque 2 de 4',
        conclusion: 'FAILURE',
        detailsUrl: 'u2',
      },
    ])
    const r = publicarConEntorno(repo, { ESPERA_MAX: '0' })
    expect(r.estado).toBe(75)
  })
})

describe('publicar.sh › con migraciones', () => {
  function ramaConMigracion() {
    git('switch', '-q', '-c', 'feat/algo')
    mkdirSync(join(repo, 'supabase/migrations'), { recursive: true })
    writeFileSync(join(repo, 'supabase/migrations/20261119000000_algo.sql'), 'select 1;\n')
    git('add', '.')
    git('commit', '-q', '-m', 'feat(datos): algo nuevo')
  }
  // gh: el CI en verde en la punta `abc`; `atras` commits de main que le faltan; integrado al pedir el merge.
  const conCi = (atras: number) =>
    falso(
      'gh',
      `case "$1 $2" in
  "auth token") exit 1 ;;
  "pr create") touch "${join(raiz, 'pr-creado')}" ;;
  "pr merge") case "$*" in *--squash*) touch "${join(raiz, 'integrado')}" ;; esac ;;
  "api repos/{owner}/{repo}/compare/main...abc") echo ${String(atras)} ;;
  "pr view")
    [ -f "${join(raiz, 'pr-creado')}" ] || exit 1
    case "$*" in
      *statusCheckRollup*)
        if [ -f "${join(raiz, 'integrado')}" ]; then echo '{"state":"MERGED","statusCheckRollup":[]}'
        else echo '{"state":"OPEN","mergeable":"MERGEABLE","mergeStateStatus":"CLEAN","headRefOid":"abc","statusCheckRollup":[{"__typename":"CheckRun","name":"Listo · todo en verde","conclusion":"SUCCESS"}]}'; fi ;;
      *) echo 7 ;;
    esac ;;
esac
exit 0`,
    )

  it('no lleva auto-merge: en verde y al día con main, lo integra la espera con la punta probada', () => {
    ramaConMigracion()
    conCi(0)
    const r = publicar()
    expect(r.estado, r.stderr).toBe(0)
    expect(llamadas()).not.toContain('gh pr merge 7 --auto')
    expect(llamadas()).toContain('gh pr merge 7 --squash --match-head-commit abc')
    expect(r.stdout).toContain('PR #7 integrado en main')
  })

  it('atrás de main, lo pone al día antes de integrarlo', () => {
    ramaConMigracion()
    conCi(2)
    const r = publicarConEntorno(repo, { ESPERA_MAX: '0' })
    expect(r.estado).toBe(75)
    expect(llamadas()).toContain('gh api -X PUT repos/{owner}/{repo}/pulls/7/update-branch')
    expect(llamadas()).not.toContain('--match-head-commit')
  })

  it('sin migraciones sigue con auto-merge', () => {
    ramaConUnCommit()
    expect(publicar('--sin-esperar').estado).toBe(0)
    expect(llamadas()).toContain('gh pr merge 7 --auto --squash')
  })
})

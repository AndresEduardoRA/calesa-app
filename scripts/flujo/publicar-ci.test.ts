import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  falso,
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

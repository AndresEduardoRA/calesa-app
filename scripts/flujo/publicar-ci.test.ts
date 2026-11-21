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

// `publicar.sh` mientras espera al CI: el rojo que no espera a «Listo», la rama atrasada (nadie la pone al día) y la cola de
// integración (en la cola, sacado de ella, sin cola activa).
/** gh con el CI en verde en la punta `abc` hasta la vuelta `integraEn` (después, integrado); la cola responde por vuelta lo de `colas`
 * (la última se repite), `rules` dice si main la exige, y `corridas`/`jobs` son las corridas del grupo y sus jobs. */
function conCola({
  colas = [] as object[],
  rules = [] as object[],
  integraEn = 99,
  corridas = [] as object[],
  jobs = [] as object[],
  estado = { mergeStateStatus: 'BLOCKED' } as object,
} = {}) {
  const vueltas = join(raiz, 'vueltas')
  colas.forEach((c, i) =>
    writeFileSync(
      join(raiz, `cola-${String(i + 1)}.json`),
      JSON.stringify({ data: { repository: { pullRequest: c } } }),
    ),
  )
  const verde = JSON.stringify({
    state: 'OPEN',
    mergeable: 'MERGEABLE',
    headRefOid: 'abc',
    ...estado,
    statusCheckRollup: [
      { __typename: 'CheckRun', name: 'Listo · todo en verde', conclusion: 'SUCCESS' },
    ],
  })
  falso(
    'gh',
    `n=$(cat "${vueltas}" 2>/dev/null | wc -l)
case "$1 $2" in
  "auth token") exit 1 ;;
  "pr create") touch "${join(raiz, 'pr-creado')}" ;;
  "api repos/{owner}/{repo}/rules/branches/main") echo '${JSON.stringify(rules)}' ;;
  "api graphql")
    f="${raiz}/cola-$n.json"
    [ -f "$f" ] || f=$(ls "${raiz}"/cola-*.json 2>/dev/null | sort -V | tail -n 1)
    [ -n "$f" ] && cat "$f" ;;
  "run list") echo '${JSON.stringify(corridas)}' ;;
  "run view") echo '${JSON.stringify({ jobs })}' ;;
  "pr view")
    [ -f "${join(raiz, 'pr-creado')}" ] || exit 1
    case "$*" in
      *statusCheckRollup*)
        echo x >> "${vueltas}"
        if [ "$((n + 1))" -ge ${String(integraEn)} ]; then echo '{"state":"MERGED","statusCheckRollup":[]}'
        else echo '${verde}'; fi ;;
      *) echo 7 ;;
    esac ;;
esac
exit 0`,
  )
}
const enCola = (puesto: number) => ({
  headRefOid: 'abc',
  isInMergeQueue: true,
  mergeQueueEntry: { position: puesto, state: 'QUEUED' },
  autoMergeRequest: { enabledAt: 'x' },
  timelineItems: {
    nodes: [{ __typename: 'AddedToMergeQueueEvent', id: 'E1', createdAt: '2999-01-01T00:00:00Z' }],
  },
})
const sacado = (cuando: string, reason = 'CI_FAILURE') => ({
  headRefOid: 'abc',
  isInMergeQueue: false,
  mergeQueueEntry: null,
  autoMergeRequest: null,
  timelineItems: {
    nodes: [
      { __typename: 'AddedToMergeQueueEvent', id: 'E1', createdAt: cuando.replace(/T\d\d/, 'T00') },
      { __typename: 'RemovedFromMergeQueueEvent', id: 'S1', createdAt: cuando, reason },
    ],
  },
})

describe('publicar.sh › main que avanza', () => {
  it('con la rama atrasada (BEHIND) no pide update-branch ni integra a mano: sigue esperando hasta verlo integrado', () => {
    ramaConUnCommit()
    conCola({ integraEn: 3, estado: { mergeStateStatus: 'BEHIND' } })
    const r = publicar()
    expect(r.estado, r.stderr).toBe(0)
    expect(llamadas()).not.toContain('update-branch')
    expect(llamadas()).not.toContain('--match-head-commit')
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

describe('publicar.sh › la cola de integración', () => {
  it('con la cola activa lo dice al encender el auto-merge; en la cola dice el puesto sólo cuando cambia', () => {
    ramaConUnCommit()
    conCola({
      rules: [{ type: 'merge_queue' }],
      colas: [enCola(2), enCola(2), enCola(1)],
      integraEn: 4,
    })
    const r = publicar()
    expect(r.estado, r.stderr).toBe(0)
    expect(r.stdout).toContain(
      'en verde entra a la cola de integración, que lo prueba combinado con main y lo integra',
    )
    expect(r.stdout.match(/en la cola de integración \(puesto 2\)/g)).toHaveLength(1)
    expect(r.stdout).toContain('en la cola de integración (puesto 1)')
    expect(r.stdout).toContain('PR #7 integrado en main')
  })

  it('la cola lo saca después de empezar: sale con 1, el motivo de GitHub, el job caído del grupo y qué hacer', () => {
    ramaConUnCommit()
    conCola({
      colas: [sacado('2999-01-01T10:00:00Z', 'CI_FAILURE')],
      corridas: [
        {
          databaseId: 55,
          headBranch: 'gh-readonly-queue/main/pr-7-abc',
          createdAt: '2999-01-01T09:00:00Z',
        },
      ],
      jobs: [
        { name: 'Nivel 1 · lint, tipos, test:kit y mapa', conclusion: 'failure', databaseId: 551 },
        { name: 'Listo · todo en verde', conclusion: 'failure', databaseId: 552 },
      ],
    })
    const r = publicar()
    expect(r.estado).toBe(1)
    expect(r.stderr).toContain('✗ la cola de integración sacó el PR #7: CI_FAILURE')
    expect(r.stderr).toContain(
      '· Nivel 1 · lint, tipos, test:kit y mapa  gh run view --job 551 --log-failed',
    )
    expect(r.stderr).not.toContain('552')
    expect(r.stderr).toContain('pnpm exec supabase migration new')
    expect(r.stderr).toContain('git merge')
    expect(llamadas()).not.toContain('update-branch')
  })

  it('una salida de antes de esta corrida no cuenta: sigue esperando', () => {
    ramaConUnCommit()
    conCola({ colas: [sacado('2000-01-01T10:00:00Z')], integraEn: 3 })
    const r = publicar()
    expect(r.estado, r.stderr).toBe(0)
    expect(r.stderr).not.toContain('sacó')
    expect(r.stdout).toContain('PR #7 integrado en main')
  })

  it('sin cola activa lo dice y sigue con el auto-merge', () => {
    ramaConUnCommit()
    conCola({ integraEn: 2 })
    const r = publicar()
    expect(r.estado, r.stderr).toBe(0)
    expect(llamadas()).toContain('gh pr merge 7 --auto --squash')
    expect(r.stdout).toContain('main no exige la cola de integración: entra sin probarse combinado')
  })
})

describe('publicar.sh › con migraciones', () => {
  it('también enciende el auto-merge y no integra a mano (el orden lo valida el CI del grupo)', () => {
    git('switch', '-q', '-c', 'feat/algo')
    mkdirSync(join(repo, 'supabase/migrations'), { recursive: true })
    writeFileSync(join(repo, 'supabase/migrations/20261119000000_algo.sql'), 'select 1;\n')
    git('add', '.')
    git('commit', '-q', '-m', 'feat(datos): algo nuevo')
    conCola({ integraEn: 3 })
    const r = publicar()
    expect(r.estado, r.stderr).toBe(0)
    expect(llamadas()).toContain('gh pr merge 7 --auto --squash')
    expect(llamadas()).not.toContain('--match-head-commit')
    expect(llamadas()).not.toContain('--disable-auto')
    expect(llamadas()).not.toContain('update-branch')
  })
})

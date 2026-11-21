import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

// integracion.sh: el orquestador y la cola de integración. Se carga con `source` (con sin-sesion.sh de verdad, para `caidos_ajenos` y
// `finales_de_logs`) en un bash con lo mínimo de orquestador.sh: estado en archivos, `log` a un archivo, `a_arreglar`,
// `migraciones_tras_main` y `log_del_job` falsos, y un `gh` falso que responde desde archivos de gh/ y anota lo que se le pide.
const ORQ = resolve('scripts/orquestador')
const raices: string[] = []
afterAll(() => {
  for (const r of raices) rmSync(r, { recursive: true, force: true })
})

function nuevaRaiz() {
  const raiz = mkdtempSync(join(tmpdir(), 'integracion-'))
  raices.push(raiz)
  for (const d of ['est', 'gh']) mkdirSync(join(raiz, d))
  return raiz
}

function correr(raiz: string, cuerpo: string) {
  const preludio = `
set -uo pipefail
EST=${JSON.stringify(join(raiz, 'est'))}; ORQ=${JSON.stringify(ORQ)}; REPO=${JSON.stringify(raiz)}; REPO_GH=o/r; WTS=/nada
G=${JSON.stringify(join(raiz, 'gh'))}
log() { printf '%s\\n' "$*" >>"$EST/log"; }
est_get() { cat "$EST/$1/$2" 2>/dev/null || true; }
est_set() { mkdir -p "$EST/$1"; printf '%s\\n' "$3" >"$EST/$1/$2"; }
gh() {
  printf '%s\\n' "$*" | head -n 1 >>"$G/llamadas"
  case "$*" in
    "api graphql"*) local n; n=$(sed -nE 's/.*-F n=([0-9]+).*/\\1/p' <<<"$*" | head -n 1); cat "$G/cola-$n.json" 2>/dev/null || return 1 ;;
    "run list"*) cat "$G/corridas.json" 2>/dev/null ;;
    "run view"*) cat "$G/jobs.json" 2>/dev/null ;;
    "api --paginate repos/{owner}/{repo}/pulls/"*) cat "$G/files" 2>/dev/null ;;
    "pr merge"*) echo "$*" >>"$G/merge" ;;
  esac
}
ghr() { gh "$@"; }
source ${JSON.stringify(join(ORQ, 'sin-sesion.sh'))}
log_del_job() { cat "$G/log-$1" 2>/dev/null; }
migraciones_tras_main() { [ -f "$G/migraciones" ] && echo "$1 $2" >>"$G/renombradas"; [ -f "$G/migraciones" ]; }
poner_al_dia_sin_sesion() { echo "$*" >>"$G/al-dia"; return 1; }
a_arreglar() { printf '%s|%s\\n' "\${3:-}" "$(head -n 1 <<<"$2")" >>"$G/arreglar"; printf '%s\\n' "$2" >"$G/motivo.md"; }
source ${JSON.stringify(join(ORQ, 'integracion.sh'))}
`
  return spawnSync('bash', ['-c', preludio + cuerpo], { encoding: 'utf8' })
}

const leer = (f: string) => (existsSync(f) ? readFileSync(f, 'utf8') : '')
const lineas = (f: string) => leer(f).trim().split('\n').filter(Boolean)

type Cola = {
  enCola?: boolean
  puesto?: number
  autoMerge?: boolean
  sha?: string
  entrada?: string
  salida?: { id: string; cuando: string; motivo?: string }
}
/** La respuesta de GraphQL de GitHub para el PR `n`. */
function cola(raiz: string, n: number, c: Cola) {
  const nodos = [
    ...(c.entrada ? [{ __typename: 'AddedToMergeQueueEvent', id: 'E', createdAt: c.entrada }] : []),
    ...(c.salida
      ? [
          {
            __typename: 'RemovedFromMergeQueueEvent',
            id: c.salida.id,
            createdAt: c.salida.cuando,
            reason: c.salida.motivo ?? 'CI_FAILURE',
          },
        ]
      : []),
  ]
  writeFileSync(
    join(raiz, `gh/cola-${String(n)}.json`),
    JSON.stringify({
      data: {
        repository: {
          pullRequest: {
            headRefOid: c.sha ?? 'abc',
            isInMergeQueue: c.enCola ?? false,
            mergeQueueEntry: c.enCola ? { position: c.puesto ?? 1, state: 'QUEUED' } : null,
            autoMergeRequest: c.autoMerge ? { enabledAt: 'x' } : null,
            timelineItems: { nodes: nodos },
          },
        },
      },
    }),
  )
}
const atender = (raiz: string, id = 'T1', pr = 9) =>
  correr(raiz, `atender_la_cola_de_integracion ${id} ${String(pr)} '{}'`)
/** La cola sacó al PR 9 (punta abc) con la corrida 55 del grupo y estos jobs. */
function sacado(raiz: string, jobs: object[], id = 'S1') {
  cola(raiz, 9, {
    entrada: '2026-11-20T10:00:00Z',
    salida: { id, cuando: '2026-11-20T10:30:00Z', motivo: 'CI_FAILURE' },
  })
  writeFileSync(
    join(raiz, 'gh/corridas.json'),
    JSON.stringify([
      { databaseId: 55, headBranch: 'gh-readonly-queue/main/pr-9-abc', createdAt: 'x' },
    ]),
  )
  writeFileSync(join(raiz, 'gh/jobs.json'), JSON.stringify({ jobs }))
}
const job = (name: string, databaseId: number, conclusion = 'failure') => ({
  name,
  databaseId,
  conclusion,
})

describe('atender_la_cola_de_integracion › en la cola y el auto-merge', () => {
  it('en la cola: guarda la punta, escribe el puesto al log sólo cuando cambia; ni merge ni PUT', () => {
    const raiz = nuevaRaiz()
    cola(raiz, 9, { enCola: true, puesto: 3, autoMerge: true, entrada: '2026-11-20T10:00:00Z' })
    atender(raiz)
    atender(raiz)
    cola(raiz, 9, { enCola: true, puesto: 1, autoMerge: true, entrada: '2026-11-20T10:00:00Z' })
    atender(raiz)
    expect(leer(join(raiz, 'est/T1/cola_sha')).trim()).toBe('abc')
    const log = lineas(join(raiz, 'est/log'))
    expect(log).toEqual([
      'T1: el PR #9 en la cola de integración (puesto 3)',
      'T1: el PR #9 en la cola de integración (puesto 1)',
    ])
    expect(leer(join(raiz, 'gh/merge'))).toBe('')
    expect(leer(join(raiz, 'gh/llamadas'))).not.toMatch(/-X PUT|update-branch/)
  })

  it('fuera de la cola y sin auto-merge: lo enciende una sola vez por punta', () => {
    const raiz = nuevaRaiz()
    cola(raiz, 9, { autoMerge: false })
    atender(raiz)
    atender(raiz)
    expect(lineas(join(raiz, 'gh/merge'))).toEqual(['pr merge 9 --auto --squash'])
    expect(leer(join(raiz, 'est/T1/cola_sha')).trim()).toBe('abc')
    // Una punta nueva (un arreglo empujado): otra vez.
    cola(raiz, 9, { autoMerge: false, sha: 'def' })
    atender(raiz)
    expect(lineas(join(raiz, 'gh/merge'))).toHaveLength(2)
  })
})

describe('atender_la_cola_de_integracion › sacado de la cola', () => {
  it('sacado con un job propio en rojo: a arreglo como choque, con el motivo de la cola y el nombre del job', () => {
    const raiz = nuevaRaiz()
    sacado(raiz, [job('Nivel 1 · tests, parte 2 de 3', 551), job('Listo · todo en verde', 552)])
    writeFileSync(join(raiz, 'gh/log-551'), 'AssertionError: expected 1 to be 2\n')
    atender(raiz)
    expect(lineas(join(raiz, 'gh/arreglar'))).toEqual([
      'choque|La cola de integración sacó el PR #9: el CI del grupo (combinado con main y los PR de delante) cayó: Nivel 1 · tests, parte 2 de 3. Motivo de GitHub: CI_FAILURE.',
    ])
    const motivo = leer(join(raiz, 'gh/motivo.md'))
    expect(motivo).toContain('https://github.com/o/r/actions/runs/55')
    expect(motivo).toContain('### Final del log de «Nivel 1 · tests, parte 2 de 3»')
    expect(motivo).toContain('AssertionError: expected 1 to be 2')
    expect(motivo).not.toContain('Listo')
    expect(leer(join(raiz, 'gh/merge'))).toBe('')
  })

  it('sacado con sus migraciones antes de una de main: las renombra y empuja sin sesión', () => {
    const raiz = nuevaRaiz()
    sacado(raiz, [job('Nivel 1 · lint, tipos, test:kit y mapa', 551)])
    writeFileSync(join(raiz, 'gh/migraciones'), '')
    atender(raiz)
    expect(lineas(join(raiz, 'gh/renombradas'))).toEqual(['T1 9'])
    expect(leer(join(raiz, 'gh/arreglar'))).toBe('')
    expect(leer(join(raiz, 'est/log'))).toContain('renombradas y empujadas')
  })

  it('sacado por la máquina del CI: lo vuelve a encolar; con el tope agotado en esa punta, a arreglo', () => {
    const raiz = nuevaRaiz()
    writeFileSync(join(raiz, 'gh/log-551'), 'Error response from daemon: toomanyrequests\n')
    sacado(raiz, [job('Base · reset, tipos, probar, lint y advisors', 551)], 'S1')
    atender(raiz)
    expect(lineas(join(raiz, 'gh/merge'))).toEqual(['pr merge 9 --auto --squash'])
    expect(leer(join(raiz, 'est/log'))).toContain(
      'la cola de integración sacó el PR #9 por algo ajeno (Base · reset, tipos, probar, lint y advisors (la máquina del CI); 1 de 2 en esta punta): lo vuelvo a encolar',
    )
    sacado(raiz, [job('Base · reset, tipos, probar, lint y advisors', 551)], 'S2')
    atender(raiz)
    expect(lineas(join(raiz, 'gh/merge'))).toHaveLength(2)
    sacado(raiz, [job('Base · reset, tipos, probar, lint y advisors', 551)], 'S3')
    atender(raiz)
    expect(lineas(join(raiz, 'gh/merge'))).toHaveLength(2)
    expect(lineas(join(raiz, 'gh/arreglar'))[0]).toMatch(
      /^choque\|La cola de integración sacó el PR #9/,
    )
  })

  it('sacado sin una corrida del grupo en rojo: lo vuelve a encolar una vez por punta; a la segunda, a arreglo', () => {
    const raiz = nuevaRaiz()
    cola(raiz, 9, {
      entrada: '2026-11-20T10:00:00Z',
      salida: { id: 'S1', cuando: '2026-11-20T10:30:00Z', motivo: 'MANUAL' },
    })
    atender(raiz)
    expect(lineas(join(raiz, 'gh/merge'))).toEqual(['pr merge 9 --auto --squash'])
    expect(leer(join(raiz, 'est/log'))).toContain('sin un job en rojo (MANUAL)')
    cola(raiz, 9, {
      entrada: '2026-11-20T11:00:00Z',
      salida: { id: 'S2', cuando: '2026-11-20T11:30:00Z', motivo: 'MANUAL' },
    })
    atender(raiz)
    expect(lineas(join(raiz, 'gh/merge'))).toHaveLength(1)
    expect(lineas(join(raiz, 'gh/arreglar'))).toEqual([
      'choque|La cola de integración sacó el PR #9: el CI del grupo (combinado con main y los PR de delante) cayó: ningún job en rojo a la vista. Motivo de GitHub: MANUAL.',
    ])
  })
})

describe('atender_la_cola_de_integracion › salidas que no se atienden', () => {
  it('la misma salida no se atiende dos veces; la de una punta vieja sólo enciende el auto-merge', () => {
    const raiz = nuevaRaiz()
    sacado(raiz, [job('Nivel 1 · tests, parte 1 de 3', 551)])
    atender(raiz)
    atender(raiz)
    expect(lineas(join(raiz, 'gh/arreglar'))).toHaveLength(1)

    // Otra tarea: entró con la punta abc, la sacaron y una sesión empujó def; la salida es de abc.
    const otra = nuevaRaiz()
    mkdirSync(join(otra, 'est/T1'))
    writeFileSync(join(otra, 'est/T1/cola_sha'), 'abc\n')
    cola(otra, 9, {
      sha: 'def',
      entrada: '2026-11-20T10:00:00Z',
      salida: { id: 'S1', cuando: '2026-11-20T10:30:00Z' },
    })
    atender(otra)
    atender(otra)
    expect(leer(join(otra, 'gh/arreglar'))).toBe('')
    expect(lineas(join(otra, 'gh/merge'))).toEqual(['pr merge 9 --auto --squash'])
    expect(leer(join(otra, 'est/T1/cola_salida_vista')).trim()).toBe('S1')
  })

  it('una salida anterior a la última entrada no cuenta (volvió a entrar)', () => {
    const raiz = nuevaRaiz()
    cola(raiz, 9, {
      autoMerge: true,
      entrada: '2026-11-20T11:00:00Z',
      salida: { id: 'S1', cuando: '2026-11-20T10:30:00Z' },
    })
    atender(raiz)
    expect(leer(join(raiz, 'gh/arreglar'))).toBe('')
    expect(leer(join(raiz, 'gh/merge'))).toBe('')
  })

  it('si GitHub no responde, no hace nada (lo intenta en la vuelta siguiente)', () => {
    const raiz = nuevaRaiz()
    expect(atender(raiz).status).toBe(0)
    expect(leer(join(raiz, 'gh/merge'))).toBe('')
    expect(leer(join(raiz, 'est/log'))).toBe('')
  })
})

describe('atender_la_cola_de_integracion › dos PR a la vez', () => {
  it('dos PR en la cola a la vez hasta integrarse: como mucho un --auto cada uno, ningún update-branch ni rerun', () => {
    const raiz = nuevaRaiz()
    const vuelta = (a: Cola | null, b: Cola) => {
      if (a) {
        cola(raiz, 1, { sha: 'uno', ...a })
        atender(raiz, 'T1', 1)
      }
      cola(raiz, 2, { sha: 'dos', ...b })
      atender(raiz, 'T2', 2)
    }
    // Recién en verde: T1 ya con auto-merge (publicar.sh), T2 todavía sin.
    vuelta({ autoMerge: true }, { autoMerge: false })
    vuelta(
      { enCola: true, puesto: 1, autoMerge: true, entrada: '2026-11-20T10:00:00Z' },
      { enCola: true, puesto: 2, autoMerge: true, entrada: '2026-11-20T10:01:00Z' },
    )
    // T1 se integra (vigilar_prs ya no la atiende); T2 sube al primer puesto.
    vuelta(null, { enCola: true, puesto: 1, autoMerge: true, entrada: '2026-11-20T10:01:00Z' })
    const merges = lineas(join(raiz, 'gh/merge'))
    expect(merges.filter((m) => m.startsWith('pr merge 1 '))).toHaveLength(0)
    expect(merges.filter((m) => m.startsWith('pr merge 2 '))).toEqual([
      'pr merge 2 --auto --squash',
    ])
    const llamadas = leer(join(raiz, 'gh/llamadas'))
    expect(llamadas).not.toContain('update-branch')
    expect(llamadas).not.toContain('rerun')
    expect(leer(join(raiz, 'gh/arreglar'))).toBe('')
  })
})

describe('guarda', () => {
  it('ningún guion del flujo ni del orquestador trae main a un PR por la API (update-branch)', () => {
    const guiones = ['scripts/flujo', 'scripts/orquestador'].flatMap((d) =>
      readdirSync(d)
        .filter((n) => n.endsWith('.sh'))
        .map((n) => join(d, n)),
    )
    expect(guiones.length).toBeGreaterThan(5)
    expect(guiones.filter((g) => readFileSync(g, 'utf8').includes('update-branch'))).toEqual([])
  })
})

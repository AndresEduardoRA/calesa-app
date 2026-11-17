import { existsSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { cuerpo, escenario, TIEMPO } from './prueba/escenario'

// El cierre de la tanda (cierre-tanda.sh y cierre-main.sh, README.md › «El cierre de la tanda»): con la cola quieta y al menos
// CIERRE_MIN_TAREAS integradas desde el último cierre, el espejo dispara una vez por sha el e2e de main y, según salga, encola la tarea
// urgente de main en rojo o el cierre (con el resumen de la tanda). Con el gh falso (prueba/escenario.ts): su `ci` hace de Actions.

const MAIN = 'a'.repeat(40)
const OTRO = 'b'.repeat(40)
const FECHA = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date())

type T = ReturnType<typeof escenario>

/** Un repo en mantenimiento con el cierre encendido, contado desde el epoch 1, y main en MAIN. */
function enMantenimiento(local = '') {
  const t = escenario(`CIERRE_TANDA="si"\n${local}`)
  const manifiesto = join(t.repo, '.proyecto/proyecto.yaml')
  writeFileSync(
    manifiesto,
    readFileSync(manifiesto, 'utf8').replace(
      'tienda-app, github: Cuenta/tienda-app, etapa: construccion',
      'tienda-app, github: Cuenta/tienda-app, etapa: mantenimiento',
    ),
  )
  t.ponerEst('.', '.cierre-desde', '1')
  t.cambiarGh((g) => {
    g.ci = { main: MAIN, corridas: [] }
    g.siguiente = 100 // lo que crea el orquestador, desde el #100 (nuevos)
  })
  return t
}

/** Las tareas (número → rama y campos extra), en la cola e integradas el 2026-01-01 con su PR 30+n y su issue cerrado; `otras`
 * (número → rama y estado), en la cola con ese estado. Termina con una vuelta del espejo. */
function integradas(
  t: T,
  tareas: Record<number, [string, string?]>,
  otras: Record<number, [string, string]> = {},
) {
  for (const [n, [rama, extra]] of Object.entries(tareas)) t.issue(Number(n), cuerpo(rama, extra))
  for (const [n, [rama]] of Object.entries(otras)) t.issue(Number(n), cuerpo(rama))
  t.orq('espejo')
  for (const [n, [, estado]] of Object.entries(otras)) t.ponerEst(`T${n}`, 'estado', estado)
  for (const n of Object.keys(tareas)) {
    t.ponerEst(`T${n}`, 'estado', 'integrado')
    t.ponerEst(`T${n}`, 'integrado_en', '2026-01-01 10:00:00')
    t.ponerEst(`T${n}`, 'pr', String(30 + Number(n)))
    t.ponerEst(`T${n}`, 'issue_cerrado', '2026-01-01T14:00:00Z')
  }
  t.cambiarGh((g) => {
    for (const n of Object.keys(tareas)) g.issues[n]!.state = 'closed'
  })
  t.orq('espejo')
}

const TRES: Record<number, [string, string?]> = {
  11: ['feat/once'],
  12: ['feat/doce'],
  13: ['feat/trece'],
}
const corridas = (t: T) => t.gh().ci?.corridas ?? []
const terminar = (t: T, conclusion: string) =>
  t.cambiarGh((g) => {
    for (const c of g.ci!.corridas) Object.assign(c, { status: 'completed', conclusion })
  })
const nuevos = (t: T) => Object.values(t.gh().issues).filter((i) => i.number >= 100)

it(
  'la primera vez sólo empieza a contar; con menos de 3 tareas o con una trabada no cierra (y lo dice una vez)',
  () => {
    const t = enMantenimiento()
    rmSync(join(t.datos, 'estado/.cierre-desde'))
    integradas(t, TRES)
    expect(corridas(t)).toEqual([])
    expect(t.log()).toContain('el cierre de la tanda cuenta desde ahora')

    const dos = enMantenimiento()
    integradas(dos, { 11: ['feat/once'], 12: ['feat/doce'] })
    expect(corridas(dos)).toEqual([])

    const trabada = enMantenimiento()
    integradas(trabada, TRES, { 14: ['feat/catorce', 'trabada'] })
    trabada.orq('espejo')
    expect(corridas(trabada)).toEqual([])
    expect(trabada.log().match(/la tanda no se cierra con tareas trabadas: T14/g)).toHaveLength(1)
  },
  TIEMPO,
)

it(
  'con 3 y la cola quieta › dispara el e2e de main una sola vez por sha y lo avisa',
  () => {
    const t = enMantenimiento()
    integradas(t, TRES)
    expect(corridas(t)).toHaveLength(1)
    expect(corridas(t)[0]!.args).toEqual([
      'ci.yml',
      '--ref',
      'main',
      '-f',
      'e2e=true',
      '-f',
      'proyectos=escritorio',
    ])
    expect(t.est('.', '.cierre-run')).toMatch(new RegExp(`^${MAIN} 9000 \\d+$`))
    expect(t.log()).toContain('AVISO · Verifico main antes de cerrar la tanda')
    t.orq('espejo')
    expect(corridas(t)).toHaveLength(1)
    expect(nuevos(t)).toEqual([])
    // main avanzó: otra verificación, sobre el sha nuevo.
    t.cambiarGh((g) => {
      g.ci!.main = OTRO
    })
    t.orq('espejo')
    expect(corridas(t).map((c) => c.headSha)).toEqual([MAIN, OTRO])
  },
  TIEMPO,
)

it(
  'main en rojo › encola una vez la tarea urgente con la corrida y los caídos; el cierre espera',
  () => {
    const t = enMantenimiento()
    integradas(t, TRES)
    terminar(t, 'failure')
    t.cambiarGh((g) => {
      g.ci!.artefactos = {
        '9000': {
          'e2e-bloque-2-intento-1/e2e-fallos/x/caidos.txt': 'e2e/leads.spec.ts:12 › crea\n',
        },
      }
    })
    t.orq('espejo')
    const [rojo, ...otros] = nuevos(t)
    expect(otros).toEqual([])
    expect(rojo!.labels).toEqual(['cola', 'cola:urgente'])
    expect(rojo!.title).toBe('dejar verde el e2e de main (aaaaaaa) antes de cerrar la tanda')
    expect(rojo!.body).toMatch(/^```yaml\ntitulo: dejar verde/)
    expect(rojo!.body).toContain('\ncierre: verificar\n')
    expect(rojo!.body).toContain('https://github.com/Cuenta/tienda-app/actions/runs/9000')
    expect(rojo!.body).toContain('- e2e/leads.spec.ts:12 › crea')
    expect(rojo!.body).not.toContain('{{')
    expect(t.est('.', '.cierre-rojo')).toBe(MAIN)
    // Aunque la cola vuelva a quedar quieta (la omitiste), no se repite para el mismo sha.
    t.ponerEst(`T${rojo!.number}`, 'estado', 'omitida')
    t.orq('espejo')
    expect(nuevos(t)).toHaveLength(1)
    expect(corridas(t)).toHaveLength(1)
  },
  TIEMPO,
)

it(
  'main en verde › publica el cierre con la etiqueta cierre, las tareas y el resumen, una sola vez',
  () => {
    const t = enMantenimiento()
    integradas(t, TRES)
    terminar(t, 'success')
    t.orq('espejo')
    const [cierre, ...otros] = nuevos(t)
    expect(otros).toEqual([])
    expect(cierre!.labels).toEqual(['cola', 'cierre'])
    expect(t.gh().etiquetas).toContain('cierre')
    expect(cierre!.title).toBe(`cerrar la tanda del ${FECHA}`)
    // El bloque yaml es sólo el frontmatter: lo de varias líneas (las tareas, el resumen) no se cuela en él.
    expect(cierre!.body).toMatch(/^```yaml\ntitulo: cerrar la tanda del [-\d]+\nrama: /)
    for (const linea of [
      `rama: chore/cerrar-tanda-${FECHA}`,
      'conflicto: flujo docs',
      'nivel: capaz',
      'cierre: tanda',
    ])
      expect(cierre!.body).toContain(`\n${linea}\n`)
    expect(cierre!.body).toContain(`main\` salió verde en \`${MAIN}\``)
    expect(cierre!.body).toContain('https://github.com/Cuenta/tienda-app/actions/runs/9000')
    expect(cierre!.body).toContain('- T11 · PR #41 · tarea de feat/once')
    expect(cierre!.body).toContain('- T13 · PR #43 · tarea de feat/trece')
    expect(cierre!.body).toContain('### Totales')
    expect(cierre!.body).not.toContain('{{')
    expect(t.est('.', '.cierre-publicado')).toBe(`T${cierre!.number}`)
    expect(t.log()).toContain('AVISO · Tanda cerrándose · 3 tareas, cierre en la cola')
    t.orq('espejo')
    expect(nuevos(t)).toHaveLength(1)
  },
  TIEMPO,
)

it(
  'al integrarse el cierre › la tanda siguiente cuenta desde ahora y se podan los transcriptos de la tanda',
  () => {
    const t = enMantenimiento()
    integradas(t, TRES)
    const est = join(t.datos, 'estado/T11')
    for (const f of ['plan.jsonl', 'sesion-1-tarea.jsonl', 'sesion-1-tarea.jsonl.err', 'plan.md'])
      writeFileSync(join(est, f), 'x'.repeat(2048))
    writeFileSync(join(est, 'prompt-1-tarea.md'), 'el prompt\n')
    symlinkSync(join(est, 'sesion-1-tarea.jsonl'), join(est, 'sesion-actual.jsonl'))
    terminar(t, 'success')
    t.orq('espejo')
    const n = nuevos(t)[0]!.number
    t.ponerEst(`T${n}`, 'estado', 'esperando_ci')
    t.ponerEst(`T${n}`, 'pr', '50')
    t.cambiarGh((g) => {
      g.issues[n]!.state = 'closed'
      g.prs['Cuenta/tienda-app'] = [
        { number: 50, rama: `chore/cerrar-tanda-${FECHA}`, estado: 'MERGED' },
      ]
    })
    const antes = Math.floor(Date.now() / 1000)
    t.orq('espejo')
    expect(t.est(`T${n}`, 'estado')).toBe('integrado')
    expect(Number(t.est('.', '.cierre-desde'))).toBeGreaterThanOrEqual(antes)
    for (const f of ['.cierre-run', '.cierre-publicado']) expect(t.est('.', f)).toBe('')
    for (const f of [
      'plan.jsonl',
      'sesion-1-tarea.jsonl',
      'sesion-1-tarea.jsonl.err',
      'sesion-actual.jsonl',
    ])
      expect(existsSync(join(est, f))).toBe(false)
    for (const f of ['plan.md', 'prompt-1-tarea.md', 'estado', 'pr'])
      expect(existsSync(join(est, f))).toBe(true)
    expect(t.log()).toMatch(
      /tanda cerrada: podé 3 transcriptos de sus sesiones \(6\.0K liberados\)/,
    )
    // Las tres ya son de la tanda cerrada: no hay otra que cerrar.
    t.orq('espejo')
    expect(corridas(t)).toHaveLength(1)
  },
  TIEMPO,
)

it(
  'no cuentan las tareas con cierre: ni las del flujo del kit, las de dependencias o las de la noche roja',
  () => {
    const t = enMantenimiento()
    integradas(t, {
      11: ['feat/once'],
      12: ['feat/doce'],
      13: ['chore/mejora-del-flujo', 'cierre: mejora\n'],
      14: ['chore/flujo-del-kit-2026-w46'],
      15: ['chore/dependencias-2026-11'],
      16: ['fix/e2e-noche-16'],
      17: ['fix/main-en-rojo-aaaaaaa', 'cierre: verificar\n'],
    })
    expect(corridas(t)).toEqual([])
  },
  TIEMPO,
)

it(
  'un issue cierre abierto (de quien puede escribir) frena otro; el de alguien sin permiso, no',
  () => {
    const t = enMantenimiento()
    t.issue(9, 'un cierre a mano', ['cierre'])
    integradas(t, TRES)
    t.orq('espejo')
    expect(corridas(t)).toEqual([])
    expect(t.log().match(/hay un issue cierre abierto: no encolo otro cierre/g)).toHaveLength(1)

    t.cambiarGh((g) => {
      g.issues[9]!.autor = 'NONE'
    })
    t.orq('espejo')
    expect(corridas(t)).toHaveLength(1)
  },
  TIEMPO,
)

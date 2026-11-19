// Las carreras de aplicar una plantilla de V1 (docs/COTIZADOR.md › «Plantillas de V1»): dos aplicar a la vez en el mismo origen, y aplicar contra `tono_crear` que
// llena el catálogo, en los dos órdenes. Cada una abre una transacción de A y deja a B esperando un candado (el arnés de `scripts/carreras.mjs`): si B no espera,
// la carrera no se probó. Trabaja en orígenes y colores propios (prefijo «Carreras»): `limpiar()` los borra, y los borradores caen con su origen.
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { PERSONAS, PREFIJO } from './terreno.mjs'

const { configura: duena } = PERSONAS

const oficina = JSON.parse(
  readFileSync('src/modules/cotizaciones/entities/plantillas-de-v1/oficina.json', 'utf8'),
)

// El paquete de Oficina con colores propios de las carreras (los borradores sólo validan la forma: sus tonos no tienen que existir todavía).
const paquete = (colores) => ({
  definicion: oficina.formula.definicion,
  params: oficina.formula.params,
  diseno: oficina.formula.diseno,
  tarjeta: oficina.tarjeta,
  nota: 'Empezado desde la plantilla de V1 «Oficina».',
  reusar: [],
  crear: colores.map((c) => ({
    id: randomUUID(),
    nombre: `${PREFIJO} pv1 ${c}`,
    hex: '#123456',
    clave: `carreras_pv1_${c}`,
  })),
})

let numero = 0
async function origen(db, etiqueta) {
  numero += 1
  const {
    rows: [o],
  } = await db.query(`insert into public.origenes (clave, nombre) values ($1, $2) returning id`, [
    `carreras_pv1_${etiqueta}_${numero}`,
    `${PREFIJO} pv1 ${etiqueta} ${numero}`,
  ])
  return o.id
}

const contar = async (db, patron) =>
  Number(
    (await db.query(`select count(*)::int as n from public.tonos where clave like $1`, [patron]))
      .rows[0].n,
  )
const todos = async (db) =>
  Number((await db.query(`select count(*)::int as n from public.tonos`)).rows[0].n)
const borradores = async (db, o) =>
  (
    await db.query(
      `select (select count(*) from public.formulas where origen_id = $1 and estado = 'borrador')::int as f,
              (select count(*) from public.plantillas_tarjeta where origen_id = $1 and estado = 'borrador')::int as t`,
      [o],
    )
  ).rows[0]

// El catálogo hasta `n` colores, con rellenos propios (como postgres, por encima del candado: es el terreno).
async function llenarHasta(db, n) {
  let i = 0
  while ((await todos(db)) < n) {
    i += 1
    await db.query(
      `insert into public.tonos (clave, nombre, hex, claro_fondo, claro_borde, claro_tinta, oscuro_fondo, oscuro_borde, oscuro_tinta)
       values ($1, $2, '#fff7d6', '#fff7d6', '#e9d27a', '#1b2130', '#3e3f3c', '#797251', '#f2f4f8')`,
      [`carreras_pv1_relleno_${numero}_${i}`, `${PREFIJO} pv1 relleno ${numero} ${i}`],
    )
  }
}
const vaciarRellenos = (db) =>
  db.query(`delete from public.tonos where clave like 'carreras\\_pv1\\_%'`)

const aplicar = `public.cotizacion_paquete_aplicar($1::uuid, $2::jsonb, null, null)`
const crearColor = `public.tono_crear($1::uuid, $2, '#654321')`

export async function carrerasDePlantillasDeV1({ orquesta, carrera, espero }) {
  console.log('Dos aplicar una plantilla de V1 a la vez en el mismo origen')
  {
    await vaciarRellenos(orquesta)
    const o = await origen(orquesta, 'dos')
    const r = await carrera(orquesta, {
      a: { persona: duena, sql: aplicar, args: [o, JSON.stringify(paquete(['a', 'b']))] },
      b: { persona: duena, sql: aplicar, args: [o, JSON.stringify(paquete(['a', 'b']))] },
    })
    const b = await borradores(orquesta, o)
    espero(
      'gana el primero: el segundo da el PT409 de crear el borrador, hay un borrador de cada uno y los colores no se duplican',
      r.a.ok &&
        r.b.codigo === 'PT409' &&
        r.b.mensaje.startsWith('Ya hay un borrador') &&
        b.f === 1 &&
        b.t === 1 &&
        (await contar(orquesta, 'carreras\\_pv1\\_a')) === 1 &&
        (await contar(orquesta, 'carreras\\_pv1\\_b')) === 1,
      { a: r.a, b: r.b, borradores: b },
    )
  }

  console.log('Aplicar una plantilla de V1 mientras otra persona llena el catálogo de colores')
  {
    await vaciarRellenos(orquesta)
    const tope = 48
    await llenarHasta(orquesta, tope - 2)
    const o = await origen(orquesta, 'primero')
    const r = await carrera(orquesta, {
      a: { persona: duena, sql: aplicar, args: [o, JSON.stringify(paquete(['c', 'd']))] },
      b: { persona: duena, sql: crearColor, args: [randomUUID(), `${PREFIJO} pv1 suelto`] },
    })
    const n = await todos(orquesta)
    espero(
      'aplicar llega primero: crea sus dos colores y el color suelto da el tope (22023); nunca más de 48',
      r.a.ok && r.b.codigo === '22023' && n === tope,
      { a: r.a, b: r.b, n },
    )
  }

  console.log('Llenar el catálogo de colores mientras se aplica una plantilla de V1')
  {
    await vaciarRellenos(orquesta)
    const tope = 48
    await llenarHasta(orquesta, tope - 2)
    const o = await origen(orquesta, 'segundo')
    const r = await carrera(orquesta, {
      a: { persona: duena, sql: crearColor, args: [randomUUID(), `${PREFIJO} pv1 suelto`] },
      b: { persona: duena, sql: aplicar, args: [o, JSON.stringify(paquete(['e', 'f']))] },
    })
    const n = await todos(orquesta)
    const b = await borradores(orquesta, o)
    espero(
      'el color suelto llega primero: aplicar da «No hay lugar» (22023) y no deja borradores ni colores; nunca más de 48',
      r.a.ok &&
        r.b.codigo === '22023' &&
        r.b.mensaje.startsWith('No hay lugar para 2 colores más') &&
        n === tope - 1 &&
        b.f === 0 &&
        b.t === 0,
      { a: r.a, b: r.b, n, borradores: b },
    )
  }
  await vaciarRellenos(orquesta)
}

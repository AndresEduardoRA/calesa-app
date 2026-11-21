// Las carreras de activar una fórmula del origen (docs/COTIZADOR.md › «Fórmulas del origen»): dos activar a la vez, activar mientras se cotiza (en los dos
// órdenes) y activar mientras se publica la activa. Cada una abre una transacción de A y deja a B esperando un candado (el arnés de `scripts/carreras.mjs`): si B
// no espera, la carrera no se probó. Cada carrera usa el terreno de `cotizaciones.mjs` (un origen propio con su «Fórmula» activa y publicada, un lead y un
// vehículo, prefijo «Carreras») más otras fórmulas del origen publicadas, cada una con su tarjeta; `limpiar()` borra el origen y todo cae con él.
import { PERSONAS } from './terreno.mjs'
import { crear, publica, terreno } from './cotizaciones.mjs'

const { duena, configura } = PERSONAS

// Otra fórmula del origen con la misma publicada que la activa del terreno y la tarjeta de omisión, publicada. Devuelve lo que vería en pantalla quien la activa.
async function otra(db, t, nombre) {
  const {
    rows: [d],
  } = await db.query(
    `insert into public.formulas_del_origen (origen_id, nombre) values ($1, $2) returning id`,
    [t.origen, nombre],
  )
  await db.query(
    `insert into public.formulas (origen_id, formula_del_origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
     select origen_id, $2, 1, 'publicada', definicion, params, diseno, visibilidad, 'v1', now() from public.formulas where id = $1`,
    [t.v1, d.id],
  )
  await db.query(
    `insert into public.plantillas_tarjeta (origen_id, formula_del_origen_id, version, estado, definicion, nota, publicado_en)
     values ($1, $2, 1, 'publicada', public._fdo_tarjeta_en_blanco(), 'v1', now())`,
    [t.origen, d.id],
  )
  return esperadas(db, d.id)
}

// Como texto: un `Date` de JavaScript pierde los microsegundos y la versión ya no coincide.
async function esperadas(db, id) {
  const {
    rows: [e],
  } = await db.query(
    `select d.id, d.actualizado_en::text as v,
            (select a.id from public.formulas_del_origen a where a.origen_id = d.origen_id and a.activa) as activa,
            (select f.id from public.formulas f where f.formula_del_origen_id = d.id and f.estado = 'publicada') as pub,
            (select p.id from public.plantillas_tarjeta p where p.formula_del_origen_id = d.id and p.estado = 'publicada') as ppub
       from public.formulas_del_origen d where d.id = $1`,
    [id],
  )
  return e
}

// Quien configura: es la única persona de las carreras con cotizaciones.configurar.
const activar = (e, nota) => ({
  persona: configura,
  sql: `public.formula_del_origen_activar($1, $2::timestamptz, $3, $4, null, $5, null, $6)`,
  args: [e.id, e.v, nota, e.activa, e.pub, e.ppub],
})

const activas = async (db, origen) =>
  (
    await db.query(
      `select id, nombre from public.formulas_del_origen where origen_id = $1 and activa`,
      [origen],
    )
  ).rows

export async function carrerasDeFormulasDelOrigen({ orquesta, carrera, espero }) {
  console.log('Dos activar fórmulas del origen a la vez, con la misma activa a la vista')
  {
    const t = await terreno(orquesta, 'fdo_dos')
    const f2 = await otra(orquesta, t, 'Segunda')
    const f3 = await otra(orquesta, t, 'Tercera')
    const r = await carrera(orquesta, { a: activar(f2, 'Gana A'), b: activar(f3, 'Pierde B') })
    const quedan = await activas(orquesta, t.origen)
    espero(
      'gana la primera: la segunda da conflicto (PT409, «Activaste «Segunda» hace…»: es la misma persona) y queda una sola activa, la de A',
      r.a.ok &&
        r.b.codigo === 'PT409' &&
        /^Activaste «Segunda»/.test(r.b.mensaje ?? '') &&
        quedan.length === 1 &&
        quedan[0].id === f2.id,
      { a: r.a, b: r.b, quedan },
    )
  }

  console.log('Activar otra fórmula del origen mientras se cotiza (cotizar primero)')
  {
    // Crear toma la activa `for share`: activar espera a que la cotización nazca de la versión que estaba activa.
    const t = await terreno(orquesta, 'fdo_cot1')
    const f2 = await otra(orquesta, t, 'Segunda')
    const id = '00000000-0000-4000-8000-0000000c1f01'
    const r = await carrera(orquesta, { a: crear(duena, t, id), b: activar(f2, 'Activa B') })
    const {
      rows: [c],
    } = await orquesta.query('select formula_id from public.cotizaciones where id = $1', [id])
    const quedan = await activas(orquesta, t.origen)
    espero(
      'la cotización nace de la versión de la activa de antes y activar espera y termina: la activa es la nueva',
      r.a.ok && r.b.ok && c?.formula_id === t.v1 && quedan.length === 1 && quedan[0].id === f2.id,
      { a: r.a, b: r.b, c, quedan },
    )
  }

  console.log('Activar otra fórmula del origen mientras se cotiza (activar primero)')
  {
    // La hoja se abrió con la versión de la activa de antes: crear espera la fila de esa activa, ve que ya no lo es y avisa que la hoja está desactualizada.
    const t = await terreno(orquesta, 'fdo_cot2')
    const f2 = await otra(orquesta, t, 'Segunda')
    const id = '00000000-0000-4000-8000-0000000c1f02'
    const r = await carrera(orquesta, { a: activar(f2, 'Activa A'), b: crear(duena, t, id) })
    const {
      rows: [n],
    } = await orquesta.query('select count(*)::int as n from public.cotizaciones where id = $1', [
      id,
    ])
    espero(
      'crear espera y responde desactualizada (PT409) sin crear nada; la activa es la nueva',
      r.a.ok &&
        r.b.codigo === 'PT409' &&
        r.b.detail === 'desactualizada' &&
        n.n === 0 &&
        (await activas(orquesta, t.origen))[0]?.id === f2.id,
      { a: r.a, b: r.b, n },
    )
  }

  console.log('Activar otra fórmula del origen mientras se publica la activa')
  {
    // Publicar y activar se ordenan por el candado `formulas:` del origen: sin deadlock, la v2 queda en la que era activa y la activa es la nueva.
    const t = await terreno(orquesta, 'fdo_pub')
    const f2 = await otra(orquesta, t, 'Segunda')
    const r = await carrera(orquesta, { a: publica(t, 'v2 de A'), b: activar(f2, 'Activa B') })
    const {
      rows: [v2],
    } = await orquesta.query(
      `select f.version, f.formula_del_origen_id from public.formulas f where f.formula_del_origen_id = $1 and f.estado = 'publicada'`,
      [f2.activa],
    )
    const quedan = await activas(orquesta, t.origen)
    espero(
      'publicar termina en la v2 de la que era activa y activar espera y termina: una sola activa, la nueva',
      r.a.ok && r.b.ok && v2?.version === 2 && quedan.length === 1 && quedan[0].id === f2.id,
      { a: r.a, b: r.b, v2, quedan },
    )
  }
}

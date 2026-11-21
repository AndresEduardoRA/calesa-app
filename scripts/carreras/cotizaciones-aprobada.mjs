// Las carreras de la cotización aprobada (`cotizacion_aprobar` y el mantenimiento al confirmar), con dos conexiones reales a la base del Supabase LOCAL (el arnés de
// `scripts/carreras.mjs`: A abre una transacción y actúa, B lanza su llamada, el orquestador espera a que B esté esperando un lock y A confirma; si B no espera, la
// carrera no se probó y el script falla). En todas, ningún interbloqueo (40P01) ni 23505, y la invariante: una sola aprobada por vehículo y apunta a una activa.
// El orden que prueban: vehículo `for key share` → la cotización y su hermana por id `for no key update` → el candado de la aprobada (aviso, por vehículo); y al
// confirmar, el trigger diferido toma ese mismo candado y vuelve a leer (`trg_cotizaciones_aprobadas_al_confirmar`). `cotizacion_privada_cambiar()` toma los
// mismos, en el mismo orden: la aprobada nunca es privada (A4).
import { PERSONAS } from './terreno.mjs'
import { insertaCotizacion, terreno } from './cotizaciones.mjs'
import {
  armarEnDosPasos,
  fila,
  idsDesde,
  sinInterbloqueo,
} from '../../supabase/tests/areas/final/carreras-comun.mjs'

const { duena } = PERSONAS
const nuevoId = idsDesde(9000)

const version = async (db, id) =>
  (await fila(db, 'select actualizado_en::text as v from public.cotizaciones where id = $1', [id]))
    .v
const aprobadasDe = async (db, vehiculo) =>
  (
    await db.query(
      'select cotizacion_id from public.cotizaciones_aprobadas where vehiculo_id = $1',
      [vehiculo],
    )
  ).rows.map((r) => r.cotizacion_id)
const aprobar = async (db, id) => ({
  persona: duena,
  sql: 'public.cotizacion_aprobar($1, $2::timestamptz)',
  args: [id, await version(db, id)],
})
const sinUnique = (...rs) => rs.every((r) => r?.codigo !== '23505')
const hacerPrivada = async (db, id) => ({
  persona: duena,
  sql: 'public.cotizacion_privada_cambiar($1, true, $2::timestamptz)',
  args: [id, await version(db, id)],
})
const privada = async (db, id) =>
  (await fila(db, 'select privada from public.cotizaciones where id = $1', [id])).privada

// Tres cotizaciones vivas del mismo vehículo, la primera aprobada (la nace el trigger al confirmar cada insert).
async function conTres(orquesta, etiqueta) {
  const t = await terreno(orquesta, etiqueta)
  const [c1, c2, c3] = [nuevoId(), nuevoId(), nuevoId()]
  for (const c of [c1, c2, c3]) await insertaCotizacion(orquesta, t, c)
  return { t, c1, c2, c3 }
}

export async function carrerasDeAprobada({ orquesta, carrera, espero, conectar }) {
  const enDosPasos = armarEnDosPasos({ orquesta, conectar })

  console.log('Dos personas aprueban dos cotizaciones del mismo vehículo a la vez (A1)')
  {
    const { t, c1, c2, c3 } = await conTres(orquesta, 'ap1')
    espero('la primera nace aprobada', (await aprobadasDe(orquesta, t.vehiculo))[0] === c1, {
      a: await aprobadasDe(orquesta, t.vehiculo),
    })
    const r = await carrera(orquesta, {
      a: await aprobar(orquesta, c2),
      b: await aprobar(orquesta, c3),
    })
    const a = await aprobadasDe(orquesta, t.vehiculo)
    espero(
      'A aprueba; B espera el candado de la aprobada y también aprueba; queda una, la de B',
      r.a.ok &&
        r.b.ok &&
        a.length === 1 &&
        a[0] === c3 &&
        sinInterbloqueo(r.a, r.b) &&
        sinUnique(r.a, r.b),
      { r, a },
    )
  }

  console.log('Aprobar una cotización mientras otro la manda a la papelera (A2, los dos órdenes)')
  {
    // La papelera primero: B espera el candado de la cotización, la cotización ya no está (42501) y la aprobada pasa a la más antigua activa que queda.
    const { t, c1, c2 } = await conTres(orquesta, 'ap2a')
    const r = await carrera(orquesta, {
      a: {
        persona: duena,
        sql: `public.papelera_enviar('cotizaciones', $1::uuid[])`,
        args: [[c1]],
      },
      b: await aprobar(orquesta, c1),
    })
    const a = await aprobadasDe(orquesta, t.vehiculo)
    espero(
      'gana la papelera: B recibe el 42501 de lo inexistente y la aprobada es la más antigua activa',
      r.a.ok &&
        r.b.codigo === '42501' &&
        a.length === 1 &&
        a[0] === c2 &&
        sinInterbloqueo(r.a, r.b),
      { r, a },
    )
  }
  {
    // Aprobar primero: la papelera espera el candado de la cotización, y al confirmar la aprobada recién elegida vuelve a la más antigua activa.
    const { t, c1, c2 } = await conTres(orquesta, 'ap2b')
    const r = await carrera(orquesta, {
      a: await aprobar(orquesta, c2),
      b: {
        persona: duena,
        sql: `public.papelera_enviar('cotizaciones', $1::uuid[])`,
        args: [[c2]],
      },
    })
    const a = await aprobadasDe(orquesta, t.vehiculo)
    espero(
      'gana aprobar: la papelera espera, termina y la aprobada pasa a la más antigua activa',
      r.a.ok && r.b.ok && a.length === 1 && a[0] === c1 && sinInterbloqueo(r.a, r.b),
      { r, a },
    )
  }

  console.log('La papelera de la aprobada contra la papelera de la que la releva (A3)')
  {
    // A: manda la aprobada (c1) a la papelera y confirma el trigger diferido a mano: la aprobada pasa a c2 y A retiene el candado, sin confirmar. B: manda c2 a la
    // papelera; al confirmar, su trigger espera ese candado y, al volver a leer, ve a c2 como aprobada de A y la quita (no queda ninguna activa). Sin el candado, B
    // vería la fila vieja (c1, todavía viva para él), no tocaría nada y quedaría aprobada una cotización de la papelera.
    const t = await terreno(orquesta, 'ap3')
    const [c1, c2] = [nuevoId(), nuevoId()]
    await insertaCotizacion(orquesta, t, c1)
    await insertaCotizacion(orquesta, t, c2)
    const r = await enDosPasos({
      sub: duena,
      a1: async (a) => {
        await a.query(`select public.papelera_enviar('cotizaciones', array[$1::uuid])`, [c1])
        await a.query('set constraints public.trg_cotizaciones_aprobadas_al_confirmar immediate')
      },
      b: {
        persona: duena,
        sql: `public.papelera_enviar('cotizaciones', $1::uuid[])`,
        args: [[c2]],
      },
      a2: async () => {},
    })
    const a = await aprobadasDe(orquesta, t.vehiculo)
    espero(
      'B espera el candado de la aprobada y, con la papelera de A vista, no deja ninguna aprobada',
      r.a.ok && r.b.ok && r.comoFue === 'esperó' && a.length === 0 && sinInterbloqueo(r.a, r.b),
      { r, a },
    )
  }

  console.log(
    'Hacer privada una cotización mientras otro la aprueba o reemplaza a la aprobada (A4)',
  )
  {
    // Aprobar primero: hacerla privada espera el candado de la cotización y, ya aprobada, recibe 23514; sigue pública.
    const { t, c2 } = await conTres(orquesta, 'ap4a')
    const r = await carrera(orquesta, {
      a: await aprobar(orquesta, c2),
      b: await hacerPrivada(orquesta, c2),
    })
    const a = await aprobadasDe(orquesta, t.vehiculo)
    espero(
      'gana aprobar: hacerla privada espera y recibe 23514; la aprobada es ella y sigue pública',
      r.a.ok &&
        r.b.codigo === '23514' &&
        a.length === 1 &&
        a[0] === c2 &&
        !(await privada(orquesta, c2)) &&
        sinInterbloqueo(r.a, r.b),
      { r, a },
    )
  }
  {
    // Hacerla privada primero: aprobar espera el candado de la cotización y su versión ya cambió (PT409); la aprobada no se mueve.
    const { t, c1, c2 } = await conTres(orquesta, 'ap4b')
    const r = await carrera(orquesta, {
      a: await hacerPrivada(orquesta, c2),
      b: await aprobar(orquesta, c2),
    })
    const a = await aprobadasDe(orquesta, t.vehiculo)
    espero(
      'gana la privada: aprobar espera y recibe PT409; la aprobada sigue siendo la primera',
      r.a.ok &&
        r.b.codigo === 'PT409' &&
        a.length === 1 &&
        a[0] === c1 &&
        (await privada(orquesta, c2)) &&
        sinInterbloqueo(r.a, r.b),
      { r, a },
    )
  }
  {
    // La papelera de la aprobada primero, con el trigger diferido confirmado a mano (como A3): la aprobada pasa a c2 y A retiene su candado; hacerla privada lo
    // espera y, con c2 ya aprobada, recibe 23514.
    const { t, c1, c2 } = await conTres(orquesta, 'ap4c')
    const b = await hacerPrivada(orquesta, c2)
    const r = await enDosPasos({
      sub: duena,
      a1: async (a) => {
        await a.query(`select public.papelera_enviar('cotizaciones', array[$1::uuid])`, [c1])
        await a.query('set constraints public.trg_cotizaciones_aprobadas_al_confirmar immediate')
      },
      b,
      a2: async () => {},
    })
    const a = await aprobadasDe(orquesta, t.vehiculo)
    espero(
      'gana la papelera: c2 pasa a ser la aprobada y hacerla privada espera su candado y recibe 23514',
      r.a.ok &&
        r.comoFue === 'esperó' &&
        r.b.codigo === '23514' &&
        a.length === 1 &&
        a[0] === c2 &&
        !(await privada(orquesta, c2)) &&
        sinInterbloqueo(r.a, r.b),
      { r, a },
    )
  }
  {
    // Hacerla privada primero: la papelera de la aprobada espera su candado y la releva la más antigua de las públicas (c3), no la privada.
    const { t, c1, c2, c3 } = await conTres(orquesta, 'ap4d')
    const r = await carrera(orquesta, {
      a: await hacerPrivada(orquesta, c2),
      b: {
        persona: duena,
        sql: `public.papelera_enviar('cotizaciones', $1::uuid[])`,
        args: [[c1]],
      },
    })
    const a = await aprobadasDe(orquesta, t.vehiculo)
    espero(
      'gana la privada: la papelera espera y la aprobada pasa a c3, la más antigua de las públicas',
      r.a.ok && r.b.ok && a.length === 1 && a[0] === c3 && sinInterbloqueo(r.a, r.b),
      { r, a },
    )
  }
}

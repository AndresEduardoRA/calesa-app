// Las carreras de las cotizaciones hermanas (`cotizacion_guardar_en_par`; glosario: «Cotizaciones hermanas»), con dos conexiones reales a la base del Supabase
// LOCAL (el arnés de `scripts/carreras.mjs`: A abre una transacción y actúa, B lanza su llamada, el orquestador espera a que B esté esperando un lock y A
// confirma; si B no espera, la carrera no se probó y el script falla). En todas, ningún interbloqueo (40P01). El orden que prueban: los vehículos y después
// las dos cotizaciones en orden de id, se llame con el par en el orden que se llame; marcar final toma lead → vehículo → las vivas del vehículo en orden de id.
import { PERSONAS } from './terreno.mjs'
import { insertaCotizacion, terreno } from './cotizaciones.mjs'
import {
  fila,
  idsDesde,
  marcar,
  sinInterbloqueo,
} from '../../supabase/tests/areas/final/carreras-comun.mjs'

const { duena } = PERSONAS
const nuevoId = idsDesde(9500)

const version = async (db, id) =>
  (await fila(db, 'select actualizado_en::text as v from public.cotizaciones where id = $1', [id]))
    .v
const viva = async (db, id) =>
  (
    await fila(db, 'select eliminado_en is null as viva from public.cotizaciones where id = $1', [
      id,
    ])
  ).viva

// Dos hermanas del mismo vehículo y lead, de la dueña (se apuntan en una sola sentencia: el invariante se mira al confirmar).
async function conHermanas(orquesta, etiqueta) {
  const t = await terreno(orquesta, etiqueta)
  const [c1, c2] = [nuevoId(), nuevoId()]
  await insertaCotizacion(orquesta, t, c1)
  await insertaCotizacion(orquesta, t, c2)
  await orquesta.query(
    `update public.cotizaciones set hermana_id = case id when $1::uuid then $2::uuid else $1::uuid end where id in ($1, $2)`,
    [c1, c2],
  )
  return { t, c1, c2 }
}

// Guardar en par como la dueña, con las versiones de ahora y un total nuevo.
const guardarEnPar = async (db, ids, t) => ({
  persona: duena,
  sql: `public.cotizacion_guardar_en_par($1::uuid[], $2::uuid[], $3::timestamptz[], $4::jsonb, null, null, array[null, null]::text[], $5, false)`,
  args: [
    ids,
    [crypto.randomUUID(), crypto.randomUUID()],
    [await version(db, ids[0]), await version(db, ids[1])],
    JSON.stringify([{ inputs: { a: 20 } }, { inputs: { a: 30 } }]),
    t.vehiculo,
  ],
})

export async function carrerasDeHermanas({ orquesta, carrera, espero }) {
  console.log('Dos personas guardan el mismo par a la vez, cada una lo nombra en otro orden (H1)')
  {
    const { t, c1, c2 } = await conHermanas(orquesta, 'her1')
    const r = await carrera(orquesta, {
      a: await guardarEnPar(orquesta, [c1, c2], t),
      b: await guardarEnPar(orquesta, [c2, c1], t),
    })
    espero(
      'A guarda las dos; B espera la primera en orden de id y recibe el PT409 de la versión, sin 40P01',
      r.a.ok && r.b.codigo === 'PT409' && sinInterbloqueo(r.a, r.b),
      { r },
    )
  }

  console.log('Guardar el par mientras otro marca final la hermana (H2, los dos órdenes)')
  {
    const { t, c1, c2 } = await conHermanas(orquesta, 'her2a')
    const r = await carrera(orquesta, {
      a: await guardarEnPar(orquesta, [c1, c2], t),
      b: marcar(duena, c2),
    })
    espero(
      'gana guardar: marcar espera las vivas del vehículo y, al confirmar A, deja la hermana en la papelera',
      r.a.ok && r.b.ok && !(await viva(orquesta, c1)) && sinInterbloqueo(r.a, r.b),
      { r },
    )
  }
  {
    const { t, c1, c2 } = await conHermanas(orquesta, 'her2b')
    const r = await carrera(orquesta, {
      a: marcar(duena, c2),
      b: await guardarEnPar(orquesta, [c1, c2], t),
    })
    espero(
      'gana marcar: guardar en par espera la primera y, con la hermana en la papelera, recibe el 42501 de lo inexistente',
      r.a.ok && r.b.codigo === '42501' && sinInterbloqueo(r.a, r.b),
      { r },
    )
  }
}

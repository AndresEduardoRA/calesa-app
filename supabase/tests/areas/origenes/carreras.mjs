// Las carreras del campo «principal» de un origen (paso 6.13), con conexiones reales a la base del Supabase LOCAL. K1: A marca «b» y B marca
// «c» del mismo origen a la vez; B espera el candado del origen que tomó A (`origen_campo_guardar` lo toma antes que el campo) y, cuando A
// confirma, desmarca «b» y marca «c»: los dos ok, un solo principal, sin 23505 ni 40P01. K2: una sesión `postgres` marca «a» sin confirmar
// (no toma el origen); `guardar(b, principal)` no ve a quién desmarcar, espera en el índice único y, cuando A confirma, sale PT409 con
// mensaje humano (nunca el 23505 crudo). Terreno con el prefijo «Carreras»: el origen (sus campos caen en cascada) y el rol los borra
// `limpiar()` de `scripts/carreras/terreno.mjs`. Las corre `scripts/carreras.mjs` (`pnpm db:carreras`).
import { PERSONAS, PREFIJO } from '../../../../scripts/carreras/terreno.mjs'

const { duena } = PERSONAS
const CONFLICTO = 'Otra persona marcó otro campo como principal mientras editabas.'

// Como texto: un `Date` de JavaScript pierde los microsegundos y la versión ya no coincide.
const versionDe = async (db, campo) =>
  (
    await db.query(`select actualizado_en::text as v from public.origenes_campos where id = $1`, [
      campo,
    ])
  ).rows[0].v

const marcar = (campo, version) => ({
  persona: duena,
  sql: `public.origen_campo_guardar($1, $2, '{"principal": true}'::jsonb)::text`,
  args: [campo, version],
})

const principales = async (db, origen) =>
  (
    await db.query(
      `select coalesce(string_agg(clave, ',' order by clave), '') as p from public.origenes_campos where origen_id = $1 and principal`,
      [origen],
    )
  ).rows[0].p

// Un origen de las carreras con tres campos de texto, como postgres; la dueña de las carreras gestiona los orígenes.
async function terrenoDelPrincipal(db) {
  const {
    rows: [rol],
  } = await db.query(
    `insert into public.roles (clave, nombre) values ('carreras_origenes_campos', $1) returning id`,
    [`${PREFIJO} campos`],
  )
  await db.query(
    `insert into public.roles_permisos (rol_id, permiso_clave) values ($1, 'origenes.gestionar')`,
    [rol.id],
  )
  await db.query(
    `insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values ($1, $2, false)`,
    [duena, rol.id],
  )
  const {
    rows: [origen],
  } = await db.query(
    `insert into public.origenes (clave, nombre) values ('carreras_campos', $1) returning id`,
    [`${PREFIJO} campos`],
  )
  const campos = {}
  for (const [i, clave] of ['a', 'b', 'c'].entries()) {
    const {
      rows: [fila],
    } = await db.query(
      `insert into public.origenes_campos (origen_id, clave, etiqueta, tipo, orden) values ($1, $2, $3, 'texto', $4) returning id`,
      [origen.id, `carreras_${clave}`, `${PREFIJO} ${clave}`, 1000 + i],
    )
    campos[clave] = fila.id
  }
  return { origen: origen.id, ...campos }
}

export async function carrerasDelPrincipal({ orquesta, carrera, espero }) {
  const { origen, a, b, c } = await terrenoDelPrincipal(orquesta)

  console.log('Dos personas marcan principales distintos del mismo origen a la vez')
  {
    const r = await carrera(orquesta, {
      a: marcar(b, await versionDe(orquesta, b)),
      b: marcar(c, await versionDe(orquesta, c)),
    })
    const quedan = await principales(orquesta, origen)
    espero(
      'K1: A marca «b»; B esperó el candado del origen, desmarca «b» y marca «c»; un solo principal; sin 23505 ni 40P01',
      r.a.ok && r.b.ok && quedan === 'carreras_c',
      { r, quedan },
    )
  }

  console.log('Un principal sin confirmar fuera de la RPC y un guardar que marca otro')
  {
    await orquesta.query(
      `update public.origenes_campos set principal = false where origen_id = $1`,
      [origen],
    )
    const r = await carrera(orquesta, {
      a: {
        rol: 'postgres',
        consulta: `update public.origenes_campos set principal = true where id = $1 returning id::text as r`,
        args: [a],
      },
      b: marcar(b, await versionDe(orquesta, b)),
    })
    const quedan = await principales(orquesta, origen)
    espero(
      'K2: B espera en el índice único y, al confirmar A, recibe PT409 con mensaje humano; queda «a»',
      r.a.ok && r.b.codigo === 'PT409' && r.b.mensaje === CONFLICTO && quedan === 'carreras_a',
      { r, quedan },
    )
  }
}

// Las carreras de los datos clave de un origen. K3: A guarda una lista con el campo «a» sin confirmar y B lo desactiva; B espera el candado
// del origen y, cuando A confirma, desactiva «a» y lo saca de la lista: los dos ok y ningún campo inactivo queda como dato clave. K4: A
// desactiva «a» sin confirmar y B guarda una lista con «a»; B espera el candado del origen y, cuando A confirma, ve el campo inactivo y sale
// PT409 con su motivo. Gana el orden de candados origen → campo; nunca 40P01. Mismo terreno que las del principal.
const CAMPO_INACTIVO =
  'Uno de los campos elegidos ya no está activo en este origen. Recarga para ver los de ahora.'

const versionDelOrigen = async (db, origen) =>
  (await db.query(`select actualizado_en::text as v from public.origenes where id = $1`, [origen]))
    .rows[0].v

const datosClave = async (db, origen) =>
  (await db.query(`select datos_clave as d from public.origenes where id = $1`, [origen])).rows[0].d

const guardarDatosClave = (origen, datos, version) => ({
  persona: duena,
  sql: `public.origen_datos_clave_guardar($1, $2::jsonb, $3)::text`,
  args: [origen, JSON.stringify(datos), version],
})

const desactivar = (campo, version) => ({
  persona: duena,
  sql: `public.origen_campo_guardar($1, $2, '{"activo": false}'::jsonb)::text`,
  args: [campo, version],
})

export async function carrerasDeDatosClave({ orquesta, carrera, espero }) {
  const origen = (
    await orquesta.query(`select id from public.origenes where clave = 'carreras_campos'`)
  ).rows[0].id
  const a = (
    await orquesta.query(
      `select id from public.origenes_campos where origen_id = $1 and clave = 'carreras_a'`,
      [origen],
    )
  ).rows[0].id
  const conA = [{ comun: 'anio' }, { campo: 'carreras_a' }]

  console.log('Una persona guarda los datos clave con un campo y otra lo desactiva a la vez')
  {
    await orquesta.query(
      `update public.origenes set datos_clave = '[{"comun": "anio"}]' where id = $1`,
      [origen],
    )
    await orquesta.query(
      `update public.origenes_campos set activo = true, principal = false where id = $1`,
      [a],
    )
    const r = await carrera(orquesta, {
      a: guardarDatosClave(origen, conA, await versionDelOrigen(orquesta, origen)),
      b: desactivar(a, await versionDe(orquesta, a)),
    })
    const quedan = await datosClave(orquesta, origen)
    espero(
      'K3: B esperó el candado del origen, desactiva «a» y lo saca de la lista; los dos ok; sin 40P01',
      r.a.ok && r.b.ok && JSON.stringify(quedan) === JSON.stringify([{ comun: 'anio' }]),
      { r, quedan },
    )
  }

  console.log('Una persona desactiva un campo y otra lo guarda como dato clave a la vez')
  {
    await orquesta.query(`update public.origenes set datos_clave = '[]' where id = $1`, [origen])
    await orquesta.query(`update public.origenes_campos set activo = true where id = $1`, [a])
    const r = await carrera(orquesta, {
      a: desactivar(a, await versionDe(orquesta, a)),
      b: guardarDatosClave(origen, conA, await versionDelOrigen(orquesta, origen)),
    })
    const quedan = await datosClave(orquesta, origen)
    espero(
      'K4: B espera el candado del origen y, al confirmar A, recibe PT409 con el motivo del campo inactivo; la lista queda vacía',
      r.a.ok &&
        r.b.codigo === 'PT409' &&
        r.b.mensaje === CAMPO_INACTIVO &&
        JSON.stringify(quedan) === '[]',
      { r, quedan },
    )
  }
}

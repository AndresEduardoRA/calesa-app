// Las carreras de «En la barra» (`tipo_cambio_guardar(… p_en_la_barra)`), con conexiones reales a la base del Supabase LOCAL. K1: con 2 activos
// marcados, A marca «c» y B marca «d» a la vez; B espera el candado consultivo de la barra que tomó A y, cuando A confirma, cuenta 3 y cae con
// 22023: quedan 3, nunca 4. K2: A y B marcan «d» con la misma versión; B espera y, cuando A confirma, recibe PT409 (nunca 40001). El terreno
// guarda la marca de cada tipo de cambio al empezar y la deja igual al terminar; los tipos de cambio y el rol llevan el prefijo de las carreras
// (el rol lo borra también `limpiar()` de `scripts/carreras/terreno.mjs`). Las corre `scripts/carreras.mjs` (`pnpm db:carreras`).
import { PERSONAS, PREFIJO } from '../../../../scripts/carreras/terreno.mjs'

const { duena, compartido } = PERSONAS
const CLAVE = 'carreras_tc_'

// Como texto: un `Date` de JavaScript pierde los microsegundos y la versión ya no coincide.
const versionDe = async (db, id) =>
  (await db.query(`select actualizado_en::text as v from public.tipos_cambio where id = $1`, [id]))
    .rows[0].v

const marcar = (persona, id, version) => ({
  persona,
  sql: `public.tipo_cambio_guardar($1, $2, p_en_la_barra => true)::text`,
  args: [id, version],
})

const marcadosActivos = async (db) =>
  (
    await db.query(
      `select coalesce(string_agg(substr(clave, length($1) + 1), ',' order by clave), '') as m
         from public.tipos_cambio where en_la_barra and activo`,
      [CLAVE],
    )
  ).rows[0].m

async function borrarLoNuestro(db) {
  await db.query(`delete from public.tipos_cambio where clave like $1`, [`${CLAVE}%`])
}

// Cuatro tipos de cambio activos de las carreras, nadie más en la barra, y un rol que gestiona los tipos de cambio para las dos personas.
async function terrenoDeLaBarra(db) {
  await borrarLoNuestro(db)
  const { rows: antes } = await db.query(
    `select id, en_la_barra from public.tipos_cambio where en_la_barra`,
  )
  await db.query(`update public.tipos_cambio set en_la_barra = false where en_la_barra`)
  const {
    rows: [rol],
  } = await db.query(
    `insert into public.roles (clave, nombre) values ('carreras_tipos_cambio', $1) returning id`,
    [`${PREFIJO} tipos de cambio`],
  )
  await db.query(
    `insert into public.roles_permisos (rol_id, permiso_clave) values ($1, 'empresa.tipos_cambio.gestionar')`,
    [rol.id],
  )
  await db.query(
    `insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values ($1, $3, false), ($2, $3, false)`,
    [duena, compartido, rol.id],
  )
  const tipos = {}
  for (const [i, letra] of ['a', 'b', 'c', 'd'].entries()) {
    const {
      rows: [fila],
    } = await db.query(
      `insert into public.tipos_cambio (clave, nombre, moneda_de, moneda_a, valor, orden)
       values ($1, $2, 'USD', 'BOB', 7, $3) returning id`,
      [`${CLAVE}${letra}`, `${PREFIJO} TC ${letra}`, 1000 + i],
    )
    tipos[letra] = fila.id
  }
  return { tipos, rol: rol.id, antes: antes.map((fila) => fila.id) }
}

async function restaurar(db, { rol, antes }) {
  await borrarLoNuestro(db)
  await db.query(`update public.tipos_cambio set en_la_barra = (id = any ($1::uuid[]))`, [antes])
  await db.query(`delete from public.usuarios_roles where rol_id = $1`, [rol])
  await db.query(`delete from public.roles where id = $1`, [rol])
}

export async function carrerasDeLaBarra({ orquesta, carrera, espero }) {
  const terreno = await terrenoDeLaBarra(orquesta)
  const { a, b, c, d } = terreno.tipos
  try {
    console.log('Dos personas suman un tipo de cambio a la barra a la vez')
    {
      await orquesta.query(
        `update public.tipos_cambio set en_la_barra = true where id in ($1, $2)`,
        [a, b],
      )
      const r = await carrera(orquesta, {
        a: marcar(duena, c, await versionDe(orquesta, c)),
        b: marcar(compartido, d, await versionDe(orquesta, d)),
      })
      const quedan = await marcadosActivos(orquesta)
      espero(
        'K1: A marca «c»; B esperó el candado de la barra y cae con 22023 (hint en_la_barra); quedan 3, nunca 4',
        r.a.ok && r.b.codigo === '22023' && quedan === 'a,b,c',
        { b: r.b, quedan },
      )
    }

    console.log('Dos personas marcan el mismo tipo de cambio con la misma versión')
    {
      await orquesta.query(
        `update public.tipos_cambio set en_la_barra = false where clave like $1`,
        [`${CLAVE}%`],
      )
      const version = await versionDe(orquesta, d)
      const r = await carrera(orquesta, {
        a: marcar(duena, d, version),
        b: marcar(compartido, d, version),
      })
      espero(
        'K2: A marca «d»; B esperó y recibe PT409 con mensaje humano (nunca 40001)',
        r.a.ok && r.b.codigo === 'PT409' && (await marcadosActivos(orquesta)) === 'd',
        r.b,
      )
    }
  } finally {
    await restaurar(orquesta, terreno)
  }
}

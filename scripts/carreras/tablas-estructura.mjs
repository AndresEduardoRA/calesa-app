// Las carreras de crear una tabla de referencia y cambiar sus columnas (docs/COTIZADOR.md › «Crear, columnas y desactivar»): dos personas crean la
// misma clave en el mismo origen, cambiar las columnas contra publicar la misma tabla, y quitar una columna mientras se guarda un borrador del mismo
// origen que empieza a usarla. Candados: `tablas_referencia:crear` al crear; la tabla (`for update`) y después `formulas:<origen>` al cambiar las
// columnas. Cada una abre una transacción de A y deja a B esperando un lock (el arnés de `scripts/carreras.mjs`): si B no espera, la carrera no se
// probó. Trabaja en orígenes propios (prefijo «Carreras»): `limpiar()` los borra, y con ellos sus fórmulas y sus tablas.
import { readFileSync } from 'node:fs'
import { PERSONAS } from './terreno.mjs'
import { terreno } from './tonos.mjs'

const { configura } = PERSONAS

// La fórmula de las capturas con los tonos propios de las carreras (como `tonos.mjs`): su nodo `transporte_bolivia` lee la tabla
// `transporte_usa_bolivia` por `match {tipo}` y la columna `cliente`.
const juego = JSON.parse(
  readFileSync('src/modules/cotizaciones/entities/casos-de-diseno.json', 'utf8'),
)
const CAPTURAS = juego.formulas.capturas
const DISENO = juego.casos[0].diseno
const DEFINICION = {
  ...CAPTURAS.definicion,
  grupos: CAPTURAS.definicion.grupos.map((g) => ({ ...g, tono: `carreras_${g.tono}` })),
}

const COLUMNAS = [
  { clave: 'tipo', etiqueta: 'Tipo', tipo: 'texto' },
  { clave: 'cliente', etiqueta: 'Cliente', tipo: 'numero' },
  { clave: 'extra', etiqueta: 'Extra', tipo: 'numero' },
]

// Una tabla propia del origen, en la versión 1, con una fila.
async function tablaDelOrigen(db, origen, clave) {
  const {
    rows: [{ id }],
  } = await db.query(
    `insert into public.tablas_referencia (origen_id, clave, nombre, columnas) values ($1, $2, $3, $4::jsonb) returning id`,
    [origen, clave, `Tabla ${clave}`, JSON.stringify(COLUMNAS)],
  )
  await db.query(
    `insert into public.tablas_referencia_filas (tabla_id, valores, orden) values ($1, '{"tipo":"auto","cliente":1,"extra":2}', 0)`,
    [id],
  )
  return id
}

const crear = (id, origen, nombre) => ({
  persona: configura,
  sql: 'public.tabla_referencia_crear($1, $2, $3, $4::jsonb)',
  args: [id, origen, nombre, JSON.stringify(COLUMNAS)],
})
const cambiarColumnas = (tabla, columnas, version) => ({
  persona: configura,
  sql: 'public.tabla_referencia_columnas($1, $2::jsonb, $3)',
  args: [tabla, JSON.stringify(columnas), version],
})

const tabla = async (db, id) =>
  (
    await db.query(
      `select version, columnas, activa, (select jsonb_agg(valores order by orden) from public.tablas_referencia_filas where tabla_id = $1) as filas
         from public.tablas_referencia where id = $1`,
      [id],
    )
  ).rows[0]

export async function carrerasDeLaEstructuraDeTablas({ orquesta, carrera, espero }) {
  console.log('Dos personas crean una tabla con la misma clave en el mismo origen')
  {
    const t = await terreno(orquesta, 'tabla_crear')
    const [idA, idB] = [crypto.randomUUID(), crypto.randomUUID()]
    const r = await carrera(orquesta, {
      a: crear(idA, t.origen, 'Fletes por puerto'),
      b: crear(idB, t.origen, 'Fletes  por  puerto'),
    })
    const { rows } = await orquesta.query(
      `select id from public.tablas_referencia where origen_id = $1 and clave = 'fletes_por_puerto'`,
      [t.origen],
    )
    espero(
      'entra una: la otra espera el candado de crear y da 23505 «Ya hay una tabla con la clave…» en el nombre; queda una sola fila, la de A',
      r.a.ok &&
        r.b.codigo === '23505' &&
        /^Ya hay una tabla con la clave «fletes_por_puerto»: elige otro nombre\.$/.test(
          r.b.mensaje,
        ) &&
        rows.length === 1 &&
        rows[0].id === idA,
      { a: r.a, b: r.b, filas: rows },
    )
  }

  console.log('Cambiar las columnas de una tabla mientras otra persona la publica')
  {
    const t = await terreno(orquesta, 'tcol_publicar')
    const id = await tablaDelOrigen(orquesta, t.origen, 'carreras_columnas')
    const nuevas = [...COLUMNAS, { clave: 'recargo', etiqueta: 'Recargo', tipo: 'numero' }]
    const r = await carrera(orquesta, {
      a: cambiarColumnas(id, nuevas, 1),
      b: {
        persona: configura,
        sql: 'public.tabla_referencia_publicar($1, $2::jsonb, $3, $4)',
        args: [id, JSON.stringify([{ tipo: 'auto', cliente: 5, extra: 2 }]), 'Pierde B', 1],
      },
    })
    const quedo = await tabla(orquesta, id)
    espero(
      'publicar espera el candado de la tabla y da conflicto (PT409) con la versión 2; quedan las columnas de A y las filas de antes',
      r.a.ok &&
        r.b.codigo === 'PT409' &&
        /publicaste la versión 2 de esta tabla/i.test(r.b.mensaje) &&
        quedo.version === 2 &&
        quedo.columnas.length === 4 &&
        quedo.filas[0].cliente === 1,
      { a: r.a, b: r.b, version: quedo.version },
    )
  }

  console.log(
    'Quitar una columna mientras se guarda un borrador del mismo origen que empieza a usarla',
  )
  {
    const t = await terreno(orquesta, 'tcol_borrador')
    const id = await tablaDelOrigen(orquesta, t.origen, 'transporte_usa_bolivia')
    const r = await carrera(orquesta, {
      a: {
        persona: configura,
        sql: 'public.formula_guardar_borrador($1, $2::jsonb, $3::jsonb, $4::jsonb)',
        args: [
          t.origen,
          JSON.stringify(DEFINICION),
          JSON.stringify(CAPTURAS.params),
          JSON.stringify(DISENO),
        ],
      },
      b: cambiarColumnas(
        id,
        COLUMNAS.filter((c) => c.clave !== 'cliente'),
        1,
      ),
    })
    const quedo = await tabla(orquesta, id)
    espero(
      'quitar espera el candado del origen, ve el borrador de A y da 23503 con quién; la columna y sus valores siguen',
      r.a.ok &&
        r.b.codigo === '23503' &&
        /^La columna «Cliente» la usa el borrador de Carreras tcol_borrador \d+\.$/.test(
          r.b.mensaje,
        ) &&
        quedo.version === 1 &&
        quedo.columnas.some((c) => c.clave === 'cliente') &&
        quedo.filas[0].cliente === 1,
      { a: r.a, b: r.b, version: quedo.version },
    )
  }
}

// El terreno de los e2e de las acciones de «Qué falta»: un origen `e2e_…` con dos fases, A → B; B pide el documento «E2E BL <proyecto>» (obligatorio) y el dato
// `transporte.contenedor` (con las reglas `transporte` y `contenedor` encendidas). Dos vehículos en A (`uno` para hacer, `dos` para pedir) y tres personas:
// «Pide» (ve y da tareas, sin documentos), «Recibe» (ve, sube, aprueba, edita el transporte y recibe tareas) y «Sin asignar» (sólo ve).
import { CONTRASENA } from './alta'
import { admin, correoDePrueba, crearPersona, darRolDePrueba, PREFIJO_ROL_E2E } from './base'
import { PREFIJO_CLAVE_E2E, borrarOrigenes, crearOrigenDePrueba } from './origenes'
import { borrarVehiculosDe } from './vehiculos'

type Unidad = { id: string; titulo: string }
type Persona = { correo: string; nombre: string; id: string }

export type TerrenoDeQueFalta = {
  origen: { id: string; nombre: string }
  a: { id: string; nombre: string }
  b: { id: string; nombre: string }
  tipoDeBl: { id: string; nombre: string }
  uno: Unidad
  dos: Unidad
  pide: Persona
  recibe: Persona
  sinAsignar: Persona
}

function exigir(error: { message: string } | null, que: string): void {
  if (error) throw new Error(`No se pudo ${que}: ${error.message}`)
}

const claveDe = (proyecto: string) => `que_falta_${proyecto}`

async function persona(
  proyecto: string,
  etiqueta: string,
  nombre: string,
  permisos: { clave: string; origenId?: string }[],
): Promise<Persona> {
  const correo = correoDePrueba(`${etiqueta}-que-falta-${proyecto}`)
  await crearPersona({ email: correo, contrasena: CONTRASENA, nombre, invitada: true })
  await darRolDePrueba({
    email: correo,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}${etiqueta} que falta ${proyecto}`,
      clave: `e2e_${etiqueta.replaceAll('-', '_')}_que_falta_${proyecto}`,
    },
    permisos,
  })
  const { data, error } = await admin()
    .from('perfiles')
    .select('id')
    .eq('email', correo)
    .single<{ id: string }>()
  exigir(error, 'leer el perfil')
  return { correo, nombre, id: data?.id ?? '' }
}

async function flujoConReglas(origenId: string): Promise<string> {
  const cliente = admin()
  const { data, error } = await cliente
    .from('flujos')
    .select('id')
    .eq('origen_id', origenId)
    .eq('ambito', 'vehiculos')
    .single<{ id: string }>()
  exigir(error, 'leer el flujo del origen')
  const flujoId = data?.id ?? ''
  const { error: errorDeReglas } = await cliente.from('flujos_reglas').upsert(
    ['transporte', 'contenedor'].map((regla) => ({ flujo_id: flujoId, regla, activa: true })),
    { onConflict: 'flujo_id,regla' },
  )
  exigir(errorDeReglas, 'encender las reglas de transporte')
  return flujoId
}

async function fasesYRequisitos(flujoId: string, proyecto: string) {
  const cliente = admin()
  const { data: fases, error } = await cliente
    .from('fases')
    .insert([
      { flujo_id: flujoId, nombre: `Origen ${proyecto}`, orden: 1, es_inicial: true },
      { flujo_id: flujoId, nombre: `Destino ${proyecto}`, orden: 2, es_inicial: false },
    ])
    .select('id, nombre, orden')
    .returns<{ id: string; nombre: string; orden: number }[]>()
  exigir(error, 'crear las fases')
  const a = fases?.find((f) => f.orden === 1) ?? { id: '', nombre: '' }
  const b = fases?.find((f) => f.orden === 2) ?? { id: '', nombre: '' }
  const { error: errorDeSalida } = await cliente
    .from('fases_transiciones')
    .insert({ flujo_id: flujoId, de_fase_id: a.id, a_fase_id: b.id })
  exigir(errorDeSalida, 'crear la salida')
  const nombreDelTipo = `E2E BL ${proyecto}`
  const { data: tipo, error: errorDelTipo } = await cliente
    .from('tipos_documento')
    .insert({ flujo_id: flujoId, nombre: nombreDelTipo, orden: 1 })
    .select('id')
    .single<{ id: string }>()
  exigir(errorDelTipo, 'crear el tipo de documento')
  const { error: errorDeRequisitos } = await cliente.from('fases_requisitos').insert([
    {
      fase_id: b.id,
      tipo: 'documento',
      tipo_documento_id: tipo?.id ?? '',
      bloqueante: true,
      orden: 1,
    },
    {
      fase_id: b.id,
      tipo: 'dato',
      clave_dato: 'transporte.contenedor',
      bloqueante: true,
      orden: 2,
    },
  ])
  exigir(errorDeRequisitos, 'crear los requisitos')
  return {
    a: { id: a.id, nombre: a.nombre },
    b: { id: b.id, nombre: b.nombre },
    tipoDeBl: { id: tipo?.id ?? '', nombre: nombreDelTipo },
  }
}

export async function sembrarQueFalta(proyecto: string): Promise<TerrenoDeQueFalta> {
  const creado = await crearOrigenDePrueba(`E2E Que falta ${proyecto}`, claveDe(proyecto))
  const flujoId = await flujoConReglas(creado.id)
  const { a, b, tipoDeBl } = await fasesYRequisitos(flujoId, proyecto)
  const titulos = { uno: `E2E Que falta uno ${proyecto}`, dos: `E2E Que falta dos ${proyecto}` }
  const { data: vehiculos, error } = await admin()
    .from('vehiculos')
    .insert(
      [titulos.uno, titulos.dos].map((titulo) => ({
        origen_id: creado.id,
        titulo,
        fase_id: a.id,
        fase_desde: new Date().toISOString(),
      })),
    )
    .select('id, titulo')
    .returns<Unidad[]>()
  exigir(error, 'cargar los vehículos')
  const unidad = (titulo: string): Unidad => ({
    id: vehiculos?.find((v) => v.titulo === titulo)?.id ?? '',
    titulo,
  })
  const ver = ['logistica.ver', 'vehiculos.ver'].map((clave) => ({ clave, origenId: creado.id }))
  return {
    origen: creado,
    a,
    b,
    tipoDeBl,
    uno: unidad(titulos.uno),
    dos: unidad(titulos.dos),
    pide: await persona(proyecto, 'pide', 'Pide Falta', [
      ...ver,
      { clave: 'agenda.tareas.asignar' },
    ]),
    recibe: await persona(proyecto, 'recibe', 'Recibe Falta', [
      ...ver,
      ...[
        'logistica.documentos.subir',
        'logistica.documentos.aprobar',
        'logistica.transporte.editar',
      ].map((clave) => ({ clave, origenId: creado.id })),
      { clave: 'agenda.tareas.recibir' },
    ]),
    sinAsignar: await persona(proyecto, 'sin-asignar', 'Sin Asignar Falta', ver),
  }
}

// Quita lo que `sembrarQueFalta` creó (las tareas vinculadas, los vehículos y el origen). Las personas y los roles los limpia el spec.
export async function borrarQueFalta(proyecto: string): Promise<void> {
  const clave = `${PREFIJO_CLAVE_E2E}${claveDe(proyecto)}`
  const { data: origen } = await admin()
    .from('origenes')
    .select('id')
    .eq('clave', clave)
    .maybeSingle<{ id: string }>()
  if (origen) {
    const { data: vehiculos } = await admin()
      .from('vehiculos')
      .select('id')
      .eq('origen_id', origen.id)
      .limit(10)
      .returns<{ id: string }[]>()
    const ids = (vehiculos ?? []).map((v) => v.id)
    if (ids.length > 0) await admin().from('tareas').delete().in('vehiculo_id', ids)
  }
  await borrarVehiculosDe([clave])
  await borrarOrigenes([clave])
}

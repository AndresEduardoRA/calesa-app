// El cuadro «Quién crea y quién ve» (Configuración › Catálogos, glosario): por rol y por lugar (un origen o «Todos los orígenes»), si crea cotizaciones
// y cuáles ve, dicho con tres permisos de la matriz de Roles. Reglas puras: qué muestra cada celda, qué se puede elegir y qué concesiones cambia cada
// elección. Lo que escribe son las mismas RPC de la matriz (`rbac_otorgar`, `rbac_revocar`), que vuelven a decidir la dominancia.
//
// «Ve» es una escalera sobre `cotizaciones.ver` y `cotizaciones.privadas.ver`:
// - «No ve»: ninguno de los dos.
// - «Sólo las suyas»: `cotizaciones.ver` con «lo propio» (las que creó y las de sus clientes).
// - «Todas menos las privadas»: `cotizaciones.ver` con «todo».
// - «Todas, también las privadas»: además `cotizaciones.privadas.ver`.
// En un origen vale lo que el rol tiene ahí sumado a lo de «Todos los orígenes» (lo heredado, como decide la base): lo que está por debajo de lo heredado
// no se elige ahí, se cambia en «Todos los orígenes».
import type { Alcance, ClavePermiso, Concesion, Permisos } from '@/shared/lib/permisos'
import {
  MOTIVO_CONCESION_NO_DOMINADA,
  MOTIVO_ROL_NO_DOMINADO,
  concesionDominada,
  rolDominado,
} from './dominancia'
import type { CambioDeConcesion } from './matriz'

export const CLAVE_DE_CREAR = 'cotizaciones.crear' satisfies ClavePermiso
export const CLAVE_DE_VER = 'cotizaciones.ver' satisfies ClavePermiso
export const CLAVE_DE_PRIVADAS = 'cotizaciones.privadas.ver' satisfies ClavePermiso

export type Ve = 'no' | 'suyas' | 'sin_privadas' | 'todas'

export const VALORES_DE_VE: readonly Ve[] = ['no', 'suyas', 'sin_privadas', 'todas']

export const ETIQUETA_DE_VE: Readonly<Record<Ve, string>> = {
  no: 'No ve',
  suyas: 'Sólo las suyas',
  sin_privadas: 'Todas menos las privadas',
  todas: 'Todas, también las privadas',
}

// Lo que quiere decir cada escalón, para la leyenda del cuadro (un `<select>` nativo no dibuja ayuda por opción).
export const AYUDA_DE_VE: Readonly<Record<Exclude<Ve, 'no'>, string>> = {
  suyas: 'Las que creó y las de sus clientes.',
  sin_privadas: 'Todas las del origen, salvo las privadas de otras personas.',
  todas: 'Todas las del origen, también las privadas de otras personas.',
}

export const MOTIVO_HEREDADO = 'Lo tiene en «Todos los orígenes»: para quitarlo, cámbialo ahí.'
export const MOTIVO_SIN_GESTIONAR_ROLES = 'Para cambiarlo te falta el permiso «Gestionar roles».'

// Lo que un rol tiene de los tres permisos en un lugar.
type Estado = { ver: Alcance | null; privadas: boolean; crea: boolean }

const NADA: Estado = { ver: null, privadas: false, crea: false }
const RANGO: Readonly<Record<Alcance, number>> = { propios: 1, todos: 2 }

const rango = (alcance: Alcance | null) => (alcance === null ? 0 : RANGO[alcance])
const mayor = (a: Alcance | null, b: Alcance | null) => (rango(a) >= rango(b) ? a : b)

function concesionEn(
  concesiones: Permisos,
  clave: ClavePermiso,
  origenId: string | null,
): Concesion | undefined {
  return concesiones.find((c) => c.clave === clave && c.origenId === origenId)
}

function estadoEn(concesiones: Permisos, origenId: string | null): Estado {
  return {
    ver: concesionEn(concesiones, CLAVE_DE_VER, origenId)?.alcance ?? null,
    privadas: concesionEn(concesiones, CLAVE_DE_PRIVADAS, origenId) !== undefined,
    crea: concesionEn(concesiones, CLAVE_DE_CREAR, origenId) !== undefined,
  }
}

// El escalón de un estado. Las privadas sólo suben un escalón sobre «todo»: con «lo propio» se lee «Sólo las suyas».
function veDe({ ver, privadas }: Pick<Estado, 'ver' | 'privadas'>): Ve {
  if (ver === null) return 'no'
  if (ver === 'propios') return 'suyas'
  return privadas ? 'todas' : 'sin_privadas'
}

// Lo que pide cada escalón: el alcance de `cotizaciones.ver` y si lleva las privadas.
const OBJETIVO: Readonly<Record<Ve, Pick<Estado, 'ver' | 'privadas'>>> = {
  no: { ver: null, privadas: false },
  suyas: { ver: 'propios', privadas: false },
  sin_privadas: { ver: 'todos', privadas: false },
  todas: { ver: 'todos', privadas: true },
}

const generalDe = (concesiones: Permisos, lugar: string | null) =>
  lugar === null ? NADA : estadoEn(concesiones, null)

export type CeldaDelCuadro = {
  // Lo que vale en ese lugar (lo suyo más lo heredado).
  crea: boolean
  ve: Ve
  // Lo que viene de «Todos los orígenes» (en «Todos los orígenes», nada).
  creaHeredado: boolean
  veHeredado: Ve
}

// Lo que se lee en la fila de un rol en un lugar (`null`: «Todos los orígenes»).
export function celdaDelCuadro(concesiones: Permisos, lugar: string | null): CeldaDelCuadro {
  const general = generalDe(concesiones, lugar)
  const local = estadoEn(concesiones, lugar)
  return {
    crea: general.crea || local.crea,
    ve: veDe({ ver: mayor(general.ver, local.ver), privadas: general.privadas || local.privadas }),
    creaHeredado: general.crea,
    veHeredado: veDe(general),
  }
}

export type ObjetivoDelCuadro = { crea: boolean } | { ve: Ve }

// Las concesiones que cambian para que el rol quede así en ese lugar, mínimas y en orden: primero se quitan las privadas, después cambia `ver`, después se
// dan las privadas (dar `ver` antes que las privadas y quitarlas antes que `ver`). `null`: no se llega desde ese lugar porque lo heredado ya da más.
export function cambiosDelCuadro(
  concesiones: Permisos,
  lugar: string | null,
  objetivo: ObjetivoDelCuadro,
): CambioDeConcesion[] | null {
  const general = generalDe(concesiones, lugar)
  const local = estadoEn(concesiones, lugar)
  return 'crea' in objetivo
    ? cambiosDeCrea(general.crea, local.crea, objetivo.crea, lugar)
    : cambiosDeVe(general, local, OBJETIVO[objetivo.ve], lugar)
}

function cambiosDeCrea(
  general: boolean,
  local: boolean,
  quiero: boolean,
  lugar: string | null,
): CambioDeConcesion[] | null {
  if (quiero) {
    return general || local
      ? []
      : [{ tipo: 'otorgar', clave: CLAVE_DE_CREAR, origenId: lugar, alcance: 'todos' }]
  }
  if (general) return null
  return local ? [{ tipo: 'revocar', clave: CLAVE_DE_CREAR, origenId: lugar }] : []
}

function cambiosDeVe(
  general: Estado,
  local: Estado,
  quiero: Pick<Estado, 'ver' | 'privadas'>,
  lugar: string | null,
): CambioDeConcesion[] | null {
  if (rango(general.ver) > rango(quiero.ver) || (general.privadas && !quiero.privadas)) {
    return null
  }
  const quitarPrivadas = !quiero.privadas && local.privadas
  const darPrivadas = quiero.privadas && !general.privadas && !local.privadas
  return [
    ...(quitarPrivadas
      ? [{ tipo: 'revocar', clave: CLAVE_DE_PRIVADAS, origenId: lugar } as const]
      : []),
    ...cambiosDeVer(general.ver, local.ver, quiero.ver, lugar),
    ...(darPrivadas
      ? [{ tipo: 'otorgar', clave: CLAVE_DE_PRIVADAS, origenId: lugar, alcance: 'todos' } as const]
      : []),
  ]
}

// `ver` en el lugar: lo de «Todos los orígenes» ya cubre hasta su alcance; sólo se da lo que falta y se quita lo que sobra.
function cambiosDeVer(
  general: Alcance | null,
  local: Alcance | null,
  quiero: Alcance | null,
  lugar: string | null,
): CambioDeConcesion[] {
  const revocar: CambioDeConcesion = { tipo: 'revocar', clave: CLAVE_DE_VER, origenId: lugar }
  if (quiero === null) return local === null ? [] : [revocar]
  if (general === quiero) return rango(local) > rango(quiero) ? [revocar] : []
  return local === quiero
    ? []
    : [{ tipo: 'otorgar', clave: CLAVE_DE_VER, origenId: lugar, alcance: quiero }]
}

// Por qué no se puede llegar a un objetivo desde este lugar, o `null` si se puede: lo heredado ya da más, o hay que dar algo que quien mira no tiene.
// Quitar siempre se puede (quien edita domina el rol: si no, la fila es sólo lectura).
export function motivoDelCambio(
  misPermisos: Permisos,
  concesiones: Permisos,
  lugar: string | null,
  objetivo: ObjetivoDelCuadro,
): string | null {
  const cambios = cambiosDelCuadro(concesiones, lugar, objetivo)
  if (cambios === null) return MOTIVO_HEREDADO
  const sinDominio = cambios.some(
    (cambio) =>
      cambio.tipo === 'otorgar' &&
      !concesionDominada(misPermisos, {
        clave: cambio.clave,
        origenId: cambio.origenId,
        alcance: cambio.alcance,
      }),
  )
  return sinDominio ? MOTIVO_CONCESION_NO_DOMINADA : null
}

export type OpcionDelCuadro = { valor: Ve; etiqueta: string; motivo: string | null }

// Los cuatro escalones para el «Ve» de un rol en un lugar, cada uno con su motivo si no se puede elegir (el de ahora, siempre elegible: no cambia nada).
export function opcionesDelCuadro(
  misPermisos: Permisos,
  concesiones: Permisos,
  lugar: string | null,
): OpcionDelCuadro[] {
  const actual = celdaDelCuadro(concesiones, lugar).ve
  return VALORES_DE_VE.map((valor) => ({
    valor,
    etiqueta: ETIQUETA_DE_VE[valor],
    motivo:
      valor === actual ? null : motivoDelCambio(misPermisos, concesiones, lugar, { ve: valor }),
  }))
}

export type FilaDelCuadro = {
  celda: CeldaDelCuadro
  // `null`: la fila se cambia; si no, por qué es sólo lectura (sin «Gestionar roles», o el rol tiene permisos que quien mira no tiene).
  sinCambiar: string | null
  // Por qué no se puede mover «Crea», o `null`.
  motivoDeCrea: string | null
  opciones: OpcionDelCuadro[]
}

// Todo lo que dibuja la fila de un rol en un lugar.
export function filaDelCuadro(
  misPermisos: Permisos,
  puedeGestionar: boolean,
  concesiones: Permisos,
  lugar: string | null,
): FilaDelCuadro {
  const celda = celdaDelCuadro(concesiones, lugar)
  let sinCambiar: string | null = null
  if (!puedeGestionar) sinCambiar = MOTIVO_SIN_GESTIONAR_ROLES
  else if (!rolDominado(misPermisos, concesiones)) sinCambiar = MOTIVO_ROL_NO_DOMINADO
  return {
    celda,
    sinCambiar,
    motivoDeCrea: motivoDelCambio(misPermisos, concesiones, lugar, { crea: !celda.crea }),
    opciones: opcionesDelCuadro(misPermisos, concesiones, lugar),
  }
}

const CLAVES_DEL_CUADRO: readonly ClavePermiso[] = [CLAVE_DE_CREAR, CLAVE_DE_VER, CLAVE_DE_PRIVADAS]

// El lugar se elige con dos orígenes o más. Con uno o ninguno el cuadro edita «Todos los orígenes», salvo que algún rol ya tenga uno de estos permisos en
// un origen suelto (dado en la matriz): entonces también se elige, para que eso no quede escondido.
export function conSelectorDeLugar(
  cantidadDeOrigenes: number,
  roles: readonly { concesiones: Permisos }[],
): boolean {
  return (
    cantidadDeOrigenes >= 2 ||
    roles.some((rol) =>
      rol.concesiones.some((c) => c.origenId !== null && CLAVES_DEL_CUADRO.includes(c.clave)),
    )
  )
}

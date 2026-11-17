// Qué muestra el resumen de un vehículo (`?vehiculo=`), sin salir de la lista: la versión corta de su ficha (portada con carrusel, datos clave, situación,
// «Relacionados» en chips, acciones y «Abrir ficha»), sin pestañas. Un `?pestana=fotos` viejo abre el visor del carrusel; otro `?pestana=` se quita. Editarlo
// abre el panel de edición encima del resumen y, al guardar o cancelar, vuelve a él (`?editar=`).
import type { Vehiculo } from './vehiculo'

export const CLAVE_DE_RESUMEN = 'vehiculo'
// Sólo para lo viejo: el resumen tuvo pestañas (`?pestana=fotos`).
export const CLAVE_DE_PESTANA = 'pestana'

// El mismo texto que el resumen de un lead, dicho para un vehículo: no se distingue por qué ya no está (no existe, está en la
// papelera, quien mira ya no lo ve o es de otro origen).
export const MENSAJE_DE_VEHICULO_NO_DISPONIBLE =
  'Este vehículo ya no está disponible: no existe o ya no tienes acceso.'

/** La clave del visor del carrusel del resumen (`?visor=<id>-resumen`): la fila de la lista usa la del vehículo, y con la misma se abrirían dos. */
export function claveDelVisorDelResumen(vehiculoId: string): string {
  return `${vehiculoId}-resumen`
}

/**
 * Qué hacer con un `?pestana=` viejo (el resumen ya no tiene pestañas): `fotos` abre el visor del carrusel del resumen; cualquier otro valor sólo
 * se quita (`visor: null`); sin pestaña, nada (`null`).
 */
export function destinoDeLaPestanaVieja(
  pestana: string | null,
  vehiculoId: string,
): { visor: string | null } | null {
  if (pestana === null) return null
  return { visor: pestana === 'fotos' ? claveDelVisorDelResumen(vehiculoId) : null }
}

// Cómo está la lectura del vehículo abierto. `no_disponible` junta lo que no existe, lo que está en la papelera y lo que quien mira
// ya no ve: no se distingue nada (no es un oráculo).
export type LecturaDelResumen =
  | { id: string; estado: 'listo'; vehiculo: Vehiculo }
  | { id: string; estado: 'no_disponible' }
  | { id: string; estado: 'error' }

export type VistaDelResumen =
  | { tipo: 'no_disponible' }
  | { tipo: 'error' }
  // El vehículo: `completo` cuando ya llegó la lectura (antes sólo se sabe lo de la fila de la página); `fallo` si la última
  // relectura no pudo.
  | { tipo: 'vehiculo'; vehiculo: Vehiculo; completo: boolean; fallo: boolean }
  | { tipo: 'cargando' }

type EntradaDeVista = {
  // El valor de `?vehiculo=` y si es un id válido.
  id: string | null
  idValido: boolean
  lectura: LecturaDelResumen | null
  // La fila de la página, si el vehículo está en ella.
  delListado: Vehiculo | null
  // El origen de la pestaña de la lista: el layout, las fases y las categorías que la página trajo son de ése.
  origenId: string
}

// Lo leído, o la fila de la página si es más nueva: tras editar, la página se vuelve a leer y trae la versión nueva.
function elMasNuevo(leido: Vehiculo, delListado: Vehiculo | null): Vehiculo {
  return delListado !== null && delListado.actualizadoEn > leido.actualizadoEn ? delListado : leido
}

// Qué dibuja el resumen según lo que se sabe. Un vehículo que desaparece o deja de ser visible mientras está abierto cae en
// `no_disponible`, con el mismo texto sea cual sea el motivo; uno de otro origen también (no se lo puede dibujar con el layout de éste).
export function vistaDelResumen(entrada: EntradaDeVista): VistaDelResumen {
  const { id, idValido, lectura, delListado, origenId } = entrada
  if (id === null) {
    return { tipo: 'cargando' }
  }
  if (!idValido || lectura?.estado === 'no_disponible') {
    return { tipo: 'no_disponible' }
  }
  if (lectura?.estado === 'listo') {
    return lectura.vehiculo.origenId === origenId
      ? {
          tipo: 'vehiculo',
          vehiculo: elMasNuevo(lectura.vehiculo, delListado),
          completo: true,
          fallo: false,
        }
      : { tipo: 'no_disponible' }
  }
  const fallo = lectura?.estado === 'error'
  if (delListado !== null) {
    return { tipo: 'vehiculo', vehiculo: delListado, completo: false, fallo }
  }
  return fallo ? { tipo: 'error' } : { tipo: 'cargando' }
}

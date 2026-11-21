// Cuándo el «⋯» de un vehículo ofrece cada acción (oculta, apagada con su motivo o habilitada), igual en la fila, la tarjeta y la ficha. Sin I/O: lo
// que se sabe de quien mira y del vehículo llega ya resuelto (la base decide quién edita: `editablesDe()`; la vitrina y la papelera, sus permisos).
import type { ClaveDeAccionDeVehiculo, OfertaDeAccion } from './acciones-de-vehiculo'
import type { PermisoDePapelera } from './papelera-permiso'
import type { PermisoDeVitrina } from './vitrina'

export const SIN_PERMISO_PARA_EDITAR = 'No tienes permiso para editar este vehículo.'
export const SIN_ENTRADA_PARA_CONSULTAR = 'No tiene enlace, lote ni VIN para consultar la subasta.'

// Qué puede quien mira con la edición de este vehículo: lo edita; tiene `vehiculos.editar` en el origen pero éste no es suyo («propios»); o no
// edita nada en el origen.
export type EdicionDelMenu = 'editable' | 'propios' | 'sin_permiso'

export type EntradaDelMenuDeVehiculo = {
  // Cotiza en el origen (`origenesParaCotizar()`).
  cotizar: boolean
  edicion: EdicionDelMenu
  // La vitrina del origen; null = no se ofrece (la lista sin el permiso).
  publicar: PermisoDeVitrina | null
  // Un origen de subasta con apibara encendida; `consultable` = tiene enlace, lote o VIN con qué preguntar (`entradaDeRefresco()`). null = no aplica.
  subasta: { consultable: boolean } | null
  // La superficie puede abrir «Editar fechas de subasta» (la ficha de un vehículo de un origen de subasta: es la que monta su modal). La fila y la tarjeta, false.
  fechas: boolean
  // Con `actividad.ver`.
  actividad: boolean
  papelera: PermisoDePapelera
}

export type OfertaConMotivo = { oferta: OfertaDeAccion; motivo: string | null }

export type OfertasConMotivo = Readonly<Record<ClaveDeAccionDeVehiculo, OfertaConMotivo>>

const OCULTA: OfertaConMotivo = { oferta: 'oculta', motivo: null }
const HABILITADA: OfertaConMotivo = { oferta: 'habilitada', motivo: null }
const apagada = (motivo: string): OfertaConMotivo => ({ oferta: 'apagada', motivo })
const si = (condicion: boolean): OfertaConMotivo => (condicion ? HABILITADA : OCULTA)

// Editar, sus imágenes, sus fechas de subasta y la subasta comparten la regla: sin permiso en el origen no aparecen (un lector no ve un «⋯» lleno de apagadas); con el
// permiso y un vehículo ajeno, apagadas con el motivo.
function porEdicion(edicion: EdicionDelMenu): OfertaConMotivo {
  switch (edicion) {
    case 'editable':
      return HABILITADA
    case 'propios':
      return apagada(SIN_PERMISO_PARA_EDITAR)
    case 'sin_permiso':
      return OCULTA
  }
}

// «Actualizar los datos»: sólo en un origen de subasta con apibara; sin algo con qué preguntar, apagada con el motivo.
function porSubasta(entrada: EntradaDelMenuDeVehiculo): OfertaConMotivo {
  const edicion = porEdicion(entrada.edicion)
  if (entrada.subasta === null || edicion.oferta !== 'habilitada') {
    return entrada.subasta === null ? OCULTA : edicion
  }
  return entrada.subasta.consultable ? HABILITADA : apagada(SIN_ENTRADA_PARA_CONSULTAR)
}

function porPermiso(permiso: PermisoDeVitrina | PermisoDePapelera | null): OfertaConMotivo {
  if (permiso === null || permiso.estado === 'oculto') {
    return OCULTA
  }
  return permiso.estado === 'deshabilitado' ? apagada(permiso.motivo) : HABILITADA
}

export function ofertasDelMenuDeVehiculo(entrada: EntradaDelMenuDeVehiculo): OfertasConMotivo {
  const edicion = porEdicion(entrada.edicion)
  return {
    cotizar: si(entrada.cotizar),
    editar: edicion,
    imagenes: edicion,
    fechas: entrada.fechas ? edicion : OCULTA,
    publicar: porPermiso(entrada.publicar),
    actualizar: porSubasta(entrada),
    actividad: si(entrada.actividad),
    papelera: porPermiso(entrada.papelera),
  }
}

// Sólo las ofertas, para `accionesDeVehiculo()`.
export function soloLasOfertas(
  ofertas: OfertasConMotivo,
): Record<ClaveDeAccionDeVehiculo, OfertaDeAccion> {
  return Object.fromEntries(
    Object.entries(ofertas).map(([clave, { oferta }]) => [clave, oferta]),
  ) as Record<ClaveDeAccionDeVehiculo, OfertaDeAccion>
}

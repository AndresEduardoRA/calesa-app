import type { AccionDeMenu } from '@/shared/ui/lista'

// «Nuevo <x>» del «⋯» de una tarjeta de catálogo, después de «Editar»: apagada al tope, con su motivo debajo.
export function accionDeNuevo(
  etiqueta: string,
  motivoDelTope: string | null,
  alElegir: () => void,
): AccionDeMenu[] {
  return [
    {
      tipo: 'accion',
      clave: 'nuevo',
      etiqueta,
      despuesDeCerrar: true,
      deshabilitada: motivoDelTope !== null,
      alElegir,
    },
    ...(motivoDelTope === null
      ? []
      : [{ tipo: 'nota', clave: 'tope', texto: motivoDelTope } as const]),
  ]
}

// Cuántas activas se dibujan en la lista corta de una tarjeta de catálogo: el resto se dice con «y N más».
export const ACTIVAS_EN_LA_TARJETA = 5

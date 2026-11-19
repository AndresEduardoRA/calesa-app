import { describe, expect, it } from 'vitest'
import {
  A_LA_VISTA_EN_LA_GUARDADA,
  BLOQUES_DEL_MENU_DE_COTIZACION,
  ETIQUETA_DE_ACCION_DE_COTIZACION,
  accionesDeCotizacion,
  type ClaveDeAccionDeCotizacion,
} from './acciones-de-cotizacion'

const CLAVES = Object.keys(ETIQUETA_DE_ACCION_DE_COTIZACION) as ClaveDeAccionDeCotizacion[]
const todas = Object.fromEntries(CLAVES.map((clave) => [clave, { motivo: null }]))

// Las que ofrece el «⋯» de una fila del listado (`src/app/(app)/cotizaciones/menus-de-la-pagina.ts`): nunca las que sólo tiene el detalle.
const DE_LA_LISTA: readonly ClaveDeAccionDeCotizacion[] = [
  'compartir',
  'aprobar',
  'final',
  'favorita',
  'reportar',
  'invalidar',
  'descartar',
  'reactivar',
  'papelera',
]
const deLaLista = Object.fromEntries(DE_LA_LISTA.map((clave) => [clave, { motivo: null }]))

describe('accionesDeCotizacion', () => {
  it('con todo ofrecido, los bloques y su orden son los de la lista única, con cada clave una vez', () => {
    expect(accionesDeCotizacion(todas)).toEqual(BLOQUES_DEL_MENU_DE_COTIZACION)
    expect(BLOQUES_DEL_MENU_DE_COTIZACION.flat().toSorted()).toEqual(CLAVES.toSorted())
  })

  it('compartir va primero y solo; lo destructivo, al final y solo', () => {
    expect(BLOQUES_DEL_MENU_DE_COTIZACION[0]).toEqual(['compartir'])
    expect(ETIQUETA_DE_ACCION_DE_COTIZACION.compartir).toBe('Compartir cotización…')
    expect(BLOQUES_DEL_MENU_DE_COTIZACION.at(-1)).toEqual(['papelera'])
  })

  it('lo que no se ofrece no aparece, y un bloque sin nada desaparece', () => {
    expect(
      accionesDeCotizacion({ favorita: { motivo: null }, reportar: { motivo: null } }),
    ).toEqual([['favorita', 'reportar']])
    expect(accionesDeCotizacion({})).toEqual([])
  })

  it('una apagada (con motivo) sigue en su lugar: la oferta dice por qué', () => {
    expect(
      accionesDeCotizacion({ aprobar: { motivo: 'Para aprobarla, asígnale un vehículo.' } }),
    ).toEqual([['aprobar']])
  })

  it('el «⋯» de la lista no cambia: compartir, aprobar y final, favorita y reportar, moderar y la papelera', () => {
    expect(accionesDeCotizacion(deLaLista)).toEqual([
      ['compartir'],
      ['aprobar', 'final'],
      ['favorita', 'reportar'],
      ['invalidar', 'descartar', 'reactivar'],
      ['papelera'],
    ])
  })

  it('el «⋯» del detalle deja afuera lo que está a la vista, en el orden de la spec', () => {
    expect(
      accionesDeCotizacion(todas, { aLaVista: A_LA_VISTA_EN_LA_GUARDADA })
        .flat()
        .map((clave) => ETIQUETA_DE_ACCION_DE_COTIZACION[clave]),
    ).toEqual([
      'Vista previa',
      'Descargar PDF',
      'Revisiones',
      'Marcar final…',
      'Emitir comprobante…',
      'Cotizar encima',
      'Favorita',
      'Reportar…',
      'Invalidar…',
      'Descartar los reportes…',
      'Reactivar…',
      'Enviar a la papelera',
    ])
    expect(accionesDeCotizacion(todas, { aLaVista: A_LA_VISTA_EN_LA_GUARDADA }).at(-1)).toEqual([
      'papelera',
    ])
  })

  it('el «⋯» del detalle y el de la lista ofrecen lo mismo en el mismo orden', () => {
    const delDetalle = accionesDeCotizacion(todas, { aLaVista: A_LA_VISTA_EN_LA_GUARDADA }).flat()
    const deLaListaSinLoALaVista = accionesDeCotizacion(deLaLista)
      .flat()
      .filter((clave) => !A_LA_VISTA_EN_LA_GUARDADA.includes(clave))
    expect(delDetalle.filter((clave) => DE_LA_LISTA.includes(clave))).toEqual(
      deLaListaSinLoALaVista,
    )
  })
})

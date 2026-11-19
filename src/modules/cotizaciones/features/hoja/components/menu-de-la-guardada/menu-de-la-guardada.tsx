'use client'

import { Trash2Icon } from 'lucide-react'
import { useContext } from 'react'
import { MasAcciones, type AccionDeMenu } from '@/shared/ui/lista'
import {
  A_LA_VISTA_EN_LA_GUARDADA,
  ETIQUETA_DE_ACCION_DE_COTIZACION,
  accionesDeCotizacion,
  type ClaveDeAccionDeCotizacion,
} from '../../../../entities/acciones-de-cotizacion'
import { ContextoDelMenuEstable, ContextoDelMenuVivo, type LineaDelMenu } from './contexto'

// Una línea sumada, como la dibuja `<MasAcciones>`: apagada con su motivo debajo (como en el «⋯» del listado), la papelera en rojo y al final.
function lineasDe(clave: ClaveDeAccionDeCotizacion, linea: LineaDelMenu): AccionDeMenu[] {
  const etiqueta = ETIQUETA_DE_ACCION_DE_COTIZACION[clave]
  if (linea.tipo === 'casilla') {
    return [
      {
        tipo: 'casilla',
        clave,
        etiqueta,
        marcada: linea.marcada,
        deshabilitada: linea.ocupada === true,
        alCambiar: linea.alCambiar,
      },
    ]
  }
  const motivo = linea.motivo ?? null
  const papelera = clave === 'papelera'
  return [
    {
      tipo: 'accion',
      clave,
      etiqueta: linea.etiqueta ?? etiqueta,
      deshabilitada: motivo !== null || linea.ocupada === true,
      ...(linea.abre === true ? { despuesDeCerrar: true } : {}),
      ...(papelera ? { destructiva: true, icono: <Trash2Icon aria-hidden /> } : {}),
      alElegir: linea.alElegir,
    },
    ...(motivo === null
      ? []
      : [{ tipo: 'nota' as const, clave: `motivo-${clave}`, texto: motivo }]),
  ]
}

// El «⋯» de la cabecera de una guardada (`docs/UX.md` › «Cotización guardada»): lo que no está a la vista («Compartir» y «Aprobar»), en el orden de la lista única
// (`accionesDeCotizacion()`, la misma del «⋯» del listado) y con un separador entre bloques. Cada línea la suma quien la hace (`useAporteAlMenu()`); lo que llega tarde
// (las marcas y los comprobantes, tras `<Suspense>`) aparece solo. El botón se dibuja siempre, también antes de que lleguen las líneas: no salta.
export function MenuDeLaGuardada({
  cotizacionId,
  numero,
}: {
  cotizacionId: string
  numero: number
}) {
  const menu = useContext(ContextoDelMenuEstable)
  const { lineas } = useContext(ContextoDelMenuVivo)
  if (menu === null) {
    return null
  }
  const acciones = accionesDeCotizacion(lineas, { aLaVista: A_LA_VISTA_EN_LA_GUARDADA }).flatMap(
    (bloque, indice) => [
      ...(indice > 0 ? [{ tipo: 'separador' as const, clave: `separador-${String(indice)}` }] : []),
      ...bloque.flatMap((clave) => {
        const linea = lineas[clave]
        return linea === undefined ? [] : lineasDe(clave, linea)
      }),
    ],
  )
  return (
    <MasAcciones
      nombre={`N.º ${String(numero)}`}
      id={cotizacionId}
      botonRef={menu.botonRef}
      conBorde
      acciones={acciones}
    />
  )
}

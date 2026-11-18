'use client'

import { useRouter } from 'next/navigation'
import type { ComponentProps } from 'react'
import type { MenuDeUnaFila } from '@/modules/cotizaciones/pantallas/listado'
import { HUECOS_DE_APROBADA_EN_EL_RESUMEN } from '@/modules/cotizaciones/pantallas/aprobada-resumen'
import { DialogosDeMarcasDeLaFila } from '@/modules/cotizaciones/pantallas/comentarios-listado'
import { HUECOS_DE_COMENTARIOS_EN_EL_RESUMEN } from '@/modules/cotizaciones/pantallas/comentarios-resumen'
import { HUECOS_DE_COMPROBANTES_EN_EL_RESUMEN } from '@/modules/cotizaciones/pantallas/comprobantes-resumen'
import { DialogoDeMarcarFinalDeLaFila } from '@/modules/cotizaciones/pantallas/final-listado'
import { ListadoDeCotizaciones } from '@/modules/cotizaciones/pantallas/listado'
import { MenuDeLaFila } from './menu-de-la-fila'
import { useAccionesDeLaLista } from './use-acciones-de-la-lista'

type Props = Omit<
  ComponentProps<typeof ListadoDeCotizaciones>,
  'menuDeFila' | 'dialogos' | 'huecosDelResumen' | 'alCambiarLaAprobada'
> & {
  // El menú de cada fila de la página (versión, marcas y lo que ofrece), por id: lo calcula el servidor (`menus-de-la-pagina.ts`). Una fila sin menú no tiene «⋯».
  menus: Readonly<Record<string, MenuDeUnaFila>>
}

// Lo que las áreas `comentarios`, `comprobantes` y `aprobada` llenan en el resumen: las pestañas, en «Adjuntos» los comprobantes y «De este vehículo». Sólo cáscaras con
// `diferido()`: el listado no paga su código.
const HUECOS_DEL_RESUMEN = {
  ...HUECOS_DE_COMENTARIOS_EN_EL_RESUMEN,
  ...HUECOS_DE_COMPROBANTES_EN_EL_RESUMEN,
  ...HUECOS_DE_APROBADA_EN_EL_RESUMEN,
}

// El listado de cotizaciones con su columna de acciones: une el «⋯» de cada fila con lo que hace cada área (aprobar, marcar final, favorita, reportar, moderar y la papelera: las mismas
// actions y los mismos diálogos de la guardada) y monta los diálogos una vez. Es un Client Component porque el «⋯» necesita las filas y sus funciones; el servidor sólo manda datos.
export function ListadoConAcciones({ menus, ...props }: Props) {
  const filas = props.pagina.filas
  const acciones = useAccionesDeLaLista(filas, menus)
  const router = useRouter()
  return (
    <ListadoDeCotizaciones
      {...props}
      huecosDelResumen={HUECOS_DEL_RESUMEN}
      // Aprobar desde «De este vehículo» del resumen cambia la insignia de otras filas: el listado no tiene nada tipeado y se refresca (como «Aprobar» del «⋯»).
      alCambiarLaAprobada={() => {
        router.refresh()
      }}
      menuDeFila={(fila) => {
        const menu = menus[fila.id]
        return menu === undefined ? null : (
          <MenuDeLaFila
            cotizacion={fila}
            menu={menu}
            favorita={acciones.esFavorita(fila.id)}
            enCurso={acciones.enCurso(fila.id)}
            acciones={acciones.accionesDe(fila, menu)}
          />
        )
      }}
      dialogos={
        <>
          <DialogoDeMarcarFinalDeLaFila
            de={(id) => {
              const fila = filas.find((una) => una.id === id)
              const oferta = menus[id]?.ofertas.final
              return fila === undefined || oferta === undefined
                ? null
                : { numero: fila.numero, motivo: oferta.motivo }
            }}
          />
          <DialogosDeMarcasDeLaFila datos={acciones.datosDeMarcas} />
        </>
      }
    />
  )
}

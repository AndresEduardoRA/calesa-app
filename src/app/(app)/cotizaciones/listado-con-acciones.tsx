'use client'

import type { ComponentProps } from 'react'
import type { MenuDeUnaFila } from '@/modules/cotizaciones/client'
import { DialogosDeMarcasDeLaFila } from '@/modules/cotizaciones/pantallas/comentarios-listado'
import { DialogoDeMarcarFinalDeLaFila } from '@/modules/cotizaciones/pantallas/final-listado'
import { ListadoDeCotizaciones } from '@/modules/cotizaciones/pantallas/listado'
import { MenuDeLaFila } from './menu-de-la-fila'
import { useAccionesDeLaLista } from './use-acciones-de-la-lista'

type Props = Omit<ComponentProps<typeof ListadoDeCotizaciones>, 'menuDeFila' | 'dialogos'> & {
  // El menú de cada fila de la página (versión, marcas y lo que ofrece), por id: lo calcula el servidor (`menus-de-la-pagina.ts`). Una fila sin menú no tiene «⋯».
  menus: Readonly<Record<string, MenuDeUnaFila>>
}

// El listado de cotizaciones con su columna de acciones: une el «⋯» de cada fila con lo que hace cada área (aprobar, marcar final, favorita, reportar, moderar y la papelera: las mismas
// actions y los mismos diálogos de la guardada) y monta los diálogos una vez. Es un Client Component porque el «⋯» necesita las filas y sus funciones; el servidor sólo manda datos.
export function ListadoConAcciones({ menus, ...props }: Props) {
  const filas = props.pagina.filas
  const acciones = useAccionesDeLaLista(filas, menus)
  return (
    <ListadoDeCotizaciones
      {...props}
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

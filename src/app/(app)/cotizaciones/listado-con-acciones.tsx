'use client'

import { useRouter } from 'next/navigation'
import { useMemo, type ComponentProps } from 'react'
import type { MenuDeUnaFila } from '@/modules/cotizaciones/pantallas/listado'
import { HUECOS_DE_APROBADA_EN_EL_RESUMEN } from '@/modules/cotizaciones/pantallas/aprobada-resumen'
import { DialogosDeMarcasDeLaFila } from '@/modules/cotizaciones/pantallas/comentarios-listado'
import { HUECOS_DE_COMENTARIOS_EN_EL_RESUMEN } from '@/modules/cotizaciones/pantallas/comentarios-resumen'
import { HUECOS_DE_COMPROBANTES_EN_EL_RESUMEN } from '@/modules/cotizaciones/pantallas/comprobantes-resumen'
import { DialogoDeMarcarFinalDeLaFila } from '@/modules/cotizaciones/pantallas/final-listado'
import { ListadoDeCotizaciones } from '@/modules/cotizaciones/pantallas/listado'
import { CompararDelGrupoDiferido } from '@/modules/cotizaciones/pantallas/aprobada-listado'
import {
  DialogoDeCompartirDeLaFila,
  useAbrirCompartirDeLaFila,
} from '@/modules/cotizaciones/pantallas/tarjeta-compartir'
import { ImagenDeLaTarjeta } from '@/modules/cotizaciones/pantallas/tarjeta-imagen'
import { HUECOS_DE_TARJETA_EN_EL_RESUMEN } from '@/modules/cotizaciones/pantallas/tarjeta-resumen'
import { useLive } from '@/shared/ui/live'
import { conLaDelResumen } from './la-del-resumen'
import { MenuDeLaFila } from './menu-de-la-fila'
import { useAccionesDeLaLista } from './use-acciones-de-la-lista'

type Props = Omit<
  ComponentProps<typeof ListadoDeCotizaciones>,
  'menuDeFila' | 'compartirDe' | 'huecos' | 'dialogos' | 'huecosDelResumen' | 'alCambiarLaAprobada'
> & {
  // El menú de cada fila de la página (versión, marcas y lo que ofrece), por id: lo calcula el servidor (`menus-de-la-pagina.ts`). Una fila sin menú no tiene «⋯».
  menus: Readonly<Record<string, MenuDeUnaFila>>
}

// Lo que las áreas `tarjeta`, `comentarios`, `comprobantes` y `aprobada` llenan en el resumen: la imagen de la tarjeta, las pestañas, en «Adjuntos» los comprobantes y «De este vehículo». Sólo cáscaras con
// `diferido()`: el listado no paga su código.
const HUECOS_DEL_RESUMEN = {
  ...HUECOS_DE_TARJETA_EN_EL_RESUMEN,
  ...HUECOS_DE_COMENTARIOS_EN_EL_RESUMEN,
  ...HUECOS_DE_COMPROBANTES_EN_EL_RESUMEN,
  ...HUECOS_DE_APROBADA_EN_EL_RESUMEN,
}

// Lo que las áreas `tarjeta` y `aprobada` llenan en la lista: la imagen de cada tarjeta (en frío: se ve al llegar) y «Comparar» de un grupo desplegado (diferido).
const HUECOS_DE_LA_LISTA = { Imagen: ImagenDeLaTarjeta, Comparar: CompararDelGrupoDiferido }

// El listado de cotizaciones con su columna de acciones: une el «⋯» de cada fila con lo que hace cada área (compartir, aprobar, marcar final, favorita, reportar, moderar y la papelera: las mismas
// actions y los mismos diálogos de la guardada) y monta los diálogos una vez. Es un Client Component porque el «⋯» necesita las filas y sus funciones; el servidor sólo manda datos.
export function ListadoConAcciones({ menus, ...props }: Props) {
  // Las cotizaciones que dibuja la página (la cabeza de cada grupo y cada una sola) y la del resumen que no está en ella (una línea de un grupo desplegado, otra página):
  // sus diálogos piden sus datos.
  const { pagina, delServidor } = props
  const filas = useMemo(
    () =>
      conLaDelResumen(
        pagina.filas.map((entrada) =>
          entrada.tipo === 'grupo' ? entrada.cabeza : entrada.cotizacion,
        ),
        delServidor,
      ),
    [pagina, delServidor],
  )
  const acciones = useAccionesDeLaLista(filas, menus)
  const router = useRouter()
  const { live } = useLive()
  const abrirCompartir = useAbrirCompartirDeLaFila()
  return (
    <ListadoDeCotizaciones
      {...props}
      huecos={HUECOS_DE_LA_LISTA}
      huecosDelResumen={HUECOS_DEL_RESUMEN}
      // «Compartir» de la tarjeta: lo que ofrece su «⋯» (sin Modo Live), con el mismo panel.
      compartirDe={(fila) =>
        live || menus[fila.id]?.ofertas.compartir === undefined
          ? null
          : () => {
              abrirCompartir(fila.id)
            }
      }
      // Aprobar desde «De este vehículo» del resumen cambia la insignia de otras filas: el listado no tiene nada tipeado y se refresca (como «Aprobar» del «⋯»).
      alCambiarLaAprobada={() => {
        router.refresh()
      }}
      menuDeFila={(fila, opciones) => {
        const menu = menus[fila.id]
        return menu === undefined ? null : (
          <MenuDeLaFila
            cotizacion={fila}
            menu={menu}
            sinCompartir={opciones?.sinCompartir === true}
            conBorde={opciones?.conBorde === true}
            favorita={acciones.esFavorita(fila.id)}
            enCurso={acciones.enCurso(fila.id)}
            acciones={acciones.accionesDe(fila, menu)}
          />
        )
      }}
      dialogos={
        <>
          <DialogoDeCompartirDeLaFila />
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

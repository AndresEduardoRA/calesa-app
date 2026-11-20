'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { cambiarLaPrivada, type MenuDeUnaFila } from '@/modules/cotizaciones/pantallas/listado'
import {
  aprobarLaCotizacion,
  useAprobarPrivadaPorUrl,
} from '@/modules/cotizaciones/pantallas/aprobada-listado'
import {
  useAbrirMarcasDeLaFila,
  useFavoritaDeLaFila,
  type DatosDeMarcasDeUnaFila,
} from '@/modules/cotizaciones/pantallas/comentarios-listado'
import { useAbrirMarcarFinalDeLaFila } from '@/modules/cotizaciones/pantallas/final-listado'
import { enviarLaCotizacionALaPapelera } from '@/modules/cotizaciones/pantallas/papelera-listado'
import { useAbrirCompartirDeLaFila } from '@/modules/cotizaciones/pantallas/tarjeta-compartir'
import type { AccionesDeLaFila } from './menu-de-la-fila'

type Fila = { id: string; numero: number }
type Menus = Readonly<Record<string, MenuDeUnaFila>>

const MODERAR = ['invalidar', 'descartar', 'reactivar'] as const

// Lo que lo moderable y reportable de cada fila de la página: las mismas referencias entre renders (`useUltimo` de los diálogos las pide estables).
function datosDeMarcasDe(
  filas: readonly Fila[],
  menus: Menus,
): Map<string, DatosDeMarcasDeUnaFila> {
  const datos = new Map<string, DatosDeMarcasDeUnaFila>()
  for (const fila of filas) {
    const menu = menus[fila.id]
    if (menu !== undefined) {
      datos.set(fila.id, {
        numero: fila.numero,
        actualizadoEn: menu.actualizadoEn,
        miMotivo: menu.miMotivo,
        acciones: MODERAR.filter((accion) => menu.ofertas[accion] !== undefined),
      })
    }
  }
  return datos
}

// Las cotizaciones con algo en vuelo (aprobar, enviar, la marca de privada): apagadas hasta que la base responde.
function useOcupadas() {
  const [ocupadas, setOcupadas] = useState<ReadonlySet<string>>(new Set())
  async function conOcupada(id: string, hacer: () => Promise<unknown>) {
    setOcupadas((ids) => new Set(ids).add(id))
    try {
      await hacer()
    } finally {
      setOcupadas((ids) => {
        const siguiente = new Set(ids)
        siguiente.delete(id)
        return siguiente
      })
    }
  }
  return { ocupadas, conOcupada }
}

// Lo que hace cada acción del «⋯» de una fila del listado, con las actions y los diálogos de cada área (las mismas de la guardada): compartir abre su panel; aprobar y enviar a la papelera se hacen de una, con su
// «Deshacer»; la favorita cambia al tocar; marcar final, reportar y moderar abren su diálogo en la URL. Qué cotizaciones tienen algo en vuelo (aprobar o enviar) se apagan hasta que
// la base responde.
export function useAccionesDeLaLista(filas: readonly Fila[], menus: Menus) {
  const router = useRouter()
  const abrirFinal = useAbrirMarcarFinalDeLaFila()
  const abrirCompartir = useAbrirCompartirDeLaFila()
  const marcas = useAbrirMarcasDeLaFila()
  const preguntaDeLaPrivada = useAprobarPrivadaPorUrl('fila')
  const leidas = useMemo(
    () => new Map(Object.entries(menus).map(([id, menu]) => [id, menu.favorita])),
    [menus],
  )
  const favoritas = useFavoritaDeLaFila(leidas)
  const { ocupadas, conOcupada } = useOcupadas()
  const datosDeMarcas = useMemo(() => datosDeMarcasDe(filas, menus), [filas, menus])

  // Aprobar una fila: con su versión y, al entrar, la página se vuelve a leer (la anterior aprobada del vehículo deja de serlo).
  function pedidoDeAprobar(fila: Fila, menu: MenuDeUnaFila) {
    return {
      id: fila.id,
      numero: fila.numero,
      actualizadoEn: menu.actualizadoEn,
      alCambiar: () => {
        router.refresh()
      },
    }
  }

  function accionesDe(fila: Fila, menu: MenuDeUnaFila): AccionesDeLaFila {
    return {
      compartir: () => {
        abrirCompartir(fila.id)
      },
      // Una privada pregunta antes (`DialogoDeAprobarPrivada`, que monta `useMenusDeLasFilas`); si la página no lo sabía, lo dice la base y abre la misma pregunta.
      aprobar: () => {
        if (menu.privada) {
          preguntaDeLaPrivada.abrir(fila.id)
          return
        }
        void conOcupada(fila.id, () =>
          aprobarLaCotizacion({
            ...pedidoDeAprobar(fila, menu),
            alSerPrivada: () => {
              preguntaDeLaPrivada.abrir(fila.id)
            },
          }),
        )
      },
      marcarFinal: () => {
        abrirFinal(fila.id)
      },
      cambiarPrivada: (privada) => {
        void conOcupada(fila.id, async () => {
          const quedo = await cambiarLaPrivada({
            id: fila.id,
            numero: fila.numero,
            privada,
            actualizadoEn: menu.actualizadoEn,
          })
          // La versión y la insignia cambiaron: la página se vuelve a leer.
          if (quedo !== null) router.refresh()
        })
      },
      favorita: (valor) => {
        favoritas.poner(fila.id, valor)
      },
      reportar: () => {
        marcas.reportar(fila.id)
      },
      moderar: (accion) => {
        marcas.moderar(fila.id, accion)
      },
      enviarALaPapelera: () => {
        void conOcupada(fila.id, () =>
          enviarLaCotizacionALaPapelera({ id: fila.id, actualizadoEn: menu.actualizadoEn }),
        )
      },
    }
  }

  return {
    accionesDe,
    pedidoDeAprobar,
    datosDeMarcas,
    esFavorita: favoritas.esFavorita,
    enCurso: (id: string) => ({ general: ocupadas.has(id), favorita: favoritas.enCurso(id) }),
  }
}

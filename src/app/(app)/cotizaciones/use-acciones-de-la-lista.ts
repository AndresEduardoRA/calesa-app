'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import type { MenuDeUnaFila } from '@/modules/cotizaciones/client'
import { aprobarLaCotizacion } from '@/modules/cotizaciones/pantallas/aprobada-listado'
import {
  useAbrirMarcasDeLaFila,
  useFavoritaDeLaFila,
  type DatosDeMarcasDeUnaFila,
} from '@/modules/cotizaciones/pantallas/comentarios-listado'
import { useAbrirMarcarFinalDeLaFila } from '@/modules/cotizaciones/pantallas/final-listado'
import { enviarLaCotizacionALaPapelera } from '@/modules/cotizaciones/pantallas/papelera-listado'
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

// Lo que hace cada acción del «⋯» de una fila del listado, con las actions y los diálogos de cada área (las mismas de la guardada): aprobar y enviar a la papelera se hacen de una, con su
// «Deshacer»; la favorita cambia al tocar; marcar final, reportar y moderar abren su diálogo en la URL. Qué cotizaciones tienen algo en vuelo (aprobar o enviar) se apagan hasta que
// la base responde.
export function useAccionesDeLaLista(filas: readonly Fila[], menus: Menus) {
  const router = useRouter()
  const abrirFinal = useAbrirMarcarFinalDeLaFila()
  const marcas = useAbrirMarcasDeLaFila()
  const leidas = useMemo(
    () => new Map(Object.entries(menus).map(([id, menu]) => [id, menu.favorita])),
    [menus],
  )
  const favoritas = useFavoritaDeLaFila(leidas)
  const [ocupadas, setOcupadas] = useState<ReadonlySet<string>>(new Set())
  const datosDeMarcas = useMemo(() => datosDeMarcasDe(filas, menus), [filas, menus])

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

  function accionesDe(fila: Fila, menu: MenuDeUnaFila): AccionesDeLaFila {
    return {
      aprobar: () => {
        void conOcupada(fila.id, () =>
          aprobarLaCotizacion({
            id: fila.id,
            numero: fila.numero,
            actualizadoEn: menu.actualizadoEn,
            // La anterior aprobada del vehículo deja de serlo: la página se vuelve a leer.
            alCambiar: () => {
              router.refresh()
            },
          }),
        )
      },
      marcarFinal: () => {
        abrirFinal(fila.id)
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
    datosDeMarcas,
    esFavorita: favoritas.esFavorita,
    enCurso: (id: string) => ({ general: ocupadas.has(id), favorita: favoritas.enCurso(id) }),
  }
}

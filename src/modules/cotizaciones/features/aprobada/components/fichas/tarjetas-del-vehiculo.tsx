'use client'

import { useEffect, useEffectEvent, useId, useState, type ComponentType } from 'react'
import { createPortal } from 'react-dom'
import {
  motivoParaNoAprobarEsta,
  type AprobarEn,
} from '../../../../entities/aprobada/de-este-vehiculo'
import {
  alternar,
  casillaApagada,
  elegidasEnLaLista,
} from '../../../../entities/aprobada/eleccion-para-comparar'
import { tarjetaDeEsteVehiculo } from '../../../../entities/aprobada/tarjeta-de-este-vehiculo'
import { rutaDelListado } from '../../../../entities/ruta-de-la-hoja'
import { tarjetasALaVista } from '../../../../entities/tarjetas-de-la-ficha'
import type { PropsDeLasTarjetasDeLaFicha } from '../../../fichas/components/tipos'
import { useAlCambiarLaAprobada } from '../../hooks/aprobada-del-vehiculo'
import { useAprobarEsta } from '../../hooks/use-aprobar-esta'
import { useDeEsteVehiculo } from '../../hooks/use-de-este-vehiculo'
import { BotonComparar } from '../de-este-vehiculo/boton-comparar'
import { CasillaDeComparar } from '../de-este-vehiculo/casilla-de-comparar'
import { AprobarEstaDeLaTarjeta } from './aprobar-esta-de-la-tarjeta'

export type PropsDeLasTarjetasDelVehiculo = {
  vehiculo: { id: string; titulo: string | null }
  // Dónde aprueba quien mira (`origenesCon(permisos, 'cotizaciones.aprobar')`, del servidor).
  aprobarEn: AprobarEn
  // La ficha, adonde vuelve «Comparar cotizaciones» (`returnTo`).
  volverA: string
  // El lugar que el servidor deja junto al título del bloque, donde la isla pone «Comparar» con un portal (el título no se vuelve a montar).
  ranuraDeComparar: string
  // La fila de tarjetas con sus estados, que dibuja el listado (por hueco: un área no importa otra); `src/app` le une la imagen y «Compartir» del área `tarjeta`.
  Tarjetas: ComponentType<PropsDeLasTarjetasDeLaFicha>
  // Tras aprobar o deshacer: la ficha se refresca (la «Cotización aprobada» de la izquierda se lee en el servidor).
  alCambiar: () => void
}

// El lugar del servidor donde va «Comparar», leído una vez al montarse: la isla sólo se dibuja en el navegador (`diferido()`) y la ranura ya está en el documento.
function useRanura(id: string): HTMLElement | null {
  const [ranura] = useState(() => document.getElementById(id))
  return ranura
}

// Las cotizaciones de la ficha del vehículo: las últimas 10 que quien mira ve, la aprobada primero y marcada, en una fila de tarjetas con «Ver más» a `/cotizaciones?vehiculo=`
// si hay más. Cada tarjeta, además de abrir el resumen y compartir, lleva «Aprobar esta» (con su permiso y su motivo) y su casilla para «Comparar» 2 o 3, cuyo botón va en el
// título del bloque. Se lee al montarse desde el navegador; tras aprobar relee su primera página y avisa a las otras islas del vehículo.
export function TarjetasDelVehiculo({
  vehiculo,
  aprobarEn,
  volverA,
  ranuraDeComparar,
  Tarjetas,
  alCambiar,
}: PropsDeLasTarjetasDelVehiculo) {
  const lista = useDeEsteVehiculo(vehiculo.id)
  const fuente = useId()
  const idDelAviso = useId()
  const ranura = useRanura(ranuraDeComparar)
  // Las marcadas; las que se ven elegidas son las que siguen a la vista (tras aprobar o releer se sueltan las que ya no están).
  const [marcadas, setMarcadas] = useState<readonly string[]>([])
  const leerAlMontar = useEffectEvent(lista.leerLaPrimera)
  useEffect(() => {
    leerAlMontar()
  }, [])
  useAlCambiarLaAprobada(vehiculo.id, fuente, lista.releer)
  const { enCurso, aprobar } = useAprobarEsta(vehiculo.id, fuente, () => {
    lista.releer()
    alCambiar()
  })
  const vista = tarjetasALaVista(lista.aLaVista, lista.siguiente !== null)
  const elegidas = elegidasEnLaLista(marcadas, vista.filas)
  const porTarjeta = (id: string) => {
    const fila = vista.filas.find((f) => f.id === id)
    if (fila === undefined) {
      return { casilla: null, aprobar: null }
    }
    return {
      casilla: (
        <CasillaDeComparar
          numero={fila.numero}
          elegida={elegidas.includes(fila.id)}
          apagada={casillaApagada(elegidas, fila.id)}
          idDelAviso={idDelAviso}
          alAlternar={() => {
            setMarcadas(alternar(elegidas, fila.id))
          }}
        />
      ),
      aprobar: fila.aprobada ? null : (
        <AprobarEstaDeLaTarjeta
          motivo={motivoParaNoAprobarEsta(fila, aprobarEn)}
          aprobando={enCurso === fila.id}
          // Un envío a la vez, y nada mientras se relee: la versión de la fila podría estar vieja.
          ocupado={enCurso !== null || lista.cargando}
          alAprobar={() => {
            aprobar(fila)
          }}
        />
      ),
    }
  }
  return (
    <>
      {ranura === null || vista.filas.length === 0
        ? null
        : createPortal(
            <BotonComparar elegidas={elegidas} volverA={volverA} idDelAviso={idDelAviso} />,
            ranura,
          )}
      <Tarjetas
        etiqueta="Cotizaciones de este vehículo"
        tituloDelError="No pudimos cargar las cotizaciones de este vehículo."
        lectura={{
          leida: lista.leido,
          fallo: lista.error !== null,
          alReintentar: lista.reintentar,
        }}
        filas={vista.filas.map((fila) => tarjetaDeEsteVehiculo(fila, vehiculo.titulo))}
        verMas={vista.hayMas ? rutaDelListado({ vehiculo: vehiculo.id }) : null}
        porTarjeta={porTarjeta}
      />
    </>
  )
}

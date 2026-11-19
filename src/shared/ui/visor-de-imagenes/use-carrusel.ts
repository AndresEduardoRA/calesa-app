'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { useEffect, useRef, useState } from 'react'
import { useAbiertoAlgunaVez } from '../use-abierto-alguna-vez'
import { usePanelPorUrl } from '../use-panel-por-url'
import { indiceDeLaUrl, vecina, type CargaDeImagenes } from './tipos'
import { useImagenes } from './use-imagenes'

// La clave de la URL del visor (`?visor=<clave>&foto=<n>`): aparte de `?panel=`, así se abre sobre un drawer o un panel sin cerrarlos.
export const CLAVE_DEL_VISOR = 'visor'
const CLAVE_DE_LA_FOTO = 'foto'

export type PedidoDelCarrusel = {
  // Única en la pantalla (el id de la entidad): nombra al visor en la URL.
  clave: string
  // El nombre de la entidad: el título del visor y el texto de cada foto.
  titulo: string
  // La miniatura de la portada que ya trae la fila (480 px); sin ella, no hay nada que mostrar ni que pedir.
  portada: string | null
  cargar: CargaDeImagenes
}

type Opciones = {
  // Pide las imágenes al montarse (si hay portada), no al acercarse: la ficha, que dibuja la tira debajo de la foto. En una lista, nunca.
  alMontar?: boolean
}

// El estado de un carrusel en su lugar y de su visor: qué foto se ve en el lugar, qué foto abre el visor (la de la URL) y las imágenes, pedidas
// recién al acercarse (`acercarse`: puntero o foco), al montarse (`alMontar`) o al abrir el visor desde la URL.
export function useCarrusel(
  { clave, portada, cargar }: PedidoDelCarrusel,
  { alMontar = false }: Opciones = {},
) {
  const { estado, imagenes, pedir } = useImagenes(cargar)
  const visor = usePanelPorUrl(clave, [CLAVE_DE_LA_FOTO], { clave: CLAVE_DEL_VISOR })
  const montarVisor = useAbiertoAlgunaVez(visor.abierto)
  // Pasar de foto dentro del visor reemplaza la entrada: «atrás» cierra el visor, no recorre las fotos.
  const [, ponerFoto] = useQueryState(
    CLAVE_DE_LA_FOTO,
    parseAsString.withOptions({ history: 'replace' }),
  )
  const [indice, setIndice] = useState(0)
  const total = imagenes?.length ?? 0

  // Abierto desde la URL (recargar, compartir): pide lo que falta.
  useEffect(() => {
    if (visor.abierto) pedir()
  }, [visor.abierto, pedir])

  // Con la tira a la vista: una sola lectura de ≤ 24 miniaturas al llegar. Sólo el primer intento: un fallo no se repite solo (lo reintenta el visor).
  const pedidoAlMontar = useRef(false)
  useEffect(() => {
    if (!alMontar || portada === null || pedidoAlMontar.current) return
    pedidoAlMontar.current = true
    pedir()
  }, [alMontar, portada, pedir])

  const acercarse = () => {
    if (portada !== null) pedir()
  }
  const abrirEn = (en: number) => {
    setIndice(en)
    pedir()
    visor.abrir({ [CLAVE_DE_LA_FOTO]: String(en + 1) })
  }
  return {
    indice,
    total,
    estado,
    imagenes,
    montarVisor,
    enLugar: imagenes?.[indice]?.miniatura ?? portada,
    // Antes de que lleguen se ofrecen igual (pueden ser varias); si llegó una sola, no.
    conFlechas: portada !== null && (imagenes === null || total > 1),
    acercarse,
    mover: (paso: 1 | -1) => {
      if (total > 1) setIndice((actual) => vecina(actual, total, paso))
      else acercarse()
    },
    abrir: () => {
      abrirEn(indice)
    },
    // Abre el visor en esa foto (la tira).
    abrirEn,
    // Cambia la foto del lugar sin abrir el visor (las flechas de la tira).
    irA: (en: number) => {
      if (en >= 0 && en < total) setIndice(en)
    },
    visor: {
      abierto: visor.abierto,
      alCerrar: visor.cerrar,
      estado,
      actual: indiceDeLaUrl(visor.valor(CLAVE_DE_LA_FOTO), total),
      alIrA: (en: number) => {
        setIndice(en)
        void ponerFoto(String(en + 1))
      },
      alReintentar: pedir,
    },
  }
}

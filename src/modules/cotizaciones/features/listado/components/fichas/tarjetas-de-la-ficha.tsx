'use client'

import type { ReactNode } from 'react'
import { EstadoError } from '@/shared/ui/estados'
import { EsqueletoDeLasTarjetas } from '../../../fichas/components/esqueleto-de-las-tarjetas'
import { FilaDeTarjetas } from '../../../fichas/components/fila-de-tarjetas'
import { SinCotizaciones } from '../../../fichas/components/sin-cotizaciones'
import type { PropsDeLasTarjetasDeLaFicha } from '../../../fichas/components/tipos'
import { useResumenDeCotizacion } from '../../hooks/use-resumen-de-cotizacion'
import { TarjetaEnLaLista } from '../tarjeta-en-la-lista'
import type { ImagenDeLaFila } from '../tipos'

export type PropsDeTarjetasDeLaFicha = PropsDeLasTarjetasDeLaFicha & {
  // La imagen de la tarjeta (del área `tarjeta`, por hueco: el área no la importa).
  Imagen: ImagenDeLaFila
  // «Compartir» de una cotización (abre su panel); nulo si no se ofrece (Modo Live).
  compartir: ((id: string) => void) | null
  // El diálogo de «Compartir» (`?panel=compartir&para=<id>`): se monta mientras el resumen está cerrado (abierto, lo monta el resumen). Sin él, lo trae la ficha.
  dialogos?: ReactNode
}

// La fila de tarjetas de una ficha con sus estados: esqueleto, error con «Reintentar», vacío y las tarjetas de la lista (`TarjetaEnLaLista`, sin cliente) con «Ver más» al final. Un clic
// en una tarjeta abre el resumen sobre la ficha (`?cotizacion=`, que el servidor dibuja) y deja marcada la abierta.
export function TarjetasDeLaFicha({
  etiqueta,
  tituloDelError,
  lectura,
  filas,
  verMas,
  porTarjeta,
  Imagen,
  compartir,
  dialogos,
}: PropsDeTarjetasDeLaFicha) {
  const resumen = useResumenDeCotizacion({ delServidor: true })
  if (!lectura.leida) {
    return lectura.fallo ? (
      <div role="alert">
        <EstadoError titulo={tituloDelError} alReintentar={lectura.alReintentar} compacto />
      </div>
    ) : (
      <EsqueletoDeLasTarjetas />
    )
  }
  if (filas.length === 0) {
    return <SinCotizaciones />
  }
  return (
    <>
      <FilaDeTarjetas etiqueta={etiqueta} verMas={verMas}>
        {filas.map((fila) => (
          <TarjetaEnLaLista
            key={fila.id}
            cotizacion={fila}
            origen={null}
            abierta={resumen.id === fila.id}
            alAbrir={() => {
              resumen.abrir(fila.id)
            }}
            menu={null}
            compartir={compartir === null ? null : () => compartir(fila.id)}
            Imagen={Imagen}
            rutaDeClientes={null}
            sinCliente
            casilla={porTarjeta?.(fila.id).casilla}
            aprobar={porTarjeta?.(fila.id).aprobar}
          />
        ))}
      </FilaDeTarjetas>
      {resumen.texto === null ? dialogos : null}
    </>
  )
}

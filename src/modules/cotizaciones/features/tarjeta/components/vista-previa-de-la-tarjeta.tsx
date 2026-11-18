'use client'

import { useEffect, useId, useState } from 'react'
import { EstadoError, EstadoSinPermiso } from '@/shared/ui/estados'
import { Modal } from '@/shared/ui/modal'
import { Skeleton } from '@/shared/ui/skeleton'
import { LiveDelResumen } from '../../hoja/components/live-del-resumen'
import type { PropsDeLaVistaPrevia } from '../../hoja/components/huecos'
import { avisoDelTotal, type AvisoDelTotal } from '../../../entities/tarjeta/aviso-del-total'
import type { ContextoDeLaCotizacion } from '../../../entities/tarjeta/contexto-de-la-cotizacion'
import type { Geometria } from '../../../entities/tarjeta/geometria-de-la-tarjeta'
import type { LecturaDeLaTarjeta } from '../../../entities/tarjeta/lectura-de-la-tarjeta'
import type { EstadoDeLaLectura } from '../hooks/use-lectura-de-la-tarjeta'
import { useModeloDeLaTarjeta, type PaginaDelModelo } from '../hooks/use-modelo-de-la-tarjeta'
import { CopiarTextoDeLaTarjeta } from './copiar-texto-de-la-tarjeta'
import { DescargarPdfDeLaTarjeta } from './descargar-pdf-de-la-tarjeta'
import { TarjetaDeCotizacion } from './tarjeta-de-cotizacion'

// Lo que la página sabe de la tarjeta y la hoja no: lo da `<ProveedorDeLaTarjeta>`. `cotizacionId`: la de una guardada, que tiene PDF; nulo en la hoja nueva.
export type DatosDeLaPagina = PaginaDelModelo & { cotizacionId: string | null }

type Props = PropsDeLaVistaPrevia & { pagina: DatosDeLaPagina }

function EsqueletoDeLaTarjeta() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const espera = setTimeout(() => {
      setVisible(true)
    }, 300)
    return () => {
      clearTimeout(espera)
    }
  }, [])
  return (
    <div aria-busy="true" aria-label="Cargando la tarjeta" className="grid gap-2">
      {visible ? (
        <>
          <Skeleton className="h-16" />
          <Skeleton className="h-24" />
          <Skeleton className="h-16" />
        </>
      ) : null}
    </div>
  )
}

// Lo que el modal dice fuera de la tarjeta: la tarjeta es lo que ve el cliente y no lleva avisos de trabajo (tampoco «Vencida», D7 de T310).
function Avisos({
  lectura,
  aviso,
  idDelDesactualizado,
  avisos,
  vencida,
}: {
  lectura: LecturaDeLaTarjeta
  aviso: AvisoDelTotal
  idDelDesactualizado: string
  avisos: Props['avisos']
  // El día en que venció, ya formateado; nulo si no venció.
  vencida: string | null
}) {
  const textos = [
    aviso === 'desactualizado' ? 'Total desactualizado.' : null,
    vencida === null ? null : `Esta cotización venció el ${vencida}.`,
    lectura.estado === 'sin_plantilla'
      ? 'Este origen no tiene una plantilla de tarjeta para esta versión de la fórmula: la tarjeta va sólo con el total.'
      : null,
    avisos.difiere ? 'Lo de hoy no es lo guardado: la tarjeta muestra lo guardado.' : null,
    avisos.cambiosSinGuardar
      ? 'Tus cambios sin guardar no están en la tarjeta: guarda para verlos.'
      : null,
  ].filter((t) => t !== null)
  return (
    <div role="status" className="grid gap-1">
      {textos.map((texto) => (
        <p
          key={texto}
          id={texto === 'Total desactualizado.' ? idDelDesactualizado : undefined}
          className="text-(length:--text-sm) text-(--color-ink-soft)"
        >
          {texto}
        </p>
      ))}
    </div>
  )
}

type DelCuerpo = {
  estado: EstadoDeLaLectura
  reintentar: () => void
  lectura: LecturaDeLaTarjeta | null
  geometria: Geometria | null
  contexto: ContextoDeLaCotizacion
  aviso: AvisoDelTotal
  idDelDesactualizado: string
  avisos: Props['avisos']
  vencida: boolean
}

function Cuerpo({
  estado,
  reintentar,
  lectura,
  geometria,
  contexto,
  aviso,
  idDelDesactualizado,
  avisos,
  vencida,
}: DelCuerpo) {
  if (estado.tipo === 'cargando') {
    return <EsqueletoDeLaTarjeta />
  }
  if (estado.tipo === 'sin_permiso') {
    return <EstadoSinPermiso titulo="No puedes ver la tarjeta de esta cotización." />
  }
  if (estado.tipo === 'error' || lectura === null || geometria === null) {
    return (
      <div role="alert">
        <EstadoError titulo="No se pudo leer la tarjeta." alReintentar={reintentar} />
      </div>
    )
  }
  return (
    <div className="grid min-w-0 gap-3">
      <Avisos
        lectura={lectura}
        aviso={aviso}
        idDelDesactualizado={idDelDesactualizado}
        avisos={avisos}
        vencida={vencida ? (contexto.venceEl ?? '') : null}
      />
      <TarjetaDeCotizacion geometria={geometria} logo={contexto.logo} />
    </div>
  )
}

// La vista previa de la tarjeta (4.18-2): un modal con su URL (`?panel=vista-previa`) que dibuja la tarjeta tal como la vería el cliente. Se monta la primera vez que se abre
// (`useAbiertoAlgunaVez`, con `diferido()`): la hoja no carga la tarjeta, su modelo ni su lectura para dibujarse.
// La lectura y la geometría se arman aquí: el cuerpo dibuja la tarjeta y el pie la copia (4.18-3b).
export default function VistaPreviaDeLaTarjeta(props: Props) {
  const { estado, reintentar, lectura, contexto, geometria } = useModeloDeLaTarjeta(props)
  const idDelDesactualizado = useId()
  const aviso = avisoDelTotal(props.estado, props.calculo.totales.usd)
  return (
    <Modal
      abierto={props.abierta}
      alCerrar={props.cerrar}
      titulo="Vista previa"
      // La tarjeta se escala al ancho del modal: en escritorio, uno grande la deja cerca de su tamaño.
      ancho="grande"
      pie={
        <>
          <LiveDelResumen />
          <CopiarTextoDeLaTarjeta
            geometria={geometria}
            lectura={lectura}
            aviso={aviso}
            idDelDesactualizado={idDelDesactualizado}
          />
          {props.pagina.cotizacionId === null ? null : (
            <DescargarPdfDeLaTarjeta
              cotizacionId={props.pagina.cotizacionId}
              numero={props.pagina.numero}
            />
          )}
        </>
      }
    >
      <Cuerpo
        estado={estado}
        reintentar={reintentar}
        lectura={lectura}
        geometria={geometria}
        contexto={contexto}
        aviso={aviso}
        idDelDesactualizado={idDelDesactualizado}
        avisos={props.avisos}
        vencida={props.pagina.vencida}
      />
    </Modal>
  )
}

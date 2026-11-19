'use client'

import type { ComponentType } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import type { PropsDelLienzoDeLaPlantilla } from '../../../../entities/vista-previa-de-la-plantilla'
import type { EleccionDePlantillaDeV1 } from '../../hooks/use-eleccion-de-plantilla-de-v1'
import { EsqueletoDePlantillas } from './esqueleto-de-plantillas'
import { ListaDePlantillas } from './lista-de-plantillas'
import { PasoDeConfirmar } from './paso-de-confirmar'

const CLASE_DE_LA_SALIDA = 'min-h-11 w-full sm:w-fit md:min-h-8'

// Un error con su salida dentro del modal.
function ErrorConSalida({
  mensaje,
  detalle,
  salida,
}: {
  mensaje: string
  detalle?: string
  salida: { etiqueta: string; accion: () => void } | null
}) {
  return (
    <Aviso tono="peligro">
      <span className="grid gap-2">
        <span>{mensaje}</span>
        {detalle === undefined ? null : <span className="text-(length:--text-sm)">{detalle}</span>}
        {salida === null ? null : (
          <Button
            type="button"
            variant="outline"
            className={CLASE_DE_LA_SALIDA}
            onClick={salida.accion}
          >
            {salida.etiqueta}
          </Button>
        )}
      </span>
    </Aviso>
  )
}

// Lo que dijo la base al aplicar: un PT409 pide «Recargar» (los borradores cambiaron); sin red, «Reintentar» el mismo pedido (todo o nada: no duplica).
function salidaDelRechazo(e: EleccionDePlantillaDeV1) {
  if (e.rechazo?.tipo === 'conflicto') return { etiqueta: 'Recargar', accion: e.recargar }
  if (e.rechazo?.tipo === 'sin_red') return { etiqueta: 'Reintentar', accion: e.reintentar }
  return null
}

// El cuerpo del modal: el esqueleto mientras llegan las plantillas, el error de la lectura con «Reintentar», el rechazo de aplicar con su salida y el paso (la lista de
// las cuatro o la confirmación).
export function CuerpoDeLasPlantillas({
  eleccion: e,
  Lienzo,
}: {
  eleccion: EleccionDePlantillaDeV1
  Lienzo: ComponentType<PropsDelLienzoDeLaPlantilla>
}) {
  if (e.lectura.estado === 'cargando') return <EsqueletoDePlantillas />
  if (e.lectura.estado === 'error') {
    return (
      <ErrorConSalida
        mensaje={e.lectura.mensaje}
        salida={{ etiqueta: 'Reintentar', accion: e.recargar }}
      />
    )
  }
  return (
    <>
      {e.rechazo === null ? null : (
        <ErrorConSalida
          mensaje={e.rechazo.mensaje}
          detalle="No se creó nada."
          salida={salidaDelRechazo(e)}
        />
      )}
      {e.paso === 'elegir' ? (
        <ListaDePlantillas
          plantillas={e.lectura.datos.plantillas}
          elegida={e.elegida}
          alElegir={e.elegir}
          Lienzo={Lienzo}
          bloqueada={e.enviando}
        />
      ) : (
        <PasoDeConfirmar pregunta={e.pregunta} avisos={e.plantilla?.avisos ?? []} />
      )}
    </>
  )
}

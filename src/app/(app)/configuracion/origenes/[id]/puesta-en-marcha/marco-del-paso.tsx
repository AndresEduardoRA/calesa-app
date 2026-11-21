import type { ReactNode } from 'react'
import type { PasoDeLaPuestaEnMarcha } from '@/modules/origenes'
import { PasoAPaso } from '@/modules/origenes/pantallas/puesta-en-marcha'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import type { PuestaEnMarchaAbierta } from './abrir'
import { MOTIVO_DEL_PASO, conMotivos } from './pasos'
import { Seguir } from './seguir'

type Abierta = Extract<PuestaEnMarchaAbierta, { tipo: 'abierto' }>

// Un paso de la puesta en marcha: el paso a paso a la izquierda (arriba en el celular) y el paso. Lo dibuja cada página y no el layout: un layout no se
// vuelve a dibujar al pasar de un paso a otro, y lo hecho en un paso (campos, fases, la fórmula) cambia el estado de los demás.
export function MarcoDelPaso({
  abierta,
  paso,
  children,
}: {
  abierta: Abierta
  paso: PasoDeLaPuestaEnMarcha | 'listo'
  children: ReactNode
}) {
  return (
    <div className="grid min-w-0 gap-6 md:grid-cols-[14rem_minmax(0,1fr)]">
      <PasoAPaso
        pasos={conMotivos(abierta.estado, abierta.origen.id)}
        actual={paso === 'listo' ? null : paso}
      />
      <div className="grid min-w-0 content-start gap-6">{children}</div>
    </div>
  )
}

// Un paso abierto por URL sin su permiso en este origen: el motivo y «Seguir» al próximo que sí hace.
export function PasoSinPermiso({
  abierta,
  paso,
}: {
  abierta: Abierta
  paso: PasoDeLaPuestaEnMarcha
}) {
  return (
    <>
      <EstadoSinPermiso titulo="No puedes hacer este paso" descripcion={MOTIVO_DEL_PASO[paso]} />
      <Seguir origenId={abierta.origen.id} paso={paso} estado={abierta.estado} />
    </>
  )
}

// Si la persona hace este paso en este origen.
export function conPermiso(abierta: Abierta, paso: PasoDeLaPuestaEnMarcha): boolean {
  return abierta.estado.some((otro) => otro.clave === paso && otro.conPermiso)
}

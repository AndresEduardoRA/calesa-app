'use client'

import { MasAcciones } from '@/shared/ui/lista'
import {
  BotonDeLaTarjeta,
  TarjetaDeAjustes,
  TarjetasDeAjustes,
  ValoresDeLaTarjeta,
} from '@/shared/ui/tarjetas-de-ajustes'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import type { SerieVigente } from '../../../entities/comprobantes/serie'
import { filasDeLaSerie } from './datos-de-la-serie'
import { ModalDeLaSerieDiferido } from './diferidos'

const MOTIVO_SIN_PERMISO = 'No tienes permiso para cambiar la serie.'

type Props = {
  vigente: SerieVigente
  // `empresa.ajustes.gestionar`: sin eso se lee y no se cambia.
  puedeCambiar: boolean
}

// La serie de comprobantes de Configuración › Empresa › Comprobantes: la vigente y el próximo número a la vista, y «Cambiar serie» abre su modal
// (`?panel=serie`). Un `?panel=serie` sin permiso se avisa y se limpia.
export function TarjetaDeLaSerie({ vigente, puedeCambiar }: Props) {
  const panel = usePanelPorUrl('serie')
  const motivo = puedeCambiar ? null : MOTIVO_SIN_PERMISO
  const rechazado = useRevisionAlAbrir(panel.abierto ? 'serie' : null, motivo, panel.cerrar)
  const abierto = panel.abierto && !rechazado
  const montar = useAbiertoAlgunaVez(abierto)
  return (
    <>
      <TarjetasDeAjustes etiqueta="Comprobantes">
        <TarjetaDeAjustes
          titulo="Serie de comprobantes"
          accion={
            <BotonDeLaTarjeta
              panel="serie"
              etiqueta="Cambiar serie"
              deshabilitado={motivo !== null}
            />
          }
          acciones={
            <MasAcciones
              nombre="Serie de comprobantes"
              acciones={[
                {
                  tipo: 'accion',
                  clave: 'cambiar',
                  etiqueta: 'Cambiar serie',
                  principal: true,
                  deshabilitada: motivo !== null,
                  despuesDeCerrar: true,
                  alElegir: panel.abrir,
                },
                ...(motivo === null
                  ? []
                  : [{ tipo: 'nota', clave: 'motivo', texto: motivo } as const]),
              ]}
            />
          }
        >
          <ValoresDeLaTarjeta filas={filasDeLaSerie(vigente)} />
        </TarjetaDeAjustes>
      </TarjetasDeAjustes>
      {montar ? (
        <ModalDeLaSerieDiferido abierto={abierto} alCerrar={panel.cerrar} vigente={vigente} />
      ) : null}
    </>
  )
}

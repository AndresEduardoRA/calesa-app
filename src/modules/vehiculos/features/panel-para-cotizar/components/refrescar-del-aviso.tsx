'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { RefreshCwIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { salirSinPerder } from '@/shared/ui/salida-con-cambios'
import { CONSULTAR_GASTA_CUOTA, type DatosDelAviso } from '../../../entities/subasta-cerrada'
import { RUTA_DE_INTEGRACIONES } from '../../subasta/ruta'
import type { ResultadoDelRefresco } from '../../subasta/hooks/use-refresco-de-subasta'
import { useRefrescoDelAviso } from '../hooks/use-refresco-del-aviso'

export const CLASE_DE_BOTON = 'min-h-11 md:min-h-8'

type Fallo = Extract<ResultadoDelRefresco, { ok: false }>

// El toque que pide confirmar: consultar a apibara gasta cuota.
function PedirElToque({
  alConfirmar,
  alCancelar,
}: {
  alConfirmar: () => void
  alCancelar: () => void
}) {
  return (
    <div className="flex basis-full flex-col gap-2" role="group" aria-label="Antes de consultar">
      <p>{CONSULTAR_GASTA_CUOTA} ¿Refrescar la subasta ahora?</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" className={CLASE_DE_BOTON} onClick={alConfirmar}>
          Sí, refrescar
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={CLASE_DE_BOTON}
          onClick={alCancelar}
        >
          No, volver
        </Button>
      </div>
    </div>
  )
}

// El fallo con su motivo: «Reintentar» si es del momento; «Ir a Integraciones» si lo frena la clave o la cuota y quien mira puede configurarlas.
function FalloDelRefresco(props: {
  fallo: Fallo
  puedeConfigurar: boolean
  alReintentar: () => void
}) {
  const { fallo, puedeConfigurar, alReintentar } = props
  const router = useRouter()
  return (
    <div className="flex basis-full flex-col gap-2" role="alert">
      <p>{fallo.mensaje}</p>
      <div className="flex flex-wrap gap-2">
        {fallo.reintentable ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={CLASE_DE_BOTON}
            onClick={alReintentar}
          >
            Reintentar
          </Button>
        ) : null}
        {fallo.revisarIntegracion && puedeConfigurar ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={CLASE_DE_BOTON}
            onClick={() => {
              salirSinPerder(() => {
                router.push(RUTA_DE_INTEGRACIONES as Route)
              })
            }}
          >
            Ir a Integraciones
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function textoDelBoton(consultando: boolean, actualizando: boolean): string {
  if (consultando) return 'Consultando…'
  return actualizando ? 'Actualizando…' : 'Refrescar la subasta'
}

// «Refrescar la subasta» del aviso, con sus pasos en el mismo lugar: el toque que pide confirmar (gasta cuota), la consulta, el fallo y el «sigue cerrada» si
// la consulta no la trajo viva.
export function RefrescarDelAviso({ datos }: { datos: DatosDelAviso }) {
  const { fase, actualizando, pedir, cancelar, consultar } = useRefrescoDelAviso(datos)
  const ocupado = fase.tipo === 'consultando' || actualizando
  return (
    <>
      {fase.tipo === 'confirmando' ? (
        <PedirElToque alConfirmar={() => void consultar()} alCancelar={cancelar} />
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={CLASE_DE_BOTON}
          disabled={ocupado}
          onClick={pedir}
        >
          <RefreshCwIcon
            aria-hidden
            className={ocupado ? 'animate-spin motion-reduce:animate-none' : undefined}
          />
          {textoDelBoton(fase.tipo === 'consultando', actualizando)}
        </Button>
      )}
      {fase.tipo === 'consultada' && !actualizando ? (
        <p className="basis-full" role="status">
          Consultada: la subasta sigue cerrada.
        </p>
      ) : null}
      {fase.tipo === 'fallo' ? (
        <FalloDelRefresco
          fallo={fase.fallo}
          puedeConfigurar={datos.puedeConfigurar}
          alReintentar={() => void consultar()}
        />
      ) : null}
    </>
  )
}

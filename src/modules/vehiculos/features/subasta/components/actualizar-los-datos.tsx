'use client'

import { useState } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { useEnLinea } from '@/shared/ui/use-en-linea'
import {
  useActualizarLosDatos,
  type VehiculoParaActualizar,
} from '../hooks/use-actualizar-los-datos'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // El vehículo que se consulta (null mientras no hay uno: el diálogo no se abre).
  vehiculo: (VehiculoParaActualizar & { titulo: string }) | null
  // Quien puede ir a Integraciones si la clave o la cuota frenan.
  puedeConfigurar: boolean
}

// «Actualizar los datos» del «⋯» (`?panel=actualizar-datos`, con `&para=<id>` en el inventario): pide confirmar porque consultar a apibara gasta cuota,
// corre la consulta con el diálogo abierto y, al terminar, cierra y dice el resultado con un aviso. Una consulta por confirmación.
export function ActualizarLosDatos({ abierto, alCerrar, vehiculo, puedeConfigurar }: Props) {
  // Mientras consulta no se cierra (la respuesta volvería con el diálogo cerrado).
  const [enCurso, setEnCurso] = useState(false)
  return (
    <Modal
      abierto={abierto && vehiculo !== null}
      alCerrar={alCerrar}
      titulo="Actualizar los datos"
      descripcion={vehiculo?.titulo}
      bloqueado={enCurso}
    >
      {vehiculo ? (
        <Confirmacion
          key={vehiculo.id}
          vehiculo={vehiculo}
          puedeConfigurar={puedeConfigurar}
          alCerrar={alCerrar}
          enCurso={enCurso}
          alCambiarEnCurso={setEnCurso}
        />
      ) : null}
    </Modal>
  )
}

function Confirmacion({
  vehiculo,
  puedeConfigurar,
  alCerrar,
  enCurso,
  alCambiarEnCurso: setEnCurso,
}: {
  vehiculo: VehiculoParaActualizar
  puedeConfigurar: boolean
  alCerrar: () => void
  enCurso: boolean
  alCambiarEnCurso: (enCurso: boolean) => void
}) {
  const { actualizar } = useActualizarLosDatos(vehiculo, puedeConfigurar)
  const enLinea = useEnLinea()
  return (
    <div className="grid gap-4">
      <p className="text-(length:--text-sm) text-(--color-ink)">
        Consultar a apibara gasta cuota. ¿Actualizar ahora?
      </p>
      {enLinea ? null : (
        <Aviso tono="aviso">No hay conexión. Vuelve a intentar cuando vuelva.</Aviso>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          disabled={enCurso}
          onClick={alCerrar}
        >
          No, volver
        </Button>
        <Button
          type="button"
          className="min-h-11 md:min-h-9"
          disabled={enCurso || !enLinea}
          onClick={() => {
            setEnCurso(true)
            void actualizar().finally(() => {
              setEnCurso(false)
              alCerrar()
            })
          }}
        >
          {enCurso ? 'Consultando…' : 'Sí, actualizar'}
        </Button>
      </div>
    </div>
  )
}

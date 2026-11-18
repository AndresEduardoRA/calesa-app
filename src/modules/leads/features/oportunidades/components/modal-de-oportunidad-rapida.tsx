'use client'

import { useState } from 'react'
import { AccionesDelAviso } from '@/shared/ui/acciones-del-aviso'
import { Aviso } from '@/shared/ui/aviso'
import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useRegional } from '@/shared/ui/regional'
import { LARGO_MAXIMO_DE_TITULO, type Oportunidad } from '../../../entities/oportunidad'
import { useAvisoDeOportunidades } from '../hooks/use-aviso-de-oportunidades'
import { useFormularioDeOportunidadRapida } from '../hooks/use-formulario-de-oportunidad-rapida'
import { AvisoDeOportunidadesDelLead } from './aviso-de-oportunidades'

type Props = {
  abierto: boolean
  alCerrar: () => void
  leadId: string
  nombreDelLead: string
  alCrear: (oportunidad: Oportunidad) => void
  // A dónde vuelve el foco al cerrar (el botón que lo abrió).
  focoAlCerrar: () => HTMLElement | boolean
}

const ID = 'oportunidad-rapida'

// «Nueva oportunidad…» del «⋯» de un lead (`?panel=oportunidad-rapida`): primero lo que el lead ya tiene (`<AvisoDeOportunidadesDelLead>`: «Crear igual»
// o «Cancelar»; sin ninguna, abre directo en el formulario) y después sólo el título (el nombre del lead) y el monto; entra en la etapa inicial del
// embudo por defecto de quien mira, que la base crea si todavía no lo tiene. El vehículo y las notas se agregan después con «Editar» en la ficha.
// Quien lo monta le da una `key` por apertura: cada una empieza de nuevo y lee el aviso una vez.
export function ModalDeOportunidadRapida({
  abierto,
  alCerrar,
  leadId,
  nombreDelLead,
  alCrear,
  focoAlCerrar,
}: Props) {
  const { monedaBase } = useRegional()
  const f = useFormularioDeOportunidadRapida({ leadId, nombreDelLead, abierto, alCrear })
  const { lectura, reintentar } = useAvisoDeOportunidades(leadId, abierto)
  const [sigue, setSigue] = useState(false)
  if (!sigue && lectura.tipo !== 'sin_oportunidades') {
    return (
      <AvisoDeOportunidadesDelLead
        abierto={abierto}
        alCerrar={alCerrar}
        leadId={leadId}
        nombreDelLead={nombreDelLead}
        lectura={lectura}
        reintentar={reintentar}
        alSeguir={() => {
          setSigue(true)
        }}
        focoAlCerrar={focoAlCerrar}
      />
    )
  }
  return (
    <ModalDeFormulario
      id={ID}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Nueva oportunidad"
      descripcion="Entra en la etapa inicial de tu embudo por defecto. Sólo tú la ves."
      focoAlCerrar={focoAlCerrar}
      formulario={f}
      guardar={{ etiqueta: 'Crear oportunidad', enCurso: 'Creando…' }}
    >
      {f.rechazo ? (
        <Aviso tono="peligro">
          <div className="grid gap-2">
            <p>{f.rechazo.mensaje}</p>
            <AccionesDelAviso resueltas={f.rechazo.acciones} enfocar />
          </div>
        </Aviso>
      ) : null}
      <Campo
        nombre="titulo"
        etiqueta="Título"
        value={f.valores.titulo}
        maxLength={LARGO_MAXIMO_DE_TITULO + 20}
        error={f.errores.titulo}
        onChange={(evento) => {
          f.cambiar('titulo', evento.target.value)
        }}
      />
      <Campo
        nombre="monto_estimado"
        etiqueta={`Monto estimado (${monedaBase}, opcional)`}
        inputMode="decimal"
        value={f.valores.monto}
        error={f.errores.monto_estimado}
        onChange={(evento) => {
          f.cambiar('monto', evento.target.value)
        }}
      />
    </ModalDeFormulario>
  )
}

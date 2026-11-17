import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { Badge } from '@/shared/ui/badge'
import { NumeroDeLead } from '@/shared/ui/numero-de-lead'
import {
  CLIENTE_FUERA_DE_TU_CARTERA,
  CLIENTE_QUE_NO_PUEDES_VER,
  type ClienteDeLaCabecera,
} from '../../../entities/proyectos/cliente-de-la-cabecera'

// El «Cliente» de la cabecera de un proyecto, ya resuelto por la página (`clienteDeLaCabecera`): el lead (nombre enlazado a su ficha, sus números y «Fuera de
// tu cartera» si se ve enmascarado), «Cliente que no puedes ver», el nombre escrito a mano de un proyecto viejo o «—». Nunca el teléfono. En una fila que se
// parte: en el celular cada pieza baja sola y nada ensancha la página.
export function ClienteDelProyecto({ cliente }: { cliente: ClienteDeLaCabecera }) {
  if (cliente.tipo === 'ninguno') {
    return <span className="text-(--color-ink-faint)">—</span>
  }
  if (cliente.tipo === 'oculto') {
    return <span className="text-(--color-ink-soft)">{CLIENTE_QUE_NO_PUEDES_VER}</span>
  }
  if (cliente.tipo === 'libre') {
    return cliente.nombre
  }
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <Link
        href={`${RUTAS.leads}/${cliente.id}` as Route}
        className="inline-flex min-h-11 min-w-0 items-center [overflow-wrap:anywhere] underline underline-offset-2 md:min-h-0"
      >
        {cliente.nombre}
      </Link>
      <NumeroDeLead
        numeros={cliente.numeros}
        conSecundario
        className="text-(--color-ink-soft) tabular-nums"
      />
      {cliente.enCartera ? null : <Badge variant="outline">{CLIENTE_FUERA_DE_TU_CARTERA}</Badge>}
    </span>
  )
}

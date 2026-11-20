import { formatearFecha } from '@/shared/lib/fechas'
import { Aviso } from '@/shared/ui/aviso'
import { useRegional } from '@/shared/ui/regional'
import { resumenDeUso } from '../../../entities/uso-apibara'
import type { EstadoDelUso } from '../hooks/use-uso-de-apibara'

// «Ver uso»: cuántas consultas lleva la cuenta en el período, bajo la tarjeta de apibara. Se pide a mano porque cada pedido a apibara cuenta.
export function ResultadoDelUso({ estado }: { estado: EstadoDelUso }) {
  const { zonaHoraria } = useRegional()
  if (estado.tipo === 'visto') {
    return (
      <Aviso tono={estado.uso.restantes === 0 ? 'aviso' : 'info'}>
        {resumenDeUso(
          estado.uso,
          estado.uso.hasta ? formatearFecha(estado.uso.hasta, { zona: zonaHoraria }) : null,
        )}
      </Aviso>
    )
  }
  return estado.tipo === 'fallo' ? <Aviso tono="peligro">{estado.mensaje}</Aviso> : null
}

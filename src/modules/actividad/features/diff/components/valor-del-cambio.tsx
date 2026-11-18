import { formatearFecha, formatearHora } from '@/shared/lib/fechas'
import { Monto } from '@/shared/ui/monto'
import type { ValorPresentado } from '../../../entities/diff'

// Un lado de un cambio, en el detalle y en la frase. Un monto va por `<Monto>` (el Modo Live lo tapa): con su moneda, con la base o, si no se
// conoce, sólo el número y «(moneda sin conocer)». Sin hooks: lo dibuja también la «Actividad reciente», que va en el servidor.
export function ValorDelCambio({ valor, zona }: { valor: ValorPresentado; zona: string }) {
  switch (valor.tipo) {
    case 'vacio':
      return (
        <span>
          <span aria-hidden="true">—</span>
          <span className="sr-only">Vacío</span>
        </span>
      )
    case 'monto':
      if (valor.enMonedaBase) {
        return <Monto valor={valor.valor} />
      }
      if (!valor.monedaConocida || valor.moneda === null) {
        return (
          <span>
            <Monto valor={valor.valor} moneda={null} />{' '}
            <span className="text-(--color-ink-soft)">(moneda sin conocer)</span>
          </span>
        )
      }
      return <Monto valor={valor.valor} moneda={valor.moneda} />
    case 'fecha':
      return (
        <span className="tabular-nums">
          {formatearFecha(valor.iso, { zona })} {formatearHora(valor.iso, { zona })}
        </span>
      )
    case 'si_no':
      return <span>{valor.valor ? 'Sí' : 'No'}</span>
    case 'texto':
      return <span className="[overflow-wrap:anywhere]">{valor.texto}</span>
  }
}

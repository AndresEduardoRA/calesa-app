import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { CLAVE_DE_ITEM_DE_STOCK, PANEL_STOCK } from '../../../entities/stock/paneles'

type Props = {
  proyectoId: string
  itemId: string
  cantidad: number
  stockCantidad: number
}

/** El panel del stock del ítem en la hoja de su proyecto (`?panel=stock&item=<id>`): ahí se pasa a stock, porque el formulario cambia la fila de la hoja sin releerla. */
export function rutaDelStockDelItem({ proyectoId, itemId }: Pick<Props, 'proyectoId' | 'itemId'>) {
  const parametros = new URLSearchParams({ panel: PANEL_STOCK, [CLAVE_DE_ITEM_DE_STOCK]: itemId })
  return `${RUTAS.repuestos}/${proyectoId}?${parametros.toString()}`
}

// El bloque «Stock» del panel del ítem: cuánto de lo pedido está en el stock y el camino al panel del stock. Sin JS: lo dibuja el servidor con lo que ya leyó el panel.
export function BloqueDeStockDelItem(props: Props) {
  const { cantidad, stockCantidad } = props
  return (
    <div className="grid gap-2" data-bloque="stock-del-item">
      <p className="text-(length:--text-sm)">
        {stockCantidad > 0
          ? `En stock: ${String(stockCantidad)} de ${String(cantidad)}`
          : 'Nada en stock.'}
      </p>
      <div>
        <Link
          href={rutaDelStockDelItem(props) as Route}
          className={buttonVariants({
            variant: 'outline',
            size: 'sm',
            className: 'min-h-11 md:min-h-9',
          })}
        >
          Abrir el stock
        </Link>
      </div>
    </div>
  )
}

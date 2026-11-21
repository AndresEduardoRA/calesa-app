import { connection } from 'next/server'
import { leerAprobadasDeVehiculos } from '@/modules/cotizaciones'
import { columnaDeCompraDirecta, columnaDePrecio, type Vehiculo } from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'
import type { LayoutDeOrigen } from '@/modules/origenes'
import { CostoConCompartir } from './costo-con-compartir'

type Props = {
  vehiculo: Vehiculo
  // Sólo `campos` importa: la puja y la compra directa son campos del layout con su ruta de apibara.
  campos: LayoutDeOrigen['campos']
  // El origen es de subasta: la cuenta regresiva del cierre, la puja y la compra directa.
  deSubasta: boolean
  // La fila «Costo estimado» con `cotizaciones.ver` del origen (null: ni la fila ni la consulta) y la hoja de cotizar que ofrece sin aprobada.
  costo: { cotizar: string | null } | null
}

// Lo de adentro de la izquierda que dice la subasta y el costo, leído tras su `<Suspense>`: la aprobada que quien mira ve, con el modo de su cotización (la misma lectura del
// inventario: una RPC por la clave primaria con un solo id), sólo con `cotizaciones.ver` del origen. Un fallo cae en el límite del bloque. «Ahora» lo fija el servidor.
export async function BloqueCostoYSubasta({ vehiculo, campos, deSubasta, costo }: Props) {
  await connection()
  const leida = costo === null ? [] : datosO(await leerAprobadasDeVehiculos([vehiculo.id]))
  const aprobada = leida.find((una) => una.vehiculoId === vehiculo.id) ?? null
  return (
    <CostoConCompartir
      vehiculo={vehiculo}
      columnaPrecio={columnaDePrecio(deSubasta, campos)}
      columnaCompra={columnaDeCompraDirecta(deSubasta, campos)}
      cuenta={deSubasta ? { ahora: new Date().toISOString() } : null}
      costo={
        costo === null
          ? null
          : {
              aprobada:
                aprobada === null
                  ? null
                  : {
                      cotizacionId: aprobada.cotizacionId,
                      monto: aprobada.monto,
                      moneda: aprobada.moneda,
                      modo: aprobada.modo,
                    },
              cotizar: costo.cotizar,
            }
      }
    />
  )
}

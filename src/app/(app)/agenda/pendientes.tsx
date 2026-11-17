import { leerPendientes, type GrupoDePendientes } from '@/modules/agenda'
import { ColumnaDePendientes } from '@/modules/agenda/pantallas/agenda'
import { diaSiguiente, inicioDelDia } from '@/shared/lib/fechas'

type Props = {
  grupos: readonly GrupoDePendientes[]
  hoy: string
  zona: string
  // La vista, la fecha y lo elegido: los enlaces de cada pendiente abren su panel aquí mismo.
  base: { vista: string; fecha: string; extra: string }
  deTodos: boolean
}

// Los pendientes de quien mira, tras su propio `<Suspense>`: la hoja del día no los espera. Los recordatorios llegan hasta el fin de hoy en la zona de la empresa
// (los vencidos y los de hoy); un error se dibuja en la columna con «Reintentar», sin tirar la página.
export async function PendientesDeLaPagina({ grupos, hoy, zona, base, deTodos }: Props) {
  const hasta = inicioDelDia(diaSiguiente(hoy), { zona })
  const lectura = await leerPendientes({ hasta, grupos })
  return (
    <ColumnaDePendientes
      lectura={lectura}
      base={base}
      deTodos={deTodos}
      zona={zona}
      ahora={new Date().toISOString()}
      hasta={hasta}
    />
  )
}

import { connection } from 'next/server'
import { datosO } from '@/shared/lib/errores'
import {
  SIN_VEHICULOS_PARA_NOTAS,
  type VehiculosParaNotas,
} from '../../../entities/vehiculo-de-nota'
import { leerResumenDeSeguimientos } from '../lecturas'
import { ResumenDeSeguimientos } from './resumen-de-seguimientos'
import { ProveedorDeVehiculos } from './vehiculos-de-las-notas'

type Props = {
  leadId: string
  // El nombre del lead: el título de los drawers «Ver todos».
  leadNombre: string
  // Los vehículos del lead que quien mira ve, para elegir uno en un seguimiento o un recordatorio. Los
  // lee la página (este módulo no lee vehículos); sin el permiso, ninguno.
  vehiculos?: Promise<VehiculosParaNotas>
}

// El bloque «Seguimiento» de la ficha, leído en el servidor con la sesión de quien mira, detrás de su `<Suspense>`.
// Un error de lectura lo atrapa el límite del bloque: los demás siguen.
export async function BloqueDeSeguimientos({ leadId, leadNombre, vehiculos }: Props) {
  await connection()
  const [leido, opciones] = await Promise.all([
    leerResumenDeSeguimientos(leadId),
    vehiculos ?? SIN_VEHICULOS_PARA_NOTAS,
  ])
  const datos = datosO(leido)
  return (
    <ProveedorDeVehiculos vehiculos={opciones.opciones} recortado={opciones.recortado}>
      <ResumenDeSeguimientos
        leadId={leadId}
        leadNombre={leadNombre}
        seguimientos={datos.seguimientos}
        recordatorios={datos.recordatorios}
        tipos={datos.tipos}
      />
    </ProveedorDeVehiculos>
  )
}

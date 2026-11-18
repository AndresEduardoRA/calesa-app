import type { Metadata } from 'next'
import { requerirSesion } from '@/modules/equipo'
import { redirigir } from '@/shared/lib/navegacion'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { conSubseccionesVisibles } from '../secciones'
import { SECCION_DE_LEADS } from './seccion'
import { comoBusqueda, destinoDeLeads } from './url-vieja'

export const metadata: Metadata = { title: 'Configurar leads' }

// Configuración › Leads no tiene sub-sección índice: esta ruta abre la primera sub-ruta que la persona puede abrir, y las URLs de cuando
// había pestañas (`?seccion=`, con sus paneles) van a la suya (`url-vieja.ts`). Sin ninguno de los dos permisos, «sin permiso».
export default async function PaginaDeLeads({ searchParams }: PageProps<'/configuracion/leads'>) {
  const [{ permisos }, parametros] = await Promise.all([requerirSesion(), searchParams])
  const abiertas = conSubseccionesVisibles(SECCION_DE_LEADS, permisos)
    .subsecciones.filter((sub) => !sub.apagada)
    .map((sub) => sub.ruta)
  const destino = destinoDeLeads(comoBusqueda(parametros), abiertas)
  if (destino === null) {
    return <EstadoSinPermiso />
  }
  redirigir(destino)
}

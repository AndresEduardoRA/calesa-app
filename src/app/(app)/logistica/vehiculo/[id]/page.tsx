import type { Metadata } from 'next'
import { requerirSesion } from '@/modules/equipo'
import { CLAVE_DEL_HUECO_ABIERTO } from '@/modules/logistica'
import { unParametro } from '@/shared/lib/rutas'
import { UnidadAbierta } from '../../unidad-abierta'

export const metadata: Metadata = { title: 'Unidad de logística' }

// La unidad de logística en su propia página (6.01): a ella apunta la notificación de demora. Es el panel de la unidad: a ella llevan la bandeja del día, la lista de una fase y «dónde está». Con `?hueco=documentos` abre ese bloque.
export default async function PaginaDeLaUnidad({
  params,
  searchParams,
}: PageProps<'/logistica/vehiculo/[id]'>) {
  const [sesion, { id }, parametros] = await Promise.all([requerirSesion(), params, searchParams])
  return (
    <div className="max-w-3xl">
      {/* Sin cabecera visible: el panel de la unidad abre con su propia tarjeta (9.12-5, R3). */}
      <h1 className="sr-only">Unidad de logística</h1>
      <UnidadAbierta
        id={id}
        permisos={sesion.permisos}
        registraElVisto
        huecoAbierto={unParametro(parametros[CLAVE_DEL_HUECO_ABIERTO])}
      />
    </div>
  )
}

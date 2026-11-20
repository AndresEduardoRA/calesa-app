import type { Metadata } from 'next'
import { puede, requerirSesion } from '@/modules/equipo'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EditorDelFlujo } from '../../_flujo/editor-del-flujo'
import { EncabezadoDeConfiguracion } from '../../_navegacion/encabezado-de-configuracion'
import { FLUJO_DE_REPUESTOS_EN_CONFIGURACION } from '../seccion'

export const metadata: Metadata = { title: FLUJO_DE_REPUESTOS_EN_CONFIGURACION.titulo }

// Configuración › Repuestos › Flujo de repuestos: las fases por las que avanza un ítem, con sus reglas y sus tipos de documento en el panel
// (`?seccion=reglas|documentos`, `?fase=`). Entra quien tiene `repuestos.configurar`; sin la clave, «No tienes permiso». La base vuelve a
// decidir cada escritura.
export default async function PaginaDelFlujoDeRepuestos({
  searchParams,
}: PageProps<'/configuracion/repuestos/flujo'>) {
  const [{ permisos }, parametros] = await Promise.all([requerirSesion(), searchParams])
  if (!puede(permisos, 'repuestos.configurar')) {
    return <EstadoSinPermiso />
  }
  return (
    <div className="grid min-w-0 gap-4">
      <div className="max-w-3xl">
        <EncabezadoDeConfiguracion {...FLUJO_DE_REPUESTOS_EN_CONFIGURACION} />
      </div>
      <EditorDelFlujo
        permisos={permisos}
        fijo={{ ambito: 'repuestos' }}
        seccionPedida={unParametro(parametros['seccion'])}
      />
    </div>
  )
}

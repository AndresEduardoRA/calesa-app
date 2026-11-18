import type { Metadata } from 'next'
import { leerDatosNuevosDeApibara, leerLayout } from '@/modules/origenes'
import { DatosNuevosDeApibara, EditorDeCampos } from '@/modules/origenes/pantallas/origen-campos'
import { datosO } from '@/shared/lib/errores'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { abrirOrigen } from '../abrir-origen'
import { MarcoDelOrigen } from '../marco-del-origen'

export const metadata: Metadata = { title: 'Campos del origen' }

// Configuración › Orígenes › un origen › Campos: los datos clave, los datos comunes y el layout de campos, con los desactivados al final.
// En un origen de subasta, quien gestiona ve además lo que apibara trajo y el origen todavía no tiene como campo.
export default async function PaginaCamposDelOrigen({
  params,
}: PageProps<'/configuracion/origenes/[id]/campos'>) {
  const abierto = await abrirOrigen((await params).id)
  if (abierto.sinPermiso) {
    return <EstadoSinPermiso />
  }
  const { sesion, origen, puedeGestionar } = abierto
  const [layout, nuevos] = await Promise.all([
    leerLayout(origen.id, { conUso: false }),
    origen.tipo === 'subasta' && puedeGestionar ? leerDatosNuevosDeApibara(origen.id) : null,
  ])
  const { campos } = datosO(layout)
  // Si no se pudo averiguar, el editor sigue: es un aviso, no la pantalla.
  const datosNuevos = nuevos?.ok ? nuevos.data : []
  return (
    <MarcoDelOrigen origen={origen} permisos={sesion.permisos} parte="campos">
      <div className="grid gap-6">
        {datosNuevos.length > 0 ? (
          <DatosNuevosDeApibara origenId={origen.id} datos={datosNuevos} />
        ) : null}
        <EditorDeCampos
          origenId={origen.id}
          tipoDeOrigen={origen.tipo}
          campos={campos}
          puedeGestionar={puedeGestionar}
        />
      </div>
    </MarcoDelOrigen>
  )
}

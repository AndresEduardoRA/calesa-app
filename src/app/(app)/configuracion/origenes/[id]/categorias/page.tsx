import type { Metadata } from 'next'
import { leerLayout } from '@/modules/origenes'
import { ArbolDeCategorias } from '@/modules/origenes/pantallas/origen-categorias'
import { datosO } from '@/shared/lib/errores'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { abrirOrigen } from '../abrir-origen'
import { MarcoDelOrigen } from '../marco-del-origen'

export const metadata: Metadata = { title: 'Categorías del origen' }

// Configuración › Orígenes › un origen › Categorías. Contar vehículos por categoría pide `origenes.gestionar`: sin él la lista no muestra
// números en vez de mostrar ceros.
export default async function PaginaCategoriasDelOrigen({
  params,
}: PageProps<'/configuracion/origenes/[id]/categorias'>) {
  const abierto = await abrirOrigen((await params).id)
  if (abierto.sinPermiso) {
    return <EstadoSinPermiso />
  }
  const { sesion, origen, puedeGestionar } = abierto
  const { categorias } = datosO(await leerLayout(origen.id, { conUso: puedeGestionar }))
  return (
    <MarcoDelOrigen origen={origen} permisos={sesion.permisos} parte="categorias">
      <ArbolDeCategorias
        origenId={origen.id}
        sustantivo={origen.sustantivo}
        categorias={categorias}
        puedeGestionar={puedeGestionar}
      />
    </MarcoDelOrigen>
  )
}

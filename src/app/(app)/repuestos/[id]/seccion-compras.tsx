import { leerComprasDelProyecto, leerMargenDelProyecto } from '@/modules/repuestos'
import {
  ComprasDelProyectoDiferido,
  MargenDelProyectoDiferido,
} from '@/modules/repuestos/pantallas/compras'
import { ErrorDelPanel } from './error-del-panel'

type Props = {
  proyectoId: string
  // Los ítems vivos de la hoja que ya leyó la página y las monedas activas: las opciones del formulario, sin otra lectura (D4 y D5 de 8.11-3).
  items: readonly { id: string; descripcion: string }[]
  monedas: readonly { codigo: string; nombre: string }[]
  puedeEditarCostos: boolean
  cerrado: boolean
}

// El panel «Compras» bajo los pasos (8.11-2, C6): el margen y la lista, leídos recién al abrirlo y sólo si quien mira tiene `repuestos.costos.ver` (lo decide la página con
// `panelesDisponibles`). Si una lectura falla, lo dice ahí con «Reintentar» y la hoja sigue. Registrar, editar y eliminar (8.11-3) revalidan la página: la lista y el
// margen se vuelven a leer acá. Su código llega con `diferido()`.
export async function SeccionDeCompras({
  proyectoId,
  items,
  monedas,
  puedeEditarCostos,
  cerrado,
}: Props) {
  const [compras, margen] = await Promise.all([
    leerComprasDelProyecto(proyectoId),
    leerMargenDelProyecto(proyectoId),
  ])
  if (!compras.ok || !margen.ok) {
    return <ErrorDelPanel titulo="No se pudieron cargar las compras." />
  }
  return (
    <div className="grid gap-6">
      <MargenDelProyectoDiferido margen={margen.data} />
      <ComprasDelProyectoDiferido
        filas={compras.data.filas}
        hayMas={compras.data.hayMas}
        proyectoId={proyectoId}
        items={items}
        monedas={monedas}
        puedeEditarCostos={puedeEditarCostos}
        cerrado={cerrado}
      />
    </div>
  )
}

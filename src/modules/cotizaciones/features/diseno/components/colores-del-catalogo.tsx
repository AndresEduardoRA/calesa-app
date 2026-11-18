'use client'

import { PlusIcon, SwatchBookIcon } from 'lucide-react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { alTopeDeTonos, textoDelTopeDeTonos } from '../../../entities/diseno/panel-de-tonos'
import type { ListaDeTonos } from '../../../entities/diseno/tonos'
import { useColores, type Colores } from '../hooks/use-colores'
import { useEliminarColorPorUrl } from '../hooks/use-eliminar-color-por-url'
import { useModalDeColor } from '../hooks/use-modal-de-color'
import { EliminarColorDiferido, ModalDeColorDiferido } from './diferidos'
import { FilaDeColor, idDelMenuDeColor } from './fila-de-color'

type Props = { lista: ListaDeTonos }

const BOTON = 'h-11 md:h-8'

function NuevoColor({ alNuevo, alTope }: { alNuevo: () => void; alTope: boolean }) {
  return (
    <Button
      className={BOTON}
      disabled={alTope}
      aria-describedby={alTope ? 'colores-tope' : undefined}
      onClick={alNuevo}
    >
      <PlusIcon aria-hidden />
      Nuevo color
    </Button>
  )
}

// El modal de «Nuevo color» y «Editar» y la confirmación de eliminar: se piden al abrirse.
function Ventanas({
  colores,
  modal,
  eliminacion,
}: {
  colores: Colores
  modal: ReturnType<typeof useModalDeColor>
  eliminacion: ReturnType<typeof useEliminarColorPorUrl>
}) {
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const montarEliminar = useAbiertoAlgunaVez(eliminacion.abierto)
  return (
    <>
      {montar ? (
        <ModalDeColorDiferido
          key={modal.apertura}
          abierto={modal.abierto}
          alCerrar={modal.alCerrar}
          colores={colores}
          original={modal.original}
          noDisponible={modal.noDisponible}
        />
      ) : null}
      {montarEliminar ? (
        <EliminarColorDiferido
          abierto={eliminacion.abierto}
          alCerrar={eliminacion.cerrar}
          tono={eliminacion.tono}
          enCurso={colores.enCurso}
          alEliminar={colores.eliminar}
          focoAlCerrar={() =>
            document.querySelector<HTMLElement>(
              `[data-mas-acciones="${idDelMenuDeColor(eliminacion.tono?.id ?? '')}"]`,
            ) ?? true
          }
        />
      ) : null}
    </>
  )
}

// Configuración › Cotización › Colores (la tabla `tonos`): el catálogo de la empresa, por nombre y hasta el tope que dice la base. Es de toda la empresa, no de un
// origen, y se guarda al instante (cada color es una escritura propia, no parte de «Guardar el borrador» del diseño). Cada escritura devuelve la lista entera y esa
// reemplaza a la local: ningún pedido extra. Un título y una acción principal («Nuevo color») en él.
export function ColoresDelCatalogo({ lista: inicial }: Props) {
  const colores = useColores(inicial)
  const { lista } = colores
  const modal = useModalDeColor(lista)
  const eliminacion = useEliminarColorPorUrl(lista.tonos)
  const alTope = alTopeDeTonos(lista)
  return (
    <section className="grid gap-3" aria-labelledby="titulo-de-colores">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2
          id="titulo-de-colores"
          className="text-(length:--text-lg) font-semibold text-(--color-ink)"
        >
          Colores
        </h2>
        {lista.tonos.length === 0 ? null : (
          <NuevoColor alNuevo={modal.abrirNuevo} alTope={alTope} />
        )}
      </div>
      {alTope ? (
        <Aviso tono="aviso">
          <span id="colores-tope">{textoDelTopeDeTonos(lista.tope)}</span>
        </Aviso>
      ) : null}
      {lista.tonos.length === 0 ? (
        <EstadoVacio
          Icono={SwatchBookIcon}
          titulo="Todavía no hay colores. Crea el primero."
          accion={<NuevoColor alNuevo={modal.abrirNuevo} alTope={false} />}
          compacto
        />
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {lista.tonos.map((tono) => (
            <FilaDeColor
              key={tono.id}
              tono={tono}
              alEditar={modal.abrirEdicion}
              alPedirEliminar={eliminacion.abrir}
            />
          ))}
        </ul>
      )}
      <Ventanas colores={colores} modal={modal} eliminacion={eliminacion} />
    </section>
  )
}

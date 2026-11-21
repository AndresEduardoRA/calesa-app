'use client'

import { Aviso } from '@/shared/ui/aviso'
import { ListaDeCatalogo } from '@/shared/ui/lista-de-catalogo/lista-de-catalogo'
import { useFocoTrasMover } from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import { Modal } from '@/shared/ui/modal'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { alTopeDeTipos, textoDelTope, type ListaDeTipos } from '../../../entities/tipo-de-lead'
import { PieDeLaLista } from '../../configuracion/components/pie-de-la-lista'
import { useFamiliaDelPanel } from '../../configuracion/hooks/use-familia-del-panel'
import { useEliminarTipoPorUrl } from '../hooks/use-eliminar-tipo-por-url'
import { useModalDeTipo } from '../hooks/use-modal-de-tipo'
import { useTiposDeLead } from '../hooks/use-tipos-de-lead'
import { EliminarTipoDiferido, ModalDeTipoDiferido } from './diferidos'
import { filasDeTipos } from './filas-de-tipos'

type Props = {
  lista: ListaDeTipos
}

const PREFIJO = 'tipo'

// «Tipos de lead» en un modal (`?panel=tipos`), desde la tarjeta: se crean, renombran, eligen su icono, ordenan, activan y desactivan; uno con leads
// no se elimina, se desactiva (sigue nombrando a los leads que ya lo tienen y no se ofrece para uno nuevo). Cada tipo es de una clase fija
// —prospecto o cliente— y siempre queda uno activo de cada clase: el último de la suya no se apaga ni se elimina, y la fila lo dice antes de
// intentarlo. Hasta el tope que dice la base; la lista no se pagina. Todo cambio lo hace la base por RPC con su versión, y cada respuesta trae la
// lista entera. «Nuevo», «Editar» y «Eliminar» son un modal hermano, no uno encima: el de la lista se cierra y, al cerrarse el del ítem, vuelve.
// Al pasar al modal de un ítem el de la lista no devuelve el foco (Base UI se lo robaría al campo nuevo); al cerrarlo del todo, sí.
export function EditorDeTipos({ lista: inicial }: Props) {
  const familia = useFamiliaDelPanel('tipos')
  const tipos = useTiposDeLead(inicial)
  const { lista } = tipos
  const modal = useModalDeTipo(lista)
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const eliminacion = useEliminarTipoPorUrl(lista.tipos)
  const montarEliminar = useAbiertoAlgunaVez(eliminacion.abierto)
  const alTope = alTopeDeTipos(lista.tipos, lista.tope)
  useFocoTrasMover(PREFIJO, tipos.movimiento)

  return (
    <>
      <Modal
        abierto={familia.abierto}
        alCerrar={familia.cerrar}
        titulo="Tipos de lead"
        ancho="grande"
        focoInicial={() => document.getElementById('tipos-nuevo')}
        focoAlCerrar={() => !familia.enLaFamilia}
        pie={
          <PieDeLaLista
            alCerrar={familia.cerrar}
            prefijo="tipos"
            etiqueta="Nuevo tipo"
            alNuevo={modal.abrirNuevo}
            alTope={alTope}
          />
        }
      >
        {alTope ? (
          <Aviso tono="aviso">
            <span id="tipos-tope">{textoDelTope(lista.tope)}</span>
          </Aviso>
        ) : null}
        <ListaDeCatalogo
          filas={filasDeTipos(lista.tipos, {
            alEditar: modal.abrirEdicion,
            alActivar: (tipo, activo) => void tipos.activar(tipo, activo),
            alPedirEliminar: eliminacion.abrir,
          })}
          prefijo={PREFIJO}
          columnaDeUso="Leads"
          alAbrir={modal.abrirEdicion}
          alMover={(id, direccion) => {
            const tipo = lista.tipos.find((uno) => uno.id === id)
            if (tipo) void tipos.mover(tipo, direccion)
          }}
        />
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">
          {lista.tipos.length} de {lista.tope} tipos posibles.
        </p>
        <p role="status" aria-live="polite" className="sr-only">
          {tipos.anuncio}
        </p>
      </Modal>
      {montar ? (
        <ModalDeTipoDiferido
          key={modal.apertura}
          abierto={modal.abierto}
          alCerrar={modal.alCerrar}
          tipos={tipos}
          original={modal.original}
          noDisponible={modal.noDisponible}
        />
      ) : null}
      {montarEliminar ? (
        <EliminarTipoDiferido
          abierto={eliminacion.abierto}
          alCerrar={eliminacion.cerrar}
          tipo={eliminacion.tipo}
          enCurso={tipos.enCurso}
          alEliminar={tipos.eliminar}
          focoAlCerrar={() => false}
        />
      ) : null}
    </>
  )
}

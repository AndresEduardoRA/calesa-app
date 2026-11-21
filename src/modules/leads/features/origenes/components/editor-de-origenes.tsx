'use client'

import { MapPinIcon, PlusIcon } from 'lucide-react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { useFocoTrasMover } from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import { Modal } from '@/shared/ui/modal'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import {
  alTopeDeOrigenes,
  TEXTO_DEL_TOPE,
  type OrigenDeLeadConUso,
} from '../../../entities/origen-de-lead'
import { PieDeLaLista } from '../../configuracion/components/pie-de-la-lista'
import { useFamiliaDelPanel } from '../../configuracion/hooks/use-familia-del-panel'
import { useEliminarOrigenPorUrl } from '../hooks/use-eliminar-origen-por-url'
import { useModalDeOrigen } from '../hooks/use-modal-de-origen'
import { useOrigenesDeLead } from '../hooks/use-origenes-de-lead'
import { EliminarOrigenDiferido, ModalDeOrigenDiferido } from './diferidos'
import { ListaDeOrigenes, PREFIJO_DE_ORIGENES } from './lista-de-origenes'

function VacioDeOrigenes({ alNuevo }: { alNuevo: () => void }) {
  return (
    <EstadoVacio
      Icono={MapPinIcon}
      titulo="Todavía no hay orígenes del lead"
      descripcion="Sin ninguno, el alta guarda los leads sin origen y el campo sale apagado."
      accion={
        <Button id="origenes-nuevo" className="h-11 md:h-8" onClick={alNuevo}>
          <PlusIcon aria-hidden />
          Nuevo origen
        </Button>
      }
    />
  )
}

type Props = {
  origenes: readonly OrigenDeLeadConUso[]
}

// «Orígenes del lead» en un modal (`?panel=origenes`), desde la tarjeta: de dónde llegan los leads. Se crean, renombran, eligen su icono, ordenan,
// activan y desactivan, y uno se marca «por defecto» (el que el alta propone a quien no tiene un último origen); uno con leads no se elimina, se
// desactiva (sigue nombrando a los leads que ya lo tienen y no se ofrece para uno nuevo). Hasta 100, dicho al llegar; la lista no se pagina. Sin
// ninguno activo el alta sigue andando y guarda los leads sin origen. Todo cambio lo hace la base por RPC con su versión, y cada respuesta trae la
// lista entera. «Nuevo», «Editar» y «Eliminar» son un modal hermano, no uno encima: el de la lista se cierra y, al cerrarse el del ítem, vuelve.
// El estado vive acá y el componente no se desmonta, así sobrevive al pasar de la lista al ítem.
// Al pasar al modal de un ítem el de la lista no devuelve el foco (Base UI se lo robaría al campo nuevo); al cerrarlo del todo, sí.
export function EditorDeOrigenes({ origenes: inicial }: Props) {
  const familia = useFamiliaDelPanel('origenes')
  const lista = useOrigenesDeLead(inicial)
  const { origenes } = lista
  const modal = useModalDeOrigen(origenes)
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const eliminacion = useEliminarOrigenPorUrl(origenes)
  const montarEliminar = useAbiertoAlgunaVez(eliminacion.abierto)
  const alTope = alTopeDeOrigenes(origenes)
  useFocoTrasMover(PREFIJO_DE_ORIGENES, lista.movimiento)

  return (
    <>
      <Modal
        abierto={familia.abierto}
        alCerrar={familia.cerrar}
        titulo="Orígenes del lead"
        ancho="grande"
        focoInicial={() => document.getElementById('origenes-nuevo')}
        focoAlCerrar={() => !familia.enLaFamilia}
        pie={
          <PieDeLaLista
            alCerrar={familia.cerrar}
            prefijo="origenes"
            etiqueta="Nuevo origen"
            alNuevo={modal.abrirNuevo}
            alTope={alTope}
            sinNuevo={origenes.length === 0}
          />
        }
      >
        {alTope ? (
          <Aviso tono="aviso">
            <span id="origenes-tope">{TEXTO_DEL_TOPE}</span>
          </Aviso>
        ) : null}
        {origenes.length === 0 ? (
          <VacioDeOrigenes alNuevo={modal.abrirNuevo} />
        ) : (
          <ListaDeOrigenes
            lista={lista}
            alEditar={modal.abrirEdicion}
            alPedirEliminar={eliminacion.abrir}
          />
        )}
        <p role="status" aria-live="polite" className="sr-only">
          {lista.anuncio}
        </p>
      </Modal>
      {montar ? (
        <ModalDeOrigenDiferido
          key={modal.apertura}
          abierto={modal.abierto}
          alCerrar={modal.alCerrar}
          origenes={lista}
          original={modal.original}
          noDisponible={modal.noDisponible}
        />
      ) : null}
      {montarEliminar ? (
        <EliminarOrigenDiferido
          abierto={eliminacion.abierto}
          alCerrar={eliminacion.cerrar}
          origen={eliminacion.origen}
          enCurso={lista.enCurso}
          alEliminar={lista.eliminar}
          focoAlCerrar={() => false}
        />
      ) : null}
    </>
  )
}

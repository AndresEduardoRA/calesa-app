'use client'

import { Aviso } from '@/shared/ui/aviso'
import { ListaDeCatalogo } from '@/shared/ui/lista-de-catalogo/lista-de-catalogo'
import { useFocoTrasMover } from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import { Modal } from '@/shared/ui/modal'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import {
  alTopeDeTiposDeSeguimiento,
  sinTiposActivos,
  textoDelTopeDeSeguimientos,
  type ListaDeTiposDeSeguimiento,
} from '../../../entities/tipo-de-seguimiento'
import { PieDeLaLista } from '../../configuracion/components/pie-de-la-lista'
import { useFamiliaDelPanel } from '../../configuracion/hooks/use-familia-del-panel'
import { useEliminarTipoDeSeguimientoPorUrl } from '../hooks/use-eliminar-tipo-de-seguimiento-por-url'
import { useModalDeTipoDeSeguimiento } from '../hooks/use-modal-de-tipo-de-seguimiento'
import { useTiposDeSeguimiento } from '../hooks/use-tipos-de-seguimiento'
import { EliminarTipoDeSeguimientoDiferido, ModalDeTipoDeSeguimientoDiferido } from './diferidos'
import { filasDeTiposDeSeguimiento } from './filas-de-tipos-de-seguimiento'

function AvisoSinTiposActivos() {
  return (
    <Aviso tono="aviso">
      Ningún tipo de seguimiento está activo: el alta guarda los leads sin primer seguimiento y
      «Anotar seguimiento» no tiene qué ofrecer.
    </Aviso>
  )
}

function VacioDeLosTipos() {
  return (
    <p className="rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4 text-(--color-ink-soft)">
      Todavía no hay tipos de seguimiento. Crea el primero con «Nuevo tipo».
    </p>
  )
}

// Cuántos hay de cuántos posibles, y lo que se anuncia al lector de pantalla tras cada cambio.
function ResumenDeLosTipos({
  lista,
  anuncio,
}: {
  lista: ListaDeTiposDeSeguimiento
  anuncio: string
}) {
  return (
    <>
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        {lista.tipos.length} de {lista.tope} tipos de seguimiento posibles.
      </p>
      <p role="status" aria-live="polite" className="sr-only">
        {anuncio}
      </p>
    </>
  )
}

type Props = {
  lista: ListaDeTiposDeSeguimiento
}

const PREFIJO = 'tipo-de-seguimiento'

// «Tipos de seguimiento» en un modal (`?panel=seguimientos`), desde la tarjeta: se crean, renombran, eligen su icono, ordenan, activan y desactivan;
// uno con seguimientos no se elimina, se desactiva (sigue nombrando a los seguimientos que ya lo tienen y no se ofrece para uno nuevo). Ningún tipo
// es de sistema: cualquiera se apaga (sin ninguno activo, el alta guarda los leads sin primer seguimiento y lo dice). Hasta el tope que dice la
// base; la lista no se pagina. Todo cambio lo hace la base por RPC con su versión, y cada respuesta trae la lista entera. «Nuevo», «Editar» y
// «Eliminar» son un modal hermano, no uno encima: el de la lista se cierra y, al cerrarse el del ítem, vuelve.
// Al pasar al modal de un ítem el de la lista no devuelve el foco (Base UI se lo robaría al campo nuevo); al cerrarlo del todo, sí.
export function EditorDeTiposDeSeguimiento({ lista: inicial }: Props) {
  const familia = useFamiliaDelPanel('seguimientos')
  const tipos = useTiposDeSeguimiento(inicial)
  const { lista } = tipos
  const modal = useModalDeTipoDeSeguimiento(lista)
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const eliminacion = useEliminarTipoDeSeguimientoPorUrl(lista.tipos)
  const montarEliminar = useAbiertoAlgunaVez(eliminacion.abierto)
  const alTope = alTopeDeTiposDeSeguimiento(lista.tipos, lista.tope)
  useFocoTrasMover(PREFIJO, tipos.movimiento)

  const filas = filasDeTiposDeSeguimiento(lista, {
    alEditar: modal.abrirEdicion,
    alActivar: (uno, activo) => void tipos.activar(uno, activo),
    alPedirEliminar: eliminacion.abrir,
  })

  return (
    <>
      <Modal
        abierto={familia.abierto}
        alCerrar={familia.cerrar}
        titulo="Tipos de seguimiento"
        ancho="grande"
        focoInicial={() => document.getElementById('seguimientos-nuevo')}
        focoAlCerrar={() => !familia.enLaFamilia}
        pie={
          <PieDeLaLista
            alCerrar={familia.cerrar}
            prefijo="seguimientos"
            etiqueta="Nuevo tipo"
            alNuevo={modal.abrirNuevo}
            alTope={alTope}
          />
        }
      >
        {alTope ? (
          <Aviso tono="aviso">
            <span id="seguimientos-tope">{textoDelTopeDeSeguimientos(lista.tope)}</span>
          </Aviso>
        ) : null}
        {sinTiposActivos(lista.tipos) ? <AvisoSinTiposActivos /> : null}
        {filas.length === 0 ? (
          <VacioDeLosTipos />
        ) : (
          <ListaDeCatalogo
            filas={filas}
            prefijo={PREFIJO}
            columnaDeUso="Seguimientos"
            alAbrir={modal.abrirEdicion}
            alMover={(id, direccion) => {
              const tipo = lista.tipos.find((uno) => uno.id === id)
              if (tipo) void tipos.mover(tipo, direccion)
            }}
          />
        )}
        <ResumenDeLosTipos lista={lista} anuncio={tipos.anuncio} />
      </Modal>
      {montar ? (
        <ModalDeTipoDeSeguimientoDiferido
          key={modal.apertura}
          abierto={modal.abierto}
          alCerrar={modal.alCerrar}
          tipos={tipos}
          original={modal.original}
          noDisponible={modal.noDisponible}
        />
      ) : null}
      {montarEliminar ? (
        <EliminarTipoDeSeguimientoDiferido
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

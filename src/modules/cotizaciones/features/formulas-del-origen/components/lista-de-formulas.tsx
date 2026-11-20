'use client'

import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { TOPE_DE_FORMULAS_DEL_ORIGEN } from '../../../entities/formula-del-origen'
import { ordenDeLaLista, type FormulaDeLaLista } from '../../../entities/formulas-del-origen/lista'
import { MENSAJE_DEL_TOPE } from '../../../entities/formulas-del-origen/resultado'
import { CLAVE_DE_LA_COPIA, PANEL_NUEVA_FORMULA } from '../../../entities/formulas-del-origen/rutas'
import { useArchivadas } from '../hooks/use-archivadas'
import { usePanelesDeLaFormula } from '../hooks/use-paneles-de-la-formula'
import { Archivadas } from './archivadas'
import { BotonDeNuevaFormula } from './boton-de-nueva-formula'
import { ModalDeNuevaFormulaDiferido } from './diferidos'
import { FilaDeFormula } from './fila-de-formula'

type Props = {
  origen: { id: string; nombre: string }
  lectura: { formulas: readonly FormulaDeLaLista[]; hayMas: boolean; hayArchivadas: boolean }
  origenesParaCopiar: readonly { id: string; nombre: string }[]
}

export const VACIO_DE_FORMULAS =
  'Este origen todavía no tiene fórmulas: crea la primera en blanco o copia una.'

// La lista de la pestaña «Fórmulas»: la activa primero (★) y las demás por nombre, cada una con su estado, «Editar» y su «⋯»; «Nueva fórmula» arriba a la
// derecha (en el vacío, junto al texto), apagada en el tope; abajo, «Archivadas». Monta una vez los paneles de la pantalla.
export function ListaDeFormulas({ origen, lectura, origenesParaCopiar }: Props) {
  const formulas = ordenDeLaLista(lectura.formulas)
  const archivadas = useArchivadas(origen.id, lectura)
  const nueva = usePanelPorUrl(PANEL_NUEVA_FORMULA, [CLAVE_DE_LA_COPIA])
  const aperturaDeNueva = useApertura(nueva.abierto)
  const enElTope = lectura.hayMas || formulas.length >= TOPE_DE_FORMULAS_DEL_ORIGEN
  const nuevaMontada = useAbiertoAlgunaVez(nueva.abierto && !enElTope)
  const activa = formulas.find((f) => f.activa) ?? null
  const { menuDe, paneles } = usePanelesDeLaFormula({
    origen,
    formulas: [...formulas, ...archivadas.formulas],
    activa: activa ? { id: activa.id, nombre: activa.nombre } : null,
    alCopiar: (formula) => {
      nueva.abrir({ [CLAVE_DE_LA_COPIA]: formula.id })
    },
    volverALaLista: false,
  })
  const boton = (
    <BotonDeNuevaFormula
      enElTope={enElTope}
      alAbrir={() => {
        nueva.abrir()
      }}
    />
  )
  return (
    <div className="grid min-w-0 gap-4">
      {formulas.length === 0 ? (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-(--radius-lg) border border-(--color-line) bg-(--color-surface) p-3 text-(length:--text-sm)">
          <p className="min-w-0 text-(--color-ink)">{VACIO_DE_FORMULAS}</p>
          {boton}
        </div>
      ) : (
        <>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1">
            {boton}
          </div>
          {enElTope ? <AvisoDeTope texto={MENSAJE_DEL_TOPE} /> : null}
          <ul
            aria-label={`Fórmulas de ${origen.nombre}`}
            className="grid grid-cols-[minmax(0,1fr)] gap-2"
          >
            {formulas.map((formula) => (
              <FilaDeFormula
                key={formula.id}
                origenId={origen.id}
                formula={formula}
                acciones={menuDe(formula)}
              />
            ))}
          </ul>
        </>
      )}
      {lectura.hayArchivadas ? (
        <Archivadas origenId={origen.id} archivadas={archivadas} menuDe={menuDe} />
      ) : null}
      {nuevaMontada && !enElTope ? (
        <ModalDeNuevaFormulaDiferido
          key={aperturaDeNueva}
          abierto={nueva.abierto}
          alCerrar={nueva.cerrar}
          origen={origen}
          origenesParaCopiar={origenesParaCopiar}
          copiaInicial={nueva.valor(CLAVE_DE_LA_COPIA)}
        />
      ) : null}
      {paneles}
    </div>
  )
}

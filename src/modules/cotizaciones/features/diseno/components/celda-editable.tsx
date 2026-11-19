'use client'

import {
  NIVEL_TODOS,
  type AnchoDeCelda,
  type CeldaDeDiseno,
  type SeccionDeDiseno,
} from '../../../entities/diseno'
import { celdaAdmiteNivel, type NodosPorId } from '../../../entities/diseno/admite-nivel'
import type { CambioDeAspectoDeItem } from '../../../entities/diseno/edicion-del-aspecto'
import type { NivelDelDiseno } from '../../../entities/diseno/edicion-del-diseno'
import type { AyudaDeCelda } from '../../../entities/diseno/edicion-de-items'
import type { CambioDeNiveles } from '../../../entities/diseno/niveles'
import { columnasDeLaCelda } from '../../../entities/rejilla-de-la-hoja'
import type { FilaOrdenable } from '../hooks/use-fila-ordenable'
import {
  CamposDelAspectoDelItem,
  errorDe,
  SelectorDeColumnas,
  type ErrorDelAspecto,
} from './aspecto'
import { CamposDeLaAyuda } from './campos-de-la-ayuda'
import type { AccionesDeLosEnlaces } from './campos-de-los-enlaces'
import { TituloConAsa } from './orden'
import { SelectorDeNivel } from './selector-de-nivel'

export const SIN_NIVEL_EN_LA_CELDA = 'El total y lo que va aparte los ve todo el mundo.'

type Props = {
  seccion: SeccionDeDiseno
  celda: CeldaDeDiseno
  etiqueta: string
  nodos: NodosPorId
  niveles: readonly NivelDelDiseno[]
  tablas: readonly string[]
  ocupado: boolean
  // La fila en la lista que se ordena dentro de su sección, y el rechazo de forma de su aspecto (si es suyo).
  fila: FilaOrdenable
  error: ErrorDelAspecto
  alPonerAncho: (ancho: AnchoDeCelda) => void
  alPonerAspecto: (cambios: CambioDeAspectoDeItem) => void
  alPonerNiveles: (cambios: CambioDeNiveles) => void
  alPonerAyuda: (ayuda: AyudaDeCelda | null) => void
  enlaces: AccionesDeLosEnlaces
}

// Una celda de la sección: su asa, su etiqueta, el ancho (de 12 columnas a 1; un ancho guardado con nombre se muestra por su número), quién la ve y quién la
// edita, su ayuda y su aspecto. La celda gana a su sección: el nivel que rige es el propio y, sin él, el de la sección.
export function CeldaEditable({
  seccion,
  celda,
  etiqueta,
  nodos,
  niveles,
  tablas,
  ocupado,
  fila: { alMontar, estilo, asa },
  error,
  alPonerAncho,
  alPonerAspecto,
  alPonerNiveles,
  alPonerAyuda,
  enlaces,
}: Props) {
  const base = `${seccion.id}__${celda.nodo}`
  const admite = celdaAdmiteNivel(celda, nodos)
  return (
    <li
      ref={alMontar}
      style={estilo}
      className="min-w-0 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) p-3"
      data-celda={celda.nodo}
    >
      <TituloConAsa etiquetaDelAsa={`Mover «${etiqueta}»`} asa={asa}>
        <p className="text-(length:--text-sm) font-medium text-(--color-ink)">{etiqueta}</p>
      </TituloConAsa>
      <div className="grid min-w-0 gap-2 @md:grid-cols-3">
        <SelectorDeColumnas
          nombre={`${base}-ancho`}
          etiqueta="Ancho"
          valor={columnasDeLaCelda(celda.ancho)}
          ocupado={ocupado}
          error={errorDe(error, 'ancho')}
          alCambiar={(columnas) => {
            if (columnas !== null) alPonerAncho(columnas)
          }}
        />
        <SelectorDeNivel
          nombre={`${base}-ver`}
          etiqueta="Quién la ve"
          valor={celda.nivel_ver ?? seccion.nivel_ver ?? NIVEL_TODOS}
          niveles={niveles}
          apagado={admite ? null : SIN_NIVEL_EN_LA_CELDA}
          ocupado={ocupado}
          alCambiar={(ver) => {
            alPonerNiveles({ ver })
          }}
        />
        <SelectorDeNivel
          nombre={`${base}-editar`}
          etiqueta="Quién la edita"
          valor={celda.nivel_editar ?? seccion.nivel_editar ?? NIVEL_TODOS}
          niveles={niveles}
          apagado={null}
          ocupado={ocupado}
          alCambiar={(editar) => {
            alPonerNiveles({ editar })
          }}
        />
      </div>
      <CamposDeLaAyuda
        base={base}
        ayuda={celda.ayuda}
        tablas={tablas}
        ocupado={ocupado}
        alPonerAyuda={alPonerAyuda}
        enlaces={enlaces}
      />
      <CamposDelAspectoDelItem
        base={base}
        item={celda}
        ocupado={ocupado}
        error={error}
        alPoner={alPonerAspecto}
      />
    </li>
  )
}

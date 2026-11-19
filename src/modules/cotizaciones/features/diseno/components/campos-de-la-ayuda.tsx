'use client'

import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import type { CeldaDeDiseno } from '../../../entities/diseno'
import { MAXIMO_DE_LA_AYUDA, type AyudaDeCelda } from '../../../entities/diseno/edicion-de-items'
import { CamposDeLosEnlaces, type AccionesDeLosEnlaces } from './campos-de-los-enlaces'

type Props = {
  base: string
  ayuda: CeldaDeDiseno['ayuda']
  // Las tablas que nombra la fórmula (la actual siempre va).
  tablas: readonly string[]
  ocupado: boolean
  alPonerAyuda: (ayuda: AyudaDeCelda | null) => void
  enlaces: AccionesDeLosEnlaces
}

// La ayuda de una celda: una tabla de referencia que se abre o un texto (con hasta 5 enlaces), nunca las dos. Escribir una quita la otra.
export function CamposDeLaAyuda({ base, ayuda, tablas, ocupado, alPonerAyuda, enlaces }: Props) {
  const tabla = ayuda !== undefined && 'tabla' in ayuda ? ayuda.tabla : ''
  const texto = ayuda !== undefined && 'texto' in ayuda ? ayuda.texto : ''
  const opciones = [
    { valor: '', etiqueta: 'Sin tabla' },
    ...(tabla === '' || tablas.includes(tabla) ? tablas : [...tablas, tabla]).map((valor) => ({
      valor,
      etiqueta: valor,
    })),
  ]
  return (
    <div className="mt-2 grid min-w-0 gap-2 @md:grid-cols-2">
      <CampoSeleccion
        nombre={`${base}-ayuda-tabla`}
        etiqueta="Ayuda con una tabla"
        opciones={opciones}
        value={tabla}
        disabled={ocupado}
        onChange={(evento) => {
          alPonerAyuda(evento.target.value === '' ? null : { tabla: evento.target.value })
        }}
      />
      <Campo
        nombre={`${base}-ayuda-texto`}
        etiqueta="Ayuda con un texto"
        maxLength={MAXIMO_DE_LA_AYUDA}
        value={texto}
        disabled={ocupado}
        onChange={(evento) => {
          alPonerAyuda({ texto: evento.target.value })
        }}
      />
      <CamposDeLosEnlaces
        base={base}
        enlaces={ayuda !== undefined && 'texto' in ayuda ? (ayuda.enlaces ?? []) : []}
        hayTexto={texto.trim() !== ''}
        ocupado={ocupado}
        acciones={enlaces}
      />
    </div>
  )
}

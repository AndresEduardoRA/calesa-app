import { describe, expect, it } from 'vitest'
import { migracionesEnOrden } from '../../../../../scripts/lib/definicion-sql'
import {
  esquemaDeSituacionDeLaUnidad,
  SITUACIONES_DE_LA_UNIDAD,
  textoDeSituacion,
} from './situacion'

describe('la situación en logística', () => {
  it('los valores son los del check de vehiculos.situacion', () => {
    const texto = migracionesEnOrden()
      .map((m) => m.texto)
      .join('\n')
    // La última definición del check: en una migración (`check (situacion in (…))`) o en la base aplastada, como la escribe el volcado
    // (`CHECK (("situacion" = ANY (ARRAY['…'::"text", …])))`).
    const formas = [
      /vehiculos_situacion_check check \(situacion in \(([^)]*)\)\)/g,
      /"vehiculos_situacion_check" CHECK \(\("situacion" = ANY \(ARRAY\[([^\]]*)\]/g,
    ]
    const ultima = formas
      .flatMap((forma) => [...texto.matchAll(forma)])
      .sort((a, b) => a.index - b.index)
      .at(-1)?.[1]
    const valores = ultima?.split(',').map((v) =>
      v
        .trim()
        .replace(/::"?text"?$/, '')
        .replaceAll("'", ''),
    )
    expect(valores).toEqual([...SITUACIONES_DE_LA_UNIDAD])
  })

  it('sólo se dice aparte cuando la subasta manda; una desconocida es su fase', () => {
    expect(textoDeSituacion('sin_resolver')).toBe('Sin resolver')
    expect(textoDeSituacion('en_subasta')).toBe('En subasta')
    expect(textoDeSituacion('fase')).toBeNull()
    expect(esquemaDeSituacionDeLaUnidad.parse('otra')).toBe('fase')
  })
})

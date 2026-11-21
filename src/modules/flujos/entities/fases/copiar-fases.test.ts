import { describe, expect, it } from 'vitest'
import {
  MOTIVO_SIN_DE_DONDE_COPIAR,
  MOTIVO_YA_TIENE_FASES,
  MOTIVOS_DE_LO_SALTADO,
  motivoDelRechazoDeCopiar,
  motivoParaNoAbrirCopiarFases,
  respuestaDeCopiarFasesDesde,
  textoDeLoSaltado,
} from './copiar-fases'

describe('motivoParaNoAbrirCopiarFases', () => {
  it('abre en un flujo vacío con algún origen de donde copiar', () => {
    expect(motivoParaNoAbrirCopiarFases({ fases: [] }, 2)).toBeNull()
  })

  it('no abre si el flujo ya tiene alguna fase, aunque esté jubilada', () => {
    expect(motivoParaNoAbrirCopiarFases({ fases: [{ activa: false }] }, 2)).toBe(
      MOTIVO_YA_TIENE_FASES,
    )
  })

  it('no abre sin origen de donde copiar', () => {
    expect(motivoParaNoAbrirCopiarFases({ fases: [] }, 0)).toBe(MOTIVO_SIN_DE_DONDE_COPIAR)
  })
})

describe('respuestaDeCopiarFasesDesde', () => {
  const cruda = {
    version: '2026-11-21T10:00:00.123456+00:00',
    copiado: { fases: 3, salidas: 2, requisitos: 1, tipos_documento: 1 },
    saltado: [{ motivo: 'subasta', nombre: 'Remate' }],
    saltado_hay_mas: false,
  }

  it('lee la respuesta y conserva la versión tal cual', () => {
    expect(respuestaDeCopiarFasesDesde(cruda)).toEqual({
      version: '2026-11-21T10:00:00.123456+00:00',
      copiado: { fases: 3, salidas: 2, requisitos: 1, tiposDocumento: 1 },
      saltado: [{ motivo: 'subasta', nombre: 'Remate' }],
      saltadoHayMas: false,
    })
  })

  it('una respuesta que no se entiende es null', () => {
    expect(respuestaDeCopiarFasesDesde({ ...cruda, version: '' })).toBeNull()
    expect(
      respuestaDeCopiarFasesDesde({ ...cruda, saltado: [{ motivo: 'otro', nombre: 'X' }] }),
    ).toBeNull()
    expect(respuestaDeCopiarFasesDesde(null)).toBeNull()
  })
})

describe('textoDeLoSaltado', () => {
  it('cada motivo tiene su frase y nombra lo saltado', () => {
    for (const motivo of MOTIVOS_DE_LO_SALTADO) {
      expect(textoDeLoSaltado({ motivo, nombre: 'Compra' })).toContain('«Compra»')
    }
    expect(textoDeLoSaltado({ motivo: 'subasta', nombre: 'Remate' })).toBe(
      'Fase «Remate»: era la subasta; este origen no es de subasta.',
    )
    expect(textoDeLoSaltado({ motivo: 'tipo_documento_reusado', nombre: 'Factura' })).toBe(
      'Tipo de documento «Factura»: ya había uno con ese nombre y se usa ese.',
    )
  })
})

describe('motivoDelRechazoDeCopiar', () => {
  it('dice cada rechazo por su código y su hint', () => {
    expect(motivoDelRechazoDeCopiar('23514', 'destino')).toBe(
      'Este flujo ya tiene fases: recarga para verlas.',
    )
    expect(motivoDelRechazoDeCopiar('22023', 'desde')).toBe(
      'Ese origen ya no tiene fases para copiar.',
    )
    expect(motivoDelRechazoDeCopiar('22023', 'tipos_documento')).toBe(
      'No caben más tipos de documento en este flujo.',
    )
    expect(motivoDelRechazoDeCopiar('22023', 'destino')).toBe(
      'Sólo se copian fases entre flujos de vehículos.',
    )
    expect(motivoDelRechazoDeCopiar('42501', 'desde')).toBe(
      'No puedes configurar el flujo de ese origen.',
    )
    expect(motivoDelRechazoDeCopiar('42501', null)).toBe(
      'No tienes permiso para configurar las fases de este flujo.',
    )
  })

  it('lo que no conoce queda nulo, también el PT409', () => {
    expect(motivoDelRechazoDeCopiar('PT409', null)).toBeNull()
    expect(motivoDelRechazoDeCopiar('22023', 'otro')).toBeNull()
    expect(motivoDelRechazoDeCopiar(undefined, undefined)).toBeNull()
  })
})

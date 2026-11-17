import { describe, expect, it } from 'vitest'
import {
  MOTIVO_NINGUN_TIPO_PARA_COMPARTIR,
  MOTIVO_SIN_PORTAPAPELES_DE_IMAGENES,
} from '../../../../../entities/compartir-tipos-cambio'
import { MOTIVO_SIN_IMAGEN, motivosDeLasAcciones } from './motivos-de-las-acciones'

const todo = { portapapeles: true, portapapelesDeImagenes: true, compartirDelSistema: false }
const listo = { estado: 'listo', dato: null } as const

describe('motivosDeLasAcciones', () => {
  it('con todo listo y todo permitido no hay motivos', () => {
    const m = motivosDeLasAcciones(listo, listo, false, todo)
    expect(m).toEqual({
      compartir: null,
      copiarTexto: null,
      copiarImagen: null,
      descargar: null,
      aLaVista: [],
    })
  })

  it('sin tipos elegidos todo está apagado con el mismo motivo, dicho una vez', () => {
    const m = motivosDeLasAcciones({ estado: 'sin_elegir' }, { estado: 'sin_elegir' }, true, todo)
    expect(m.copiarTexto).toBe(MOTIVO_NINGUN_TIPO_PARA_COMPARTIR)
    expect(m.copiarImagen).toBe(MOTIVO_NINGUN_TIPO_PARA_COMPARTIR)
    expect(m.descargar).toBe(MOTIVO_NINGUN_TIPO_PARA_COMPARTIR)
    expect(m.aLaVista).toEqual([MOTIVO_NINGUN_TIPO_PARA_COMPARTIR])
  })

  it('un navegador sin portapapeles de imágenes apaga sólo «Copiar imagen» y lo dice', () => {
    const m = motivosDeLasAcciones(listo, listo, false, { ...todo, portapapelesDeImagenes: false })
    expect(m.copiarImagen).toBe(MOTIVO_SIN_PORTAPAPELES_DE_IMAGENES)
    expect(m.copiarTexto).toBeNull()
    expect(m.descargar).toBeNull()
    expect(m.aLaVista).toEqual([MOTIVO_SIN_PORTAPAPELES_DE_IMAGENES])
  })

  it('si la imagen falla, el texto se copia y se comparte (sólo el texto)', () => {
    const m = motivosDeLasAcciones({ estado: 'error', mensaje: 'x' }, listo, false, {
      ...todo,
      compartirDelSistema: true,
    })
    expect(m.copiarTexto).toBeNull()
    expect(m.compartir).toBeNull()
    expect(m.descargar).toBe(MOTIVO_SIN_IMAGEN)
  })

  it('el menú del sistema espera a que la imagen llegue', () => {
    const m = motivosDeLasAcciones({ estado: 'leyendo' }, listo, false, {
      ...todo,
      compartirDelSistema: true,
    })
    expect(m.compartir).toBe(MOTIVO_SIN_IMAGEN)
  })
})

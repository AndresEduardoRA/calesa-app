import { describe, expect, it } from 'vitest'
import { MOTIVO_SIN_PORTAPAPELES_DE_IMAGENES, type Capacidades } from '@/shared/lib/compartir'
import {
  MOTIVO_FOTOS_BAJANDO,
  MOTIVO_IMAGEN_FALLIDA,
  MOTIVO_SIN_FOTOS,
  MOTIVO_SIN_IMAGEN,
  MOTIVO_SIN_RED,
  MOTIVO_SIN_TEXTO,
  MOTIVO_UNA_SOLA_FOTO,
  motivosDeCompartir,
  type EntradaDeLosMotivos,
} from './motivos-de-compartir'

const ESCRITORIO: Capacidades = {
  portapapeles: true,
  portapapelesDeImagenes: true,
  compartirDelSistema: false,
  compartirArchivos: false,
}
const CELULAR: Capacidades = { ...ESCRITORIO, compartirDelSistema: true, compartirArchivos: true }

const base: EntradaDeLosMotivos = {
  opcion: 'cotizacion',
  portada: 'listo',
  fotos: { marcadas: 0, listas: 0 },
  texto: 'listo',
  capacidades: ESCRITORIO,
  enLinea: true,
}
const con = (mas: Partial<EntradaDeLosMotivos>) => motivosDeCompartir({ ...base, ...mas })

describe('motivosDeCompartir', () => {
  it('con todo listo y permitido no hay motivos', () => {
    expect(con({})).toEqual({
      compartir: null,
      copiarImagen: null,
      descargarImagen: null,
      copiarTexto: null,
      descargarPdf: null,
      aLaVista: [],
    })
  })

  it('mientras llega la portada, lo de la imagen espera y lo dice una vez', () => {
    const m = con({ portada: 'leyendo' })
    expect(m.copiarImagen).toBe(MOTIVO_SIN_IMAGEN)
    expect(m.descargarImagen).toBe(MOTIVO_SIN_IMAGEN)
    expect(m.aLaVista).toEqual([MOTIVO_SIN_IMAGEN])
  })

  it('con la portada fallida, el menú del sistema manda sólo el texto', () => {
    const m = con({ portada: 'error', capacidades: CELULAR })
    expect(m.compartir).toBeNull()
    expect(m.copiarImagen).toBe(MOTIVO_IMAGEN_FALLIDA)
  })

  it('sin el texto no se comparte ni se copia texto', () => {
    const m = con({ texto: 'leyendo', capacidades: CELULAR })
    expect(m.compartir).toBe(MOTIVO_SIN_TEXTO)
    expect(m.copiarTexto).toBe(MOTIVO_SIN_TEXTO)
  })

  it('fotos: ninguna marcada, bajando, y copiar sólo con una', () => {
    expect(con({ opcion: 'fotos' }).descargarImagen).toBe(MOTIVO_SIN_FOTOS)
    expect(con({ opcion: 'fotos', fotos: { marcadas: 2, listas: 1 } }).descargarImagen).toBe(
      MOTIVO_FOTOS_BAJANDO,
    )
    const dos = con({ opcion: 'fotos', fotos: { marcadas: 2, listas: 2 } })
    expect(dos.descargarImagen).toBeNull()
    expect(dos.copiarImagen).toBe(MOTIVO_UNA_SOLA_FOTO)
    expect(con({ opcion: 'fotos', fotos: { marcadas: 1, listas: 1 } }).copiarImagen).toBeNull()
  })

  it('en el celular, las fotos sin bajar apagan «Compartir»', () => {
    const m = con({ opcion: 'fotos', fotos: { marcadas: 1, listas: 0 }, capacidades: CELULAR })
    expect(m.compartir).toBe(MOTIVO_FOTOS_BAJANDO)
  })

  it('sin red: el PDF y lo que falta bajar se apagan; lo que está en memoria sigue', () => {
    const m = con({ enLinea: false })
    expect(m.descargarPdf).toBe(MOTIVO_SIN_RED)
    expect(m.copiarImagen).toBeNull()
    expect(m.copiarTexto).toBeNull()
    expect(con({ enLinea: false, portada: 'leyendo' }).descargarImagen).toBe(MOTIVO_SIN_RED)
  })

  it('el navegador que no copia imágenes lo dice; en el celular ese botón no se ofrece', () => {
    const sin = { ...ESCRITORIO, portapapelesDeImagenes: false }
    expect(con({ capacidades: sin }).aLaVista).toEqual([MOTIVO_SIN_PORTAPAPELES_DE_IMAGENES])
    expect(con({ capacidades: { ...CELULAR, portapapelesDeImagenes: false } }).aLaVista).toEqual([])
  })
})

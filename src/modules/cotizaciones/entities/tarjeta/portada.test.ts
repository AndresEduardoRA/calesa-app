import { describe, expect, it } from 'vitest'
import {
  coincideLaEtiqueta,
  estadoDeLaPortadaDesde,
  etiquetaDeLaPortada,
  queHacerConLaPortada,
  rutaDelObjetoDeLaPortada,
  type EstadoDeLaPortada,
} from './portada'

const CLAVE = 'p1-0123456789abcdef0123456789abcdef'
const RUTA = `00000000-0000-4000-8000-000000000001/portada/${'a'.repeat(64)}.webp`
const CONTEXTO = {
  cliente: 'Juan Pérez',
  vehiculo: { titulo: 'Hilux', lote: '44', vin: null },
  asesor: { nombre: 'Ana', telefono: null, cargo: null, foto: null },
}

const respuesta = (cambios: Record<string, unknown> = {}) => ({
  ruta: RUTA,
  clave: CLAVE,
  clave_vigente: CLAVE,
  ve_todo: true,
  puede_guardarla: true,
  contexto: {
    cliente: 'Juan Pérez',
    vehiculo: { titulo: 'Hilux', lote: '44', vin: null },
    asesor: { nombre: '  ', email: 'ana@ejemplo.com' },
  },
  ...cambios,
})

const estado = (cambios: Partial<EstadoDeLaPortada> = {}): EstadoDeLaPortada => ({
  ruta: RUTA,
  clave: CLAVE,
  claveVigente: CLAVE,
  veTodo: true,
  puedeGuardarla: true,
  contexto: CONTEXTO,
  ...cambios,
})

describe('estadoDeLaPortadaDesde', () => {
  it('lee la respuesta de la base y nombra al asesor como la tarjeta (autorVisible)', () => {
    expect(estadoDeLaPortadaDesde(respuesta())).toEqual({
      ruta: RUTA,
      clave: CLAVE,
      claveVigente: CLAVE,
      veTodo: true,
      puedeGuardarla: true,
      contexto: {
        cliente: 'Juan Pérez',
        vehiculo: { titulo: 'Hilux', lote: '44', vin: null },
        asesor: { nombre: 'ana', telefono: null, cargo: null, foto: null },
      },
    })
  })

  it('sin portada, ruta y clave nulas', () => {
    expect(estadoDeLaPortadaDesde(respuesta({ ruta: null, clave: null }))).toMatchObject({
      ruta: null,
      clave: null,
      claveVigente: CLAVE,
    })
  })

  it('sin ve_todo no hay contexto ni se puede guardar, aunque la respuesta los trajera', () => {
    expect(estadoDeLaPortadaDesde(respuesta({ ve_todo: false }))).toMatchObject({
      veTodo: false,
      puedeGuardarla: false,
      contexto: null,
    })
  })

  it('con otra forma, nulo', () => {
    expect(estadoDeLaPortadaDesde(null)).toBeNull()
    expect(estadoDeLaPortadaDesde(respuesta({ clave_vigente: null }))).toBeNull()
    expect(estadoDeLaPortadaDesde(respuesta({ clave_vigente: '' }))).toBeNull()
    expect(estadoDeLaPortadaDesde(respuesta({ ve_todo: 'sí' }))).toBeNull()
  })
})

describe('la etiqueta', () => {
  it('es la clave entre comillas', () => {
    expect(etiquetaDeLaPortada(CLAVE)).toBe(`"${CLAVE}"`)
  })

  it('coincide con la fuerte, la débil y dentro de una lista; no con otra ni sin cabecera', () => {
    expect(coincideLaEtiqueta(`"${CLAVE}"`, CLAVE)).toBe(true)
    expect(coincideLaEtiqueta(`W/"${CLAVE}"`, CLAVE)).toBe(true)
    expect(coincideLaEtiqueta(`"otra", W/"${CLAVE}"`, CLAVE)).toBe(true)
    expect(coincideLaEtiqueta('"otra"', CLAVE)).toBe(false)
    expect(coincideLaEtiqueta(CLAVE, CLAVE)).toBe(false)
    expect(coincideLaEtiqueta(null, CLAVE)).toBe(false)
  })
})

describe('la etiqueta de la miniatura', () => {
  it('lleva su ancho: no es la de la grande ni coincide con ella', () => {
    expect(etiquetaDeLaPortada(CLAVE, 480)).toBe(`"${CLAVE}-480"`)
    expect(coincideLaEtiqueta(`"${CLAVE}-480"`, CLAVE, 480)).toBe(true)
    expect(coincideLaEtiqueta(`"${CLAVE}"`, CLAVE, 480)).toBe(false)
    expect(coincideLaEtiqueta(`"${CLAVE}-480"`, CLAVE)).toBe(false)
  })
})

describe('queHacerConLaPortada', () => {
  const pide = { siNoneMatch: null, perspectivaPropia: true }

  it('la miniatura da 304 sólo con su propia ETag', () => {
    expect(
      queHacerConLaPortada(estado(), { ...pide, ancho: 480, siNoneMatch: `"${CLAVE}-480"` }),
    ).toEqual({
      tipo: 'sin_cambios',
    })
    expect(
      queHacerConLaPortada(estado(), { ...pide, ancho: 480, siNoneMatch: `"${CLAVE}"` }),
    ).toEqual({
      tipo: 'bajar',
      ruta: RUTA,
    })
  })

  it('con la ETag de hoy, 304 sin bajar ni armar', () => {
    expect(queHacerConLaPortada(estado(), { ...pide, siNoneMatch: `"${CLAVE}"` })).toEqual({
      tipo: 'sin_cambios',
    })
    // Aunque la guardada falte: el navegador ya tiene la de esta clave.
    expect(
      queHacerConLaPortada(estado({ ruta: null, clave: null }), {
        ...pide,
        siNoneMatch: `"${CLAVE}"`,
      }),
    ).toEqual({ tipo: 'sin_cambios' })
  })

  it('la guardada al día se baja', () => {
    expect(queHacerConLaPortada(estado(), pide)).toEqual({ tipo: 'bajar', ruta: RUTA })
    expect(queHacerConLaPortada(estado(), { ...pide, siNoneMatch: '"vieja"' })).toEqual({
      tipo: 'bajar',
      ruta: RUTA,
    })
  })

  it('sin guardada o vieja, se arma la compartida y se guarda si puede', () => {
    expect(queHacerConLaPortada(estado({ ruta: null, clave: null }), pide)).toEqual({
      tipo: 'generar',
      contexto: CONTEXTO,
      guardar: true,
    })
    expect(queHacerConLaPortada(estado({ clave: 'p1-vieja' }), pide)).toEqual({
      tipo: 'generar',
      contexto: CONTEXTO,
      guardar: true,
    })
  })

  it('quien sólo ve recibe la compartida sin guardarla', () => {
    expect(
      queHacerConLaPortada(estado({ clave: 'p1-vieja', puedeGuardarla: false }), pide),
    ).toEqual({
      tipo: 'generar',
      contexto: CONTEXTO,
      guardar: false,
    })
  })

  it('sin ver todo, o con «Ver como», se arma con lo suyo: sin ETag, sin bajar la guardada y sin guardar', () => {
    const sinVer = estado({ veTodo: false, puedeGuardarla: false, contexto: null })
    expect(queHacerConLaPortada(sinVer, { ...pide, siNoneMatch: `"${CLAVE}"` })).toEqual({
      tipo: 'generar',
      contexto: null,
      guardar: false,
    })
    expect(
      queHacerConLaPortada(estado(), { siNoneMatch: `"${CLAVE}"`, perspectivaPropia: false }),
    ).toEqual({
      tipo: 'generar',
      contexto: null,
      guardar: false,
    })
  })
})

describe('rutaDelObjetoDeLaPortada', () => {
  it('va por hash en la carpeta portada/ de la cotización', () => {
    expect(rutaDelObjetoDeLaPortada('c1', 'f'.repeat(64))).toBe(`c1/portada/${'f'.repeat(64)}.webp`)
  })
})

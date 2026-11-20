import { describe, expect, it } from 'vitest'
import {
  avisoDePrivada,
  MOTIVO_PRIVADA_APROBADA,
  MOTIVO_PRIVADA_FINAL,
  ofertaDePrivada,
  type DatosDeLaPrivada,
} from './privada'

const ANA = '6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b'
const LUIS = '7a2d3c4b-5e6f-4a70-9b8c-0d1e2f3a4b5c'

const base: DatosDeLaPrivada = {
  creadoPor: ANA,
  usuarioId: ANA,
  clase: 'preventa',
  aprobada: false,
  privada: false,
}

describe('ofertaDePrivada', () => {
  it('quien no la creó no ve la línea, sea privada o no, aunque vea todas', () => {
    expect(ofertaDePrivada({ ...base, usuarioId: LUIS })).toBeNull()
    expect(ofertaDePrivada({ ...base, usuarioId: LUIS, privada: true })).toBeNull()
  })

  it('la autora de una pública ve «Hacer privada»; de una privada, «Hacer pública»', () => {
    expect(ofertaDePrivada(base)).toEqual({ clave: 'hacer-privada', motivo: null })
    expect(ofertaDePrivada({ ...base, privada: true })).toEqual({
      clave: 'hacer-publica',
      motivo: null,
    })
  })

  it('una final o la aprobada no se hacen privadas: la línea queda apagada con el motivo de la base', () => {
    expect(ofertaDePrivada({ ...base, clase: 'final' })).toEqual({
      clave: 'hacer-privada',
      motivo: MOTIVO_PRIVADA_FINAL,
    })
    expect(ofertaDePrivada({ ...base, aprobada: true })).toEqual({
      clave: 'hacer-privada',
      motivo: MOTIVO_PRIVADA_APROBADA,
    })
  })

  it('sin saber si es la aprobada, la ofrece encendida: decide la base al intentarlo', () => {
    expect(ofertaDePrivada({ ...base, aprobada: null })).toEqual({
      clave: 'hacer-privada',
      motivo: null,
    })
  })

  it('hacerla pública siempre se puede: una privada nunca es final ni la aprobada', () => {
    expect(ofertaDePrivada({ ...base, privada: true, aprobada: true })?.motivo).toBeNull()
  })
})

describe('avisoDePrivada', () => {
  it('nombra el número y cómo quedó', () => {
    expect(avisoDePrivada(12, true)).toBe('La n.º 12 es privada.')
    expect(avisoDePrivada(12, false)).toBe('La n.º 12 es pública.')
  })
})

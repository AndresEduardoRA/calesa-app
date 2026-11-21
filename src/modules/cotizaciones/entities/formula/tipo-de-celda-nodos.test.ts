import { describe, expect, it } from 'vitest'
import type { Nodo } from '../nodos'
import { nodoDelTipo } from './tipo-de-celda-nodos'

const REMATE = {
  id: 'remate',
  tipo: 'constante',
  etiqueta: 'Remate',
  descripcion: 'Lo que se paga en la subasta',
  formato: 'usd',
  grupo: 'primer_pago',
} as Nodo

describe('nodoDelTipo', () => {
  it('a «Lo escribe el asesor»: conserva id, etiqueta, descripción, formato y banda', () => {
    expect(nodoDelTipo(REMATE, { tipo: 'lo_escribe_el_asesor' })).toEqual({
      id: 'remate',
      tipo: 'input',
      etiqueta: 'Remate',
      descripcion: 'Lo que se paga en la subasta',
      formato: 'usd',
      grupo: 'primer_pago',
    })
  })

  it('a «Interruptor Sí/No»: no da un monto, así que sale de la banda', () => {
    expect(nodoDelTipo(REMATE, { tipo: 'interruptor' })).toEqual({
      id: 'remate',
      tipo: 'bandera',
      etiqueta: 'Remate',
      descripcion: 'Lo que se paga en la subasta',
    })
  })

  it('a «Dato del vehículo» y «Tipo de cambio»: con formato raw y sin banda', () => {
    expect(nodoDelTipo(REMATE, { tipo: 'dato_del_vehiculo', campo: 'anio' })).toMatchObject({
      tipo: 'campo_vehiculo',
      campo: 'anio',
      formato: 'raw',
    })
    expect(nodoDelTipo(REMATE, { tipo: 'tipo_de_cambio', clave: 'oficial' })).not.toHaveProperty(
      'grupo',
    )
  })

  it('el total sigue siendo el total', () => {
    const total = { id: 'total', tipo: 'constante', etiqueta: 'Total', salida: 'total' } as Nodo
    expect(nodoDelTipo(total, { tipo: 'valor_fijo', valor: 0 })).toMatchObject({
      tipo: 'constante',
      salida: 'total',
    })
  })

  it('a «Variante»: sus opciones, la de por defecto y en par', () => {
    const opciones = [{ clave: 'a', etiqueta: 'A', titulo: 'Opción A' }]
    expect(
      nodoDelTipo(REMATE, { tipo: 'variante', opciones, porDefecto: 'a', enPar: true }),
    ).toMatchObject({ tipo: 'opcion', opciones, por_defecto: 'a', en_par: true })
  })
})

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { compilarExpresion, type ContextoDeCompilacion } from './compilador'
import { formulaDe } from './compilador-formula-de-prueba'
import { evaluar } from './motor'
import { esquemaEntrada } from './motor-entrada'
import { validarFormula } from './validar'

// La ruta va por una variable: Vite reescribe un `new URL('literal', import.meta.url)`.
const JUEGO = './casos-del-compilador.json'
const { contexto } = JSON.parse(readFileSync(new URL(JUEGO, import.meta.url), 'utf8')) as {
  contexto: ContextoDeCompilacion
}

const TABLAS = {
  fletes: [
    { desde: 0, hasta: 1000, monto: 300 },
    { desde: 1000.01, hasta: 5000, monto: 450 },
  ],
  tasas: [
    { anio: 2020, tasa: 0.1 },
    { anio: 2024, tasa: 0.3 },
  ],
  recargos: [
    { variante: 'a', recargo: 5 },
    { variante: 'b', recargo: 9 },
  ],
}

// Lo que vale el total con esos inputs, ese vehículo y esa opción de la variante.
function valorDe(
  texto: string,
  inputs: Record<string, number>,
  otros: { anio?: number; variante?: string } = {},
) {
  const r = compilarExpresion(texto, contexto)
  if (!r.ok) throw new Error(`«${texto}» no compiló: ${r.error.codigo}`)
  const f = formulaDe(contexto, r)
  const v = validarFormula(f.definicion, f.params)
  if (!v.ok) throw new Error(`«${texto}» no valida: ${v.error.mensaje}`)
  const entrada = esquemaEntrada.parse({
    inputs,
    banderas: {},
    tipos_cambio: { paralelo: 1 },
    vehiculo: otros.anio === undefined ? {} : { anio: otros.anio },
    tablas: TABLAS,
    overrides: {},
    variante: otros.variante ?? 'a',
  })
  return evaluar(v.formula, entrada).valores['total']
}

describe('BUSCARV calcula como Excel', () => {
  it('por tramo: la fila cuyo desde y hasta encierran el valor, los extremos incluidos', () => {
    const texto = 'BUSCARV(remate; "fletes"; "monto"; VERDADERO)'
    expect(valorDe(texto, { remate: 1000 })).toBe(300)
    expect(valorDe(texto, { remate: 2000 })).toBe(450)
    expect(valorDe(texto, { remate: 9000 })).toBeNull()
  })

  it('exacta: la fila cuya primera columna es el valor', () => {
    expect(valorDe('BUSCARV(anio; "tasas"; "tasa")', {}, { anio: 2024 })).toBe(0.3)
    expect(valorDe('BUSCARV(variante; "recargos"; "recargo")', {}, { variante: 'b' })).toBe(9)
  })

  it('el ejemplo de la tarea, a cada lado del umbral', () => {
    const texto =
      'SI(remate>1000; MAX(remate*0.1; 150); BUSCARV(remate; "fletes"; "monto"; VERDADERO))'
    expect(valorDe(texto, { remate: 2000 })).toBe(200)
    expect(valorDe(texto, { remate: 1200 })).toBe(150)
    expect(valorDe(texto, { remate: 800 })).toBe(300)
  })
})

describe('el catálogo de tablas', () => {
  const codigoCon = (tablas: ContextoDeCompilacion['tablas']) => {
    const r = compilarExpresion('BUSCARV(remate; "fletes"; "monto"; VERDADERO)', {
      ...contexto,
      tablas,
    })
    return r.ok ? 'compiló' : r.error.codigo
  }

  it('con dos tablas de la misma clave manda la primera (el catálogo trae la del origen antes)', () => {
    const propia = { clave: 'fletes', columnas: ['desde', 'hasta', 'monto'] }
    const compartida = { clave: 'fletes', columnas: ['monto'] }
    expect(codigoCon([propia, compartida])).toBe('compiló')
    expect(codigoCon([compartida, propia])).toBe('tabla_sin_tramos')
  })

  it('un origen sin tablas no tiene ninguna; sin catálogo, no se pudo leer', () => {
    expect(codigoCon([])).toBe('tabla_inexistente')
    expect(codigoCon(null)).toBe('tablas_sin_leer')
    expect(codigoCon(undefined)).toBe('tablas_sin_leer')
  })
})

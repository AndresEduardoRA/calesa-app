import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { compilarExpresion, type ContextoDeCompilacion } from './compilador'
import { formulaDe } from './compilador-formula-de-prueba'
import { evaluar } from './motor'
import { esquemaEntrada } from './motor-entrada'
import { MAXIMO_DE_PROFUNDIDAD, MAXIMO_DE_TERMINOS } from './motivos-del-compilador'
import type { Nodo } from './nodos'
import { validarFormula } from './validar'

// La ruta va por una variable: Vite reescribe un `new URL('literal', import.meta.url)`.
const JUEGO = './casos-del-compilador.json'
const { contexto } = JSON.parse(readFileSync(new URL(JUEGO, import.meta.url), 'utf8')) as {
  contexto: ContextoDeCompilacion
}

const compilar = (texto: string, ctx: ContextoDeCompilacion = contexto) => {
  const r = compilarExpresion(texto, ctx)
  if (!r.ok) throw new Error(`«${texto}» no compiló: ${r.error.codigo}`)
  return r
}
const codigoDe = (texto: string, ctx: ContextoDeCompilacion = contexto) => {
  const r = compilarExpresion(texto, ctx)
  return r.ok ? 'compiló' : r.error.codigo
}

// Lo que vale el total con esos inputs y banderas.
function valorDe(texto: string, inputs: Record<string, number>, banderas = {}) {
  const r = compilar(texto)
  const f = formulaDe(contexto, r)
  const v = validarFormula(f.definicion, f.params)
  if (!v.ok) throw new Error(`«${texto}» no valida: ${v.error.mensaje}`)
  const entrada = esquemaEntrada.parse({
    inputs,
    banderas,
    tipos_cambio: { paralelo: 1 },
    vehiculo: {},
    tablas: {},
    overrides: {},
    variante: 'a',
  })
  return evaluar(v.formula, entrada).valores['total']
}

describe('SI con una bandera y un valor', () => {
  it('sigue siendo el `si` de siempre, nodo por nodo', () => {
    expect(compilar('SI(activa; remate*fees)').nodos).toEqual([
      {
        id: 'total__1',
        tipo: 'calculo',
        op: 'multiplicar',
        de: ['remate', 'fees'],
        etiqueta: 'remate*fees',
      },
      {
        id: 'total',
        tipo: 'calculo',
        op: 'si',
        de: ['total__1'],
        condicion: 'activa',
        etiqueta: 'Total',
        salida: 'total',
      },
    ])
  })

  it('con una rama «si no», o con una condición que no es una bandera, es un `elegir`', () => {
    expect(compilar('SI(activa; remate; fees)').nodos.at(-1)).toMatchObject({ op: 'elegir' })
    expect(compilar('SI(remate>1; fees)').nodos.at(-1)).toMatchObject({ op: 'elegir' })
  })
})

describe('las condiciones', () => {
  // Una fila anterior que ya es una comparación.
  const caro: Nodo = {
    id: 'es_caro',
    tipo: 'calculo',
    op: 'comparar',
    de: ['remate', 'fees'],
    cmp: '>',
    etiqueta: 'Es caro',
    formato: 'raw',
  }
  const conCaro = { ...contexto, nodos: [...contexto.nodos, caro] }

  it('una fila anterior que compara sirve de condición', () => {
    expect(compilar('SI(es_caro; remate; fees)', conCaro).nodos).toEqual([
      {
        id: 'total',
        tipo: 'calculo',
        op: 'elegir',
        de: ['remate', 'fees'],
        prueba: 'es_caro',
        etiqueta: 'Total',
        salida: 'total',
      },
    ])
    expect(codigoDe('Y(es_caro; activa)', conCaro)).toBe('compiló')
  })

  it('un monto no sirve: el mensaje propone una comparación con su nombre', () => {
    const r = compilarExpresion('SI(remate; 1; 2)', contexto)
    expect(r.ok ? 'compiló' : r.error.mensaje).toBe(
      'SI necesita una condición, por ejemplo remate>1000.',
    )
  })

  it('la variante tampoco: el mensaje propone compararla con una de sus opciones', () => {
    const r = compilarExpresion('O(activa; variante)', contexto)
    expect(r.ok ? 'compiló' : r.error.mensaje).toBe(
      'O necesita una condición, por ejemplo variante="a".',
    )
  })
})

describe('los topes', () => {
  const anidados = (n: number) => `${'SI(remate>1; '.repeat(n)}fees${'; 0)'.repeat(n)}`

  it(`${String(MAXIMO_DE_PROFUNDIDAD)} SI anidados compilan y uno más es demasiado profundo`, () => {
    expect(codigoDe(anidados(MAXIMO_DE_PROFUNDIDAD))).toBe('compiló')
    expect(codigoDe(anidados(MAXIMO_DE_PROFUNDIDAD + 1))).toBe('demasiado_profundo')
  })

  // Un grupo `g` con n miembros, antes de la fila.
  const conGrupo = (n: number): ContextoDeCompilacion => ({
    nodos: Array.from({ length: n }, (_, i) => ({
      id: `n${String(i)}`,
      tipo: 'input' as const,
      etiqueta: 'N',
      grupo: 'g',
    })),
    grupos: ['g'],
    params: {},
    destino: { id: 'total', etiqueta: 'Total' },
  })

  it('MAX de un grupo cuenta sus miembros contra el tope de términos', () => {
    expect(codigoDe('MAX(g)', conGrupo(MAXIMO_DE_TERMINOS))).toBe('compiló')
    expect(codigoDe('MIN(g)', conGrupo(MAXIMO_DE_TERMINOS + 1))).toBe('demasiados_terminos')
  })

  it('Y y MAX cuentan sus argumentos', () => {
    const muchos = (f: string, x: string) =>
      `${f}(${Array.from({ length: MAXIMO_DE_TERMINOS + 1 }, () => x).join(';')})`
    expect(codigoDe(muchos('MAX', 'remate'))).toBe('demasiados_terminos')
    expect(codigoDe(muchos('Y', 'activa'))).toBe('demasiados_terminos')
  })
})

describe('lo compilado calcula como Excel', () => {
  const texto = 'SI(remate>1000; MAX(remate*0.1; 150); MIN(fees; 7))'

  it('a cada lado del umbral, y en el umbral (1000 no es mayor que 1000)', () => {
    expect(valorDe(texto, { remate: 2000, fees: 3 })).toBe(200)
    expect(valorDe(texto, { remate: 1200, fees: 3 })).toBe(150)
    expect(valorDe(texto, { remate: 1000, fees: 3 })).toBe(3)
    expect(valorDe(texto, { remate: 1000, fees: 30 })).toBe(7)
  })

  it('la variante comparada, Y y O', () => {
    expect(valorDe('SI(variante="a"; 1; 2)', {})).toBe(1)
    expect(valorDe('SI(variante<>"a"; 1; 2)', {})).toBe(2)
    expect(valorDe('SI(Y(activa; remate>=5); 1; 2)', { remate: 5 }, { activa: true })).toBe(1)
    expect(valorDe('SI(O(activa; remate<5); 1; 2)', { remate: 5 }, { activa: false })).toBe(2)
  })
})

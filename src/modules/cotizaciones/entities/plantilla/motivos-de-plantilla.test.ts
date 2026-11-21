import { describe, expect, it } from 'vitest'
import { REGLAS_DE_PLANTILLA, rechazoDePlantilla } from './motivos-de-plantilla'

describe('REGLAS_DE_PLANTILLA', () => {
  it('va en el orden fijo de validar_plantilla(): el primer rechazo manda', () => {
    expect(REGLAS_DE_PLANTILLA).toEqual([
      'forma',
      'demasiadas_columnas',
      'demasiadas_filas',
      'demasiadas_celdas',
      'columna_repetida',
      'fila_repetida',
      'celda_repetida',
      'ancho_total',
      'celda_fuera_de_la_grilla',
      'celdas_se_pisan',
      'variable_inexistente',
      'respaldo_vacio',
      'grupo_inexistente',
      'grupo_repetido',
      'grupo_faltante',
      'tono_inexistente',
      'nodo_de_fila_inexistente',
      'nodo_inexistente',
      'mostrar_no_admitido',
      'nodo_sin_lugar',
      'nodo_restringido',
      'tipo_de_cambio_restringido',
      'condicion_invalida',
    ])
  })
})

describe('rechazoDePlantilla', () => {
  // Los textos de los `format` de `validar_plantilla()` y sus ayudantes en la base, con el donde entre comillas latinas.
  it.each([
    ['forma', 'grupos[0]', 'La plantilla no tiene la forma esperada.'],
    ['grupo_inexistente', 'seguro', 'El grupo «seguro» no es de la fórmula.'],
    ['grupo_repetido', 'compra', 'El grupo «compra» está dos veces.'],
    [
      'grupo_faltante',
      'aduana',
      'Falta el grupo «aduana»: la tarjeta lleva todos los grupos de la fórmula.',
    ],
    ['tono_inexistente', 'compra', 'El grupo «compra» usa un color que no está en el catálogo.'],
    ['nodo_inexistente', 'zz', 'La plantilla nombra «zz», que no es un nodo de la fórmula.'],
    [
      'nodo_sin_lugar',
      'cif',
      'El nodo «cif» no va en la tarjeta: no es de un grupo, el total ni lo aparte.',
    ],
    ['nodo_restringido', 'fees', 'La tarjeta no puede mostrar «fees»: no es del nivel «todos».'],
    [
      'tipo_de_cambio_restringido',
      'tc_adu',
      'La tarjeta no puede nombrar el tipo de cambio de «tc_adu»: no es del nivel «todos».',
    ],
    // La forma 2: el `donde` con prefijo y el mensaje nombra la celda, la fila o la columna, nunca el nodo.
    ['demasiadas_columnas', 'columnas', 'La tarjeta lleva hasta 16 columnas.'],
    ['demasiadas_filas', 'filas', 'La tarjeta lleva hasta 120 filas.'],
    ['demasiadas_celdas', 'celdas', 'La tarjeta lleva hasta 1.000 celdas.'],
    ['columna_repetida', 'columnas.a', 'La columna «a» está dos veces.'],
    ['fila_repetida', 'filas.f', 'La fila «f» está dos veces.'],
    ['celda_repetida', 'celdas.x', 'La celda «x» está dos veces.'],
    ['ancho_total', 'columnas', 'Las columnas suman más de 1.600 px de ancho.'],
    ['celda_fuera_de_la_grilla', 'celdas.x', 'La celda «x» se sale de la cuadrícula.'],
    ['celdas_se_pisan', 'celdas.y', 'La celda «y» pisa otra celda.'],
    ['variable_inexistente', 'celdas.fecha', 'La celda «fecha» muestra un dato que no existe.'],
    [
      'respaldo_vacio',
      'celdas.x',
      'La celda «x» necesita al menos dos datos para mostrar el primero con valor.',
    ],
    ['tono_inexistente', 'celdas.x', 'La celda «x» usa un color que no está en el catálogo.'],
    [
      'nodo_de_fila_inexistente',
      'filas.fees',
      'La fila «fees» depende de un nodo que no es de la fórmula.',
    ],
    ['nodo_inexistente', 'celdas.x', 'La celda «x» nombra un nodo que no es de la fórmula.'],
    ['mostrar_no_admitido', 'celdas.x', 'La celda «x» muestra algo que su nodo no tiene.'],
    [
      'nodo_restringido',
      'filas.fees',
      'La tarjeta no puede mostrar lo que nombra la fila «fees»: no es del nivel «todos».',
    ],
    [
      'tipo_de_cambio_restringido',
      'celdas.tc',
      'La tarjeta no puede nombrar el tipo de cambio de la celda «tc»: no es del nivel «todos».',
    ],
    [
      'condicion_invalida',
      'filas.f',
      'La fila «f» tiene una condición que esta fórmula no puede responder.',
    ],
  ] as const)('%s', (regla, donde, mensaje) => {
    expect(rechazoDePlantilla(regla, donde)).toEqual({ regla, donde, mensaje })
  })
})

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { problemasDelWorkflow } from './workflows'

// El job `carreras` de ci.yml, propio de este repo: `db:carreras` con dos o tres conexiones reales, sólo a mano (workflow_dispatch con
// el input `carreras`, apagado por defecto) hasta 5 corridas seguidas en verde (docs/PENDIENTES.md, 9-6). Cada mutación rompe esa
// regla en el ci.yml real y la guarda de workflows.ts tiene que caer con el motivo.
const CI = '.github/workflows/ci.yml'
const ci = readFileSync(CI, 'utf8')

function mutar(texto: string, antes: string | RegExp, despues: string): string {
  const mutado = texto.replace(antes, despues)
  expect(mutado, `la mutación no encontró ${String(antes)}`).not.toBe(texto)
  return mutado
}

describe('las mutaciones del job carreras caen', () => {
  const casos: [string, string | RegExp, string, RegExp][] = [
    [
      'el job carreras sin su if',
      /^ {4}if: github\.event_name == 'workflow_dispatch' && inputs\.carreras\n/m,
      '',
      /db:carreras no corre en CI/,
    ],
    [
      'el job carreras sin workflow_dispatch en su if',
      "if: github.event_name == 'workflow_dispatch' && inputs.carreras",
      'if: inputs.carreras',
      /db:carreras no corre en CI/,
    ],
    [
      'el job carreras con otro if',
      "if: github.event_name == 'workflow_dispatch' && inputs.carreras",
      "if: github.event_name == 'workflow_dispatch' || inputs.carreras",
      /db:carreras no corre en CI/,
    ],
    [
      'el input carreras encendido por defecto',
      /( {6}carreras:\n(?: {8}.*\n)*? {8}default: )false/,
      '$1true',
      /input «carreras»/,
    ],
    [
      'carreras.mjs en el job carreras',
      '- run: pnpm db:carreras',
      '- run: node scripts/carreras.mjs',
      /carreras\.mjs no corre en CI/,
    ],
  ]

  it.each(casos)('%s', (_, antes, despues, motivo) => {
    expect(problemasDelWorkflow(mutar(ci, antes, despues), CI).join('\n')).toMatch(motivo)
  })
})

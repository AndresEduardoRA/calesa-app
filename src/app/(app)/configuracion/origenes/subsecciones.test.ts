import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CLAVES_DE_PARTE_DEL_ORIGEN,
  SUBSECCIONES_DE_ORIGEN,
  rutaDeSubseccionDeOrigen,
  subseccionDeOrigen,
} from './subsecciones'

const APP = path.join(process.cwd(), 'src/app/(app)')

describe('las partes de un origen', () => {
  it('son Datos, Campos y Categorías, cada una con su frase', () => {
    expect(SUBSECCIONES_DE_ORIGEN.map((sub) => sub.clave)).toEqual([...CLAVES_DE_PARTE_DEL_ORIGEN])
    expect(SUBSECCIONES_DE_ORIGEN.map((sub) => sub.titulo)).toEqual([
      'Datos',
      'Campos',
      'Categorías',
    ])
    expect(subseccionDeOrigen('campos').descripcion).toBe(
      'Los datos que se cargan de cada vehículo y los 4 que su ficha muestra primero.',
    )
  })

  it('cada ruta resuelta lleva a una pantalla que existe', () => {
    const id = '00000000-0000-4000-8000-000000000001'
    for (const clave of CLAVES_DE_PARTE_DEL_ORIGEN) {
      expect(rutaDeSubseccionDeOrigen(clave, id)).toBe(`/configuracion/origenes/${id}/${clave}`)
      expect(existsSync(path.join(APP, subseccionDeOrigen(clave).ruta, 'page.tsx')), clave).toBe(
        true,
      )
    }
  })
})

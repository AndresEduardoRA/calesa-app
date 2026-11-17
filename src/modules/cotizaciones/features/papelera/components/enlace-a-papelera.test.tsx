import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { HUECOS_DE_PAPELERA_EN_EL_LISTADO } from './huecos-en-el-listado'

afterEach(cleanup)

const con = (...claves: string[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' as const })) as Permisos

// Lo que la página pregunta antes de pasar `Junto`: si quien mira lo vería.
function hayJunto(permisos: Permisos): boolean {
  const { hayJunto: pregunta } = HUECOS_DE_PAPELERA_EN_EL_LISTADO
  if (!pregunta) {
    throw new Error('El área papelera no dice cuándo hay `Junto`')
  }
  return pregunta(permisos)
}

function dibujar(permisos: Permisos) {
  const { Junto } = HUECOS_DE_PAPELERA_EN_EL_LISTADO
  if (!Junto) {
    throw new Error('El área papelera no llena `Junto`')
  }
  return render(<Junto permisos={permisos} />)
}

describe('el enlace a la papelera en «Vista y opciones» › «Más»', () => {
  it('lleva «Papelera» a la papelera de cotizaciones a quien puede enviar', () => {
    dibujar(con('cotizaciones.editar'))
    expect(screen.getByRole('link', { name: 'Papelera' }).getAttribute('href')).toBe(
      '/cotizaciones/papelera',
    )
    expect(hayJunto(con('cotizaciones.editar'))).toBe(true)
  })

  it('también a quien puede vaciarla', () => {
    dibujar(con('cotizaciones.papelera.purgar'))
    expect(screen.getByRole('link', { name: 'Papelera' })).toBeTruthy()
    expect(hayJunto(con('cotizaciones.papelera.purgar'))).toBe(true)
  })

  it('a quien modera o gestiona finales', () => {
    dibujar(con('cotizaciones.moderar'))
    expect(screen.getByRole('link', { name: 'Papelera' })).toBeTruthy()
    cleanup()
    dibujar(con('cotizaciones.final.gestionar'))
    expect(screen.getByRole('link', { name: 'Papelera' })).toBeTruthy()
    expect(hayJunto(con('cotizaciones.moderar'))).toBe(true)
    expect(hayJunto(con('cotizaciones.final.gestionar'))).toBe(true)
  })

  it('no a quien sólo ve o crea', () => {
    const { container } = dibujar(con('cotizaciones.ver', 'cotizaciones.crear'))
    expect(screen.queryByRole('link', { name: 'Papelera' })).toBeNull()
    expect(container.textContent).toBe('')
    // La página no pasa `Junto` y el listado no arma «Más» vacío.
    expect(hayJunto(con('cotizaciones.ver', 'cotizaciones.crear'))).toBe(false)
  })
})

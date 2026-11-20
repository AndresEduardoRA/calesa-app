import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PlantillaEnCuadricula } from '../../../entities/cuadricula-de-la-tarjeta'
import type { PropsDelEditor } from '../../../entities/plantilla/props-del-editor'
import type { ReferenciaDeLaTarjeta } from '../../../entities/referencia-de-la-tarjeta'
import type { PropsDelLienzoDeLaPlantilla } from '../../../entities/vista-previa-de-la-plantilla'
import { AVISO_DE_PANTALLA_CHICA } from './cuadricula/aviso-de-pantalla-chica'
import { PestanaDeLaTarjeta } from './pestana-de-la-tarjeta'

// El editor y el modal se sustituyen por cáscaras con estado propio: lo que se prueba es qué se remonta y qué no, y qué se dibuja según el ancho.
const montajes = { editor: 0, modal: 0 }
const medios = { ancha: true }
vi.mock('@/shared/ui/use-consulta-de-medios', () => ({ useConsultaDeMedios: () => medios.ancha }))
vi.mock('./cuadricula/diferidos', async () => {
  const { useEffect } = await import('react')
  return {
    EditorDeLaCuadriculaDiferido: (p: { esperada: string | null; alPublicar: () => void }) => {
      useEffect(() => {
        montajes.editor += 1
      }, [])
      return (
        <button type="button" onClick={p.alPublicar}>
          editor {p.esperada}
        </button>
      )
    },
  }
})
vi.mock('./diferidos', async () => {
  const { useEffect, useState } = await import('react')
  return {
    ModalDePublicarLaTarjetaDiferido: () => {
      const [nota, setNota] = useState('')
      useEffect(() => {
        montajes.modal += 1
      }, [])
      return (
        <input
          aria-label="nota del modal"
          value={nota}
          onChange={(e) => {
            setNota(e.target.value)
          }}
        />
      )
    },
    DescartarLaPlantillaDiferido: () => null,
  }
})
vi.mock('@/shared/ui/toasts', () => ({ avisarError: vi.fn() }))

const V1 = '2026-11-07T15:00:00.123456+00:00'
const V2 = '2026-11-07T16:00:00.654321+00:00'
const CUADRICULA: PlantillaEnCuadricula = {
  forma: 2,
  columnas: [{ id: 'a', ancho: 100 }],
  filas: [{ id: 'f', alto: 20, ocultar_si: 'nunca' }],
  celdas: [],
}
const editor = (esperada: string): PropsDelEditor => ({
  origen: { id: 'o', nombre: 'Mini' },
  esperada,
  inicial: CUADRICULA,
  de: 'borrador',
  avisos: [],
  contexto: { definicion: { nodos: [] }, diseno: null, visibilidad: null, tonos: [] },
  tonos: [],
  publicada: null,
  guardada: CUADRICULA,
})
const REFERENCIA: ReferenciaDeLaTarjeta = { estado: 'sin_cotizacion' }
const lienzos: PropsDelLienzoDeLaPlantilla[] = []
function Lienzo(props: PropsDelLienzoDeLaPlantilla) {
  lienzos.push(props)
  return <div data-testid="lienzo" />
}

afterEach(() => {
  cleanup()
  montajes.editor = 0
  montajes.modal = 0
  medios.ancha = true
  lienzos.length = 0
})

function Pestana({ esperada }: { esperada: string }) {
  return (
    <NuqsTestingAdapter searchParams="?panel=publicar-tarjeta" hasMemory>
      <PestanaDeLaTarjeta
        editor={editor(esperada)}
        referencia={REFERENCIA}
        Lienzo={Lienzo}
        puedeCambiarElLogo={false}
      />
    </NuqsTestingAdapter>
  )
}

describe('PestanaDeLaTarjeta', () => {
  it('un cambio de esperada remonta el editor y NO el modal: la nota escrita sobrevive', () => {
    const { rerender } = render(<Pestana esperada={V1} />)
    const campo = screen.getByLabelText('nota del modal') as HTMLInputElement
    act(() => {
      fireEvent.change(campo, { target: { value: 'Mi nota' } })
    })
    expect(montajes).toEqual({ editor: 1, modal: 1 })
    rerender(<Pestana esperada={V2} />)
    expect(montajes).toEqual({ editor: 2, modal: 1 })
    expect((screen.getByLabelText('nota del modal') as HTMLInputElement).value).toBe('Mi nota')
  })

  it('en una pantalla de menos de 1.024 px: el aviso y la tarjeta en sólo lectura (el lienzo sin capa), sin pedir el editor', () => {
    medios.ancha = false
    render(<Pestana esperada={V1} />)
    expect(screen.getByText(AVISO_DE_PANTALLA_CHICA)).toBeTruthy()
    expect(screen.getByTestId('lienzo')).toBeTruthy()
    expect(montajes.editor).toBe(0)
    const ultimo = lienzos[lienzos.length - 1]
    expect(ultimo?.capa).toBeUndefined()
    expect(ultimo?.referencia).toBeNull()
    expect(ultimo?.lectura.definicion).toEqual(CUADRICULA)
  })
})

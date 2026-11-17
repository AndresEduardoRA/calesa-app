import { renderHook, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { probarLaVuelta } from '@/shared/ui/vuelta-del-foco.soporte'
import { useResumenDeVehiculo } from './use-resumen-de-vehiculo'

const ID = '2f1c3a4b-5d6e-4f70-8a9b-0c1d2e3f4a5b'

const useResumenDePrueba = () => useResumenDeVehiculo()

// El resumen de un vehículo (`?vehiculo=<id>`): tras recargar con él abierto, «atrás» devuelve el foco a la fila que lo abrió (4-49).
probarLaVuelta({
  hook: 'useResumenDeVehiculo',
  usar: useResumenDePrueba,
  clave: 'vehiculo',
  cerrada: '',
  aperturas: [
    {
      nombre: 'abrir',
      abrir: (resumen) => {
        resumen.abrir(ID)
      },
      abierta: `?vehiculo=${ID}`,
      abierto: (resumen) => resumen.id === ID,
    },
  ],
  cerrar: (resumen) => {
    resumen.cerrar()
  },
})

describe('un `?pestana=` viejo', () => {
  const envoltura = (busqueda: string, alCambiar: (e: UrlUpdateEvent) => void) =>
    function Envoltura({ children }: { children: ReactNode }) {
      return (
        <NuqsTestingAdapter searchParams={busqueda} onUrlUpdate={alCambiar} hasMemory>
          {children}
        </NuqsTestingAdapter>
      )
    }

  it('`fotos` se reemplaza por el visor del carrusel del resumen, sin sumar al historial', async () => {
    const alCambiar = vi.fn<(e: UrlUpdateEvent) => void>()
    renderHook(useResumenDePrueba, {
      wrapper: envoltura(`?vehiculo=${ID}&pestana=fotos`, alCambiar),
    })
    await waitFor(() => {
      expect(alCambiar).toHaveBeenCalled()
    })
    const ultima = alCambiar.mock.lastCall?.[0]
    expect(ultima?.searchParams.get('pestana')).toBeNull()
    expect(ultima?.searchParams.get('visor')).toBe(`${ID}-resumen`)
    expect(ultima?.searchParams.get('foto')).toBe('1')
    expect(ultima?.options.history).toBe('replace')
  })

  it('otra pestaña sólo se quita', async () => {
    const alCambiar = vi.fn<(e: UrlUpdateEvent) => void>()
    renderHook(useResumenDePrueba, {
      wrapper: envoltura(`?vehiculo=${ID}&pestana=interesados`, alCambiar),
    })
    await waitFor(() => {
      expect(alCambiar).toHaveBeenCalled()
    })
    const ultima = alCambiar.mock.lastCall?.[0]
    expect(ultima?.searchParams.get('pestana')).toBeNull()
    expect(ultima?.searchParams.get('visor')).toBeNull()
  })
})

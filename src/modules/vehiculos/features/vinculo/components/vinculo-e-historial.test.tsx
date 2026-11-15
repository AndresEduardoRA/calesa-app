import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LEAD_QUE_NO_VES, type VinculosDelVehiculo } from '../../../entities/vinculo'
import { VinculoEHistorial } from './vinculo-e-historial'

afterEach(cleanup)

const vinculo = (leadNombre: string | null, hasta: string | null = null) => ({
  leadId: leadNombre ?? 'oculto',
  leadNombre,
  leadNumeros: leadNombre
    ? { numero: 12, numeroPropio: null, creadorDelPropio: null }
    : { numero: null, numeroPropio: null, creadorDelPropio: null },
  desde: '2026-10-01T16:00:00+00:00',
  hasta,
  porNombre: 'Rosa Mamani',
})
const VACIO: VinculosDelVehiculo = { vinculo: null, historial: [], historialHayMas: false }

describe('VinculoEHistorial', () => {
  it('sin vínculo, lo dice', () => {
    render(<VinculoEHistorial vinculos={VACIO} />)
    expect(screen.getByText(/Sin vínculo: ningún lead es dueño/)).toBeInTheDocument()
  })

  it('muestra el lead vinculado, desde cuándo y quién lo vinculó', () => {
    render(<VinculoEHistorial vinculos={{ ...VACIO, vinculo: vinculo('Ana Quispe') }} />)
    const region = within(screen.getByRole('region', { name: 'Vínculo' }))
    expect(region.getByText('Ana Quispe')).toBeInTheDocument()
    expect(region.getByText(/N\.º 12/)).toBeInTheDocument()
    expect(region.getByText(/^Desde el .* · lo vinculó Rosa Mamani$/)).toBeInTheDocument()
  })

  it('un lead que quien mira no ve no se nombra', () => {
    render(<VinculoEHistorial vinculos={{ ...VACIO, vinculo: vinculo(null) }} />)
    expect(screen.getByText(LEAD_QUE_NO_VES)).toBeInTheDocument()
    expect(screen.queryByText(/lead #/)).toBeNull()
  })

  it('lista los vínculos anteriores con su período', () => {
    const anterior = vinculo('Luis Rojas', '2026-10-05T16:00:00+00:00')
    render(<VinculoEHistorial vinculos={{ ...VACIO, historial: [anterior] }} />)
    const anteriores = within(screen.getByRole('list', { name: 'Vínculos anteriores' }))
    expect(anteriores.getByText('Luis Rojas')).toBeInTheDocument()
    expect(anteriores.getByText(/^Del .* al .*/)).toBeInTheDocument()
  })

  it('con más vínculos que el tope, lo dice al pie (cierre 1)', () => {
    render(<VinculoEHistorial vinculos={{ ...VACIO, historialHayMas: true }} />)
    expect(screen.getByText('Mostrando los 50 vínculos más recientes.')).toBeInTheDocument()
  })

  it('sin pasar el tope, no dice nada', () => {
    render(<VinculoEHistorial vinculos={VACIO} />)
    expect(screen.queryByText(/^Mostrando los/)).toBeNull()
  })
})

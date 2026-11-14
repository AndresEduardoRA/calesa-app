import { cleanup, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { EsquemaDeFiltros } from '@/shared/lib/filtros'
import { render } from '../../hoja/components/render-con-url.soporte'
import { ListadoDeCotizaciones } from './listado-de-cotizaciones'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/cotizaciones',
}))
// Las vistas guardadas traen las actions de `equipo` (de servidor): acá no se llaman.
vi.mock('server-only', () => ({}))
vi.mock('./diferidos', () => ({ ResumenDeCotizacionDiferido: () => null }))

beforeAll(() => {
  // jsdom no trae matchMedia: se prueba como una pantalla angosta.
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})
afterEach(cleanup)

const ESQUEMA: EsquemaDeFiltros = { busqueda: { clave: 'q', etiqueta: 'Buscar' }, filtros: [] }
const VACIA = { filas: [], siguiente: null, anterior: null }
const base = {
  esquema: ESQUEMA,
  pagina: VACIA,
  porPagina: { valor: 25, opciones: [25, 50] },
  origenes: [],
  rutaDeNueva: '/cotizaciones/nuevo?origen=o1' as string | null,
  delServidor: null,
  acotada: false,
  vistas: [],
}

// Los hijos del contenedor de acciones del `<FilterShell>`: el que tiene a «Nueva cotización» (el primero con ese botón, el de la barra).
function accionesDeLaBarra() {
  const nuevas = screen.getAllByRole('link', { name: 'Nueva cotización' })
  const barra = nuevas[0]?.parentElement
  if (!barra) throw new Error('No está la barra de acciones')
  return { nuevas, barra }
}

describe('ListadoDeCotizaciones: lo que va junto a «Nueva cotización» (4.15-6b, C5)', () => {
  it('con `junto`, va antes de «Nueva cotización» en el contenedor de acciones', () => {
    render(<ListadoDeCotizaciones {...base} junto={<button>Papelera de prueba</button>} />)
    const { barra } = accionesDeLaBarra()
    const junto = screen.getByRole('button', { name: 'Papelera de prueba' })
    expect(junto.parentElement).toBe(barra)
    expect(junto.nextElementSibling?.textContent).toBe('Nueva cotización')
  })

  it('con `junto` y sin ruta de «Nueva», sólo `junto`', () => {
    render(
      <ListadoDeCotizaciones
        {...base}
        rutaDeNueva={null}
        junto={<button>Papelera de prueba</button>}
      />,
    )
    expect(screen.queryByRole('link', { name: 'Nueva cotización' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Papelera de prueba' })).toBeTruthy()
  })

  it('sin `junto`, la barra tiene un solo hijo con «Nueva cotización», como siempre (C9)', () => {
    render(<ListadoDeCotizaciones {...base} />)
    const { barra } = accionesDeLaBarra()
    expect(barra.children).toHaveLength(1)
  })

  it('con la página vacía, el vacío ofrece sólo «Nueva cotización» aunque haya `junto`', () => {
    render(<ListadoDeCotizaciones {...base} junto={<button>Papelera de prueba</button>} />)
    const nuevas = screen.getAllByRole('link', { name: 'Nueva cotización' })
    expect(nuevas).toHaveLength(2)
    const vacio = nuevas[1]?.parentElement
    expect(vacio?.textContent).toBe('Nueva cotización')
  })
})

const fila = (numero: number) => ({
  id: `00000000-0000-4000-8000-${String(numero).padStart(12, '0')}`,
  numero,
  origenId: 'o1',
  leadId: null,
  vehiculoId: null,
  creadoPor: '00000000-0000-4000-8000-0000000000cc',
  clase: 'preventa' as const,
  estado: 'activa' as const,
  titulo: null,
  totalBase: 100,
  monedaMostrar: null,
  creadoEn: '2026-11-14T10:00:00.000001+00:00',
  venceEl: '2026-11-21',
  vencida: false,
  cliente: null,
  vehiculo: null,
  autor: 'Ana',
  aprobada: false,
})

describe('ListadoDeCotizaciones: la columna de acciones (T15)', () => {
  it('sin `menuDeFila` no hay botón de acciones', () => {
    render(<ListadoDeCotizaciones {...base} pagina={{ ...VACIA, filas: [fila(1)] }} />)
    expect(screen.queryByRole('button', { name: /Más acciones/ })).toBeNull()
  })

  it('con `menuDeFila`, cada tarjeta lleva lo que ese menú dibuja (la columna de la tabla la mira el e2e)', () => {
    render(
      <ListadoDeCotizaciones
        {...base}
        pagina={{ ...VACIA, filas: [fila(1), fila(2)] }}
        menuDeFila={(una) => <button>Menú de {una.numero}</button>}
      />,
    )
    expect(screen.getAllByRole('button', { name: /^Menú de \d$/ }).length).toBeGreaterThanOrEqual(2)
  })

  it('una fila sin menú (nulo) no lleva botón', () => {
    render(
      <ListadoDeCotizaciones
        {...base}
        pagina={{ ...VACIA, filas: [fila(1), fila(2)] }}
        menuDeFila={(una) => (una.numero === 1 ? <button>Menú de 1</button> : null)}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Menú de 2' })).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Menú de 1' }).length).toBeGreaterThanOrEqual(1)
  })

  it('los diálogos que traen las áreas se montan una vez', () => {
    render(<ListadoDeCotizaciones {...base} dialogos={<p>Diálogos de prueba</p>} />)
    expect(screen.getAllByText('Diálogos de prueba')).toHaveLength(1)
  })
})

describe('ListadoDeCotizaciones: la búsqueda (T15)', () => {
  it('con una búsqueda acotada, avisa al pie de la lista que afine; sin ella, no', () => {
    const { rerender } = render(
      <ListadoDeCotizaciones {...base} pagina={{ ...VACIA, filas: [fila(1)] }} acotada />,
    )
    expect(screen.getByRole('status').textContent).toMatch(/Escribe más para afinarla/)
    rerender(<ListadoDeCotizaciones {...base} pagina={{ ...VACIA, filas: [fila(1)] }} />)
    expect(screen.queryByText(/Escribe más para afinarla/)).toBeNull()
  })

  it('el menú de vistas guardadas está en la barra', () => {
    render(<ListadoDeCotizaciones {...base} />)
    expect(screen.getByRole('button', { name: /Vistas/ })).toBeTruthy()
  })
})

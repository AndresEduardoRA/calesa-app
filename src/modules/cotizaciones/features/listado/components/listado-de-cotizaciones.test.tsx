import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
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
// El panel de «Vista y opciones» sin `lazy`.
vi.mock('@/shared/ui/vista-y-opciones/diferidos', async () => {
  const { PanelDeVistaYOpciones } =
    await import('@/shared/ui/vista-y-opciones/panel-de-vista-y-opciones')
  return { PanelDeVistaYOpcionesDiferido: PanelDeVistaYOpciones }
})
// El resumen sólo con sus diálogos y su aviso de montado: dónde van se prueba aquí; lo demás, en su test. `resumenSinLlegar`: su código aún no llegó.
const resumenSinLlegar = { valor: false }
vi.mock('./diferidos', async () => {
  const { useEffect } = await import('react')
  function Resumen({
    dialogos,
    alMontarse,
  }: {
    dialogos?: ReactNode
    alMontarse?: (listo: true) => void
  }) {
    useEffect(() => {
      alMontarse?.(true)
    }, [alMontarse])
    return <div data-testid="resumen">{dialogos}</div>
  }
  return {
    ResumenDeCotizacionDiferido: (props: Parameters<typeof Resumen>[0]) =>
      resumenSinLlegar.valor ? null : <Resumen {...props} />,
    VistasDeCotizacionesDiferido: () => <button>Vistas</button>,
  }
})

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
const VACIA = { filas: [], siguiente: null, anterior: null, cortada: null }
const base = {
  esquema: ESQUEMA,
  pagina: VACIA,
  vistaPreferida: null,
  agruparPedido: true,
  rutaDeClientes: null,
  filtrosDelGrupo: {},
  porPagina: { valor: 25, opciones: [25, 50] },
  origenes: [],
  rutaDeNueva: '/cotizaciones/nuevo?origen=o1' as string | null,
  delServidor: null,
  acotada: false,
  vistas: [],
}

const botonDeOpciones = () =>
  screen.getByRole('button', { name: /^Vista y opciones/, hidden: true })

// Abre «Vista y opciones» y devuelve su panel (en jsdom, una pantalla angosta: la hoja inferior).
async function abrirOpciones() {
  fireEvent.click(botonDeOpciones())
  return screen.findByRole('dialog', { name: 'Vista y opciones' })
}

describe('ListadoDeCotizaciones: la papelera en «Vista y opciones» (4.15-6b, C5)', () => {
  it('con `junto`, va en «Más» dentro de «Vista y opciones», no en la barra', async () => {
    render(<ListadoDeCotizaciones {...base} junto={<button>Papelera de prueba</button>} />)
    expect(screen.queryByRole('button', { name: 'Papelera de prueba' })).toBeNull()
    const panel = await abrirOpciones()
    const mas = within(panel).getByRole('region', { name: 'Más' })
    expect(within(mas).getByRole('button', { name: 'Papelera de prueba' })).toBeTruthy()
  })

  it('sin `junto`, no hay «Más»', async () => {
    render(<ListadoDeCotizaciones {...base} />)
    const panel = await abrirOpciones()
    expect(within(panel).queryByRole('region', { name: 'Más' })).toBeNull()
    expect(within(panel).getByRole('region', { name: 'Vistas guardadas' })).toBeTruthy()
  })

  it('con `junto` y sin ruta de «Nueva», el botón sigue y no hay «Nueva cotización»', async () => {
    render(
      <ListadoDeCotizaciones
        {...base}
        rutaDeNueva={null}
        junto={<button>Papelera de prueba</button>}
      />,
    )
    expect(screen.queryByRole('link', { name: 'Nueva cotización' })).toBeNull()
    const panel = await abrirOpciones()
    expect(within(panel).getByRole('button', { name: 'Papelera de prueba' })).toBeTruthy()
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
  modo: null,
})
// Una cotización sola de la lista (sin agrupar, o sin vehículo).
const sola = (numero: number) => {
  const cotizacion = fila(numero)
  return {
    tipo: 'suelta' as const,
    ordenEn: cotizacion.creadoEn,
    ordenId: cotizacion.id,
    cotizacion,
  }
}

describe('ListadoDeCotizaciones: la columna de acciones (T15)', () => {
  it('sin `menuDeFila` no hay botón de acciones', () => {
    render(<ListadoDeCotizaciones {...base} pagina={{ ...VACIA, filas: [sola(1)] }} />)
    expect(screen.queryByRole('button', { name: /Más acciones/ })).toBeNull()
  })

  it('con `menuDeFila`, cada tarjeta lleva lo que ese menú dibuja (la columna de la tabla la mira el e2e)', () => {
    render(
      <ListadoDeCotizaciones
        {...base}
        pagina={{ ...VACIA, filas: [sola(1), sola(2)] }}
        menuDeFila={(una) => <button>Menú de {una.numero}</button>}
      />,
    )
    expect(screen.getAllByRole('button', { name: /^Menú de \d$/ }).length).toBeGreaterThanOrEqual(2)
  })

  it('una fila sin menú (nulo) no lleva botón', () => {
    render(
      <ListadoDeCotizaciones
        {...base}
        pagina={{ ...VACIA, filas: [sola(1), sola(2)] }}
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
      <ListadoDeCotizaciones {...base} pagina={{ ...VACIA, filas: [sola(1)] }} acotada />,
    )
    expect(screen.getByRole('status').textContent).toMatch(/Escribe más para afinarla/)
    rerender(<ListadoDeCotizaciones {...base} pagina={{ ...VACIA, filas: [sola(1)] }} />)
    expect(screen.queryByText(/Escribe más para afinarla/)).toBeNull()
  })

  it('«Vista y opciones» está en la barra con «Nueva cotización» a la vista, y trae las vistas guardadas', async () => {
    render(<ListadoDeCotizaciones {...base} />)
    const barra = botonDeOpciones().parentElement
    expect(barra?.hasAttribute('data-barra-de-filtros')).toBe(true)
    expect(
      barra?.querySelector('a')?.textContent,
      '«Nueva cotización» queda en la barra, después del botón',
    ).toBe('Nueva cotización')
    const panel = await abrirOpciones()
    expect(within(panel).getByRole('button', { name: 'Vistas' })).toBeTruthy()
  })
})

describe('ListadoDeCotizaciones: tarjetas, grupos y «Compartir» (T319)', () => {
  const grupo = (numero: number, n: number) => {
    const cabeza = { ...fila(numero), vehiculoId: '00000000-0000-4000-8000-0000000000ee' }
    return {
      tipo: 'grupo' as const,
      ordenEn: cabeza.creadoEn,
      ordenId: cabeza.id,
      vehiculoId: cabeza.vehiculoId,
      cabeza,
      conteo: { n, hayMas: false },
    }
  }

  it('un grupo dice cuántas tiene y se despliega en el lugar; una sola no lleva conteo', () => {
    render(<ListadoDeCotizaciones {...base} pagina={{ ...VACIA, filas: [grupo(1, 3), sola(2)] }} />)
    const conteo = screen.getByRole('button', { name: '3 cotizaciones de este vehículo' })
    expect(conteo.getAttribute('aria-expanded')).toBe('false')
    expect(screen.getAllByRole('button', { name: /cotizaciones de este vehículo/ })).toHaveLength(1)
    fireEvent.click(conteo)
    expect(conteo.getAttribute('aria-expanded')).toBe('true')
    expect(document.getElementById(conteo.getAttribute('aria-controls') ?? '')).not.toBeNull()
  })

  it('«Compartir» es la acción principal de la tarjeta si se ofrece, y el «⋯» se pide sin él', () => {
    const compartir = vi.fn()
    const pedidos: unknown[] = []
    render(
      <ListadoDeCotizaciones
        {...base}
        pagina={{ ...VACIA, filas: [sola(1), sola(2)] }}
        compartirDe={(una) => (una.numero === 1 ? compartir : null)}
        menuDeFila={(una, opciones) => {
          pedidos.push(opciones)
          return <button>Menú de {una.numero}</button>
        }}
      />,
    )
    const botones = screen.getAllByRole('button', { name: 'Compartir' })
    expect(botones).toHaveLength(1)
    fireEvent.click(botones[0] as HTMLElement)
    expect(compartir).toHaveBeenCalledTimes(1)
    expect(
      pedidos.every((opciones) => (opciones as { sinCompartir?: boolean }).sinCompartir === true),
    ).toBe(true)
  })

  it('«Vista y opciones» trae «Agrupar por vehículo», encendido como lo pide la página', async () => {
    render(<ListadoDeCotizaciones {...base} />)
    const panel = await abrirOpciones()
    expect(
      within(panel)
        .getByRole('switch', { name: 'Agrupar por vehículo' })
        .getAttribute('aria-checked'),
    ).toBe('true')
  })
})

describe('ListadoDeCotizaciones: los diálogos y el resumen (T320)', () => {
  const ID = '2f1c3a4b-5d6e-4f70-8a9b-0c1d2e3f4a5b'
  const dialogos = <p data-testid="dialogos" />

  it('con el resumen cerrado, los diálogos van en el listado', () => {
    render(<ListadoDeCotizaciones {...base} dialogos={dialogos} />)
    expect(screen.getAllByTestId('dialogos')).toHaveLength(1)
    expect(screen.queryByTestId('resumen')).toBeNull()
  })

  it('con el resumen abierto pero su código sin llegar, siguen en el listado (un `?panel=` no lo espera)', () => {
    resumenSinLlegar.valor = true
    try {
      render(<ListadoDeCotizaciones {...base} dialogos={dialogos} />, `?cotizacion=${ID}`)
      expect(screen.getAllByTestId('dialogos')).toHaveLength(1)
      expect(screen.queryByTestId('resumen')).toBeNull()
    } finally {
      resumenSinLlegar.valor = false
    }
  })

  it('con el resumen abierto, van una sola vez y dentro de él', () => {
    render(<ListadoDeCotizaciones {...base} dialogos={dialogos} />, `?cotizacion=${ID}`)
    expect(screen.getAllByTestId('dialogos')).toHaveLength(1)
    expect(screen.getByTestId('resumen').contains(screen.getByTestId('dialogos'))).toBe(true)
  })
})

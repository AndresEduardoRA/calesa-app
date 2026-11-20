import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import type * as ReactTipos from 'react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CotizacionDelListado } from '../../../entities/listado/filas-del-listado'
import type { LecturaDelServidor } from '../../../entities/listado/resumen-del-listado'
import type { HuecosDelResumen } from '../../hoja/components/huecos-del-resumen'
import type { CompartirDe, MenuDeFila } from './tipos'

// La barra de arriba del resumen (T320): «Abrir cotización», «Compartir cotización» y el «⋯». Los demás estados del resumen, en `resumen-de-cotizacion.test.tsx`.
// Un pedido que no termina: `useTransition` queda pendiente mientras `enCamino` sea true.
const estado = { enCamino: false }
vi.mock('react', async (importar) => {
  const react = await importar<typeof ReactTipos>()
  return {
    ...react,
    useTransition: () => {
      const [pendiente, empezar] = react.useTransition()
      return [pendiente || estado.enCamino, empezar] as const
    },
  }
})
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/cotizaciones',
  useSearchParams: () => new URLSearchParams(),
}))

import { ResumenDeCotizacion } from './resumen-de-cotizacion'

afterEach(() => {
  cleanup()
  estado.enCamino = false
})

const ID = '2f1c3a4b-5d6e-4f70-8a9b-0c1d2e3f4a5b'
const ORIGEN = '00000000-0000-4000-8000-0000000000aa'

const cotizacion = (extra: Partial<CotizacionDelListado> = {}): CotizacionDelListado => ({
  id: ID,
  numero: 1234,
  origenId: ORIGEN,
  leadId: null,
  vehiculoId: null,
  creadoPor: '00000000-0000-4000-8000-0000000000bb',
  clase: 'preventa',
  estado: 'activa',
  titulo: 'Título de prueba',
  totalBase: 100,
  monedaMostrar: null,
  creadoEn: '2026-03-01T12:00:00.123456+00:00',
  venceEl: '2026-04-01',
  vencida: false,
  cliente: null,
  vehiculo: null,
  autor: 'Ana',
  aprobada: false,
  modo: null,
  ...extra,
})

function dibujar(opciones: {
  busqueda: string
  filas?: CotizacionDelListado[]
  delServidor?: LecturaDelServidor | null
  huecos?: HuecosDelResumen
  menuDeFila?: MenuDeFila
  compartirDe?: CompartirDe
  dialogos?: ReactNode
}) {
  return render(
    <NuqsTestingAdapter searchParams={opciones.busqueda} hasMemory>
      <ResumenDeCotizacion
        filas={opciones.filas ?? []}
        origenes={[{ id: ORIGEN, nombre: 'Subastas', color: null }]}
        delServidor={opciones.delServidor ?? null}
        huecos={opciones.huecos}
        menuDeFila={opciones.menuDeFila}
        compartirDe={opciones.compartirDe}
        dialogos={opciones.dialogos}
      />
    </NuqsTestingAdapter>,
  )
}

describe('ResumenDeCotizacion: la barra de arriba (T320)', () => {
  const Imagen: NonNullable<HuecosDelResumen['Imagen']> = () => <p data-testid="imagen" />
  const sigue = (a: Node, b: Node) =>
    Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

  it('arriba y en orden: «Abrir cotización», «Compartir cotización» y el «⋯» sin «Compartir», antes de la imagen y los datos', () => {
    const menuDeFila = vi.fn<MenuDeFila>(() => <button type="button">Más acciones</button>)
    const compartir = vi.fn()
    dibujar({
      busqueda: `?cotizacion=${ID}`,
      filas: [cotizacion()],
      huecos: { Imagen },
      menuDeFila,
      compartirDe: () => compartir,
    })
    expect(menuDeFila).toHaveBeenCalledWith(expect.objectContaining({ id: ID }), {
      sinCompartir: true,
      conBorde: true,
    })
    const abrir = screen.getByRole('link', { name: 'Abrir cotización' })
    const boton = screen.getByRole('button', { name: 'Compartir cotización' })
    const mas = screen.getByRole('button', { name: 'Más acciones' })
    expect(sigue(abrir, boton)).toBe(true)
    expect(sigue(boton, mas)).toBe(true)
    expect(sigue(mas, screen.getByTestId('imagen'))).toBe(true)
    expect(sigue(mas, screen.getByText('Cliente'))).toBe(true)
    fireEvent.click(boton)
    expect(compartir).toHaveBeenCalledTimes(1)
  })

  it('sin «Compartir» (Modo Live o sin la oferta) ni menú, sólo «Abrir cotización»', () => {
    dibujar({
      busqueda: `?cotizacion=${ID}`,
      filas: [cotizacion()],
      menuDeFila: () => null,
      compartirDe: () => null,
    })
    const barra = document.querySelector('[data-acciones-del-resumen]')
    expect(barra?.children.length).toBe(1)
    expect(screen.queryByRole('button', { name: 'Compartir cotización' })).toBeNull()
  })

  it('sin la cotización a la vista (no disponible, error o cargando) no hay barra', () => {
    const conBarra = { menuDeFila: () => <button type="button">Más acciones</button> }
    dibujar({
      busqueda: `?cotizacion=${ID}`,
      delServidor: { id: ID, estado: 'no_disponible' },
      ...conBarra,
    })
    expect(document.querySelector('[data-acciones-del-resumen]')).toBeNull()
    cleanup()
    dibujar({
      busqueda: `?cotizacion=${ID}`,
      delServidor: { id: ID, estado: 'error' },
      ...conBarra,
    })
    expect(document.querySelector('[data-acciones-del-resumen]')).toBeNull()
    cleanup()
    estado.enCamino = true
    dibujar({ busqueda: `?cotizacion=${ID}`, ...conBarra })
    expect(screen.getByLabelText('Cargando la cotización')).toBeTruthy()
    expect(document.querySelector('[data-acciones-del-resumen]')).toBeNull()
  })

  it('los diálogos se dibujan dentro del panel', () => {
    dibujar({
      busqueda: `?cotizacion=${ID}`,
      filas: [cotizacion()],
      dialogos: <p data-testid="dialogos" />,
    })
    expect(screen.getByRole('dialog').contains(screen.getByTestId('dialogos'))).toBe(true)
  })

  it('el total va con su modo; la vigencia es un dato', () => {
    dibujar({ busqueda: `?cotizacion=${ID}`, filas: [cotizacion({ modo: 'Paralelo' })] })
    expect(document.querySelector('[data-modo-del-total]')?.textContent).toBe('Paralelo')
    expect(screen.getByText('Vigencia').nextElementSibling?.textContent).toContain('Vale hasta el')
  })
})

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  avisarExito,
  ejecutar,
  falla,
  hojaDePrueba,
  leida,
  ok,
  ORIGEN,
  OTRA_PUBLICADA,
  pedidoMandado,
  pedidos,
  PUBLICADA,
  reiniciar,
  responder,
} from './use-ajuste-de-la-cabecera.soporte'

vi.mock('next-safe-action/hooks', async () => {
  const soporte = await import('./use-ajuste-de-la-cabecera.soporte')
  return { useAction: () => ({ executeAsync: soporte.ejecutar }) }
})
vi.mock('../actions/cambiar-cabecera', () => ({ cambiarCabecera: {} }))
vi.mock('@/shared/ui/toasts', async () => {
  const soporte = await import('./use-ajuste-de-la-cabecera.soporte')
  return { avisarExito: soporte.avisarExito }
})
vi.mock('../../../areas/formula/composicion.client', async () => {
  const soporte = await import('./use-ajuste-de-la-cabecera.soporte')
  return { leerCabeceraPublicada: soporte.leerSimulado }
})

const { useAjusteDeLaCabecera } = await import('./use-ajuste-de-la-cabecera')

function montar(cambios: Parameters<typeof hojaDePrueba>[0] = {}) {
  const { hoja, alElegirModo, alCambiarVerTotalBs } = hojaDePrueba(cambios)
  const cerrar = vi.fn()
  const vista = renderHook(() =>
    useAjusteDeLaCabecera({ origenId: ORIGEN, origen: 'Subasta EE. UU.', cerrar, hoja }),
  )
  return { ...vista, alElegirModo, alCambiarVerTotalBs, cerrar }
}

type Hook = ReturnType<typeof montar>['result']

const elegirUnificadoConTotal = (result: Hook) => {
  act(() => {
    result.current.elegir({ modo: 'unificado', verTotalBs: true, visibles: ['unificado'] })
  })
}
const enviar = async (result: Hook) => {
  await act(async () => {
    await result.current.enviar()
  })
}

beforeEach(reiniciar)

describe('useAjusteDeLaCabecera: lo que lee, manda y aplica', () => {
  it('abre con lo efectivo de la publicada y «Aplicar» marcada', async () => {
    const { result } = montar()
    expect(result.current.lectura.tipo).toBe('leyendo')
    await responder(1, leida())
    expect(result.current.valor).toEqual({
      modo: 'paralelo',
      verTotalBs: false,
      visibles: ['paralelo', 'unificado'],
    })
    expect(result.current.aplicar).toBe(true)
    expect(result.current.aplicable).toEqual({ puede: true })
    expect(result.current.hayCambios).toBe(false)
  })

  it('guarda las tres claves con la publicada leída, aplica a la hoja, avisa y cierra', async () => {
    const { result, alElegirModo, alCambiarVerTotalBs, cerrar } = montar()
    await responder(1, leida())
    elegirUnificadoConTotal(result)
    expect(result.current.hayCambios).toBe(true)
    ejecutar.mockResolvedValue(ok())
    await enviar(result)
    expect(pedidoMandado()).toEqual({
      origenId: ORIGEN,
      modoPorDefecto: 'unificado',
      verTotalBsPorDefecto: true,
      modosVisibles: ['unificado'],
      publicadaEsperada: PUBLICADA,
    })
    expect(alElegirModo).toHaveBeenCalledWith('unificado')
    expect(alCambiarVerTotalBs).toHaveBeenCalledWith(true)
    expect(avisarExito).toHaveBeenCalledWith(
      'Guardaste la configuración por defecto de Subasta EE. UU. y la aplicaste a esta cotización.',
    )
    expect(cerrar).toHaveBeenCalled()
  })

  it('con «Aplicar» desmarcada la hoja no cambia', async () => {
    const { result, alElegirModo, alCambiarVerTotalBs } = montar()
    await responder(1, leida())
    elegirUnificadoConTotal(result)
    act(() => {
      result.current.marcarAplicar(false)
    })
    ejecutar.mockResolvedValue(ok())
    await enviar(result)
    expect(alElegirModo).not.toHaveBeenCalled()
    expect(alCambiarVerTotalBs).not.toHaveBeenCalled()
    expect(avisarExito).toHaveBeenCalledWith(
      'Guardaste la configuración por defecto de Subasta EE. UU.. Esta cotización no cambia.',
    )
  })

  it('apagada con su motivo en una de sólo lectura o si la versión de la hoja no tiene el modo; guardar no toca la hoja', async () => {
    const soloVe = montar({ soloLectura: true })
    await responder(1, leida())
    expect(soloVe.result.current.aplicable).toEqual({
      puede: false,
      motivo: 'Sólo ves esta cotización: no cambia.',
    })
    soloVe.unmount()
    reiniciar()
    const vieja = montar({
      formula: { id: OTRA_PUBLICADA, version: 2 },
      cabecera: {
        ...hojaDePrueba().hoja.cabecera,
        modos: [{ clave: 'paralelo', nombre: 'Paralelo' }],
      },
    })
    await responder(1, leida())
    elegirUnificadoConTotal(vieja.result)
    expect(vieja.result.current.aplicable).toEqual({
      puede: false,
      motivo: 'Esta cotización usa la versión 2, que no tiene ese modo.',
    })
    ejecutar.mockResolvedValue(ok())
    await enviar(vieja.result)
    expect(vieja.alElegirModo).not.toHaveBeenCalled()
  })
})

describe('useAjusteDeLaCabecera: lo que sale mal', () => {
  it('PT409: el mensaje de la base con «Volver a leer»; lo elegido queda y no se cierra', async () => {
    const { result, cerrar } = montar()
    await responder(1, leida())
    elegirUnificadoConTotal(result)
    ejecutar.mockResolvedValue(falla('conflicto', 'Ana publicó la versión 4 hace 1 min.'))
    await enviar(result)
    expect(result.current.aviso).toEqual({
      mensaje: 'Ana publicó la versión 4 hace 1 min.',
      salida: 'volver_a_leer',
    })
    expect(cerrar).not.toHaveBeenCalled()
    act(() => {
      result.current.volverALeer()
    })
    await responder(2, leida({ publicadaId: OTRA_PUBLICADA, version: 4 }))
    expect(result.current.valor?.modo).toBe('unificado')
    ejecutar.mockResolvedValue(ok())
    await enviar(result)
    expect(pedidoMandado(1)?.['publicadaEsperada']).toBe(OTRA_PUBLICADA)
  })

  it('sin red: «No hay conexión.» con «Reintentar» y no se cierra', async () => {
    const { result, cerrar } = montar()
    await responder(1, leida())
    elegirUnificadoConTotal(result)
    ejecutar.mockRejectedValue(new Error('sin red'))
    await enviar(result)
    expect(result.current.aviso).toEqual({ mensaje: 'No hay conexión.', salida: 'reintentar' })
    expect(cerrar).not.toHaveBeenCalled()
  })

  it('los mismos valores se dicen sin mandar nada', async () => {
    const { result } = montar()
    await responder(1, leida())
    await enviar(result)
    expect(ejecutar).not.toHaveBeenCalled()
    expect(result.current.aviso).toEqual({
      mensaje: 'La cabecera ya tiene esos valores.',
      salida: null,
    })
  })

  it('sin publicada y con un error de lectura, nada que guardar', async () => {
    const { result } = montar()
    await responder(1, { ok: true, data: null })
    expect(result.current.lectura.tipo).toBe('sin_publicada')
    act(() => {
      result.current.reintentarLectura()
    })
    await responder(2, { ok: false, error: { codigo: 'inesperado', mensaje: 'x' } })
    expect(result.current.lectura).toEqual({
      tipo: 'error',
      mensaje: 'No pudimos leer la configuración por defecto.',
    })
    expect(pedidos).toHaveLength(2)
  })
})

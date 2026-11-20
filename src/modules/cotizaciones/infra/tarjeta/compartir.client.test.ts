import { afterEach, describe, expect, it, vi } from 'vitest'
import { MENSAJE_SIN_CONEXION } from '@/shared/lib/errores'
import { DATOS_DE_PRUEBA } from '../../entities/tarjeta/compartir/compartir.soporte'
import {
  MENSAJE_SESION_QUE_NO_VALE,
  MENSAJE_SIN_ACCESO,
  pedirLaImagenParaCompartir,
  pedirLasFotos,
  pedirLosDatos,
} from './compartir.client'

const ID = '00000000-0000-4000-8000-0000000000aa'

function responder(respuesta: Response | Error) {
  const espia = vi.fn<typeof fetch>(() =>
    respuesta instanceof Error ? Promise.reject(respuesta) : Promise.resolve(respuesta),
  )
  vi.stubGlobal('fetch', espia)
  return espia
}

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('pedirLosDatos', () => {
  it('pide la ruta sin caché ni redirección y valida lo que llega', async () => {
    const espia = responder(json(DATOS_DE_PRUEBA))
    expect(await pedirLosDatos(ID)).toEqual({ ok: true, data: DATOS_DE_PRUEBA })
    expect(espia).toHaveBeenCalledWith(`/cotizaciones/${ID}/compartir`, {
      redirect: 'manual',
      cache: 'no-store',
    })
  })

  it('un 404 es «sin acceso»; la redirección, la sesión; sin red, sin conexión', async () => {
    responder(new Response('x', { status: 404 }))
    expect(await pedirLosDatos(ID)).toMatchObject({
      ok: false,
      error: { mensaje: MENSAJE_SIN_ACCESO },
    })
    responder(new Response(null, { status: 307, headers: { Location: '/ingreso' } }))
    expect(await pedirLosDatos(ID)).toMatchObject({
      ok: false,
      error: { codigo: 'no_autenticado', mensaje: MENSAJE_SESION_QUE_NO_VALE },
    })
    responder(new TypeError('Failed to fetch'))
    expect(await pedirLosDatos(ID)).toMatchObject({
      ok: false,
      error: { mensaje: MENSAJE_SIN_CONEXION },
    })
  })

  it('lo que no cumple el esquema no se muestra', async () => {
    responder(json({ numero: 'doce' }))
    expect(await pedirLosDatos(ID)).toMatchObject({ ok: false, error: { codigo: 'inesperado' } })
  })
})

describe('pedirLasFotos y la imagen de la tarjeta', () => {
  it('las fotos llegan como lista', async () => {
    responder(json({ fotos: [] }))
    expect(await pedirLasFotos(ID)).toEqual({ ok: true, data: [] })
  })

  it('la imagen se pide a su ruta con la caché del navegador (su ETag) y llega como blob', async () => {
    const espia = responder(
      new Response(new Uint8Array([1, 2]), {
        status: 200,
        headers: { 'Content-Type': 'image/webp' },
      }),
    )
    const imagen = await pedirLaImagenParaCompartir(ID)
    expect(imagen.ok).toBe(true)
    expect(espia).toHaveBeenCalledWith(`/cotizaciones/${ID}/imagen`, {
      redirect: 'manual',
      cache: 'default',
    })
  })
})

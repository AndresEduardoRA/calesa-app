import { describe, expect, it } from 'vitest'
import { fraseDeActividad, textoDeLaFrase, type FilaParaLaFrase } from './frase'

const VEHICULO = '00000000-0000-4000-8000-0000000000a1'
const ANA = '00000000-0000-4000-8000-0000000000b1'

const fila = (cambios: Partial<FilaParaLaFrase> = {}): FilaParaLaFrase => ({
  accion: 'vehiculos.update',
  tabla: 'vehiculos',
  registroId: VEHICULO,
  actorId: ANA,
  actorNombre: 'Ana',
  visible: true,
  campos: ['precio'],
  masCampos: false,
  registroTitulo: 'Toyota Hilux #12',
  registroDestino: null,
  primerCambio: {
    campo: 'precio',
    antes: 10000,
    despues: 12000,
    monedaAntes: null,
    monedaDespues: null,
  },
  ...cambios,
})

describe('la frase de un cambio', () => {
  it('un campo: quién, qué hizo, qué campo, el registro enlazado y su antes y después (un monto como monto)', () => {
    const frase = fraseDeActividad(fila())
    expect(textoDeLaFrase(frase)).toBe('Ana cambió Precio de Toyota Hilux #12: 10000 → 12000')
    expect(frase.registro.enlace).toBe(`/vehiculos/${VEHICULO}`)
    expect(frase.icono).toBe('vehiculo')
    expect(frase.cambio).toEqual({
      antes: {
        tipo: 'monto',
        valor: 10000,
        moneda: null,
        enMonedaBase: true,
        monedaConocida: true,
      },
      despues: {
        tipo: 'monto',
        valor: 12000,
        moneda: null,
        enMonedaBase: true,
        monedaConocida: true,
      },
    })
  })

  it('varios campos: el primero y «y N más», sin antes ni después', () => {
    const frase = fraseDeActividad(fila({ campos: ['precio', 'situacion', 'titulo'] }))
    expect(textoDeLaFrase(frase)).toBe('Ana cambió Precio y 2 más de Toyota Hilux #12')
    expect(frase.cambio).toBeNull()
    expect(
      textoDeLaFrase(
        fraseDeActividad(
          fila({ campos: ['a', 'b', 'c', 'd', 'precio'], masCampos: true, primerCambio: null }),
        ),
      ),
    ).toBe('Ana cambió A y 4+ más de Toyota Hilux #12')
  })

  it('un alta y una baja no llevan campo ni antes y después', () => {
    const alta = fila({ accion: 'vehiculos.insert', campos: [], primerCambio: null })
    expect(textoDeLaFrase(fraseDeActividad(alta))).toBe('Ana creó Toyota Hilux #12')
    const baja = fila({
      accion: 'vehiculos.delete',
      campos: [],
      primerCambio: null,
      registroTitulo: null,
    })
    expect(textoDeLaFrase(fraseDeActividad(baja))).toBe('Ana borró un vehículo')
    expect(fraseDeActividad(baja).registro.enlace).toBeNull()
  })

  it('una fila no visible dice sólo que hubo un cambio, aunque llegue algo', () => {
    const frase = fraseDeActividad(fila({ tabla: 'leads', accion: 'leads.update', visible: false }))
    expect(textoDeLaFrase(frase)).toBe('Ana cambió un lead que no puedes ver')
    expect(frase.campo).toBeNull()
    expect(frase.cambio).toBeNull()
    expect(frase.registro.enlace).toBeNull()
  })
})

describe('la frase con montos, atributos, el sistema y la configuración', () => {
  it('un monto en la moneda de la fila lleva la de cada lado; sin moneda conocida, el número solo', () => {
    const gasto = fila({
      tabla: 'gastos',
      accion: 'gastos.update',
      campos: ['monto'],
      registroDestino: { vehiculoId: VEHICULO, proyectoId: null, itemId: null, cotizacionId: null },
      primerCambio: {
        campo: 'monto',
        antes: 100,
        despues: '150.5',
        monedaAntes: 'USD',
        monedaDespues: 'BOB',
      },
    })
    const frase = fraseDeActividad(gasto)
    expect(textoDeLaFrase(frase)).toBe(
      'Ana cambió Monto de un gasto de Toyota Hilux #12: 100 → 150.5',
    )
    expect(frase.registro.enlace).toBe(`/logistica/vehiculo/${VEHICULO}`)
    expect(frase.cambio?.antes).toMatchObject({
      tipo: 'monto',
      moneda: 'USD',
      monedaConocida: true,
    })
    expect(frase.cambio?.despues).toMatchObject({ tipo: 'monto', moneda: 'BOB', valor: 150.5 })
    const sinMoneda = fraseDeActividad({
      ...gasto,
      primerCambio: {
        campo: 'monto',
        antes: 1,
        despues: 2,
        monedaAntes: null,
        monedaDespues: null,
      },
    })
    expect(sinMoneda.cambio?.antes).toMatchObject({
      tipo: 'monto',
      moneda: null,
      monedaConocida: false,
    })
  })

  it('un campo de atributos se nombra por su clave de adentro', () => {
    const frase = fraseDeActividad(
      fila({
        campos: ['atributos'],
        primerCambio: {
          campo: 'atributos',
          antes: { kilometraje: 10 },
          despues: { kilometraje: 20 },
          monedaAntes: null,
          monedaDespues: null,
        },
      }),
    )
    expect(textoDeLaFrase(frase)).toBe('Ana cambió Kilometraje de Toyota Hilux #12: 10 → 20')
  })
})

describe('la frase del sistema y de la configuración', () => {
  it('el sistema, una acción con verbo propio y una tabla de configuración', () => {
    expect(
      textoDeLaFrase(
        fraseDeActividad(
          fila({
            actorId: null,
            actorNombre: null,
            accion: 'vehiculo.subasta_resuelta',
            campos: [],
            primerCambio: null,
          }),
        ),
      ),
    ).toBe('Sistema resolvió la subasta de Toyota Hilux #12')
    const fase = fraseDeActividad(
      fila({
        tabla: 'fases',
        accion: 'fases.update',
        campos: ['nombre'],
        registroTitulo: null,
        primerCambio: {
          campo: 'nombre',
          antes: 'A',
          despues: 'B',
          monedaAntes: null,
          monedaDespues: null,
        },
      }),
    )
    expect(textoDeLaFrase(fase)).toBe('Ana cambió Nombre de una fase: A → B')
    expect(fase.registro.enlace).toBe('/configuracion/flujos')
    expect(fase.icono).toBe('configuracion')
  })
})

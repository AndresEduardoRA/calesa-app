import { describe, expect, it } from 'vitest'
import type { Alcance, ClavePermiso, Concesion, Permisos } from '@/shared/lib/permisos'
import {
  CLAVE_DE_CREAR,
  CLAVE_DE_PRIVADAS,
  CLAVE_DE_VER,
  ETIQUETA_DE_VE,
  MOTIVO_HEREDADO,
  MOTIVO_SIN_GESTIONAR_ROLES,
  VALORES_DE_VE,
  cambiosDelCuadro,
  celdaDelCuadro,
  conSelectorDeLugar,
  filaDelCuadro,
  motivoDelCambio,
  opcionesDelCuadro,
  type Ve,
} from './cuadro-de-cotizaciones'
import { MOTIVO_CONCESION_NO_DOMINADA, MOTIVO_ROL_NO_DOMINADO } from './dominancia'
import type { CambioDeConcesion } from './matriz'

const BO = '11111111-1111-4111-8111-111111111111'
const CL = '22222222-2222-4222-8222-222222222222'

const c = (
  clave: ClavePermiso,
  origenId: string | null,
  alcance: Alcance = 'todos',
): Concesion => ({
  clave,
  origenId,
  alcance,
})

// Las concesiones de cada escalón en un lugar, como las dejaría el cuadro.
function escalon(ve: Ve, lugar: string | null): Concesion[] {
  if (ve === 'no') return []
  if (ve === 'suyas') return [c(CLAVE_DE_VER, lugar, 'propios')]
  if (ve === 'sin_privadas') return [c(CLAVE_DE_VER, lugar)]
  return [c(CLAVE_DE_VER, lugar), c(CLAVE_DE_PRIVADAS, lugar)]
}

// Aplica los cambios como lo harían `rbac_otorgar` (reemplaza el alcance) y `rbac_revocar`.
function aplicar(concesiones: Permisos, cambios: CambioDeConcesion[]): Permisos {
  return cambios.reduce<Permisos>((acc, cambio) => {
    const resto = acc.filter((x) => !(x.clave === cambio.clave && x.origenId === cambio.origenId))
    return cambio.tipo === 'otorgar'
      ? [...resto, c(cambio.clave, cambio.origenId, cambio.alcance)]
      : resto
  }, concesiones)
}

const TODO: Permisos = [c(CLAVE_DE_CREAR, null), c(CLAVE_DE_VER, null), c(CLAVE_DE_PRIVADAS, null)]

describe('celdaDelCuadro', () => {
  it('lee cada escalón en «Todos los orígenes»', () => {
    for (const ve of VALORES_DE_VE) {
      expect(celdaDelCuadro(escalon(ve, null), null)).toEqual({
        crea: false,
        ve,
        creaHeredado: false,
        veHeredado: 'no',
      })
    }
  })

  it('con «lo propio» las privadas no suben de «Sólo las suyas»', () => {
    const rol = [c(CLAVE_DE_VER, null, 'propios'), c(CLAVE_DE_PRIVADAS, null)]
    expect(celdaDelCuadro(rol, null).ve).toBe('suyas')
  })

  it('en un origen suma lo de «Todos los orígenes» y dice qué es heredado', () => {
    const rol = [
      c(CLAVE_DE_VER, null, 'propios'),
      c(CLAVE_DE_PRIVADAS, BO),
      c(CLAVE_DE_VER, BO),
      c(CLAVE_DE_CREAR, null),
    ]
    expect(celdaDelCuadro(rol, BO)).toEqual({
      crea: true,
      ve: 'todas',
      creaHeredado: true,
      veHeredado: 'suyas',
    })
    expect(celdaDelCuadro(rol, CL)).toEqual({
      crea: true,
      ve: 'suyas',
      creaHeredado: true,
      veHeredado: 'suyas',
    })
  })

  it('en «Todos los orígenes» no cuenta lo de un origen', () => {
    expect(celdaDelCuadro([c(CLAVE_DE_VER, BO), c(CLAVE_DE_CREAR, BO)], null)).toEqual({
      crea: false,
      ve: 'no',
      creaHeredado: false,
      veHeredado: 'no',
    })
  })
})

describe('cambiosDelCuadro: «Ve»', () => {
  for (const lugar of [null, BO]) {
    const donde = lugar === null ? 'en «Todos los orígenes»' : 'en un origen'
    for (const desde of VALORES_DE_VE) {
      for (const hasta of VALORES_DE_VE) {
        it(`${donde}: de «${ETIQUETA_DE_VE[desde]}» a «${ETIQUETA_DE_VE[hasta]}»`, () => {
          const antes = escalon(desde, lugar)
          const cambios = cambiosDelCuadro(antes, lugar, { ve: hasta })
          expect(cambios).not.toBeNull()
          const despues = aplicar(antes, cambios ?? [])
          expect(despues).toEqual(expect.arrayContaining(escalon(hasta, lugar)))
          expect(despues).toHaveLength(escalon(hasta, lugar).length)
          if (desde === hasta) expect(cambios).toEqual([])
        })
      }
    }
  }

  it('da `ver` antes que las privadas', () => {
    expect(cambiosDelCuadro([], null, { ve: 'todas' })).toEqual([
      { tipo: 'otorgar', clave: CLAVE_DE_VER, origenId: null, alcance: 'todos' },
      { tipo: 'otorgar', clave: CLAVE_DE_PRIVADAS, origenId: null, alcance: 'todos' },
    ])
  })

  it('quita las privadas antes que `ver`', () => {
    expect(cambiosDelCuadro(escalon('todas', BO), BO, { ve: 'no' })).toEqual([
      { tipo: 'revocar', clave: CLAVE_DE_PRIVADAS, origenId: BO },
      { tipo: 'revocar', clave: CLAVE_DE_VER, origenId: BO },
    ])
    expect(cambiosDelCuadro(escalon('todas', null), null, { ve: 'suyas' })).toEqual([
      { tipo: 'revocar', clave: CLAVE_DE_PRIVADAS, origenId: null },
      { tipo: 'otorgar', clave: CLAVE_DE_VER, origenId: null, alcance: 'propios' },
    ])
  })

  it('en un origen sólo da lo que lo heredado no cubre', () => {
    const rol = [c(CLAVE_DE_VER, null)]
    expect(cambiosDelCuadro(rol, BO, { ve: 'sin_privadas' })).toEqual([])
    expect(cambiosDelCuadro(rol, BO, { ve: 'todas' })).toEqual([
      { tipo: 'otorgar', clave: CLAVE_DE_PRIVADAS, origenId: BO, alcance: 'todos' },
    ])
  })

  it('en un origen quita lo local que sobra sobre lo heredado', () => {
    const rol = [c(CLAVE_DE_VER, null, 'propios'), c(CLAVE_DE_VER, BO), c(CLAVE_DE_PRIVADAS, BO)]
    expect(cambiosDelCuadro(rol, BO, { ve: 'suyas' })).toEqual([
      { tipo: 'revocar', clave: CLAVE_DE_PRIVADAS, origenId: BO },
      { tipo: 'revocar', clave: CLAVE_DE_VER, origenId: BO },
    ])
  })

  it('no baja de lo heredado en un origen', () => {
    const rol = [c(CLAVE_DE_VER, null), c(CLAVE_DE_PRIVADAS, null)]
    expect(cambiosDelCuadro(rol, BO, { ve: 'sin_privadas' })).toBeNull()
    expect(cambiosDelCuadro(rol, BO, { ve: 'no' })).toBeNull()
    expect(cambiosDelCuadro([c(CLAVE_DE_VER, null, 'propios')], BO, { ve: 'no' })).toBeNull()
  })
})

describe('cambiosDelCuadro: «Crea»', () => {
  it('lo da y lo quita en el lugar', () => {
    expect(cambiosDelCuadro([], BO, { crea: true })).toEqual([
      { tipo: 'otorgar', clave: CLAVE_DE_CREAR, origenId: BO, alcance: 'todos' },
    ])
    expect(cambiosDelCuadro([c(CLAVE_DE_CREAR, null)], null, { crea: false })).toEqual([
      { tipo: 'revocar', clave: CLAVE_DE_CREAR, origenId: null },
    ])
    expect(cambiosDelCuadro([c(CLAVE_DE_CREAR, BO)], BO, { crea: true })).toEqual([])
  })

  it('no lo quita en un origen si lo hereda', () => {
    expect(cambiosDelCuadro([c(CLAVE_DE_CREAR, null)], BO, { crea: false })).toBeNull()
    expect(cambiosDelCuadro([c(CLAVE_DE_CREAR, null)], BO, { crea: true })).toEqual([])
  })
})

describe('motivoDelCambio y opcionesDelCuadro', () => {
  it('con todo, todas se eligen', () => {
    const opciones = opcionesDelCuadro(TODO, [], null)
    expect(opciones.map((o) => [o.valor, o.etiqueta, o.motivo])).toEqual([
      ['no', 'No ve', null],
      ['suyas', 'Sólo las suyas', null],
      ['sin_privadas', 'Todas menos las privadas', null],
      ['todas', 'Todas, también las privadas', null],
    ])
  })

  it('no deja dar lo que quien mira no tiene', () => {
    const mias = [c(CLAVE_DE_VER, null, 'propios')]
    expect(opcionesDelCuadro(mias, [], null).map((o) => o.motivo)).toEqual([
      null,
      null,
      MOTIVO_CONCESION_NO_DOMINADA,
      MOTIVO_CONCESION_NO_DOMINADA,
    ])
    expect(motivoDelCambio(mias, [], null, { crea: true })).toBe(MOTIVO_CONCESION_NO_DOMINADA)
  })

  it('lo de un solo origen alcanza para darlo ahí y no en «Todos los orígenes»', () => {
    const mias = [c(CLAVE_DE_VER, BO), c(CLAVE_DE_PRIVADAS, BO)]
    expect(motivoDelCambio(mias, [], BO, { ve: 'todas' })).toBeNull()
    expect(motivoDelCambio(mias, [], null, { ve: 'todas' })).toBe(MOTIVO_CONCESION_NO_DOMINADA)
  })

  it('quitar siempre se puede', () => {
    expect(motivoDelCambio([], escalon('todas', null), null, { ve: 'no' })).toBeNull()
    expect(motivoDelCambio([], [c(CLAVE_DE_CREAR, BO)], BO, { crea: false })).toBeNull()
  })

  it('lo heredado se cambia en «Todos los orígenes»', () => {
    const rol = [c(CLAVE_DE_VER, null), c(CLAVE_DE_CREAR, null)]
    expect(opcionesDelCuadro(TODO, rol, BO).map((o) => o.motivo)).toEqual([
      MOTIVO_HEREDADO,
      MOTIVO_HEREDADO,
      null,
      null,
    ])
    expect(motivoDelCambio(TODO, rol, BO, { crea: false })).toBe(MOTIVO_HEREDADO)
  })

  it('el escalón de ahora se elige siempre', () => {
    const rol = escalon('todas', null)
    expect(opcionesDelCuadro([], rol, null).at(-1)?.motivo).toBeNull()
  })
})

describe('filaDelCuadro', () => {
  it('sin «Gestionar roles», sólo lectura', () => {
    expect(filaDelCuadro(TODO, false, [], null).sinCambiar).toBe(MOTIVO_SIN_GESTIONAR_ROLES)
  })

  it('un rol con permisos que quien mira no tiene, sólo lectura', () => {
    const mias = [c(CLAVE_DE_VER, null, 'propios')]
    expect(filaDelCuadro(mias, true, TODO, null).sinCambiar).toBe(MOTIVO_ROL_NO_DOMINADO)
    expect(
      filaDelCuadro(mias, true, [c(CLAVE_DE_VER, null, 'propios')], null).sinCambiar,
    ).toBeNull()
  })

  it('dice por qué no se mueve «Crea»', () => {
    expect(filaDelCuadro(TODO, true, [c(CLAVE_DE_CREAR, null)], BO).motivoDeCrea).toBe(
      MOTIVO_HEREDADO,
    )
    expect(filaDelCuadro([], true, [], BO).motivoDeCrea).toBe(MOTIVO_CONCESION_NO_DOMINADA)
    expect(filaDelCuadro(TODO, true, [], BO)).toMatchObject({
      sinCambiar: null,
      motivoDeCrea: null,
      celda: { crea: false, ve: 'no' },
    })
  })
})

describe('conSelectorDeLugar', () => {
  it('con dos orígenes o más se elige el lugar', () => {
    expect(conSelectorDeLugar(2, [])).toBe(true)
    expect(conSelectorDeLugar(1, [{ concesiones: TODO }])).toBe(false)
  })

  it('con uno, sólo si un rol ya lo tiene en un origen suelto', () => {
    expect(conSelectorDeLugar(1, [{ concesiones: [c(CLAVE_DE_PRIVADAS, BO)] }])).toBe(true)
    expect(conSelectorDeLugar(1, [{ concesiones: [c('leads.ver', BO)] }])).toBe(false)
  })
})

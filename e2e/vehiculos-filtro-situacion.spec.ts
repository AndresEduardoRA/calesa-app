import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { aLaVista, cerrarPanelDeFiltros, panelDeFiltros, vehiculo } from './soporte/inventario'
import { PREFIJO_CLAVE_E2E, borrarOrigenes, crearOrigenDePrueba } from './soporte/origenes'
import { capturar } from './soporte/recorrido'
import { borrarVehiculosDe, vistasDe } from './soporte/vehiculos'

// El filtro «Situación» del inventario (docs/UX.md › «Vehículos»): las fases del origen más «En subasta», «Sin resolver» y «No ganadas», que se combina con
// los demás filtros, vive en la URL y se guarda en una vista. Y el atajo «Sin resolver» con su conteo. La equivalencia de las dos copias de cada condición
// la ata `vehiculos-inventario-postgrest.spec.ts`; el plan, `db:medir:volumen`. Terreno propio por SQL de servicio, borrado al empezar y al terminar.
test.describe.configure({ mode: 'serial' })

const DIA = 86_400_000

type Terreno = { origen: string; otro: string; comprado: string }

let proyecto = ''
let correo = ''
let terreno: Terreno

const claveDe = (p: string) => `${PREFIJO_CLAVE_E2E}fsit_${p}`
const otraClaveDe = (p: string) => `${PREFIJO_CLAVE_E2E}fsit_otro_${p}`
const sinPrefijo = (clave: string) => clave.slice(PREFIJO_CLAVE_E2E.length)

const titulos = (p: string) => ({
  enSubasta: `E2E En subasta ${p}`,
  sinResolverNueva: `E2E Sin resolver nueva ${p}`,
  sinResolverVieja: `E2E Sin resolver vieja ${p}`,
  noGanada: `E2E No ganada ${p}`,
  comprado: `E2E Comprado ${p}`,
  sinFase: `E2E Sin fase ${p}`,
})

function exigir(error: { message: string } | null, que: string): void {
  if (error) throw new Error(`No se pudo ${que}: ${error.message}`)
}

async function borrarTerreno(p: string): Promise<void> {
  await borrarVehiculosDe([claveDe(p), otraClaveDe(p)])
  await borrarOrigenes([claveDe(p), otraClaveDe(p)])
}

// Un origen de subasta con «Subasta» (la subasta, inicial) y «Comprado», y un vehículo en cada situación: uno con la subasta viva, dos con la subasta
// terminada (de 2020 y de 2015), uno marcado «No ganada», uno ya «Comprado» y uno sin fase ni subasta. Y otro origen, sólo para cambiar de pestaña.
async function sembrar(p: string): Promise<Terreno> {
  const origen = await crearOrigenDePrueba(`E2E Situación filtro ${p}`, sinPrefijo(claveDe(p)), {
    tipo: 'subasta',
    plataformas: ['copart'],
  })
  const otro = await crearOrigenDePrueba(`E2E Otro origen ${p}`, sinPrefijo(otraClaveDe(p)))
  const cliente = admin()
  const flujo = await cliente
    .from('flujos')
    .select('id')
    .eq('origen_id', origen.id)
    .single<{ id: string }>()
  exigir(flujo.error, 'leer el flujo')
  const fases = await cliente
    .from('fases')
    .insert([
      { flujo_id: flujo.data?.id, nombre: 'Subasta', orden: 1, es_inicial: true, es_subasta: true },
      {
        flujo_id: flujo.data?.id,
        nombre: 'Comprado',
        orden: 2,
        es_inicial: false,
        es_subasta: false,
      },
    ])
    .select('id, nombre')
    .returns<{ id: string; nombre: string }[]>()
  exigir(fases.error, 'crear las fases')
  const fase = (nombre: string) => fases.data?.find((f) => f.nombre === nombre)?.id ?? ''
  const t = titulos(p)
  const hace = new Date(Date.now() - 2 * DIA).toISOString()
  const futuro = new Date(Date.now() + 5 * DIA).toISOString()
  const terminada = { estado_subasta: 'terminada', subasta_en: hace }
  const enSubasta = { fase_id: fase('Subasta'), fase_desde: hace }
  const filas = await cliente
    .from('vehiculos')
    .insert([
      {
        origen_id: origen.id,
        titulo: t.enSubasta,
        anio: 2021,
        ...enSubasta,
        estado_subasta: 'abierta',
        subasta_en: futuro,
        subasta_fin_en: futuro,
      },
      { origen_id: origen.id, titulo: t.sinResolverNueva, anio: 2020, ...enSubasta, ...terminada },
      { origen_id: origen.id, titulo: t.sinResolverVieja, anio: 2015, ...enSubasta, ...terminada },
      {
        origen_id: origen.id,
        titulo: t.noGanada,
        anio: 2020,
        ...enSubasta,
        ...terminada,
        subasta_resultado: 'no_ganada',
        subasta_resuelta_en: hace,
      },
      { origen_id: origen.id, titulo: t.comprado, anio: 2020, fase_id: fase('Comprado') },
      { origen_id: origen.id, titulo: t.sinFase, anio: 2019 },
    ])
    .select('titulo, situacion')
    .returns<{ titulo: string; situacion: string }[]>()
  exigir(filas.error, 'cargar los vehículos')
  const situacionDe = (titulo: string) => filas.data?.find((v) => v.titulo === titulo)?.situacion
  const esperadas: [string, string][] = [
    [t.enSubasta, 'en_subasta'],
    [t.sinResolverNueva, 'sin_resolver'],
    [t.sinResolverVieja, 'sin_resolver'],
    [t.noGanada, 'no_ganada'],
    [t.comprado, 'fase'],
    [t.sinFase, 'fase'],
  ]
  for (const [titulo, situacion] of esperadas) {
    if (situacionDe(titulo) !== situacion) {
      throw new Error(`«${titulo}» quedó ${situacionDe(titulo)} y debía ser ${situacion}.`)
    }
  }
  return { origen: origen.id, otro: otro.id, comprado: fase('Comprado') }
}

// Lo que se ve en la lista: cada título del terreno, visible o no.
async function exigirLista(
  page: Page,
  visibles: (keyof ReturnType<typeof titulos>)[],
): Promise<void> {
  const t = titulos(proyecto)
  for (const [clave, titulo] of Object.entries(t)) {
    const lugar = vehiculo(page, titulo)
    if (visibles.includes(clave as keyof typeof t)) {
      await expect(lugar).toBeVisible()
    } else {
      await expect(lugar).toBeHidden()
    }
  }
}

const irA = async (page: Page, consulta = '') =>
  page.goto(`/vehiculos?origen=${terreno.origen}${consulta}`)

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  correo = correoDePrueba(`duena-filtro-situacion-${proyecto}`)
  await borrarTerreno(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await crearDuenaDePrueba({ email: correo, contrasena: CONTRASENA, nombre: 'Dalia Filtro' })
  terreno = await sembrar(proyecto)
})

test.afterAll(async () => {
  await borrarTerreno(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E situación filtro · sin filtrar no salen las no ganadas, y cada situación trae las suyas', async ({
  page,
}) => {
  await entrar(page, correo, { fresco: true })
  await irA(page)
  await exigirLista(page, [
    'enSubasta',
    'sinResolverNueva',
    'sinResolverVieja',
    'comprado',
    'sinFase',
  ])

  await irA(page, '&situacion=en_subasta')
  await exigirLista(page, ['enSubasta'])
  await irA(page, '&situacion=sin_resolver')
  await exigirLista(page, ['sinResolverNueva', 'sinResolverVieja'])
  await irA(page, '&situacion=no_ganada')
  await exigirLista(page, ['noGanada'])
  await irA(page, '&situacion=ninguna')
  await exigirLista(page, ['sinFase'])
  // Una fase: las que tienen esa fase y nada más («Subasta» no es «En subasta»: las de la subasta figuran por su situación).
  await irA(page, `&situacion=${terreno.comprado}`)
  await exigirLista(page, ['comprado'])
  // Varias a la vez, con las no ganadas incluidas.
  await irA(page, `&situacion=no_ganada,en_subasta,${terreno.comprado}`)
  await exigirLista(page, ['noGanada', 'enSubasta', 'comprado'])
})

test('E2E situación filtro · se elige en el panel, sale como chip y se combina con otro filtro', async ({
  page,
}, info) => {
  await entrar(page, correo)
  await irA(page)
  let panel = await panelDeFiltros(page)
  await expect(panel.getByRole('checkbox', { name: 'Sin fase' })).toBeVisible()
  await panel.getByRole('checkbox', { name: 'Sin resolver' }).check()
  await capturar(page, info, 'panel-de-situacion')
  await cerrarPanelDeFiltros(page)
  await expect(page).toHaveURL(/situacion=sin_resolver/)
  await exigirLista(page, ['sinResolverNueva', 'sinResolverVieja'])
  await expect(
    page.getByRole('list', { name: 'Filtros activos' }).getByText('Situación: Sin resolver'),
  ).toBeVisible()

  // Con el año: sólo la de 2020 en adelante.
  panel = await panelDeFiltros(page)
  await panel.getByRole('spinbutton', { name: 'Año, desde' }).fill('2018')
  await cerrarPanelDeFiltros(page)
  await expect(page).toHaveURL(/anio\.min=2018/)
  await exigirLista(page, ['sinResolverNueva'])

  // Y las no ganadas con el mismo año: ahora sí se ven.
  await irA(page, '&situacion=no_ganada,sin_resolver&anio.min=2018')
  await exigirLista(page, ['noGanada', 'sinResolverNueva'])
})

test('E2E situación filtro · el atajo «Sin resolver» cuenta, filtra y se quita', async ({
  page,
}, info) => {
  await entrar(page, correo)
  await irA(page)
  const atajo = aLaVista(page.getByRole('button', { name: /^Sin resolver/ }))
  await expect(atajo).toContainText('2')
  await expect(atajo).toHaveAttribute('aria-pressed', 'false')
  await atajo.click()
  await expect(page).toHaveURL(/situacion=sin_resolver/)
  await exigirLista(page, ['sinResolverNueva', 'sinResolverVieja'])
  await expect(atajo).toHaveAttribute('aria-pressed', 'true')
  await capturar(page, info, 'atajo-puesto')
  await atajo.click()
  await expect(page).not.toHaveURL(/situacion=/)
  await exigirLista(page, [
    'enSubasta',
    'sinResolverNueva',
    'sinResolverVieja',
    'comprado',
    'sinFase',
  ])

  // Sin ninguna pendiente (ni el filtro puesto), no hay atajo.
  await page.goto(`/vehiculos?origen=${terreno.otro}`)
  await expect(page.getByRole('link', { name: `E2E Otro origen ${proyecto}` })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(aLaVista(page.getByRole('button', { name: /^Sin resolver/ }))).toHaveCount(0)
})

test('E2E situación filtro · una vista guardada vuelve a poner la situación', async ({ page }) => {
  await entrar(page, correo)
  await irA(page, '&situacion=no_ganada&anio.min=2018')
  await exigirLista(page, ['noGanada'])
  await page.getByRole('button', { name: 'Vistas' }).click()
  await page.getByLabel('Guardar los filtros de ahora').fill('Las que perdimos')
  await page.getByRole('button', { name: 'Guardar vista' }).click()
  await expect(page.getByText('Vista «Las que perdimos» guardada')).toBeVisible()
  expect(await vistasDe(correo)).toEqual([
    {
      nombre: 'Las que perdimos',
      params: { origen: terreno.origen, situacion: 'no_ganada', 'anio.min': '2018' },
    },
  ])

  await page.goto(`/vehiculos?origen=${terreno.otro}`)
  await page.getByRole('button', { name: 'Vistas' }).click()
  await page.getByRole('button', { name: 'Las que perdimos', exact: true }).click()
  await expect(page).toHaveURL(/situacion=no_ganada/)
  await exigirLista(page, ['noGanada'])
  await expect(
    page.getByRole('list', { name: 'Filtros activos' }).getByText('Situación: No ganadas'),
  ).toBeVisible()
})

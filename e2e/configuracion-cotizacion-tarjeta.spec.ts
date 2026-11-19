import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { PREFIJO_ROL_E2E, correoDePrueba, crearPersona, darRolDePrueba } from './soporte/base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import {
  borradorGuardado,
  escribirEnLaCelda,
  lienzoDeLaTarjeta,
  limpiarTerrenoDePlantilla,
  prepararTerrenoDePlantilla,
  tarjetaDibujada,
  type TerrenoDePlantilla,
} from './soporte/plantilla'

// @sin-celular-archivo: editor de Configuración que se usa en una pantalla de al menos 1.024 px; el celular ve un aviso y la tarjeta en sólo lectura

// La pestaña «Tarjeta» de Configuración › Cotización (T325, `docs/UX.md` › «Cotización: tarjeta (estados propios)»): quien configura el origen edita el borrador de la
// tarjeta en el lienzo (la forma 2) y lo guarda con la versión esperada. Sin plantilla nace de la de por omisión; sin la clave no hay pestaña; sin fórmula publicada, un
// vacío con su enlace; lo escrito y sin guardar vuelve tras recargar. La marca de archivo no deja medir (el editor es de escritorio): sin «sin scroll horizontal».
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let terreno: TerrenoDePlantilla | undefined
let configuradora = ''
let sinClave = ''
let sinFormula = { id: '', nombre: '' }
let ajeno = { id: '', nombre: '' }

const origenId = () => {
  if (!terreno) throw new Error('No hay terreno.')
  return terreno.origenId
}

test.beforeAll(async ({}, info) => {
  info.setTimeout(180_000)
  proyecto = info.project.name
  terreno = await prepararTerrenoDePlantilla(proyecto, 'tarjeta')
  sinFormula = await crearOrigenDeCotizar(proyecto, 'tarjsinf', false)
  ajeno = await crearOrigenDeCotizar(proyecto, 'tarjajeno', false)
  configuradora = correoDePrueba(`configura-tarjeta-${proyecto}`)
  await crearPersona({
    email: configuradora,
    contrasena: CONTRASENA,
    nombre: 'Cleo Tarjeta',
    invitada: true,
  })
  await darRolDePrueba({
    email: configuradora,
    rol: { nombre: `${PREFIJO_ROL_E2E}Tarjeta ${proyecto}`, clave: `e2e_tarjeta_${proyecto}` },
    permisos: [origenId(), sinFormula.id].map((id) => ({
      clave: 'cotizaciones.configurar',
      origenId: id,
    })),
  })
  sinClave = correoDePrueba(`sinclave-tarjeta-${proyecto}`)
  await crearPersona({
    email: sinClave,
    contrasena: CONTRASENA,
    nombre: 'Sol Sinclave',
    invitada: true,
  })
  await darRolDePrueba({
    email: sinClave,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}SinTarjeta ${proyecto}`,
      clave: `e2e_sintarjeta_${proyecto}`,
    },
    permisos: ['equipo.roles.ver'],
  })
})

test.afterAll(async ({}, info) => {
  info.setTimeout(120_000)
  await limpiarTerrenoDePlantilla()
  borrarOrigenesDeCotizar()
})

async function abrirTarjeta(page: Page, id = origenId()) {
  await page.goto(`/configuracion/cotizacion?seccion=tarjeta&origen=${id}`)
  await expect(page.getByRole('heading', { name: /^Tarjeta de / })).toBeVisible()
}

const guardar = (page: Page) => page.getByRole('button', { name: 'Guardar borrador' })
// La celda de texto «Cotización n.º» de la tarjeta de por omisión (la conversión de la forma 1): su nombre accesible es su texto.
const celdaConTexto = (page: Page, texto: string) =>
  lienzoDeLaTarjeta(page).getByRole('gridcell', { name: texto, exact: true })

test('E1: sin borrador ni publicada el editor nace de la de por omisión, guarda la cuadrícula y lo guardado vuelve tras recargar', async ({
  page,
}) => {
  await entrar(page, configuradora, { fresco: true })
  await page.goto(`/configuracion/cotizacion/${origenId()}/formula`)
  const pestanas = page.getByRole('tab')
  await expect(pestanas).toHaveText(['Fórmula', 'Hoja', 'Tarjeta', 'Tablas'])
  await page.getByRole('tab', { name: 'Tarjeta' }).click()
  await expect(page).toHaveURL(new RegExp(`/configuracion/cotizacion/${origenId()}/tarjeta$`))
  await expect(page.getByRole('heading', { name: /^Tarjeta de / })).toBeVisible()
  await expect(
    page.getByText('Sin borrador ni publicada: parte de la de por omisión.'),
  ).toBeVisible()
  await expect(page.getByText('Todavía no hay tarjeta: nace de la de por omisión.')).toBeVisible()
  // Sin borrador, «Guardar borrador» está activo desde el principio.
  await expect(guardar(page)).toBeEnabled()
  await escribirEnLaCelda(page, celdaConTexto(page, 'Cotización n.º'), 'Cotización número')
  await expect(tarjetaDibujada(page).getByText('Cotización número', { exact: true })).toBeVisible()
  await guardar(page).click()
  await expect(page.getByText('Se guardó el borrador.')).toBeVisible()
  await expect.poll(() => borradorGuardado(origenId())?.actualizadoEn ?? null).not.toBeNull()
  await page.reload()
  await expect(page.getByText(/^Sobre el borrador guardado el /)).toBeVisible()
  await expect(tarjetaDibujada(page).getByText('Cotización número', { exact: true })).toBeVisible()
  // Sin cambios no hay qué guardar.
  await expect(guardar(page)).toBeDisabled()
  const guardado = borradorGuardado(origenId())
  expect((guardado?.definicion as unknown as { forma?: number } | undefined)?.forma).toBe(2)
  expect(JSON.stringify(guardado?.definicion)).toContain('Cotización número')
  // Sin aserción sobre los decimales de `actualizadoEn`: la base los escribe sin los ceros del final. Que la versión esperada conserve los microsegundos lo prueba el
  // PT409 de `-conflicto.spec.ts`.
  expect(guardado?.actualizadoEn).toBeTruthy()
})

test('E2: sin la clave no hay pestaña ni se abre por la URL; un origen ajeno abre el suyo; sin fórmula, el vacío con su enlace', async ({
  page,
}) => {
  await entrar(page, sinClave, { fresco: true })
  await page.goto('/configuracion/cotizacion?seccion=tarjeta')
  // Sin la clave, el enlace viejo abre la primera parte que puede («Niveles»): se espera a que llegue antes de cambiar de cuenta (si no, la redirección en
  // curso aborta la ida al ingreso).
  await expect(page).toHaveURL(/\/configuracion\/cotizacion\/general\/niveles/)
  await expect(page.getByRole('tab', { name: 'Tarjeta' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /^Tarjeta de / })).toHaveCount(0)

  await page.context().clearCookies()
  await entrar(page, configuradora, { fresco: true })
  await abrirTarjeta(page, ajeno.id)
  await expect(
    page.getByRole('navigation', { name: 'Origen' }).locator('[aria-current="page"]'),
  ).toHaveAttribute('href', `/configuracion/cotizacion/${origenId()}/tarjeta`)
  await page.goto(`/configuracion/cotizacion?seccion=tarjeta&origen=${sinFormula.id}`)
  await expect(
    page.getByText(/^Falta publicar la fórmula de .*: la tarjeta se arma con sus nodos\.$/),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: /^Tarjeta de / })).toHaveCount(0)
  await page.getByRole('link', { name: 'Ir a la fórmula' }).click()
  await expect(page).toHaveURL(new RegExp(`/configuracion/cotizacion/${sinFormula.id}/formula$`))
})

test('E4: lo escrito en una celda y sin guardar vuelve tras recargar con «Descartar», y «Descartar» lo quita', async ({
  page,
}) => {
  await entrar(page, configuradora, { fresco: true })
  await abrirTarjeta(page)
  await expect(guardar(page)).toBeDisabled()
  await escribirEnLaCelda(page, celdaConTexto(page, 'Cotización número'), 'Escrita y sin guardar')
  await expect(guardar(page)).toBeEnabled()
  await page.reload()
  await expect(page.getByText('Recuperamos lo que habías escrito y no guardaste.')).toBeVisible()
  await expect(
    tarjetaDibujada(page).getByText('Escrita y sin guardar', { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Descartar', exact: true }).click()
  await expect(tarjetaDibujada(page).getByText('Cotización número', { exact: true })).toBeVisible()
  await expect(guardar(page)).toBeDisabled()
})

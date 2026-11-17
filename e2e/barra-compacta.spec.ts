import type { Locator, Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { admin, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { esMovil } from './soporte/inventario'
import { idDe } from './soporte/leads'
import { selectorDeTamano } from './soporte/listas-por-pagina'
import { capturar } from './soporte/recorrido'
import {
  abrirVistaYOpciones,
  botonDeVistaYOpciones,
  cerrarVistaYOpciones,
  elegirEnVistaYOpciones,
  panelDeVistaYOpciones,
  seccionDeVistaYOpciones,
} from './soporte/vista-y-opciones'

// «Vista y opciones» (T27): en leads, vehículos, cotizaciones y repuestos la barra deja a la vista el buscador (que ocupa el ancho libre),
// «Filtros» y «Nuevo», y lo demás va en un botón que abre un popover desde 768 px y una hoja inferior por debajo. Lo elegido adentro cambia
// la URL como antes, el botón dice lo activo, el foco vuelve al botón al cerrar y, sin red, el panel lo dice y no navega a medias. Una
// dueña de prueba propia (con todos los permisos); su cuenta se borra al final.
test.describe.configure({ mode: 'serial' })

let duena = ''

test.beforeAll(async ({}, info) => {
  duena = correoDePrueba(`duena-barra-compacta-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Bárbara Barra' })
})

test.afterAll(async () => {
  const { error } = await admin().auth.admin.deleteUser(await idDe(duena))
  expect(error).toBeNull()
})

const parametro = (page: Page, clave: string) => new URL(page.url()).searchParams.get(clave)

// En el celular el panel es una hoja inferior: toca el borde de abajo y mide el ancho de la pantalla. En escritorio, un popover bajo el
// botón, de menos de 30 rem.
async function exigirFormaDelPanel(page: Page, panel: Locator, hoja: boolean): Promise<void> {
  await expect(async () => {
    const caja = await panel.boundingBox()
    const pantalla = page.viewportSize() ?? { width: 0, height: 0 }
    expect(caja).not.toBeNull()
    if (!caja) return
    if (hoja) {
      expect(Math.abs(caja.y + caja.height - pantalla.height)).toBeLessThanOrEqual(2)
      expect(Math.abs(caja.width - pantalla.width)).toBeLessThanOrEqual(2)
    } else {
      const boton = await botonDeVistaYOpciones(page).boundingBox()
      expect(caja.y).toBeGreaterThanOrEqual((boton?.y ?? 0) + (boton?.height ?? 0))
      expect(caja.width).toBeLessThan(30 * 16)
    }
  }).toPass({ timeout: 5_000 })
}

test('E2E leads — «Vista y opciones» agrupa vista, alcance y más; la URL cambia como hoy y el foco vuelve', async ({
  page,
}, info) => {
  await entrar(page, duena)
  await page.goto('/leads')
  await expect(botonDeVistaYOpciones(page)).toContainText('Míos')
  // Cerrado, el alcance no está en la página.
  await expect(page.getByRole('group', { name: 'Qué leads ver' })).toHaveCount(0)
  const panel = await abrirVistaYOpciones(page)
  await exigirFormaDelPanel(page, panel, esMovil(page))
  await expect(seccionDeVistaYOpciones(page, 'Más')).toContainText('Exportar…')
  await expect(seccionDeVistaYOpciones(page, 'Más')).toContainText('Papelera')
  await capturar(page, info, 'leads-panel')
  await panel.getByRole('button', { name: 'Todos', exact: true }).click()
  await expect.poll(() => parametro(page, 'alcance')).toBe('todos')
  await expect(botonDeVistaYOpciones(page)).toContainText('Todos')
  // Cambiar el alcance no cierra el panel.
  await expect(panel).toBeVisible()
  await cerrarVistaYOpciones(page)

  await elegirEnVistaYOpciones(page, 'Embudo')
  await expect.poll(() => parametro(page, 'vista')).toBe('embudo')
  await expect(botonDeVistaYOpciones(page)).toContainText('Embudo')
  // La primera vez se prepara el embudo por defecto: se espera a su tablero (con otro botón) antes de abrir.
  await expect(page.getByText('Aquí ves tus oportunidades.', { exact: false })).toBeVisible()
  const delEmbudo = await abrirVistaYOpciones(page)
  await expect(delEmbudo.getByRole('button', { name: 'Etapas…' })).toBeVisible()
  await expect(delEmbudo.getByRole('button', { name: 'Nuevo embudo…' })).toBeVisible()
  await capturar(page, info, 'embudo-panel')
  await cerrarVistaYOpciones(page)
})

test('E2E vehículos — tabla o tarjetas e ítems por página en el panel', async ({ page }, info) => {
  await entrar(page, duena)
  await page.goto('/vehiculos')
  const panel = await abrirVistaYOpciones(page)
  if (esMovil(page)) {
    // Por debajo de 768 px siempre van las tarjetas: no hay nada que elegir.
    await expect(seccionDeVistaYOpciones(page, 'Vistas guardadas')).toBeVisible()
    await expect(page.getByRole('group', { name: 'Cómo ver la lista' })).toHaveCount(0)
  } else {
    await panel.getByRole('button', { name: 'Tarjetas' }).click()
    await expect.poll(() => parametro(page, 'vista')).toBe('tarjetas')
    await expect(botonDeVistaYOpciones(page)).toContainText('Tarjetas')
  }
  await selectorDeTamano(page).selectOption('10')
  await expect.poll(() => parametro(page, 'por')).toBe('10')
  await expect(botonDeVistaYOpciones(page)).toContainText('10 por página')
  await expect(panel).toBeVisible()
  await capturar(page, info, 'vehiculos-panel')
  if (!esMovil(page)) {
    // Angostar la ventana con el panel abierto lo pasa a la hoja sin cerrarlo.
    const ancho = page.viewportSize() ?? { width: 1280, height: 720 }
    await page.setViewportSize({ width: 600, height: ancho.height })
    await exigirFormaDelPanel(page, panelDeVistaYOpciones(page), true)
    await capturar(page, info, 'vehiculos-panel-angosto')
    await page.setViewportSize(ancho)
    await exigirFormaDelPanel(page, panelDeVistaYOpciones(page), false)
  }
  await cerrarVistaYOpciones(page)
})

test('E2E cotizaciones — vistas guardadas, ítems por página y papelera', async ({ page }, info) => {
  await entrar(page, duena)
  await page.goto('/cotizaciones')
  const panel = await abrirVistaYOpciones(page)
  // Las vistas guardadas llegan diferidas, dentro del panel.
  await expect(panel.getByLabel('Guardar los filtros de ahora')).toBeVisible()
  // La preferencia es de la cuenta: la prueba de vehículos la dejó en 10.
  await selectorDeTamano(page).selectOption('25')
  await expect.poll(() => parametro(page, 'por')).toBe('25')
  await capturar(page, info, 'cotizaciones-panel')
  await seccionDeVistaYOpciones(page, 'Más').getByRole('link', { name: 'Papelera' }).click()
  await expect(page).toHaveURL(/\/cotizaciones\/papelera$/)
  await expect(panelDeVistaYOpciones(page)).toBeHidden()
})

test('E2E repuestos — «Qué ver» cambia de vista', async ({ page }, info) => {
  await entrar(page, duena)
  await page.goto('/repuestos')
  await expect(botonDeVistaYOpciones(page)).toContainText('Proyectos')
  await elegirEnVistaYOpciones(page, 'Cadena')
  await expect.poll(() => parametro(page, 'vista')).toBe('cadena')
  await expect(botonDeVistaYOpciones(page)).toContainText('Cadena')
  await page.goto('/repuestos?vista=stock')
  await expect(botonDeVistaYOpciones(page)).toContainText('Stock')
  await abrirVistaYOpciones(page)
  await capturar(page, info, 'repuestos-stock-panel')
  await cerrarVistaYOpciones(page)
})

// En la fila del buscador, la última pieza llega al borde derecho de la barra (el buscador crece y no deja hueco); si el buscador va solo
// en su fila, ocupa toda la barra.
async function exigirBuscadorQueLlena(page: Page): Promise<void> {
  const barra = page.locator('main [data-barra-de-filtros]').filter({ visible: true })
  await expect(botonDeVistaYOpciones(page)).toHaveAttribute('data-hidratado', 'true')
  const medida = await barra.evaluate((elemento) => {
    const borde = elemento.getBoundingClientRect()
    const piezas = [...elemento.children].map((hijo) => hijo.getBoundingClientRect())
    const buscador = elemento.querySelector('input[type="search"]')?.parentElement
    const caja = buscador?.getBoundingClientRect()
    if (!caja) return null
    const enSuFila = piezas.filter((p) => p.top < caja.bottom - 1 && p.bottom > caja.top + 1)
    return {
      derechaDeLaBarra: borde.right,
      anchoDeLaBarra: borde.width,
      derechaDeLaFila: Math.max(...enSuFila.map((p) => p.right)),
      solo: enSuFila.length === 1,
      anchoDelBuscador: caja.width,
    }
  })
  expect(medida, 'la barra tiene buscador').not.toBeNull()
  if (!medida) return
  if (medida.solo) {
    expect(medida.anchoDelBuscador).toBeGreaterThanOrEqual(medida.anchoDeLaBarra - 4)
  } else {
    expect(medida.derechaDeLaBarra - medida.derechaDeLaFila).toBeLessThanOrEqual(4)
  }
}

test('E2E el buscador ocupa el ancho libre', async ({ page }, info) => {
  await entrar(page, duena)
  await page.goto('/leads')
  await exigirBuscadorQueLlena(page)
  await capturar(page, info, 'leads-barra')
  await page.goto('/vehiculos')
  await exigirBuscadorQueLlena(page)
  await capturar(page, info, 'vehiculos-barra')
})

test('E2E sin red, el panel lo dice y no navega a medias', async ({ page, context }) => {
  await entrar(page, duena)
  await page.goto('/leads')
  const panel = await abrirVistaYOpciones(page)
  await context.setOffline(true)
  try {
    await expect(
      panel.getByText('Sin conexión: lo que necesita la red se activa cuando vuelva.'),
    ).toBeVisible()
    // El alcance queda `inert`: el clic no le llega y la URL no cambia.
    const todos = panel.locator('[inert]').getByRole('button', { name: 'Todos', exact: true })
    await expect(todos).toBeAttached()
    await todos.click({ force: true })
    expect(parametro(page, 'alcance')).toBeNull()
    // «Ítems por página» sigue: lo elegido queda pendiente y lo dice.
    await selectorDeTamano(page).selectOption('10')
    await expect(panel.getByText('Sin conexión: se aplicará cuando vuelva la red.')).toBeVisible()
    expect(parametro(page, 'por')).toBeNull()
  } finally {
    await context.setOffline(false)
  }
  await expect.poll(() => parametro(page, 'por')).toBe('10')
  await expect(panel.getByRole('button', { name: 'Todos', exact: true })).toBeVisible()
  await expect(panel.locator('[inert]')).toHaveCount(0)
  await expect(panel.getByText('Sin conexión: lo que necesita la red se activa')).toHaveCount(0)
})

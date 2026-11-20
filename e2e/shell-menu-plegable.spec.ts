// @sin-celular-archivo: el menú lateral se pliega sólo en escritorio y en el celular no cambia (lo comprueba barra-superior-celular.spec.ts y el menú del celular de chat-widget.spec.ts)
import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { limpiarChat, prepararChat, sembrarMensaje, type TerrenoDelChat } from './soporte/chat'
import { sql } from './soporte/sql'

// El menú lateral plegable (T426): en escritorio se pliega a sólo íconos con su botón y con Ctrl/Cmd+B, se recuerda por persona (`menu.plegado`) y
// llega ya dibujado como quedó, sin saltar al cargar. Plegado, cada entrada lleva su nombre en `title` y `aria-label` y el contador de Chat es un punto.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelChat

test.beforeAll(async ({}, info) => {
  t = await prepararChat(info.project.name, {
    permisosDeAna: ['chat.participar', { clave: 'leads.ver', alcance: 'propios' }],
  })
  sql(
    `update public.conversaciones_miembros set ultimo_leido_en = now() where usuario_id = '${t.ana.id}'`,
  )
})

test.afterAll(async () => {
  await limpiarChat()
})

test.beforeEach(() => {
  borrarPreferencia()
})

function borrarPreferencia(): void {
  sql(
    `delete from public.preferencias_usuario where usuario_id = '${t.ana.id}' and clave = 'menu.plegado'`,
  )
}

const guardada = (): string =>
  sql(
    `select valor from public.preferencias_usuario where usuario_id = '${t.ana.id}' and clave = 'menu.plegado'`,
  )

const barra = (page: Page) => page.locator('[data-barra-lateral]').filter({ visible: true })
const navegacion = (page: Page) => page.getByRole('navigation', { name: 'Principal' })

test('E2E el botón pliega el menú a sólo íconos y lo despliega', async ({ page }) => {
  await entrar(page, t.ana.email)
  await page.goto('/leads')
  await expect(barra(page)).not.toHaveAttribute('data-plegado', '')
  // 15,5 rem desplegada y 3,5 rem plegada (el texto de la prueba mide 16 px por rem).
  await expect(barra(page)).toHaveCSS('width', '248px')
  const enlace = navegacion(page).getByRole('link', { name: 'Leads' })
  await expect(enlace).not.toHaveAttribute('aria-label', /.+/)
  await expect(enlace).toContainText('Leads')

  await page.getByRole('button', { name: 'Plegar menú' }).click()
  await expect(barra(page)).toHaveAttribute('data-plegado', '')
  await expect(page.getByRole('button', { name: 'Desplegar menú' })).toBeVisible()
  await expect(barra(page)).toHaveCSS('width', '56px')
  // Sólo el ícono a la vista: el nombre queda en el tooltip y en `aria-label`.
  for (const nombre of ['Inicio', 'Leads', 'Chat']) {
    const entrada = navegacion(page).getByRole('link', { name: nombre })
    await expect(entrada).toHaveAttribute('aria-label', nombre)
    await expect(entrada).toHaveAttribute('title', nombre)
    // El nombre queda sólo para el lector (1 px): a la vista, el ícono.
    await expect(entrada.locator('span').first()).toHaveCSS('width', '1px')
  }
  await expect(enlace.locator('svg')).toBeVisible()

  await page.getByRole('button', { name: 'Desplegar menú' }).click()
  await expect(barra(page)).not.toHaveAttribute('data-plegado', '')
  await expect(enlace).not.toHaveAttribute('title', /.+/)
  await expect(barra(page)).toHaveCSS('width', '248px')
})

test('E2E Ctrl/Cmd+B pliega y despliega, pero no mientras se escribe', async ({ page }) => {
  await entrar(page, t.ana.email)
  await page.goto('/leads')
  await expect(barra(page)).toBeVisible()
  await page.keyboard.press('ControlOrMeta+b')
  await expect(barra(page)).toHaveAttribute('data-plegado', '')
  await page.keyboard.press('ControlOrMeta+b')
  await expect(barra(page)).not.toHaveAttribute('data-plegado', '')

  // En un campo de texto la tecla es de quien escribe (la negrita de los editores): el menú no se mueve.
  await page.keyboard.press('Control+k')
  await expect(page.getByRole('dialog', { name: 'Buscar' })).toBeVisible()
  await page.keyboard.press('ControlOrMeta+b')
  await expect(barra(page)).not.toHaveAttribute('data-plegado', '')
})

test('E2E lo que se deja se recuerda por persona y llega dibujado desde el servidor', async ({
  page,
}) => {
  await entrar(page, t.ana.email)
  await page.goto('/leads')
  await page.getByRole('button', { name: 'Plegar menú' }).click()
  await expect.poll(guardada).toBe('true')

  await page.reload()
  await expect(barra(page)).toHaveAttribute('data-plegado', '')
  // Ya en el HTML del servidor: la barra no se dibuja ancha para plegarse después.
  const html = await (await page.request.get('/leads')).text()
  expect(html).toMatch(/<aside[^>]*data-plegado=""/)

  await page.getByRole('button', { name: 'Desplegar menú' }).click()
  await expect.poll(guardada).toBe('false')
  await page.reload()
  await expect(barra(page)).not.toHaveAttribute('data-plegado', '')
  const desplegada = await (await page.request.get('/leads')).text()
  expect(desplegada).not.toMatch(/<aside[^>]*data-plegado=""/)
})

test('E2E plegado, el contador de Chat es un punto con su número para el lector', async ({
  page,
}) => {
  await entrar(page, t.ana.email)
  await page.goto('/leads')
  await page.getByRole('button', { name: 'Plegar menú' }).click()
  sembrarMensaje(t.conLuis, t.luis.id, 'Ya llegó el contenedor')
  const contador = navegacion(page).locator('[data-no-leidos-de-la-barra]')
  await expect(contador).toHaveAccessibleName('1 sin leer', { timeout: 20_000 })
  await expect(contador).toHaveCSS('width', '8px')
  await expect(contador).toHaveCSS('height', '8px')

  await page.getByRole('button', { name: 'Desplegar menú' }).click()
  await expect(contador).not.toHaveCSS('width', '8px')
})

test('E2E sin conexión cambia en la pantalla y se guarda al volver', async ({ page, context }) => {
  await entrar(page, t.ana.email)
  await page.goto('/leads')
  await expect(barra(page)).toBeVisible()
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Plegar menú' }).click()
  await expect(barra(page)).toHaveAttribute('data-plegado', '')
  expect(guardada()).toBe('')

  await context.setOffline(false)
  await expect.poll(guardada, { timeout: 20_000 }).toBe('true')
  await expect(barra(page)).toHaveAttribute('data-plegado', '')
})

import { expect, test, type Locator, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { limpiarChat, prepararChat, type TerrenoDelChat } from './soporte/chat'
import { esMovil } from './soporte/inventario'

// «Recargar la página» (a la izquierda del buscador, en la barra) y «Copiar el enlace de esta página» (flotante, a la izquierda del botón del chat; solo donde
// el chat no está).
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelChat

test.beforeAll(async ({}, info) => {
  t = await prepararChat(info.project.name)
})

test.afterAll(async () => {
  await limpiarChat()
})

const copiar = (page: Page): Locator =>
  page.getByRole('button', { name: 'Copiar el enlace de esta página' })

// El botón del chat: un botón desde 768 px y un enlace a /chat en el celular.
const chat = (page: Page): Locator =>
  esMovil(page)
    ? page.getByRole('link', { name: /^Chat/, exact: false }).filter({ visible: true })
    : page.getByRole('button', { name: /^Chat/ })

async function izquierdaDe(a: Locator, b: Locator): Promise<void> {
  const cajaA = await a.boundingBox()
  const cajaB = await b.boundingBox()
  expect(cajaA, 'sin caja de A').not.toBeNull()
  expect(cajaB, 'sin caja de B').not.toBeNull()
  expect((cajaA?.x ?? 0) + (cajaA?.width ?? 0)).toBeLessThanOrEqual((cajaB?.x ?? 0) + 1)
}

test('E2E recargar: va a la izquierda del buscador (o en el menú del celular) y recarga la página completa', async ({
  page,
}) => {
  await entrar(page, t.ana.email)
  await page.evaluate(() => {
    ;(window as unknown as { marca: string }).marca = 'sin recargar'
  })
  const barra = page.locator('header').first()
  if (esMovil(page)) {
    // El celular angosto no tiene lugar en la barra: el botón vive en el menú.
    await expect(barra.getByRole('button', { name: 'Recargar la página' })).toBeHidden()
    await page.getByRole('button', { name: 'Abrir el menú' }).click()
    const recargar = page.getByRole('dialog').getByRole('button', { name: 'Recargar la página' })
    await Promise.all([page.waitForEvent('load'), recargar.click()])
  } else {
    const recargar = barra.getByRole('button', { name: 'Recargar la página' })
    await izquierdaDe(recargar, barra.getByRole('button', { name: 'Buscar', exact: true }))
    await Promise.all([page.waitForEvent('load'), recargar.click()])
  }
  await expect(
    page.evaluate(() => (window as unknown as { marca?: string }).marca),
  ).resolves.toBeUndefined()
})

test('E2E copiar: queda a la izquierda del chat, copia la URL y avisa', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await entrar(page, t.ana.email)
  await expect(copiar(page)).toBeVisible()
  await expect(chat(page)).toBeVisible()
  await izquierdaDe(copiar(page), chat(page))

  await copiar(page).click()
  await expect(
    page.locator('[data-sonner-toast]').filter({ hasText: 'Enlace copiado.' }),
  ).toBeVisible()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(page.url())
})

test('E2E copiar: con el portapapeles bloqueado, un modal deja el enlace seleccionado', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new DOMException('bloqueado', 'NotAllowedError')) },
    })
  })
  await entrar(page, t.ana.email)
  await copiar(page).click()
  const modal = page.getByRole('dialog', { name: 'Copia el enlace de esta página' })
  await expect(modal).toBeVisible()
  const campo = modal.getByRole('textbox', { name: 'Enlace de esta página' })
  await expect(campo).toHaveValue(page.url())
  await expect(campo).toBeFocused()
  expect(
    await campo.evaluate((el: HTMLInputElement) =>
      el.value.slice(el.selectionStart ?? 0, el.selectionEnd ?? 0),
    ),
  ).toBe(page.url())
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
})

test('E2E copiar: en /chat y sin permiso de chat queda solo, en el lugar del chat', async ({
  page,
}) => {
  await entrar(page, t.ana.email)
  await page.goto('/chat')
  await expect(copiar(page)).toBeVisible()
  await expect(page.getByRole('button', { name: /^Chat/ })).toHaveCount(0)
  const enChat = await copiar(page).boundingBox()

  await page.context().clearCookies()
  await entrar(page, t.sofia.email, { fresco: true })
  await expect(copiar(page)).toBeVisible()
  await expect(
    page.locator(
      '[data-flotantes] a[href="/chat"], [data-flotantes] button:not([aria-label^="Copiar"])',
    ),
  ).toHaveCount(0)
  const sinChat = await copiar(page).boundingBox()
  expect(Math.round(sinChat?.x ?? -1)).toBe(Math.round(enChat?.x ?? -2))
})

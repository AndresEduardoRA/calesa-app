import { entrar } from './soporte/alta'
import { borrarRolesDePrueba } from './soporte/base'
import { sembrarConTitulos } from './soporte/cotizaciones-papelera'
import { idDePersona } from './soporte/cotizaciones-sembradas'
import { limpiarGuardado } from './soporte/cotizar-guardar'
import { prepararListado, type TerrenoDelListado } from './soporte/listado-de-cotizaciones'
import { expect, test, type Locator, type Page } from './soporte/prueba'
import { literal, sql } from './soporte/sql'

// Las pestañas del resumen `?cotizacion=` de `/cotizaciones` (T16): «Todo» (adjuntos, revisiones y comentarios en una línea de tiempo, lo más nuevo arriba), «Adjuntos»,
// «Revisiones» y «Comentarios», cada una leída al abrirse y con su `?pestana=`. Se comenta y se adjunta desde ahí y lo escrito aparece en «Todo». Permisos, candados y
// versiones de comentarios y adjuntos ya tienen sus pruebas SQL (`supabase/tests/areas/comentarios/`).
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n')
const resumen = (page: Page): Locator => page.getByRole('dialog')
const pestana = (page: Page, nombre: string): Locator =>
  resumen(page).getByRole('tab', { name: nombre, exact: true })
const entradas = (page: Page): Locator => resumen(page).locator('[data-entrada]')

async function abrir(page: Page, correo: string, id: string, consulta = ''): Promise<void> {
  await entrar(page, correo, { fresco: true })
  await page.goto(`/cotizaciones?origen=${t.origen.id}&cotizacion=${id}${consulta}`)
  await expect(
    resumen(page).getByRole('tablist', { name: 'Secciones de la cotización' }),
  ).toBeVisible()
}

function sembrar(titulo: string): string {
  const [id = ''] = sembrarConTitulos({
    origenId: t.origen.id,
    creadoPor: t.duena,
    titulos: [titulo],
  })
  return id
}

test('E2E las cuatro pestañas, el vacío de «Todo» y comentar desde el resumen', async ({
  page,
}) => {
  const id = sembrar('Pestañas comentar')
  await abrir(page, t.duena, id)
  for (const nombre of ['Todo', 'Adjuntos', 'Revisiones', 'Comentarios']) {
    await expect(pestana(page, nombre)).toBeVisible()
  }
  await expect(pestana(page, 'Todo')).toHaveAttribute('aria-selected', 'true')
  await expect(resumen(page).getByText('Todavía no hay actividad.')).toBeVisible()
  await expect(resumen(page).getByRole('button', { name: 'Adjuntar' })).toBeVisible()

  // «Agregar comentario» lleva a la pestaña que lo hace posible.
  await resumen(page).getByRole('button', { name: 'Agregar comentario' }).click()
  await expect(page).toHaveURL(/pestana=comentarios/)
  await expect(pestana(page, 'Comentarios')).toHaveAttribute('aria-selected', 'true')
  await expect(
    resumen(page).getByText('Todavía no hay comentarios.', { exact: true }),
  ).toBeVisible()
  await resumen(page)
    .getByRole('textbox', { name: 'Escribe un comentario' })
    .fill('Desde el resumen')
  await resumen(page).getByRole('button', { name: 'Comentar' }).click()
  await expect(resumen(page).getByText('Desde el resumen', { exact: true })).toBeVisible()
  // Los adjuntos tienen su pestaña: no están dentro de «Comentarios».
  await expect(resumen(page).getByRole('heading', { name: 'Adjuntos' })).toHaveCount(0)

  // Recargar conserva la pestaña; en «Todo» el comentario va en la línea de tiempo.
  await page.reload()
  await expect(pestana(page, 'Comentarios')).toHaveAttribute('aria-selected', 'true')
  await expect(resumen(page).getByText('Desde el resumen', { exact: true })).toBeVisible()
  await pestana(page, 'Todo').click()
  await expect(page).not.toHaveURL(/pestana=/)
  await expect(entradas(page)).toHaveCount(1)
  await expect(entradas(page).first()).toHaveAttribute('data-entrada', 'comentario')
  await expect(entradas(page).first()).toContainText('Desde el resumen')

  // Cerrar el resumen borra la pestaña de la URL; abrir otra vez empieza en «Todo».
  await pestana(page, 'Revisiones').click()
  await expect(page).toHaveURL(/pestana=revisiones/)
  await expect(resumen(page).getByText('Todavía no tiene cambios guardados.')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(resumen(page)).toBeHidden()
  await expect(page).not.toHaveURL(/pestana=|cotizacion=/)
})

test('E2E adjuntar desde el resumen y verlo en «Todo» sobre el comentario más viejo', async ({
  page,
}) => {
  const id = sembrar('Pestañas adjuntar')
  sql(`
    begin;
    set local session_replication_role = replica;
    insert into public.cotizaciones_comentarios (cotizacion_id, usuario_id, cuerpo, creado_en, actualizado_en)
    values (${literal(id)}::uuid, ${literal(idDePersona(t.duena))}::uuid, 'Comentario viejo', now() - interval '1 day', now() - interval '1 day');
    commit;`)
  await abrir(page, t.duena, id, '&pestana=adjuntos')
  await expect(resumen(page).getByText('Todavía no hay adjuntos.', { exact: true })).toBeVisible()
  await resumen(page)
    .locator('input[type=file]')
    .setInputFiles([{ name: 'contrato.pdf', mimeType: 'application/pdf', buffer: PDF }])
  await expect(resumen(page).getByRole('button', { name: 'Descargar contrato.pdf' })).toBeVisible()

  await pestana(page, 'Todo').click()
  await expect(entradas(page)).toHaveCount(2)
  await expect(entradas(page).nth(0)).toHaveAttribute('data-entrada', 'adjunto')
  await expect(entradas(page).nth(0)).toContainText('contrato.pdf')
  await expect(entradas(page).nth(1)).toContainText('Comentario viejo')
})

test('E2E «Todo» mezcla las fuentes sin traer la historia: sólo hasta donde llegó la que menos retrocedió', async ({
  page,
}) => {
  const id = sembrar('Pestañas mezcla')
  const yo = literal(idDePersona(t.duena))
  sql(`
    begin;
    set local session_replication_role = replica;
    insert into public.cotizaciones_comentarios (cotizacion_id, usuario_id, cuerpo, creado_en, actualizado_en)
    select ${literal(id)}::uuid, ${yo}::uuid, 'c' || lpad(g::text, 2, '0'), now() - (g || ' hours')::interval, now() - (g || ' hours')::interval
      from generate_series(1, 25) g;
    insert into public.cotizaciones_revisiones (cotizacion_id, usuario_id, diff, creado_en)
    select ${literal(id)}::uuid, ${yo}::uuid, '{}'::jsonb, now() - (g || ' hours')::interval from generate_series(30, 50, 10) g;
    insert into public.cotizaciones_adjuntos (cotizacion_id, ruta, nombre, mime, bytes, subido_por, creado_en)
    values (${literal(id)}::uuid, ${literal(`${id}/${'a'.repeat(64)}.pdf`)}, 'medio.pdf', 'application/pdf', 100, ${yo}::uuid, now() - interval '150 minutes');
    commit;`)
  await abrir(page, t.duena, id)
  // La primera página de comentarios llega hasta c20 y todavía hay más: lo anterior (las revisiones, más viejas que c20) espera. Los adjuntos entran en su lugar.
  await expect(entradas(page)).toHaveCount(21)
  await expect(entradas(page).locator('xpath=self::*[@data-entrada="revision"]')).toHaveCount(0)
  await expect(entradas(page).nth(0)).toContainText('c01')
  await expect(entradas(page).nth(2)).toContainText('medio.pdf')
  await expect(entradas(page).nth(3)).toContainText('c03')

  await resumen(page).getByRole('button', { name: 'Ver más' }).click()
  // Con los comentarios completos ya no hay borde: caben las tres revisiones, al final.
  await expect(entradas(page)).toHaveCount(29)
  await expect(entradas(page).nth(26)).toHaveAttribute('data-entrada', 'revision')
  await expect(entradas(page).last()).toHaveAttribute('data-entrada', 'revision')
  await expect(resumen(page).getByRole('button', { name: 'Ver más' })).toHaveCount(0)

  // «Revisiones» y «Comentarios» siguen leyendo por su cuenta, con su propio «Ver más».
  await pestana(page, 'Comentarios').click()
  await expect(resumen(page).getByText('c01', { exact: true })).toBeVisible()
  await expect(resumen(page).getByRole('button', { name: 'Ver más' })).toBeVisible()
})

let idDeSoloVe = ''

test('E2E quien sólo ve no adjunta', async ({ page }) => {
  const id = sembrar('Pestañas sólo ve')
  idDeSoloVe = id
  await abrir(page, t.soloVer, id)
  await expect(resumen(page).getByText('Todavía no hay actividad.')).toBeVisible()
  await expect(resumen(page).getByRole('button', { name: 'Agregar comentario' })).toBeVisible()
  await expect(resumen(page).getByRole('button', { name: 'Adjuntar' })).toHaveCount(0)
  await pestana(page, 'Adjuntos').click()
  await expect(resumen(page).getByText('Todavía no hay adjuntos.', { exact: true })).toBeVisible()
  await expect(resumen(page).locator('input[type=file]')).toHaveCount(0)
})

test('E2E una cotización que quien mira no ve no abre pestañas', async ({ page }) => {
  // Ana ve «propios»: la de la dueña no existe para ella, y sin cotización no hay pestañas.
  await entrar(page, t.ana, { fresco: true })
  await page.goto(
    `/cotizaciones?origen=${t.origen.id}&cotizacion=${idDeSoloVe}&pestana=comentarios`,
  )
  await expect(resumen(page).getByRole('status')).toContainText('ya no está disponible')
  await expect(resumen(page).getByRole('tablist')).toHaveCount(0)
})

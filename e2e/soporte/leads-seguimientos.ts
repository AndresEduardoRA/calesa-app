// Lo que los e2e de los seguimientos preparan y miran en la base del Supabase LOCAL sin pasar por la
// pantalla: compartir un lead (como lo hará la parte 6), apagar un tipo, meter una fila escrita
// «por fuera» y leer lo que quedó guardado.
import { expect, type Locator, type Page } from '@playwright/test'
import { admin } from './base'
import { exigir } from './leads'
import { irAFicha } from './leads-ficha'

export const SECCION = '?seccion=seguimientos'

// El drawer «Ver todos» de la ficha (`?todos=seguimientos|recordatorios`).
export const drawerDeTodos = (page: Page): Locator =>
  page.getByRole('dialog', { name: /^(Seguimientos de|Tus recordatorios sobre) / })

// `mas`: el resto de la URL (`&panel=…`). Con `todos`, abre además «Ver todos» (la línea de tiempo completa o todos los recordatorios,
// con «Ver más», «Ir a una fecha» y «Completados»): con el drawer abierto, lo de atrás sale del árbol de accesibilidad y los localizadores
// por rol ven sólo lo del drawer. Sin él, el bloque de la ficha muestra lo último y lo próximo.
export async function irASeguimientos(
  page: Page,
  leadId: string,
  mas = '',
  { todos }: { todos?: 'seguimientos' | 'recordatorios' } = {},
): Promise<void> {
  await irAFicha(page, leadId, `${SECCION}${todos ? `&todos=${todos}` : ''}${mas}`)
  const region = todos === 'recordatorios' ? 'Tus recordatorios' : 'Seguimientos'
  await expect(
    (todos ? drawerDeTodos(page) : page).getByRole('region', { name: region, exact: true }),
  ).toBeVisible()
}

// El bloque «Seguimiento» de la ficha (`#seguimientos`): el título con el «+» y el «⋯», el recordatorio más próximo y la línea de tiempo.
export const bloqueSeguimiento = (page: Page): Locator =>
  page.getByRole('region', { name: 'Seguimiento', exact: true })
export const botonMasDelSeguimiento = (page: Page): Locator =>
  page.getByRole('button', { name: 'Anotar o agendar' })
export const verTodosLosSeguimientos = (page: Page): Locator =>
  page.locator('#seguimientos').getByRole('button', { name: 'Ver todos', exact: true })

// Elige una línea de un menú (el «+» o un «⋯») y espera lo que abre; antes de hidratar el clic no vale, así que se insiste hasta que la URL
// lo pida (y no más: cada clic de más suma una entrada al historial).
type Destino = { enLaUrl: string; abierto: Locator }

async function elegirEnElMenu(
  page: Page,
  boton: Locator,
  linea: string,
  { enLaUrl, abierto }: Destino,
): Promise<void> {
  await expect(async () => {
    if (!page.url().includes(enLaUrl)) {
      const item = page.getByRole('menuitem', { name: linea, exact: true })
      if (!(await item.isVisible())) {
        await boton.click()
      }
      await item.click({ timeout: 1000 })
    }
    await expect(abierto).toBeVisible({ timeout: 1000 })
  }).toPass()
}

// Abre «Ver todos» (la línea de tiempo, con el enlace al pie de la línea) o «Ver tus recordatorios» (desde el «⋯» del bloque).
export async function abrirTodos(
  page: Page,
  cual: 'seguimientos' | 'recordatorios',
): Promise<Locator> {
  const drawer = drawerDeTodos(page)
  if (cual === 'seguimientos') {
    await expect(async () => {
      if (!page.url().includes('todos=seguimientos')) {
        await verTodosLosSeguimientos(page).click()
      }
      await expect(drawer).toBeVisible({ timeout: 1000 })
    }).toPass()
  } else {
    await elegirEnElMenu(
      page,
      page.getByRole('button', { name: 'Más acciones de «Seguimiento»' }),
      'Ver tus recordatorios',
      { enLaUrl: 'todos=recordatorios', abierto: drawer },
    )
  }
  return drawer
}

// El modal de anotar o editar (`?panel=anotar-seguimiento`, `?panel=editar-seguimiento&seguimiento=`):
// adentro están los campos y el pie con «Cancelar» y «Guardar».
export const modalDeSeguimiento = (page: Page, modo: 'Anotar' | 'Editar'): Locator =>
  page.getByRole('dialog', { name: `${modo} seguimiento` })
export const editorDe = (formulario: Locator): Locator =>
  formulario.getByRole('textbox', { name: 'Detalle (opcional)' })
// Dentro de la línea de tiempo: un recordatorio puede llevar el mismo título.
export const seguimiento = (page: Page, titulo: string): Locator =>
  page
    .getByRole('region', { name: 'Seguimientos', exact: true })
    .getByRole('article', { name: titulo })

// Abre el modal con «Anotar seguimiento» del «+» del bloque «Seguimiento» (en «Ver todos», con su botón); antes de hidratar el clic no
// vale, así que se insiste. El foco queda en el resumen y el editor llega aparte (carga diferida).
export async function abrirAnotar(page: Page): Promise<Locator> {
  const modal = modalDeSeguimiento(page, 'Anotar')
  const enElDrawer = drawerDeTodos(page).getByRole('button', { name: 'Anotar seguimiento' })
  if (await enElDrawer.isVisible()) {
    await enElDrawer.click()
    await expect(modal).toBeVisible()
  } else {
    await elegirEnElMenu(page, botonMasDelSeguimiento(page), 'Anotar seguimiento', {
      enLaUrl: 'panel=anotar-seguimiento',
      abierto: modal,
    })
  }
  await expect(editorDe(modal)).toBeVisible()
  await expect(modal.getByLabel('Resumen')).toBeFocused()
  return modal
}

// «Editar» de un seguimiento o un recordatorio: a la vista en «Ver todos»; en el bloque de la ficha, en el «⋯» de su fila.
async function editarDesde(
  page: Page,
  fila: Locator,
  titulo: string,
  { enLaUrl, abierto: modal }: Destino,
): Promise<void> {
  const aLaVista = fila.getByRole('button', { name: 'Editar', exact: true })
  if (await aLaVista.isVisible()) {
    await expect(async () => {
      if (!page.url().includes(enLaUrl)) {
        await aLaVista.click()
      }
      await expect(modal).toBeVisible({ timeout: 1000 })
    }).toPass()
    return
  }
  await elegirEnElMenu(
    page,
    fila.getByRole('button', { name: `Más acciones de «${titulo}»` }),
    'Editar',
    { enLaUrl, abierto: modal },
  )
}

// Abre el modal de edición de un seguimiento de la línea de tiempo.
export async function abrirEdicionDeSeguimiento(page: Page, titulo: string): Promise<Locator> {
  const modal = modalDeSeguimiento(page, 'Editar')
  await editarDesde(page, seguimiento(page, titulo), titulo, {
    enLaUrl: 'panel=editar-seguimiento',
    abierto: modal,
  })
  await expect(editorDe(modal)).toBeVisible()
  return modal
}

// Le da el lead a otra persona como co-asesora, como lo haría `lead_compartir` (sin pasar por la pantalla).
export async function compartirCon(leadId: string, personaId: string, deQuienId: string) {
  const { error } = await admin().from('leads_asesores').upsert({
    lead_id: leadId,
    usuario_id: personaId,
    tipo_acceso: 'compartido',
    compartido_por: deQuienId,
    revocado_en: null,
  })
  exigir(error, 'compartir el lead')
}

export type SeguimientoEnLaBase = {
  id: string
  titulo: string
  detalle_doc: unknown
  detalle_texto: string | null
  visibilidad: string
  eliminado_en: string | null
  usuario_id: string
}

export async function seguimientosEnLaBase(leadId: string): Promise<SeguimientoEnLaBase[]> {
  const { data, error } = await admin()
    .from('seguimientos')
    .select('id, titulo, detalle_doc, detalle_texto, visibilidad, eliminado_en, usuario_id')
    .eq('lead_id', leadId)
    .order('ocurrido_en', { ascending: false })
    .returns<SeguimientoEnLaBase[]>()
  exigir(error, 'leer los seguimientos')
  return data ?? []
}

export async function tipoDeSeguimiento(clave: string): Promise<{ id: string; nombre: string }> {
  const { data, error } = await admin()
    .from('tipos_seguimiento')
    .select('id, nombre')
    .eq('clave', clave)
    .single<{ id: string; nombre: string }>()
  exigir(error, `leer el tipo ${clave}`)
  return data ?? { id: '', nombre: '' }
}

// Apaga un tipo y devuelve cómo volver a encenderlo.
export async function apagarTipo(clave: string): Promise<() => Promise<void>> {
  const poner = async (activo: boolean) => {
    const { error } = await admin().from('tipos_seguimiento').update({ activo }).eq('clave', clave)
    exigir(error, `${activo ? 'encender' : 'apagar'} el tipo ${clave}`)
  }
  await poner(false)
  return () => poner(true)
}

// Una fila escrita por fuera de las RPC (como lo haría un bug o el cliente de servicio): un enlace
// `javascript:`, una imagen con `onerror` y HTML en el texto. La pantalla tiene que dibujarla inerte.
export async function meterSeguimientoMalicioso(leadId: string, quienId: string, titulo: string) {
  const tipo = await tipoDeSeguimiento('nota')
  const { error } = await admin()
    .from('seguimientos')
    .insert({
      lead_id: leadId,
      usuario_id: quienId,
      tipo_id: tipo.id,
      titulo,
      visibilidad: 'publico',
      detalle_texto: '<img src=x onerror="window.__xss=1"><script>window.__xss=2</script>',
      detalle_doc: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'clic acá',
                marks: [{ type: 'link', attrs: { href: 'javascript:window.__xss=3' } }],
              },
            ],
          },
          { type: 'image', attrs: { src: 'x', onerror: 'window.__xss=4' } },
        ],
      },
    })
  exigir(error, 'insertar el seguimiento malicioso')
}

// --- Recordatorios ---------------------------------------------------------------------------------

export const bloqueDeRecordatorios = (page: Page): Locator =>
  page.getByRole('region', { name: 'Tus recordatorios' })
export const recordatorio = (page: Page, titulo: string): Locator =>
  bloqueDeRecordatorios(page).getByRole('article', { name: titulo })

export type RecordatorioEnLaBase = {
  id: string
  titulo: string
  recordar_en: string
  notificado_en: string | null
  completado_en: string | null
  eliminado_en: string | null
  usuario_id: string
  actualizado_en: string
}

export async function recordatoriosEnLaBase(leadId: string): Promise<RecordatorioEnLaBase[]> {
  const { data, error } = await admin()
    .from('recordatorios')
    .select(
      'id, titulo, recordar_en, notificado_en, completado_en, eliminado_en, usuario_id, actualizado_en',
    )
    .eq('lead_id', leadId)
    .order('recordar_en')
    .returns<RecordatorioEnLaBase[]>()
  exigir(error, 'leer los recordatorios')
  return data ?? []
}

// Un recordatorio puesto como dueño de la base (uno vencido no se puede crear por la RPC).
export async function meterRecordatorio(datos: {
  leadId: string
  usuarioId: string
  titulo: string
  recordarEn: string
  notificadoEn?: string
}): Promise<string> {
  const { data, error } = await admin()
    .from('recordatorios')
    .insert({
      lead_id: datos.leadId,
      usuario_id: datos.usuarioId,
      titulo: datos.titulo,
      recordar_en: datos.recordarEn,
      notificado_en: datos.notificadoEn ?? null,
    })
    .select('id')
    .single<{ id: string }>()
  exigir(error, 'insertar el recordatorio')
  return data?.id ?? ''
}

// «Agendar recordatorio» y «Editar» son un modal con su URL (`?panel=agendar-recordatorio`,
// `?panel=editar-recordatorio&recordatorio=<id>`).
export const modalDeRecordatorio = (page: Page, modo: 'Agendar' | 'Editar'): Locator =>
  page.getByRole('dialog', { name: `${modo} recordatorio` })

// «Agendar recordatorio» del «+» del bloque «Seguimiento» (en «Ver tus recordatorios», con su botón). El bloque llega dibujado del
// servidor: antes de hidratar el clic no vale, así que se insiste.
export async function abrirAgendar(page: Page): Promise<Locator> {
  const modal = modalDeRecordatorio(page, 'Agendar')
  const enElDrawer = drawerDeTodos(page).getByRole('button', { name: 'Agendar recordatorio' })
  if (await enElDrawer.isVisible()) {
    await enElDrawer.click()
    await expect(modal).toBeVisible()
  } else {
    await elegirEnElMenu(page, botonMasDelSeguimiento(page), 'Agendar recordatorio', {
      enLaUrl: 'panel=agendar-recordatorio',
      abierto: modal,
    })
  }
  await expect(modal.getByLabel('De qué es')).toBeFocused()
  return modal
}

export async function abrirEdicionDeRecordatorio(page: Page, titulo: string): Promise<Locator> {
  const modal = modalDeRecordatorio(page, 'Editar')
  await editarDesde(page, recordatorio(page, titulo), titulo, {
    enLaUrl: 'panel=editar-recordatorio',
    abierto: modal,
  })
  await expect(modal.getByLabel('De qué es')).toBeFocused()
  return modal
}

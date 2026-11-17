import { describe, expect, it } from 'vitest'
import { PANEL_ANOTAR_SEGUIMIENTO } from './edicion-de-seguimiento'
import { CLAVE_DE_SECCION, SECCIONES_DE_LEAD } from './ficha'
import { PANEL_AGENDAR_RECORDATORIO } from './recordatorios'
import { rutaDeAccionSobreUnLead } from './ruta-de-accion-de-lead'

describe('rutaDeAccionSobreUnLead', () => {
  it('lleva a la sección Seguimientos de la ficha con el modal pedido', () => {
    expect(rutaDeAccionSobreUnLead('anotar-seguimiento', 'abc')).toBe(
      '/leads/abc?seccion=seguimientos&panel=anotar-seguimiento',
    )
    expect(rutaDeAccionSobreUnLead('agendar-recordatorio', 'abc')).toBe(
      '/leads/abc?seccion=seguimientos&panel=agendar-recordatorio',
    )
  })

  it('usa las mismas claves que la ficha', () => {
    expect('anotar-seguimiento').toBe(PANEL_ANOTAR_SEGUIMIENTO)
    expect('agendar-recordatorio').toBe(PANEL_AGENDAR_RECORDATORIO)
    expect(CLAVE_DE_SECCION).toBe('seccion')
    expect(SECCIONES_DE_LEAD.map((s) => s.clave)).toContain('seguimientos')
  })
})

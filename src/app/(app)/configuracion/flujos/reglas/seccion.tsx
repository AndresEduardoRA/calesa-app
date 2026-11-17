import { EsqueletoDeReglas, PantallaDeReglas } from '@/modules/flujos/pantallas/reglas'
import { getOrigenes } from '@/modules/origenes'
import type { PanelDeFlujos, SeccionDeFlujos } from '../pestanas'

// El área `reglas` no tiene sección en la página: las reglas se abren en el panel del flujo.
export const SECCIONES_DE_REGLAS: Record<string, SeccionDeFlujos> = {}

// Las reglas del flujo y la oferta de transporte (5.11), en el panel del flujo (`?seccion=reglas`).
export const PANELES_DE_REGLAS: Record<string, PanelDeFlujos> = {
  reglas: {
    titulo: 'Reglas del flujo',
    contenido: (pedido) => (
      <PantallaDeReglas
        permisos={pedido.permisos}
        origenes={getOrigenes(true)}
        origenPedido={pedido.origenPedido}
        ambitoPedido={pedido.ambitoPedido}
      />
    ),
    esqueleto: () => <EsqueletoDeReglas />,
  },
}

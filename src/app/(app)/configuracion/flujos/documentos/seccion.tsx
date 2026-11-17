import { Suspense } from 'react'
import { EsqueletoDeTipos, PantallaDeDocumentos } from '@/modules/flujos/pantallas/documentos'
import { getOrigenes } from '@/modules/origenes'
import type { PanelDeFlujos, SeccionDeFlujos } from '../pestanas'

// Los tipos de documento en la página (5.09), para quien no ve las fases (sólo gestiona los catálogos de logística). Se leen detrás de `<Suspense>` y se
// reinician al cambiar de flujo (`key`).
export const SECCIONES_DE_DOCUMENTOS: Record<string, SeccionDeFlujos> = {
  documentos: (pedido) => (
    <Suspense
      key={`${pedido.origenPedido ?? ''}:${pedido.ambitoPedido ?? ''}`}
      fallback={<EsqueletoDeTipos />}
    >
      <PantallaDeDocumentos
        permisos={pedido.permisos}
        origenes={getOrigenes(true)}
        origenPedido={pedido.origenPedido}
        ambitoPedido={pedido.ambitoPedido}
      />
    </Suspense>
  ),
}

// Los tipos de documento en el panel del flujo (`?seccion=documentos`), para quien configura: sin su selector.
export const PANELES_DE_DOCUMENTOS: Record<string, PanelDeFlujos> = {
  documentos: {
    titulo: 'Tipos de documento',
    contenido: (pedido) => (
      <PantallaDeDocumentos
        permisos={pedido.permisos}
        origenes={getOrigenes(true)}
        origenPedido={pedido.origenPedido}
        ambitoPedido={pedido.ambitoPedido}
        enElPanel
      />
    ),
    esqueleto: () => <EsqueletoDeTipos />,
  },
}

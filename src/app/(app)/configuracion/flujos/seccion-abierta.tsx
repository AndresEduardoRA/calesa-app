import { Suspense } from 'react'
import { PantallaDelFlujo, type SeccionesDelPanel } from '@/modules/flujos/pantallas/configuracion'
import { leerRolesParaElegir } from '@/modules/equipo'
import { getOrigenes } from '@/modules/origenes'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { PANELES_DE_DOCUMENTOS, SECCIONES_DE_DOCUMENTOS } from './documentos/seccion'
import { SECCIONES_DE_FASES } from './fases/seccion'
import { HUECOS_DE_FLUJOS } from './huecos'
import type { PanelDeFlujos, PedidoDeFlujos, SeccionDeFlujos } from './pestanas'
import { PANELES_DE_REGLAS, SECCIONES_DE_REGLAS } from './reglas/seccion'
import { FueraDeReglaDelFlujo } from './requisitos/fuera-de-regla'
import { SECCIONES_DE_REQUISITOS } from './requisitos/seccion'

// Lo que dibuja en la página cada sección de un área, por su clave (para quien no ve «Fases»): cada área llena el suyo en su carpeta.
const SECCIONES: Record<string, SeccionDeFlujos> = {
  ...SECCIONES_DE_REQUISITOS,
  ...SECCIONES_DE_DOCUMENTOS,
  ...SECCIONES_DE_REGLAS,
  ...SECCIONES_DE_FASES,
}

// Lo que se abre en el panel del flujo desde su barra, por su clave.
const PANELES: Record<string, PanelDeFlujos> = { ...PANELES_DE_DOCUMENTOS, ...PANELES_DE_REGLAS }

type Props = PedidoDeFlujos & {
  // La sección que abre la página (la primera visible si la URL no dice una).
  pestana: string
  // Las que esta persona ve.
  visibles: readonly string[]
  // `?seccion=` tal cual: la que el panel muestra abierta.
  seccionPedida: string | undefined
}

// Las secciones del panel que esta persona ve: la que pide la URL se lee (detrás de su `<Suspense>`); las otras van con su esqueleto, así el panel abre en el
// acto y la sección llega del servidor.
function seccionesDelPanel(
  visibles: readonly string[],
  seccionPedida: string | undefined,
  pedido: PedidoDeFlujos,
): SeccionesDelPanel {
  return Object.fromEntries(
    Object.entries(PANELES)
      .filter(([clave]) => visibles.includes(clave))
      .map(([clave, panel]) => [
        clave,
        {
          titulo: panel.titulo,
          contenido: (
            <Suspense fallback={panel.esqueleto()}>
              {seccionPedida === clave ? panel.contenido(pedido) : panel.esqueleto()}
            </Suspense>
          ),
        },
      ]),
  )
}

// El cuerpo de la página. Con «Fases» visible, la pantalla del flujo (del núcleo, detrás de `<Suspense>`, se reinicia al cambiar de flujo) con las demás
// secciones en su panel; sin ella, la sección que corresponde.
export function SeccionAbierta({ pestana, visibles, seccionPedida, ...pedido }: Props) {
  if (visibles.includes('fases')) {
    return (
      <Suspense
        key={`${pedido.origenPedido ?? ''}:${pedido.ambitoPedido ?? ''}`}
        fallback={<EsqueletoFormulario bloques={2} campos={4} />}
      >
        <PantallaDelFlujo
          permisos={pedido.permisos}
          origenes={getOrigenes(true)}
          roles={leerRolesParaElegir()}
          origenPedido={pedido.origenPedido}
          ambitoPedido={pedido.ambitoPedido}
          huecos={HUECOS_DE_FLUJOS}
          sobreLaLista={(flujo) => <FueraDeReglaDelFlujo flujo={flujo} />}
          secciones={seccionesDelPanel(visibles, seccionPedida, pedido)}
        />
      </Suspense>
    )
  }
  return SECCIONES[pestana]?.(pedido) ?? null
}

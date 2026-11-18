'use client'

import { PlusIcon } from 'lucide-react'
import { textoDelTope } from '@/shared/lib/conteo'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { ListaDeCatalogo } from '@/shared/ui/lista-de-catalogo/lista-de-catalogo'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { TOPE_DE_TESTIMONIOS, type Testimonio } from '../../../../entities/contenido/testimonios'
import { useAperturaDeTestimonio } from '../hooks/use-apertura-de-testimonio'
import { useConsentimientoPorUrl } from '../hooks/use-consentimiento-por-url'
import { useEliminarTestimonioPorUrl } from '../hooks/use-eliminar-testimonio-por-url'
import { useEscrituraDeTestimonios } from '../hooks/use-escritura-de-testimonios'
import { useRetirarConsentimientoPorUrl } from '../hooks/use-retirar-consentimiento-por-url'
import {
  ConfirmarEliminarTestimonioDiferido,
  ConfirmarRetirarConsentimientoDiferido,
  PanelDeConsentimientoDiferido,
  PanelDeTestimonioDiferido,
} from './diferidos'
import { filasDeTestimonios } from './filas-de-testimonios'

export type PropsDeTestimonios = {
  testimonios: readonly Testimonio[]
  // Había más de los que se muestran (`TOPE_DE_TESTIMONIOS`).
  hayMas: boolean
}

const PREFIJO = 'testimonio'

// Su acción principal. El título y la frase los pone la página.
function AccionesDeTestimonios({ alNuevo }: { alNuevo: () => void }) {
  return (
    <div className="flex justify-end">
      <Button className="h-11 max-sm:w-full md:h-8" onClick={alNuevo}>
        <PlusIcon aria-hidden />
        Nuevo testimonio
      </Button>
    </div>
  )
}

const SIN_TESTIMONIOS = (
  <EstadoVacio
    compacto
    titulo="Todavía no hay testimonios."
    descripcion="Un testimonio nuevo nace sin publicar y sin consentimiento."
  />
)

// El «⋯» de la fila devuelve el foco ahí al cerrar un diálogo.
const focoEnElMas = (testimonio: Testimonio | null) => () =>
  (testimonio &&
    document.querySelector<HTMLElement>(`[data-mas-acciones="${PREFIJO}-${testimonio.id}-mas"]`)) ??
  true

// Configuración › Sitio web › Testimonios (8.02-2): lo que dicen los clientes, con su consentimiento. La lee la página en el servidor y cada action renueva
// la ruta (`revalidatePath`). Escribir lo exige `web.contenido.gestionar` (la RLS y las RPC); la página ya lo pide.
export function Testimonios({ testimonios, hayMas }: PropsDeTestimonios) {
  const apertura = useAperturaDeTestimonio(testimonios)
  const consentimiento = useConsentimientoPorUrl(testimonios)
  const retiro = useRetirarConsentimientoPorUrl(testimonios)
  const eliminacion = useEliminarTestimonioPorUrl(testimonios)
  const montarPanel = useAbiertoAlgunaVez(apertura.abierto)
  const montarConsentimiento = useAbiertoAlgunaVez(consentimiento.abierto)
  const montarRetiro = useAbiertoAlgunaVez(retiro.abierto)
  const montarEliminar = useAbiertoAlgunaVez(eliminacion.abierto)
  const escritura = useEscrituraDeTestimonios()

  return (
    <section className="grid gap-3" aria-label="Testimonios">
      <AccionesDeTestimonios alNuevo={apertura.abrirNueva} />
      {testimonios.length === 0 ? (
        SIN_TESTIMONIOS
      ) : (
        <ListaDeCatalogo
          filas={filasDeTestimonios(testimonios, {
            alEditar: apertura.abrirEdicion,
            alPublicar: (testimonio, publicado) => void escritura.publicar(testimonio, publicado),
            alRegistrarConsentimiento: consentimiento.abrir,
            alPedirRetirar: retiro.abrir,
            alPedirEliminar: eliminacion.abrir,
          })}
          prefijo={PREFIJO}
          columnaDeUso="Consentimiento"
          alAbrir={apertura.abrirEdicion}
          alMover={() => undefined}
        />
      )}
      {hayMas ? (
        <AvisoDeTope
          texto={textoDelTope(TOPE_DE_TESTIMONIOS, {
            sustantivo: 'testimonios',
            articulo: 'los',
            orden: 'primeros por orden',
          })}
        />
      ) : null}
      {montarPanel ? (
        <PanelDeTestimonioDiferido
          key={apertura.apertura}
          abierto={apertura.abierto}
          original={apertura.original}
          noDisponible={apertura.noDisponible}
          alGuardar={apertura.alCerrar}
          alCerrar={apertura.alCerrar}
        />
      ) : null}
      {montarConsentimiento && consentimiento.testimonio ? (
        <PanelDeConsentimientoDiferido
          key={consentimiento.apertura}
          abierto={consentimiento.abierto}
          testimonio={consentimiento.testimonio}
          alGuardar={consentimiento.cerrar}
          alCerrar={consentimiento.cerrar}
        />
      ) : null}
      {montarRetiro ? (
        <ConfirmarRetirarConsentimientoDiferido
          abierto={retiro.abierto}
          alCerrar={retiro.cerrar}
          testimonio={retiro.testimonio}
          alRetirar={escritura.retirar}
          focoAlCerrar={focoEnElMas(retiro.testimonio)}
        />
      ) : null}
      {montarEliminar ? (
        <ConfirmarEliminarTestimonioDiferido
          abierto={eliminacion.abierto}
          alCerrar={eliminacion.cerrar}
          testimonio={eliminacion.testimonio}
          alEliminar={escritura.eliminar}
          focoAlCerrar={focoEnElMas(eliminacion.testimonio)}
        />
      ) : null}
    </section>
  )
}

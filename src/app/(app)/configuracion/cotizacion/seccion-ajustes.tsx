import { leerAjustesDeCotizacion } from '@/modules/empresa'
import { FormularioDeAjustesDeCotizacion } from '@/modules/empresa/pantallas/configuracion-cotizacion'
import { datosO } from '@/shared/lib/errores'

// La pestaña «Ajustes»: la vigencia de las cotizaciones, una fila que siempre existe. Si no se puede leer, el `error.tsx` con «Reintentar»
// (nunca los de fábrica). La `key` es la versión: lo guardado, aquí o por otra persona, vuelve a montar el formulario desde la base. `puedeCambiar` lo pone la página.
export async function SeccionAjustes({
  puedeCambiar,
  puedeIrARoles,
}: {
  puedeCambiar: boolean
  puedeIrARoles: boolean
}) {
  const ajustes = datosO(await leerAjustesDeCotizacion())
  return (
    <FormularioDeAjustesDeCotizacion
      key={ajustes.actualizadoEn}
      ajustes={ajustes}
      puedeCambiar={puedeCambiar}
      puedeIrARoles={puedeIrARoles}
    />
  )
}

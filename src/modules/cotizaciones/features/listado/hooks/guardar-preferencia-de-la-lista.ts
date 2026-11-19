import {
  CLAVE_DE_AGRUPAR_COTIZACIONES,
  CLAVE_DE_VISTA_DE_COTIZACIONES,
  guardarPreferencia,
} from '@/modules/equipo/client'
import { avisarError } from '@/shared/ui/toasts'

type PreferenciaDeLaLista =
  { clave: 'vista'; valor: 'tabla' | 'tarjetas' } | { clave: 'agrupar'; valor: boolean }

// Guarda una preferencia de la lista de cotizaciones (`cotizaciones.vista` o `cotizaciones.agrupar`) con la action de `equipo`, que valida y escribe sólo en la fila
// de quien actúa. Si no se pudo guardar, la lista igual cambió en esta pestaña: sólo se avisa lo que la persona tiene que saber.
export function guardarPreferenciaDeLaLista(preferencia: PreferenciaDeLaLista): void {
  const pedido =
    preferencia.clave === 'vista'
      ? guardarPreferencia({ clave: CLAVE_DE_VISTA_DE_COTIZACIONES, valor: preferencia.valor })
      : guardarPreferencia({ clave: CLAVE_DE_AGRUPAR_COTIZACIONES, valor: preferencia.valor })
  void pedido
    .then((resultado) => {
      if (resultado.serverError) avisarError(resultado.serverError)
    })
    .catch(() => undefined)
}

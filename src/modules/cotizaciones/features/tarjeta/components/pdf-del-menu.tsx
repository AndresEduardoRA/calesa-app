'use client'

import { useEffect } from 'react'
import { avisarError } from '@/shared/ui/toasts'
import { textoDelFalloDelPdf } from '../../../entities/tarjeta/fallo-del-pdf'
import { useAporteAlMenu } from '../../hoja/components/menu-de-la-guardada/use-aporte-al-menu'
import { useDescargaDelPdf } from '../hooks/use-descarga-del-pdf'

// «Descargar PDF» en el «⋯» de la cabecera de una guardada: baja el PDF de lo guardado sin salir de la página (como el pie de «Vista previa»). Mientras baja, «Descargando…» y
// apagada; si falla, lo avisa y se vuelve a elegir para reintentar. No dibuja nada: sólo suma su línea.
export function PdfDelMenu({
  cotizacionId,
  numero,
}: {
  cotizacionId: string
  numero: number | null
}) {
  const { estado, descargar } = useDescargaDelPdf(cotizacionId, numero)
  const bajando = estado.tipo === 'bajando'
  useAporteAlMenu({
    pdf: {
      tipo: 'accion',
      ocupada: bajando,
      ...(bajando ? { etiqueta: 'Descargando…' } : {}),
      alElegir: descargar,
    },
  })
  // Cada fallo es un estado nuevo: se avisa una vez por intento.
  useEffect(() => {
    if (estado.tipo === 'fallo') {
      avisarError({ codigo: estado.codigo, mensaje: textoDelFalloDelPdf(estado.codigo) })
    }
  }, [estado])
  return null
}

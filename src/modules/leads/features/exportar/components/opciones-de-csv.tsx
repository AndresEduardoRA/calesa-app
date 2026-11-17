'use client'

import { DownloadIcon, UploadIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { CLASE_DE_OPCION, useVistaYOpciones } from '@/shared/ui/vista-y-opciones'

type Props = { puedeExportar: boolean; puedeImportar: boolean; alExportar: () => void }

// «Exportar…» e «Importar…», en el grupo «Más» de «Vista y opciones». Cada uno sólo con su permiso (`leads.exportar`, `leads.crear`); la base
// lo vuelve a decidir. «Exportar…» abre su diálogo cuando el panel terminó de cerrarse (el foco ya está en el botón, que queda como quien lo
// abrió); el diálogo vive en el listado, así `?panel=exportar` lo abre también con el panel cerrado.
export function OpcionesDeCsv({ puedeExportar, puedeImportar, alExportar }: Props) {
  const panel = useVistaYOpciones()
  return (
    <>
      {puedeExportar ? (
        <button
          type="button"
          className={CLASE_DE_OPCION}
          onClick={() => {
            panel.cerrarYLuego(alExportar)
          }}
        >
          <DownloadIcon aria-hidden />
          Exportar…
        </button>
      ) : null}
      {puedeImportar ? (
        <Link href={RUTAS.importarLeads as Route} className={CLASE_DE_OPCION}>
          <UploadIcon aria-hidden />
          Importar…
        </Link>
      ) : null}
    </>
  )
}

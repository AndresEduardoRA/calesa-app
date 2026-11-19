'use client'

import { useALaVista } from '@/shared/ui/use-a-la-vista'
import { ListaRecienteDiferida } from './diferidos'
import { FilasDelEsqueleto } from './esqueleto-de-actividad-reciente'
import { MarcoDeActividadReciente } from './marco-de-actividad-reciente'

type Props = {
  tabla: string
  registroId: string
  zona: string
  diasDeActividad: number
}

// «Actividad reciente» en una ficha larga (la del vehículo): el título y «Ver toda la actividad» llegan con la página; las filas se leen desde el
// navegador, con la sesión de quien mira, la primera vez que el bloque está a 200 px de la vista, y su código llega entonces (`diferido()`). Así no
// pesan en el documento. Quien la monta ya comprobó `actividad.ver` (y la base lo vuelve a mirar).
export function ActividadRecienteAlAcercarse(props: Props) {
  const [observar, visto] = useALaVista<HTMLDivElement>()
  return (
    <MarcoDeActividadReciente tabla={props.tabla} registroId={props.registroId}>
      <div ref={observar} className="min-w-0">
        {visto ? <ListaRecienteDiferida {...props} /> : <FilasDelEsqueleto />}
      </div>
    </MarcoDeActividadReciente>
  )
}

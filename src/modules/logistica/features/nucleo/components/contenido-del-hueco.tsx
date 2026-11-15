import { esUnidadDeVehiculo, type UnidadAbierta } from '../../../entities/nucleo/unidad'
import type { HuecoDeLaUnidad } from '../../../entities/nucleo/hueco'
import type { ReactNode } from 'react'
import { LimiteDelHueco } from './limite-del-hueco'

// Un vehículo dibuja el `componente` del hueco (las áreas que sólo tratan vehículos); un ítem, la `repuesto.componente` de su variante, y sin ella no dibuja nada.
function ComponenteDelHueco({ hueco, unidad }: { hueco: HuecoDeLaUnidad; unidad: UnidadAbierta }) {
  if (unidad.tipo === 'repuesto') {
    const Componente = hueco.repuesto?.componente
    return Componente === undefined ? null : <Componente unidad={unidad} />
  }
  return esUnidadDeVehiculo(unidad) ? <hueco.componente unidad={unidad} /> : null
}

// El contenido de un hueco, en su límite de error: si se rompe al dibujarse, lo dice ahí y el resto de la unidad sigue en pie. Lo comparten el panel (bloques) y la página (zonas).
export function ContenidoDelHueco({
  hueco,
  unidad,
}: {
  hueco: HuecoDeLaUnidad
  unidad: UnidadAbierta
}) {
  return (
    <LimiteDelHueco titulo={hueco.titulo}>
      <ComponenteDelHueco hueco={hueco} unidad={unidad} />
    </LimiteDelHueco>
  )
}

// Lo que se dibuja de un hueco, serializable de servidor a cliente: la clave, el título y su contenido ya armado (con su límite de error). La página lo reparte en zonas o en bloques sin dibujarlo dos veces.
export type SeccionDeLaUnidad = {
  clave: string
  titulo: string
  abiertoAlInicio?: boolean
  contenido: ReactNode
}

export function seccionesDeLaUnidad(
  unidad: UnidadAbierta,
  huecos: readonly HuecoDeLaUnidad[],
): SeccionDeLaUnidad[] {
  return huecos.map((hueco) => ({
    clave: hueco.clave,
    titulo: hueco.titulo,
    ...(hueco.abiertoAlInicio ? { abiertoAlInicio: true } : {}),
    contenido: <ContenidoDelHueco hueco={hueco} unidad={unidad} />,
  }))
}

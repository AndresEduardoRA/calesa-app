import type { HuecoDeLaUnidad } from '../../../entities/nucleo/hueco'
import type { UnidadAbierta } from '../../../entities/nucleo/unidad'
import { BloqueDelHueco } from './bloque-del-hueco'
import { ContenidoDelHueco } from './contenido-del-hueco'

// Los huecos como bloques plegables, uno bajo otro, en el orden recibido: el panel de un drawer y la página en el celular. Cada uno se monta al abrirse.
export function BloquesDeLaUnidad({
  unidad,
  huecos,
}: {
  unidad: UnidadAbierta
  huecos: readonly HuecoDeLaUnidad[]
}) {
  if (huecos.length === 0) return null
  return (
    <div className="grid gap-3">
      {huecos.map((hueco) => (
        <BloqueDelHueco
          key={hueco.clave}
          clave={hueco.clave}
          titulo={hueco.titulo}
          abiertoAlInicio={hueco.abiertoAlInicio}
        >
          <ContenidoDelHueco hueco={hueco} unidad={unidad} />
        </BloqueDelHueco>
      ))}
    </div>
  )
}

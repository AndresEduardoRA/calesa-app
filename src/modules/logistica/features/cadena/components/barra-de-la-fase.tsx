import { cn } from 'cn'
import {
  proporcionDeLaBarra,
  proporcionDelTramo,
  type FaseDelResumen,
} from '../../../entities/cadena/resumen'

type Props = {
  fase: FaseDelResumen
  // La cifra más alta de la cadena: el largo de la barra se mide contra ella.
  maximo: number
}

const porcentaje = (proporcion: number) => `${String(Math.round(proporcion * 1000) / 10)}%`

// La barra de una fase: la pista, el relleno con el color de la fase (largo = su cifra contra el máximo de la cadena) y, encima, el tramo de los demorados y el de los trabados (los trabados
// son demorados: van dentro). Sólo dibujo (`aria-hidden`): lo que dice el color lo dicen también el texto de la fase y su etiqueta. Sin animación propia.
export function BarraDeLaFase({ fase, maximo }: Props) {
  const largo = proporcionDeLaBarra(fase.vehiculos.n, maximo)
  const demorados =
    fase.demorados === null ? 0 : proporcionDelTramo(fase.demorados.n, fase.vehiculos.n)
  const trabados =
    fase.trabados === null ? 0 : proporcionDelTramo(fase.trabados.n, fase.vehiculos.n)
  return (
    <div aria-hidden className="h-2 w-full overflow-hidden rounded-full bg-(--viz-pista)">
      <div
        className="relative h-full rounded-full"
        style={{
          width: porcentaje(largo),
          backgroundColor: fase.color ?? 'var(--viz-series-1)',
        }}
      >
        <span
          className={cn('absolute inset-y-0 left-0 bg-(--viz-aviso)', demorados === 0 && 'hidden')}
          style={{ width: porcentaje(demorados) }}
        />
        <span
          className={cn('absolute inset-y-0 left-0 bg-(--viz-critico)', trabados === 0 && 'hidden')}
          style={{ width: porcentaje(trabados) }}
        />
      </div>
    </div>
  )
}

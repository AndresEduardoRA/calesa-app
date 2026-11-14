import {
  cadenaSinVehiculos,
  maximoDeLaCadena,
  type ResumenDeLaCadena,
} from '../../../entities/cadena/resumen'
import { FaseDeLaGrafica } from './fase-de-la-grafica'
import { LeyendaDeLaGrafica } from './leyenda-de-la-grafica'

type Props = {
  resumen: ResumenDeLaCadena
  origenId: string
}

// La cadena de un origen como gráfica: una línea de recorrido con una fase por punto (una `<ol>`, porque es una secuencia de verdad), cada una con cuántos vehículos tiene y cuántos están
// demorados o trabados. Server Component, sin JS propio. Los números son conteos con tope («1.000+»), nunca un total.
export function GraficaDeLaCadena({ resumen, origenId }: Props) {
  const maximo = maximoDeLaCadena(resumen)
  return (
    <div className="grid gap-3">
      <LeyendaDeLaGrafica />
      <ol className="grid">
        {resumen.fases.map((fase) => (
          <FaseDeLaGrafica
            key={fase.faseId ?? 'sin_fase'}
            fase={fase}
            origenId={origenId}
            maximo={maximo}
          />
        ))}
      </ol>
      {cadenaSinVehiculos(resumen) ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Todavía no hay vehículos en la cadena de este origen.
        </p>
      ) : null}
    </div>
  )
}

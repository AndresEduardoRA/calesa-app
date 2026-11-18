import { Button } from '@/shared/ui/button'
import { MasAcciones } from '@/shared/ui/lista'
import { tintaDeLaTarjeta } from '../../../entities/colores'
import { TEMAS_DE_UN_TONO, type Tono } from '../../../entities/diseno/tonos'
import { MuestraDeColor } from './muestra-de-color'
import { MuestraDelHex } from './muestra-del-hex'

type Props = {
  tono: Tono
  alEditar: (id: string) => void
  alPedirEliminar: (id: string) => void
}

const BOTON = 'h-11 md:h-8'

// El «⋯» de un color: se busca por él para devolverle el foco al cerrar la confirmación de eliminar.
export const idDelMenuDeColor = (id: string) => `color-${id}`

// Un color del catálogo: su nombre, su clave en texto suave (la nombran los grupos de una fórmula y no cambia), el hex como lo pinta la tarjeta y sus dos muestras
// de la hoja; «Editar» a la vista y «Eliminar» en el «⋯» (menos ruido: una acción principal por fila). Al 200 % la fila se apila (`flex-wrap` sobre una base en rem).
export function FilaDeColor({ tono, alEditar, alPedirEliminar }: Props) {
  return (
    <li
      data-color={tono.clave}
      className="min-w-0 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="grid min-w-0 flex-1 basis-48 gap-0.5">
          <span className="truncate font-medium text-(--color-ink)" title={tono.nombre}>
            {tono.nombre}
          </span>
          <span className="truncate text-(length:--text-sm) text-(--color-ink-faint)">
            {tono.clave}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <MuestraDelHex
            hex={tono.hex}
            tinta={tintaDeLaTarjeta(tono.hex, tono.colores.claro.tinta)}
          />
          {TEMAS_DE_UN_TONO.map((tema) => (
            <MuestraDeColor key={tema} tema={tema} colores={tono.colores[tema]} />
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            className={BOTON}
            data-editar-color={tono.id}
            aria-label={`Editar «${tono.nombre}»`}
            onClick={() => {
              alEditar(tono.id)
            }}
          >
            Editar
          </Button>
          <MasAcciones
            nombre={`«${tono.nombre}»`}
            id={idDelMenuDeColor(tono.id)}
            acciones={[
              {
                tipo: 'accion',
                clave: 'eliminar',
                etiqueta: 'Eliminar',
                destructiva: true,
                despuesDeCerrar: true,
                alElegir: () => {
                  alPedirEliminar(tono.id)
                },
              },
            ]}
          />
        </div>
      </div>
    </li>
  )
}

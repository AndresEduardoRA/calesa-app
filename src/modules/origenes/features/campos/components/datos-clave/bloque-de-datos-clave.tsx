'use client'

import { TOPE_DE_DATOS_CLAVE } from '../../../../entities/datos-clave'
import { MOTIVO_DATOS_CLAVE_VACIOS } from '../../../../entities/datos-clave-edicion'
import { FilaDeDatoClave, type DatoClaveDeLaLista } from './fila-de-dato-clave'

type Props = {
  datos: readonly DatoClaveDeLaLista[]
  // Por qué los controles están apagados (sin permiso, o ya hay 4 para las estrellas), visible y con su id para `aria-describedby`.
  motivo: string | null
  idDelMotivo: string
  // Sin permiso o con un cambio en vuelo: subir, bajar y quitar no hacen nada.
  apagado: boolean
  alMover: (indice: number, sentido: 'subir' | 'bajar') => void
  alQuitar: (indice: number) => void
}

// «Datos clave (n de 4)»: los que la ficha de un vehículo de este origen muestra primero, en orden, con «Subir», «Bajar» y «Quitar» (el
// teclado ordena sin arrastrar). Se guardan al instante.
export function BloqueDeDatosClave(props: Props) {
  const { datos, motivo, idDelMotivo, apagado, alMover, alQuitar } = props
  return (
    <section aria-labelledby="datos-clave-titulo" className="grid gap-2">
      <h2
        id="datos-clave-titulo"
        className="text-(length:--text-lg) font-medium text-(--color-ink)"
      >
        {`Datos clave (${String(datos.length)} de ${String(TOPE_DE_DATOS_CLAVE)})`}
      </h2>
      {motivo === null ? null : (
        <p id={idDelMotivo} className="text-(length:--text-sm) text-(--color-ink-soft)">
          {motivo}
        </p>
      )}
      {datos.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {MOTIVO_DATOS_CLAVE_VACIOS}
        </p>
      ) : (
        <ol className="divide-y divide-(--color-line) overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
          {datos.map((dato, indice) => (
            <FilaDeDatoClave
              key={dato.llave}
              dato={dato}
              posicion={indice + 1}
              esPrimero={indice === 0}
              esUltimo={indice === datos.length - 1}
              apagado={apagado}
              describir={apagado && motivo !== null ? idDelMotivo : undefined}
              alSubir={() => {
                alMover(indice, 'subir')
              }}
              alBajar={() => {
                alMover(indice, 'bajar')
              }}
              alQuitar={() => {
                alQuitar(indice)
              }}
            />
          ))}
        </ol>
      )}
    </section>
  )
}

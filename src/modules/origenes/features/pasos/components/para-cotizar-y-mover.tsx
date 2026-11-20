import type { Route } from 'next'
import Link from 'next/link'
import type { EstadoDePaso } from '../../../entities/pasos'
import { IconoDelPaso } from './icono-del-paso'

// Un paso ya con su destino (lo resuelve `src/app`, que conoce las pestañas y los permisos): sin permiso, `motivo` y sin enlace.
export type PasoDeLaTira = {
  clave: string
  titulo: string
  estado: EstadoDePaso
  frase: string
  ruta: string
  motivo: string | null
}

type Props = { pasos: readonly PasoDeLaTira[] } | { inactivo: true }

// «Para cotizar y mover»: lo que le falta a un origen, en una fila de cinco pasos (ícono, nombre y una frase corta) que en el celular se
// parte en dos columnas. Cada paso lleva a su pestaña; sin el permiso, se dice el motivo debajo, sin enlace. Un origen inactivo dice sólo
// «Inactivo». Sin JS: es del servidor.
export function ParaCotizarYMover(props: Props) {
  return (
    <section aria-labelledby="para-cotizar-titulo" className="grid gap-2">
      <h2
        id="para-cotizar-titulo"
        className="text-(length:--text-sm) font-medium text-(--color-ink-soft)"
      >
        Para cotizar y mover
      </h2>
      {'inactivo' in props ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Inactivo: no recibe vehículos ni cotizaciones nuevos.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {props.pasos.map((paso) => (
            <li key={paso.clave} className="min-w-0">
              <Paso paso={paso} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const CAJA =
  'flex h-full min-w-0 items-start gap-2 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-3 py-2'

function Contenido({ paso }: { paso: PasoDeLaTira }) {
  return (
    <>
      <IconoDelPaso estado={paso.estado} />
      <span className="grid min-w-0 gap-0.5">
        <span className="text-(length:--text-sm) font-medium text-(--color-ink)">
          {paso.titulo}
        </span>
        <span className="text-(length:--text-xs) break-words text-(--color-ink-soft)">
          {paso.frase}
        </span>
        {paso.motivo === null ? null : (
          <span className="text-(length:--text-xs) break-words text-(--color-ink-faint)">
            {paso.motivo}
          </span>
        )}
      </span>
    </>
  )
}

function Paso({ paso }: { paso: PasoDeLaTira }) {
  if (paso.motivo !== null) {
    return (
      <div className={CAJA}>
        <Contenido paso={paso} />
      </div>
    )
  }
  return (
    <Link
      // La ruta la declara `src/app` y un test comprueba que existe.
      href={paso.ruta as Route}
      className={`${CAJA} outline-none hover:border-(--color-line-strong) hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus)`}
    >
      <Contenido paso={paso} />
    </Link>
  )
}

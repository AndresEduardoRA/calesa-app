import type { Route } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { formatearNumero } from '@/shared/lib/formato'
import { TOPE_DEL_EQUIPO } from '@/shared/lib/paginacion'
import { RUTAS } from '@/shared/lib/rutas'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { EstadoVacio } from '@/shared/ui/estados'
import { MOTIVO_FUERA, ordenDeLaRueda } from '../../../../entities/cola/orden-de-la-rueda'
import {
  agruparTablero,
  TEXTO_CUENTA_INACTIVA,
  TEXTO_EN_LA_RUEDA,
  TEXTO_HABILITADA_SIN_ROL,
  type FilaDelTablero,
  type Tablero,
} from '../../../../entities/cola/tablero'
import { FilaDeLaRueda } from './fila-de-la-rueda'
import { SeccionDeLaCola } from './seccion-de-la-cola'

type Props = {
  tablero: Tablero
  // Quien mira puede abrir Roles: el grupo aparte lleva el enlace.
  puedeVerRoles: boolean
  // La acción principal de la sección, junto a su título («Agregar a la rueda»).
  accion?: ReactNode
}

const LISTA = 'grid grid-cols-[minmax(0,1fr)] gap-2'

// «En la rueda»: quién recibe los turnos y, debajo, las habilitadas que hoy no pueden recibirlos: por su rol (ninguno tiene «Recibir turnos de la web») o
// por su cuenta. Las de la rueda van numeradas en el orden de la ruleta (`ordenDeLaRueda`, espejo de la base: el número no promete el próximo turno) y, al
// final, las que hoy no reciben uno nuevo, con su motivo. Los dos grupos aparte son parte de la sección, con su propio título.
export function RuedaDeLaCola({ tablero, puedeVerRoles, accion }: Props) {
  const grupos = agruparTablero(tablero.filas)
  const { elegibles, fuera } = ordenDeLaRueda(grupos.rueda)
  return (
    <SeccionDeLaCola
      id="rueda-titulo"
      titulo={TEXTO_EN_LA_RUEDA}
      descripcion="Quién recibe los turnos, en el orden de la ruleta."
      accion={accion}
      className="gap-4"
    >
      {tablero.hayMas ? (
        <AvisoDeTope
          texto={`Mostrando las primeras ${formatearNumero(TOPE_DEL_EQUIPO)} habilitadas, por nombre.`}
        />
      ) : null}
      {elegibles.length === 0 && fuera.length === 0 ? (
        <EstadoVacio compacto titulo="Nadie en la rueda." />
      ) : (
        <>
          {elegibles.length > 0 ? (
            <ol className={LISTA}>
              {elegibles.map((fila, i) => (
                <FilaDeLaRueda key={fila.usuarioId} fila={fila} puesto={i + 1} />
              ))}
            </ol>
          ) : null}
          {fuera.length > 0 ? (
            <ul className={LISTA}>
              {fuera.map(({ fila, motivo }) => (
                <FilaDeLaRueda
                  key={fila.usuarioId}
                  fila={fila}
                  motivo={`Hoy no recibe turnos nuevos: ${MOTIVO_FUERA[motivo]}.`}
                />
              ))}
            </ul>
          ) : null}
        </>
      )}
      <GrupoAparte id="sin-rol-titulo" titulo={TEXTO_HABILITADA_SIN_ROL} filas={grupos.porRol}>
        Están habilitadas, pero ningún rol suyo tiene «Recibir turnos de la web».{' '}
        {puedeVerRoles ? (
          <Link href={RUTAS.roles as Route} className="underline">
            Se cambia en Roles.
          </Link>
        ) : (
          'Se cambia en Roles.'
        )}
      </GrupoAparte>
      <GrupoAparte id="cuenta-titulo" titulo={TEXTO_CUENTA_INACTIVA} filas={grupos.porCuenta}>
        Su cuenta está bloqueada o dada de baja: no recibe turnos aunque siga habilitada.
      </GrupoAparte>
    </SeccionDeLaCola>
  )
}

type PropsDeGrupo = {
  id: string
  titulo: string
  filas: readonly FilaDelTablero[]
  children: ReactNode
}

// Un grupo aparte sólo se dibuja si tiene a alguien.
function GrupoAparte({ id, titulo, filas, children }: PropsDeGrupo) {
  if (filas.length === 0) {
    return null
  }
  return (
    <section aria-labelledby={id} className="grid gap-3 border-t border-(--color-line) pt-4">
      <div className="grid gap-1">
        <h3 id={id} className="text-(length:--text-base) font-medium text-(--color-ink)">
          {titulo}
        </h3>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{children}</p>
      </div>
      <ul className={LISTA}>
        {filas.map((fila) => (
          <FilaDeLaRueda key={fila.usuarioId} fila={fila} />
        ))}
      </ul>
    </section>
  )
}

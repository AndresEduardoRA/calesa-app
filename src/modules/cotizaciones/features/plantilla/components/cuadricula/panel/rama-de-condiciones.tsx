'use client'

import type { RamaEnBorrador } from '../../../../../entities/plantilla/edicion/borradores-de-la-celda'
import type { Motivos } from '../../../../../entities/plantilla/edicion/condiciones'
import type { ContextoDePlantilla } from '../../../../../entities/plantilla/validar-plantilla'
import { ListaDeCondiciones, operacionesDeLasCondiciones } from './lista-de-condiciones'
import { MenuDelBloque } from './menu-del-bloque'
import { MostrarDeLaRama } from './mostrar-de-la-rama'

type Props = {
  indice: number
  total: number
  rama: RamaEnBorrador
  motivos: Motivos
  // Por qué no se puede quitar (la única rama), o nulo.
  motivoParaQuitar: string | null
  contexto: ContextoDePlantilla
  nombrados: ReadonlySet<string>
  clave: string
  // El selector del dato de su contenido, abierto.
  abierto: boolean
  alAbrir: (abierto: boolean) => void
  alCambiar: (rama: RamaEnBorrador, clave?: string) => void
  alMover: (hacia: -1 | 1) => void
  alQuitar: () => void
}

// Una rama de las condiciones: «Si» (la primera) o «Si no, si», sus condiciones con «Y además…» y «Mostrar». Un bloque con separador, no una tarjeta; lo demás en su
// «⋯» (subir, bajar, quitar una condición, quitar la rama).
export function RamaDeCondiciones({
  indice: j,
  total,
  rama,
  motivos,
  motivoParaQuitar,
  contexto,
  nombrados,
  clave,
  abierto,
  alAbrir,
  alCambiar,
  alMover,
  alQuitar,
}: Props) {
  const titulo = j === 0 ? 'Si' : 'Si no, si'
  const lugar = `ramas.${String(j)}`
  return (
    <section
      aria-label={`Rama ${String(j + 1)}: ${titulo}`}
      className={`grid min-w-0 gap-2 ${j === 0 ? '' : 'border-t border-(--color-line) pt-3'}`}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <h5 className="font-medium">{titulo}</h5>
        <MenuDelBloque
          etiqueta={`Más acciones de la rama ${String(j + 1)}`}
          operaciones={[
            {
              texto: 'Subir',
              motivo: j === 0 ? 'Ya es la primera.' : null,
              alHacer: () => {
                alMover(-1)
              },
            },
            {
              texto: 'Bajar',
              motivo: j === total - 1 ? 'Ya es la última antes del «si no».' : null,
              alHacer: () => {
                alMover(1)
              },
            },
            ...operacionesDeLasCondiciones(rama.si, (si) => {
              alCambiar({ ...rama, si })
            }),
            { texto: 'Quitar la rama', motivo: motivoParaQuitar, alHacer: alQuitar },
          ]}
        />
      </div>
      <ListaDeCondiciones
        si={rama.si}
        lugar={`${lugar}.si`}
        motivos={motivos}
        contexto={contexto}
        nombrados={nombrados}
        clave={clave}
        alCambiar={(si, k) => {
          alCambiar({ ...rama, si }, k)
        }}
      />
      <MostrarDeLaRama
        etiqueta="Mostrar"
        contenido={rama.contenido}
        motivo={motivos.get(`${lugar}.contenido`) ?? null}
        contexto={contexto}
        nombrados={nombrados}
        abierto={abierto}
        alAbrir={() => {
          alAbrir(true)
        }}
        alCerrar={() => {
          alAbrir(false)
        }}
        clave={`${clave}:${lugar}.contenido`}
        alCambiar={(contenido, k) => {
          alCambiar({ ...rama, contenido }, k)
        }}
      />
    </section>
  )
}

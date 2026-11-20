'use client'

import { useState } from 'react'
import type { ContenidoDeLaCelda } from '../../../../../entities/cuadricula-de-la-tarjeta'
import {
  borradorDeRespaldo,
  cambiarEn,
  completarRespaldo,
  motivoParaQuitarDato,
  motivoParaSumarDato,
  moverEn,
  quitarDato,
  sumarDato,
  type RespaldoEnBorrador,
} from '../../../../../entities/plantilla/edicion/borradores-de-la-celda'
import type { ContextoDePlantilla } from '../../../../../entities/plantilla/validar-plantilla'
import { useBorradorDeLaRegla } from '../../../hooks/use-borrador-de-la-regla'
import { BotonDeAgregar } from './boton-de-agregar'
import { CLASE_DEL_MOTIVO, DatoElegible } from './dato-elegible'
import { MenuDelBloque, type OperacionDelBloque } from './menu-del-bloque'
import { SinTerminar } from './sin-terminar'

type Props = {
  contenido: ContenidoDeLaCelda | null
  contexto: ContextoDePlantilla
  nombrados: ReadonlySet<string>
  alCambiar: (contenido: ContenidoDeLaCelda) => void
}

// El «⋯» de un dato de la lista: subir, bajar, cambiar el dato y quitar.
function operacionesDelDato(
  i: number,
  b: RespaldoEnBorrador,
  hacer: { mover: (hacia: -1 | 1) => void; abrir: () => void; quitar: () => void },
): OperacionDelBloque[] {
  return [
    {
      texto: 'Subir',
      motivo: i === 0 ? 'Ya es el primero.' : null,
      alHacer: () => hacer.mover(-1),
    },
    {
      texto: 'Bajar',
      motivo: i === b.datos.length - 1 ? 'Ya es el último.' : null,
      alHacer: () => hacer.mover(1),
    },
    { texto: 'Cambiar el dato', motivo: null, alHacer: hacer.abrir },
    { texto: 'Quitar', motivo: motivoParaQuitarDato(b), alHacer: hacer.quitar },
  ]
}

// «El primero con valor» (glosario: «Lista de respaldo»): de 2 a 5 datos en orden; la tarjeta muestra el primero que tiene valor. Cada dato con su «⋯» (subir, bajar,
// cambiar, quitar) y debajo «Agregar un dato». Lo que falta queda aquí con su motivo y la celda no cambia hasta completarla.
export function ListaDeRespaldo({ contenido, contexto, nombrados, alCambiar }: Props) {
  const { borrador, cambiar, motivos, completo } = useBorradorDeLaRegla<
    RespaldoEnBorrador,
    ContenidoDeLaCelda | null
  >({
    valor: contenido,
    derivar: borradorDeRespaldo,
    completar: completarRespaldo,
    alCompletar: (v) => {
      if (v !== null) alCambiar(v)
    },
  })
  const [abierto, setAbierto] = useState<number | null>(null)
  const { datos } = borrador
  return (
    <div className="grid min-w-0 gap-2" data-lista-de-respaldo="">
      {completo ? null : <SinTerminar />}
      <p className="text-(length:--text-xs) text-(--color-ink-soft)">
        La celda muestra el primero que tenga valor.
      </p>
      <ol className="grid min-w-0 gap-2">
        {datos.map((d, i) => (
          // Los datos no tienen id propio: su lugar es su clave (mover cierra el selector).

          <li key={i} className="min-w-0 border-b border-(--color-line) pb-2">
            <DatoElegible
              etiqueta={`Dato ${String(i + 1)}`}
              dato={d}
              contexto={contexto}
              nombrados={nombrados}
              abierto={abierto === i}
              alAbrir={() => {
                setAbierto(i)
              }}
              alCerrar={() => {
                setAbierto(null)
              }}
              alElegir={(elegido) => {
                cambiar({ datos: cambiarEn(datos, i, elegido) })
              }}
              motivo={motivos.get(`datos.${String(i)}`) ?? null}
              accesorio={
                <MenuDelBloque
                  etiqueta={`Más acciones del dato ${String(i + 1)}`}
                  operaciones={operacionesDelDato(i, borrador, {
                    mover: (hacia) => {
                      setAbierto(null)
                      cambiar({ datos: moverEn(datos, i, hacia) })
                    },
                    abrir: () => {
                      setAbierto(i)
                    },
                    quitar: () => {
                      setAbierto(null)
                      cambiar(quitarDato(borrador, i))
                    },
                  })}
                />
              }
            />
          </li>
        ))}
      </ol>
      {motivos.has('datos') ? <p className={CLASE_DEL_MOTIVO}>{motivos.get('datos')}</p> : null}
      <BotonDeAgregar
        texto="Agregar un dato"
        motivo={motivoParaSumarDato(borrador)}
        alAgregar={() => {
          setAbierto(datos.length)
          cambiar(sumarDato(borrador))
        }}
      />
    </div>
  )
}

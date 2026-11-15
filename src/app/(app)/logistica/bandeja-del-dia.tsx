import { connection } from 'next/server'
import {
  gruposVisibles,
  estadoDeLaBandeja,
  leerGrupoDeLaBandeja,
  type GrupoDeLaBandeja,
  type GrupoDeLaBandejaLeido,
} from '@/modules/logistica'
import { BandejaDelDia } from '@/modules/logistica/pantallas/alertas'
import { fallo, MENSAJE_INESPERADO } from '@/shared/lib/errores'
import { PRIMERAS_DE_LA_BANDEJA } from '@/shared/lib/paginacion'
import type { Permisos } from '@/shared/lib/permisos'
import { contextoDeLaBandeja } from './contexto-de-la-bandeja'
import { MarcasDeLogistica } from './marcas-de-logistica'

// Un grupo con sus primeras filas y el conteo hasta 100. Un fallo (de red o de forma) queda en ese grupo: los demás se dibujan igual.
async function leerElGrupo(grupo: GrupoDeLaBandeja): Promise<GrupoDeLaBandejaLeido> {
  try {
    return {
      grupo,
      resultado: await leerGrupoDeLaBandeja({
        grupo,
        tope: PRIMERAS_DE_LA_BANDEJA,
        conConteo: true,
        cursor: null,
      }),
    }
  } catch {
    return { grupo, resultado: fallo('inesperado', MENSAJE_INESPERADO) }
  }
}

// La bandeja del día de la portada: una lectura por grupo que ve quien mira, todas en paralelo y cada una con su error aparte.
export async function BandejaDeLaPortada({ permisos }: { permisos: Permisos }) {
  await connection()
  const [leidos, contexto] = await Promise.all([
    Promise.all(gruposVisibles(permisos).map(leerElGrupo)),
    contextoDeLaBandeja(permisos),
  ])
  // Los vehículos de los grupos que se leyeron (a lo sumo 7 grupos de 5): su «visto» es el de `/logistica/vehiculo/[id]`.
  const ids = leidos.flatMap((leido) =>
    leido.resultado.ok ? leido.resultado.data.filas.map((fila) => fila.vehiculoId) : [],
  )
  return (
    <MarcasDeLogistica ids={ids}>
      <BandejaDelDia
        estado={estadoDeLaBandeja(leidos)}
        permisos={permisos}
        ahora={new Date()}
        zona={contexto.zona}
        origenes={contexto.origenes}
      />
    </MarcasDeLogistica>
  )
}

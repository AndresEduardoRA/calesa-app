import { Suspense, type ReactNode } from 'react'
import { rutaDeLaFormula, rutaDeParteDelOrigen, type ParteDeLaFormula } from '@/shared/lib/rutas'
import {
  CaminoDeLaEdicion,
  EdicionAPantallaCompleta,
} from '@/shared/ui/edicion-a-pantalla-completa'
import { Skeleton } from '@/shared/ui/skeleton'
import { abrirFormula } from './abrir-formula'

type Props = {
  origenId: string
  formulaId: string
  parte: ParteDeLaFormula
  // «Planilla», «Hoja» o «Tarjeta»: el `h1` de la barra, fijo (se ve aunque el resto espere).
  titulo: string
  children: ReactNode
}

// La edición a pantalla completa de una parte de la fórmula (`?editar=si`): la barra con «‹ Salir» (a la misma parte, sin el modo), el camino origen › fórmula › y
// el título. El camino lee el origen y la fórmula tras su `<Suspense>` (`abrirFormula()` va con `cache`: la misma lectura que la página).
export function EdicionDeLaFormula({ origenId, formulaId, parte, titulo, children }: Props) {
  return (
    <EdicionAPantallaCompleta
      salirA={rutaDeLaFormula(origenId, formulaId, parte)}
      titulo={titulo}
      camino={
        <Suspense fallback={<Skeleton className="h-4 w-48" />}>
          <CaminoDeLaFormula origenId={origenId} formulaId={formulaId} />
        </Suspense>
      }
    >
      {children}
    </EdicionAPantallaCompleta>
  )
}

async function CaminoDeLaFormula({ origenId, formulaId }: { origenId: string; formulaId: string }) {
  const abierto = await abrirFormula(origenId, formulaId)
  if (abierto.tipo !== 'abierto') {
    return null
  }
  return (
    <CaminoDeLaEdicion
      pasos={[
        { nombre: abierto.origen.nombre, ruta: rutaDeParteDelOrigen(abierto.origen.id, 'datos') },
        {
          nombre: abierto.formula.nombre,
          ruta: rutaDeLaFormula(abierto.origen.id, abierto.formula.id, 'planilla'),
        },
      ]}
    />
  )
}

// La plantilla de V1 con las claves de color que quedan en el catálogo (`coloresDeLaPlantilla()`): reescribe el tono de cada grupo de la fórmula, el de la
// cabecera y las secciones del diseño y el fondo y el texto de cada celda de la tarjeta. Lo demás no cambia. Pura.
import type { PlantillaDeV1 } from './tipos'

type Piezas = Pick<PlantillaDeV1, 'formula' | 'tarjeta'>

export function plantillaConClaves<P extends Piezas>(
  plantilla: P,
  mapa: Readonly<Record<string, string>>,
): P {
  const clave = (x: string) => (Object.hasOwn(mapa, x) ? (mapa[x] ?? x) : x)
  const talVez = (x: string | undefined) => (x === undefined ? undefined : clave(x))
  const { definicion, diseno } = plantilla.formula
  return {
    ...plantilla,
    formula: {
      ...plantilla.formula,
      definicion: {
        ...definicion,
        ...(definicion.grupos === undefined
          ? {}
          : { grupos: definicion.grupos.map((g) => ({ ...g, tono: clave(g.tono) })) }),
      },
      diseno: {
        ...diseno,
        cabecera:
          diseno.cabecera.tono === undefined
            ? diseno.cabecera
            : { ...diseno.cabecera, tono: clave(diseno.cabecera.tono) },
        secciones: diseno.secciones.map((s) =>
          s.tono === undefined ? s : { ...s, tono: clave(s.tono) },
        ),
      },
    },
    tarjeta: {
      ...plantilla.tarjeta,
      celdas: plantilla.tarjeta.celdas.map((c) => {
        if (c.estilo === undefined) return c
        const { fondo, texto, ...resto } = c.estilo
        const f = talVez(fondo)
        const t = talVez(texto)
        return {
          ...c,
          estilo: {
            ...resto,
            ...(f === undefined ? {} : { fondo: f }),
            ...(t === undefined ? {} : { texto: t }),
          },
        }
      }),
    },
  }
}

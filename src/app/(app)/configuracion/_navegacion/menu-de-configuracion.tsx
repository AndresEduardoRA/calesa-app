import type { LucideIcon } from 'lucide-react'
import type { GrupoDelNavegador } from '../secciones'
import { EnlaceDelMenu } from './enlace-del-menu'
import { marcaDe } from './marca'
import { SubseccionesDelMenu } from './subsecciones-del-menu'

// El menú de Configuración, en tres niveles que no se confunden: el grupo es un rótulo en mayúscula chica (no es un enlace); la sección,
// un renglón con su ícono; y sólo la sección abierta despliega sus sub-secciones, sangradas y con su línea guía (se esconden por CSS mientras su
// sección no está marcada; en Orígenes, un renglón por origen). La sub-sección índice se marca sólo en
// su ruta; la que no se puede abrir va apagada con su motivo. Los rótulos no son encabezados: la página pone su `h1` después.
export function MenuDeConfiguracion({
  grupos,
  iconos,
}: {
  grupos: readonly GrupoDelNavegador[]
  // Los íconos de las secciones por clave, que se dibujan aquí y cruzan al navegador ya hechos.
  iconos: Readonly<Record<string, LucideIcon>>
}) {
  return (
    <nav aria-label="Secciones de Configuración" className="grid content-start gap-5">
      {grupos.map((grupo) => {
        const idDelTitulo = `grupo-de-configuracion-${grupo.clave}`
        return (
          <div key={grupo.clave} className="grid gap-1">
            <p
              id={idDelTitulo}
              className="px-2.5 text-(length:--text-xs) font-semibold tracking-wide text-(--color-ink-soft) uppercase"
            >
              {grupo.titulo}
            </p>
            <ul aria-labelledby={idDelTitulo} className="grid gap-0.5">
              {grupo.secciones.map((seccion) => {
                const Icono = iconos[seccion.clave]
                return (
                  <li
                    key={seccion.clave}
                    className="grid gap-0.5 [&:not(:has(>a[aria-current]))>ul]:hidden"
                  >
                    <EnlaceDelMenu
                      ruta={seccion.ruta}
                      subrutas={seccion.subsecciones.map(marcaDe)}
                      titulo={seccion.titulo}
                      nivel="seccion"
                      icono={Icono ? <Icono aria-hidden className="size-4 shrink-0" /> : null}
                    />
                    {seccion.subsecciones.length > 0 ? (
                      <SubseccionesDelMenu
                        claveDeSeccion={seccion.clave}
                        rutaDeSeccion={seccion.ruta}
                        subsecciones={seccion.subsecciones}
                      />
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}

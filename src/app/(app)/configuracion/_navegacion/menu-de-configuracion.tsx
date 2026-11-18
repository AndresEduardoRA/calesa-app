import type { GrupoDelNavegador } from '../secciones'
import { EnlaceDelMenu } from './enlace-del-menu'
import { SubseccionesDelMenu } from './subsecciones-del-menu'

// El menú de Configuración: las secciones que la persona puede abrir, por grupo, y debajo de la sección actual sus sub-secciones (se
// esconden por CSS mientras su sección no está marcada; una plantilla, como las partes de un origen, se rellena con la ruta actual). La
// sub-sección índice se marca sólo en su ruta; la que no se puede abrir va apagada con su motivo. Los títulos de grupo no son
// encabezados: la página pone su `h1` después.
export function MenuDeConfiguracion({ grupos }: { grupos: readonly GrupoDelNavegador[] }) {
  return (
    <nav aria-label="Secciones de Configuración" className="grid content-start gap-4">
      {grupos.map((grupo) => {
        const idDelTitulo = `grupo-de-configuracion-${grupo.clave}`
        return (
          <div key={grupo.clave} className="grid gap-1">
            <p
              id={idDelTitulo}
              className="px-2.5 text-(length:--text-xs) font-medium text-(--color-ink-soft)"
            >
              {grupo.titulo}
            </p>
            <ul aria-labelledby={idDelTitulo} className="grid gap-0.5">
              {grupo.secciones.map((seccion) => (
                <li
                  key={seccion.clave}
                  className="grid gap-0.5 [&:not(:has(>a[aria-current]))>ul]:hidden"
                >
                  <EnlaceDelMenu
                    ruta={seccion.ruta}
                    subrutas={seccion.subsecciones.map((sub) => sub.ruta)}
                    titulo={seccion.titulo}
                  />
                  {seccion.subsecciones.length > 0 ? (
                    <SubseccionesDelMenu
                      claveDeSeccion={seccion.clave}
                      rutaDeSeccion={seccion.ruta}
                      subsecciones={seccion.subsecciones}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}

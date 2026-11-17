import type { ReactNode } from 'react'

// Un grupo de «Vista y opciones»: un título y el control que pone el módulo, ya filtrado por permisos (`docs/GLOSARIO.md`).
export type GrupoDeVistaYOpciones = {
  // Estable: `key` del grupo y parte del id de su título.
  clave: string
  // «Vista», «Qué leads ver», «Ítems por página», «Vistas guardadas», «Embudo», «Qué ver», «Más».
  titulo: string
  // El control del módulo, tal cual (con su `aria` y lo que miran los e2e).
  contenido: ReactNode
  // Lo que el botón dice de este grupo («Lista», «Todos», «25 por página»). Sin esto, el botón no lo nombra.
  resumen?: string
  // Sin red: `apagar` (por defecto) deja el grupo `inert` y atenuado, porque navegaría a medias; `sigue`, para lo que ya sabe esperar la red.
  sinRed?: 'apagar' | 'sigue'
}

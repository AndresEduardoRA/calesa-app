import type { VistaGuardada } from '@/modules/equipo/client'
import type { EsquemaDeFiltros } from '@/shared/lib/filtros'
import type { GrupoDeVistaYOpciones } from '@/shared/ui/filtros'
import type { ModoDelListado } from '../../../entities/alcance'
import { ConmutadorDeVista } from '../../embudo/components/conmutador-de-vista'
import { OpcionesDeCsv } from '../../exportar/components/opciones-de-csv'
import { EnlaceAPapeleraDeLeads } from '../../papelera/components/enlace-a-papelera'
import { SelectorDeAlcance } from './selector-de-alcance'
import { VistasDeLeads } from './vistas-de-leads'

type Datos = {
  esquema: EsquemaDeFiltros
  vistas: readonly VistaGuardada[]
  modo: ModoDelListado
  puedeVerTodos: boolean
  puedeExportar: boolean
  puedeCrear: boolean
  puedeAbrirPapelera: boolean
  alExportar: () => void
}

// Los grupos de «Vista y opciones» del listado de leads: la vista, el alcance, las vistas guardadas y «Más» (CSV y papelera), cada uno sólo
// para quien puede. «Ítems por página» lo suma `FilterShell`.
export function opcionesDelListado(datos: Datos): GrupoDeVistaYOpciones[] {
  const { modo, puedeVerTodos, puedeExportar, puedeCrear, puedeAbrirPapelera } = datos
  const grupos: GrupoDeVistaYOpciones[] = [
    {
      clave: 'vista',
      titulo: 'Vista',
      contenido: <ConmutadorDeVista actual="lista" />,
      resumen: 'Lista',
    },
  ]
  if (puedeVerTodos) {
    grupos.push({
      clave: 'alcance',
      titulo: 'Qué leads ver',
      contenido: <SelectorDeAlcance modo={modo} />,
      resumen: modo === 'todos' ? 'Todos' : 'Míos',
    })
  }
  grupos.push({
    clave: 'vistas',
    titulo: 'Vistas guardadas',
    contenido: <VistasDeLeads esquema={datos.esquema} vistas={datos.vistas} modo={modo} />,
  })
  if (puedeExportar || puedeCrear || puedeAbrirPapelera) {
    grupos.push({
      clave: 'mas',
      titulo: 'Más',
      contenido: (
        <>
          <OpcionesDeCsv
            puedeExportar={puedeExportar}
            puedeImportar={puedeCrear}
            alExportar={datos.alExportar}
          />
          {puedeAbrirPapelera ? <EnlaceAPapeleraDeLeads /> : null}
        </>
      ),
    })
  }
  return grupos
}

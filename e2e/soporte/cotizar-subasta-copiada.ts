// La subasta de la semilla copiada en un origen de prueba (`e2e_4_13_…`: la limpieza de `borrarOrigenesDeCotizar()` lo borra con sus fórmulas). Para los specs que
// publican sobre ella (el ⚙ de una constante, el de la cabecera) sin tocar la de la semilla, que miran otros specs.
import { crearOrigenDePrueba } from './origenes'
import { literal, sql } from './sql'

// Un origen de subasta con la publicada de `subasta_usa` copiada como su v1; `nombre` y `resto` llevan el proyecto: dos proyectos no se pisan.
export async function crearSubastaCopiada(nombre: string, resto: string): Promise<string> {
  const copia = await crearOrigenDePrueba(nombre, `4_13_${resto}`, { tipo: 'subasta' })
  sql(`insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
    select ${literal(copia.id)}::uuid, 1, 'publicada', f.definicion, f.params, f.diseno, f.visibilidad, 'E2E copia de la subasta', now()
    from public.formulas f join public.origenes o on o.id = f.origen_id
    where o.clave = 'subasta_usa' and f.estado = 'publicada'`)
  return copia.id
}

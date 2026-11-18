'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import {
  DESCRIPCION_DE_LA_POLITICA,
  TITULO_DE_LA_POLITICA,
} from '../../../../entities/cola/politica'
import { SeccionDeLaCola } from '../../tablero/components/seccion-de-la-cola'
import type { PropsDelFormularioDeLaPolitica } from './formulario-de-la-politica'

// El formulario de la política viaja aparte: el tablero se muestra sin cargar su código. Mientras llega, la sección ya tiene su título y su frase.
export const FormularioDeLaPolitica = diferido<PropsDelFormularioDeLaPolitica>(
  () => import('./formulario-de-la-politica').then((modulo) => modulo.FormularioDeLaPolitica),
  {
    esqueleto: (
      <SeccionDeLaCola
        id="politica-titulo"
        titulo={TITULO_DE_LA_POLITICA}
        descripcion={DESCRIPCION_DE_LA_POLITICA}
      >
        <EsqueletoFormulario bloques={1} campos={5} />
      </SeccionDeLaCola>
    ),
    aviso: 'aqui',
  },
)

'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoDeRecordatorios } from '../../recordatorios/components/esqueleto-de-recordatorios'
import { EsqueletoDeSeguimientos } from './esqueleto-de-seguimientos'

// El modal de anotar y editar se pide recién al abrirse (y con él, el editor): la línea de tiempo no
// carga su código para mostrarse. Se monta con `useAbiertoAlgunaVez()`.
export const ModalDeSeguimientoDiferido = diferido(() =>
  import('./modal-de-seguimiento').then((modulo) => modulo.ModalDeSeguimiento),
)

// Lo de una línea larga («Ir a una fecha», «Desde el …», el aviso del tope) se pide al dibujarse: la
// línea de tiempo casi nunca lo usa. Los tres se piden juntos y una vez: tras «Ir», «Desde el …»
// aparece sin volver a la red.
const ventana = () =>
  Promise.all([
    import('@/shared/ui/ir-a-una-fecha'),
    import('@/shared/ui/desde-una-fecha'),
    import('./aviso-del-tope'),
  ])
export const IrAUnaFechaDiferido = diferido(() => ventana().then(([m]) => m.IrAUnaFecha), {
  aviso: 'aqui',
})
export const DesdeUnaFechaDiferido = diferido(() => ventana().then(([, m]) => m.DesdeUnaFecha), {
  aviso: 'aqui',
})
export const AvisoDelTopeDiferido = diferido(() => ventana().then(([, , m]) => m.AvisoDelTope), {
  aviso: 'aqui',
})

// Lo de adentro de «Ver todos» (`?todos=`) se pide al abrirlo: la ficha no carga la línea completa ni los recordatorios con «Completados».
// Sin red, el aviso va en su lugar.
export const TodosLosSeguimientosDiferido = diferido(
  () => import('./todos-los-seguimientos').then((modulo) => modulo.TodosLosSeguimientos),
  { esqueleto: <EsqueletoDeSeguimientos forma="linea" />, aviso: 'aqui' },
)

export const TodosLosRecordatoriosDiferido = diferido(
  () =>
    import('../../recordatorios/components/todos-los-recordatorios').then(
      (modulo) => modulo.TodosLosRecordatorios,
    ),
  { esqueleto: <EsqueletoDeRecordatorios etiqueta="Cargando los recordatorios" />, aviso: 'aqui' },
)

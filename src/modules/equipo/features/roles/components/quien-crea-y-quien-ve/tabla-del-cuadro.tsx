'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { RoleBadge } from '../role-badge'
import { ControlDeCrea } from './control-de-crea'
import { ControlDeVe } from './control-de-ve'
import type { AlCambiarDelCuadro, RolDelCuadro } from './tipos'

type Props = { filas: readonly RolDelCuadro[]; alCambiar: AlCambiarDelCuadro }

// El cuadro desde 768 px: un renglón por rol, «Crea» y «Ve» en columnas. Las celdas con un motivo debajo anulan el `whitespace-nowrap` de `TableCell`:
// sin eso, el de «Crea» se derrama sobre la columna «Ve».
export function TablaDelCuadro({ filas, alCambiar }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-3">Rol</TableHead>
          <TableHead>Crea</TableHead>
          <TableHead>Ve</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((fila) => (
          <TableRow key={fila.rol.id}>
            <TableCell className="py-2 pl-3 align-top">
              <div className="flex min-h-8 items-center">
                <RoleBadge rol={fila.rol} />
              </div>
              {fila.motivo ? (
                <p className="max-w-64 text-(length:--text-xs) whitespace-normal text-(--color-ink-faint)">
                  {fila.motivo}
                </p>
              ) : null}
            </TableCell>
            <TableCell className="py-2 align-top whitespace-normal">
              <ControlDeCrea
                {...fila}
                alCambiar={(crea) => {
                  alCambiar(fila.rol, { crea })
                }}
              />
            </TableCell>
            <TableCell className="py-2 align-top whitespace-normal">
              <ControlDeVe
                {...fila}
                alCambiar={(ve) => {
                  alCambiar(fila.rol, { ve })
                }}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// Los pagos del cliente de un proyecto de repuestos (8.13-5): el panel «Pagos» de `/repuestos/[id]`, lo que abre «Registrar pago» desde la hoja y el aviso de que cambió
// el dinero del proyecto (la página se vuelve a pedir). Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
export { PagosDelProyectoDiferido } from '../features/dinero/components/diferidos'
export { useAlCambiarElDineroDelProyecto } from '../features/dinero/hooks/eventos-de-dinero'
export { PARAMETROS_DE_REGISTRAR_PAGO } from '../entities/dinero/paneles-de-pago'

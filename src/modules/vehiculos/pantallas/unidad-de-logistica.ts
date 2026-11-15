// Pantalla: la cabecera de la unidad de logística (`/logistica/vehiculo/[id]`) dibuja la portada con sus fotos en el lugar. Lo compone `src/app`: `logistica` no importa `vehiculos`. Sólo `src/app`
// importa este archivo (`.claude/rules/modulos.md`): reexporta lo que esa pantalla dibuja y nada más.
export { FotosEnElLugar } from '../features/fotos/components/fotos-en-el-lugar'

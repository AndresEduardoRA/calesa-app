// Configuración › Sitio web › Testimonios. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`): reexporta lo que esa pantalla dibuja y nada
// más. La lista viaja diferida: se pide al abrir la sub-ruta.
export { Testimonios } from '../features/contenido/testimonios/components/diferidos'
export type { PropsDeTestimonios } from '../features/contenido/testimonios/components/testimonios'

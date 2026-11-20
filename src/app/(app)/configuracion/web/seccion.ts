import { GlobeIcon } from 'lucide-react'
import type { ClavePermiso } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import type { SeccionDeConfiguracion, SubseccionDeConfiguracion } from '../secciones'

// La entrada de Configuración › Sitio web en el registro, con una sub-ruta por cada parte. Ninguna vive en la ruta de la sección: `/configuracion/web`
// abre la primera que la persona puede (`page.tsx`). El tipo se trae con `import type`: el ciclo con `secciones.ts` se borra al compilar.

const DE_AJUSTES = ['web.ajustes.gestionar'] as const satisfies readonly ClavePermiso[]
const DE_CONTENIDO = ['web.contenido.gestionar'] as const satisfies readonly ClavePermiso[]

export const AJUSTES_DEL_SITIO = {
  clave: 'ajustes',
  titulo: 'Ajustes',
  descripcion: 'El nombre, el contacto, las redes, el SEO y qué vehículos se ven en la web.',
  palabras: ['nombre', 'contacto', 'redes', 'seo', 'vehículos visibles', 'whatsapp'],
  ruta: RUTAS.ajustesDelSitio,
  permisos: DE_AJUSTES,
  motivoSinPermiso: 'Pide el permiso «Ajustes de la web».',
} as const satisfies SubseccionDeConfiguracion

export const LEGALES_DEL_SITIO = {
  clave: 'legales',
  titulo: 'Legales',
  descripcion: 'Los textos legales del sitio: términos y privacidad.',
  palabras: ['términos', 'privacidad', 'condiciones'],
  ruta: RUTAS.legalesDelSitio,
  permisos: DE_AJUSTES,
  motivoSinPermiso: 'Pide el permiso «Ajustes de la web».',
} as const satisfies SubseccionDeConfiguracion

export const GUIAS_DEL_SITIO = {
  clave: 'guias',
  titulo: 'Guías',
  descripcion: 'Las guías del sitio y sus categorías; cada una se edita, se programa y se publica.',
  palabras: ['blog', 'artículos', 'categorías', 'programar'],
  ruta: RUTAS.guiasDelSitio,
  permisos: DE_CONTENIDO,
  motivoSinPermiso: 'Pide el permiso «Contenido de la web».',
} as const satisfies SubseccionDeConfiguracion

export const FAQS_DEL_SITIO = {
  clave: 'faqs',
  titulo: 'Preguntas frecuentes',
  descripcion: 'Las preguntas y respuestas del sitio, en el orden en que se ven.',
  palabras: ['faq', 'preguntas', 'respuestas'],
  ruta: RUTAS.faqsDelSitio,
  permisos: DE_CONTENIDO,
  motivoSinPermiso: 'Pide el permiso «Contenido de la web».',
} as const satisfies SubseccionDeConfiguracion

export const TESTIMONIOS_DEL_SITIO = {
  clave: 'testimonios',
  titulo: 'Testimonios',
  descripcion: 'Lo que dicen los clientes, con su consentimiento.',
  palabras: ['reseñas', 'opiniones', 'clientes', 'consentimiento'],
  ruta: RUTAS.testimoniosDelSitio,
  permisos: DE_CONTENIDO,
  motivoSinPermiso: 'Pide el permiso «Contenido de la web».',
} as const satisfies SubseccionDeConfiguracion

export const SUBSECCIONES_DE_WEB: readonly SubseccionDeConfiguracion[] = [
  AJUSTES_DEL_SITIO,
  LEGALES_DEL_SITIO,
  GUIAS_DEL_SITIO,
  FAQS_DEL_SITIO,
  TESTIMONIOS_DEL_SITIO,
]

// Con cualquiera de ellos se entra a Sitio web: la unión de los permisos de sus sub-secciones, sin repetir y en orden.
export const PERMISOS_DE_WEB: readonly ClavePermiso[] = [
  ...new Set(SUBSECCIONES_DE_WEB.flatMap((sub) => sub.permisos)),
]

export const SECCION_DE_WEB = {
  clave: 'web',
  titulo: 'Sitio web',
  descripcion: 'Los ajustes, los legales, las guías, las preguntas frecuentes y los testimonios.',
  palabras: [
    'sitio',
    'página web',
    'publicar',
    'guías',
    'preguntas',
    'testimonios',
    'legales',
    'seo',
  ],
  ruta: RUTAS.configuracionDeWeb,
  Icono: GlobeIcon,
  permisos: PERMISOS_DE_WEB,
  grupo: 'web',
  subsecciones: SUBSECCIONES_DE_WEB,
} as const satisfies SeccionDeConfiguracion

import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { specAlKit, tocaFlujo } from './flujo.mjs'

// Lo que sube al kit desde un PR de un proyecto (flujo.mjs): las lecciones enteras y una tarea del kit con su yaml limpio.

it('tocaFlujo: una lección en varias líneas sube entera, en una sola; una línea de contexto corta la viñeta', () => {
  const patrones = ['docs/LECCIONES.md']
  expect(
    tocaFlujo(
      [
        {
          filename: 'docs/LECCIONES.md',
          patch:
            '+- Para que tome un cambio no reinicies el servicio:\n+  se relanza solo y las sesiones\n+  siguen. (kit)\n' +
            ' - Una vieja que sigue\n+  suelta. (semilla)',
        },
      ],
      patrones,
    ),
  ).toEqual({
    rutas: [],
    kit: [
      '- Para que tome un cambio no reinicies el servicio: se relanza solo y las sesiones siguen. (kit)',
    ],
    semilla: ['suelta. (semilla)'],
  })
})

it('no reemplaza en los comentarios del frontmatter: una lección con «: » no se vuelve una clave del yaml', () => {
  const plantilla = readFileSync('scripts/orquestador/plantillas/traer-de-proyecto.md', 'utf8')
  const spec = specAlKit(plantilla, {
    repoGh: 'Cuenta/tienda-app',
    nombre: 'tienda-app',
    pr: '41',
    toca: {
      rutas: ['scripts/flujo/a.sh'],
      kit: ['- No reinicies el servicio: se relanza solo. (kit)'],
      semilla: [],
    },
  })
  const frontmatter = spec.split('\n---\n')[0] ?? ''
  expect(frontmatter).toContain('{{LECCIONES}}')
  expect(frontmatter).not.toContain('No reinicies')
  expect(frontmatter).not.toContain('scripts/flujo/a.sh')
  expect(frontmatter).toContain('titulo: traer de tienda-app el PR #41')
  expect(spec.slice(frontmatter.length)).toContain(
    '- No reinicies el servicio: se relanza solo. (kit)',
  )
})

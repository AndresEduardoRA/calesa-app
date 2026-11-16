import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// `sql-del-dueno.sh` arma el SQL que crea al dueño tras un reset de la demo (`resetear.sh`). Lo que se prueba aquí: que no arme nada
// sin credenciales válidas (así `resetear.sh` no resetea) y que la clave entre como literal sin romper el SQL. Que el SQL deja una
// cuenta que entra y es dueña se probó contra la pila local (Auth de verdad); el reset remoto lo vuelve a comprobar al correr.
const GUION = resolve('scripts/demo/sql-del-dueno.sh')

function correr(env: Record<string, string>) {
  const r = spawnSync('bash', [GUION], {
    env: { NODE_ENV: 'test', PATH: process.env['PATH'] ?? '', ...env },
    encoding: 'utf8',
  })
  return { estado: r.status, salida: r.stdout, error: r.stderr }
}

describe('sql-del-dueno.sh', () => {
  it.each([
    [{}, 'DEMO_DUENO_EMAIL'],
    [{ DEMO_DUENO_EMAIL: 'no-es-correo', DEMO_DUENO_CLAVE: 'una-clave-larga' }, 'forma de correo'],
    [{ DEMO_DUENO_EMAIL: 'a@b.cl', DEMO_DUENO_CLAVE: 'corta' }, '12 caracteres'],
  ])('sin credenciales válidas sale con 64 y no escribe SQL (%o)', (env, motivo) => {
    const r = correr(env)
    expect(r.estado).toBe(64)
    expect(r.salida).toBe('')
    expect(r.error).toContain(motivo)
  })

  it('el correo va en minúsculas y la clave con sus comillas duplicadas', () => {
    const r = correr({
      DEMO_DUENO_EMAIL: ' Duena@Ejemplo.TEST ',
      DEMO_DUENO_CLAVE: "o'higgins-1810'; drop table x; --",
    })
    expect(r.estado).toBe(0)
    expect(r.salida).toContain("v_email text := 'duena@ejemplo.test';")
    expect(r.salida).toContain("v_clave text := 'o''higgins-1810''; drop table x; --';")
  })
})

---
# Dejar verde main en plena tanda: lo crea solo el orquestador (main_rojo_en_tanda en main-en-tanda.sh) cuando el CI del push a main cae,
# una vez por sha. Como main no exige la rama al día, dos PR en verde por separado pueden romperlo juntos. Reemplaza las llaves SHA,
# SHA_CORTO, CORRIDA (su enlace), ID_CORRIDA y CAIDOS (los `caidos.txt` de los artefactos o, si no hay, los jobs caídos; de varias
# líneas: en estos comentarios van sin llaves). Va urgente (cola:urgente): mientras main siga en rojo no arrancan tareas nuevas.
# `cierre: verificar`: no cuenta como tarea de la tanda.
titulo: dejar verde main ({{SHA_CORTO}})
rama: fix/main-rojo-{{SHA_CORTO}}
conflicto: e2e
nivel: normal
effort: high
cierre: verificar
urgente: si
---

## Pedido de la persona

«Un PR en verde entra aunque main haya avanzado; si dos juntos lo rompen, se arregla primero.» El CI de `main` cayó en `{{SHA}}`:
{{CORRIDA}}. Esta tarea la abrió solo el orquestador (`scripts/orquestador/README.md` › «Vigila»); las tareas nuevas esperan a que se
integre.

## Objetivo

Dejar verde lo que cayó en el CI de `main`:

{{CAIDOS}}

## Decisiones ya tomadas

- La causa, con evidencia: los artefactos de la corrida (`gh run download {{ID_CORRIDA}}`; en `e2e-fallos/<fecha>/`, la traza, el video y
  `caidos.txt`). Ni reintentar hasta que pase, ni `.skip` ni `.fixme`.
- Si el mismo spec ya está en un issue `noche-roja` en la cola, es la misma falla: dilo en el PR y arréglala aquí.
- Si la causa es ajena al repo (el runner, un servicio de afuera), `RESULTADO: TRABADA —` con la evidencia.

## Anclajes

Los specs de arriba y `e2e/soporte/`.

## Estados no felices

Una prueba que cae sólo en CI se reproduce con el build de producción (`pnpm test:e2e`, como en CI) antes de tocarla · un caído que en
local pasa siempre → la traza de la corrida manda; si no alcanza, trabada con lo visto.

## Verificación

Lo caído, en verde en local (`pnpm test:e2e <los specs caídos>` con el proyecto que cayó, o lo del job de Nivel 1 que cayó), y lo
de siempre (`pnpm lint`, `pnpm typecheck`, `pnpm test`).

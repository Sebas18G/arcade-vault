---
description: Crea un git worktree aislado en .trees/ y ejecuta ahí el requerimiento recibido
argument-hint: <descripción del requerimiento o instrucciones a ejecutar>
---

El usuario invocó `/worktree` con el siguiente requerimiento:

<requerimiento>
$ARGUMENTS
</requerimiento>

Si `$ARGUMENTS` está vacío, pide al usuario que describa qué requerimiento debe ejecutarse en el worktree y detente ahí.

Si no está vacío, sigue estos pasos en orden:

1. **Determina el nombre del worktree**: a partir del requerimiento anterior, elige un nombre corto y descriptivo en kebab-case (minúsculas, sin espacios ni acentos, palabras separadas por guiones, máx. ~4 palabras) que resuma la tarea. Este será `<nombre>`.

2. **Revisa el estado del repo** con `git status` para tener claro el punto de partida (rama actual, working tree limpio o no). El worktree nuevo es independiente, pero conviene saber desde qué commit se ramifica.

3. **Crea el worktree** ramificando desde la rama/commit actual:
   ```
   git worktree add -b <nombre> .trees/<nombre>
   ```
   Si el nombre de rama o la carpeta ya existen, ajústalo con un sufijo numérico (`<nombre>-2`, `<nombre>-3`, ...) hasta que no colisione, y vuelve a intentar.

4. Si `.trees/` no aparece en `.gitignore` (en la raíz del repo), agrégalo — créalo si no existe — para que estos worktrees no se trackeen desde la rama principal.

5. **Entra al worktree** con la herramienta `EnterWorktree` usando `path: ".trees/<nombre>"` (no uses `name`, porque el worktree ya se creó manualmente en el paso 3). Esto aísla el resto de la sesión dentro de ese directorio y rama, sin afectar la rama ni los archivos originales.

6. **Ejecuta el requerimiento completo** dentro de ese worktree, como cualquier tarea normal de ingeniería: explora el código, implementa, prueba lo que corresponda, y comitea el trabajo en la rama `<nombre>`. No toques la rama ni el working tree original — ya estás aislado de ellos.

7. Al terminar, resume brevemente qué se hizo, indica la ruta (`.trees/<nombre>`) y el nombre de rama (`<nombre>`), y recuerda al usuario que puede pedirte salir del worktree (conservándolo o eliminándolo) cuando lo desee.

Notas:
- Crear el worktree en sí es una acción local y reversible (`git worktree remove`), así que no pidas confirmación solo para ese paso.
- Para cualquier acción destructiva o que afecte sistemas compartidos (push, PRs, etc.) que surja al ejecutar el requerimiento, sigue las reglas normales de confirmación.

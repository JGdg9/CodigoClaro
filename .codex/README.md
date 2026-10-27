# Perfiles de agentes de CódigoClaro

Los archivos de `agents/` definen cinco agentes personalizados de Codex para este repositorio: coordinación técnica, programación, revisión educativa, QA/seguridad y monitorización de Render.

Son perfiles invocables por Codex cuando una tarea los necesita; no son procesos autónomos permanentes. La comprobación periódica determinista está en [`.github/workflows/render-health.yml`](../.github/workflows/render-health.yml): consulta una vez al día `/api/health` en UTC, permite ejecución manual y valida el endpoint al cambiar ese workflow en un PR. GitHub puede retrasar o pausar tareas programadas; el perfil `monitor_render` solo complementa la comprobación con revisiones puntuales de solo lectura. Ningún perfil puede autorizar por sí solo costes, cambios de producción, migraciones con datos reales ni despliegues.

Codex carga los perfiles del repositorio cuando se abre desde la raíz del proyecto y se inicia una tarea. Consulta la documentación oficial de [subagentes de Codex](https://learn.chatgpt.com/docs/agent-configuration/subagents) para detalles de configuración.

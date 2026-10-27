# Estructura del proyecto CódigoClaro

Esta guía describe la organización real de la entrega v1.4.2 y qué ubicaciones son sensibles para el despliegue.

## Árbol principal

```text
.
├── server.js                  # Servidor predeterminado (SQLite)
├── server-postgres.js         # Backend PostgreSQL opt-in para staging
├── package.json               # Dependencias y comandos npm
├── render.yaml                # Blueprint del servicio actual; revisar rootDir según el repositorio
├── render-postgres.yaml       # Blueprint alternativo, no activar en producción sin validar
├── .env.example               # Nombres de variables; nunca secretos reales
├── lib/                       # Módulos reutilizables del servidor
├── migrations/                # Migraciones SQL versionadas
├── scripts/                   # Herramientas de mantenimiento, generación y smoke tests
├── tests/                     # Pruebas unitarias, regresión y contratos de API
├── public/                    # Raíz web pública: páginas y recursos estáticos
│   ├── temarios/              # PDF públicos; los enlaces antiguos se redirigen internamente
│   └── ayuda/                 # Guías públicas y documentación de usuario
└── docs/                      # Documentación, catálogo de Pages, temarios e historial
    ├── guias/                 # Guías operativas y de desarrollo
    ├── historial/versiones/   # Notas de versiones anteriores
    ├── temarios/              # Copia para la demo estática de Pages
    └── ESTRUCTURA_PROYECTO.md # Este documento
```

## Por qué no se deben mover ciertos archivos a ciegas

- `public/` es la raíz que sirven los servidores. Los PDF viven en `public/temarios/`. El catálogo y la página de temarios apuntan a esa carpeta; el servidor mantiene compatibilidad interna con las URL antiguas que usaban el nombre del PDF en la raíz.
- `server.js` es el comando de inicio predeterminado. `server-postgres.js` es alternativo y requiere `DATABASE_URL`; no se cambia el inicio de producción automáticamente.
- `migrations/` contiene SQL de PostgreSQL. Las migraciones deben ejecutarse en una base de staging con copia de seguridad, no desde el arranque normal del servidor.
- `docs/index.html` pertenece a la demo estática de GitHub Pages; no es la aplicación completa de Node.
- `.env`, `data/` y `node_modules/` son locales/ignorados y no deben incluir secretos ni bases de datos personales en Git.

## Convenciones

1. Código ejecutable en `server.js`, `server-postgres.js`, `lib/` y `scripts/`.
2. Pruebas automáticas exclusivamente en `tests/`; cualquier nuevo endpoint debe tener casos de éxito, error, permisos y validación.
3. Documentación de desarrollo en `docs/`; notas históricas en `docs/historial/versiones/`.
4. Mantener nombres descriptivos y evitar duplicar la misma guía en varios sitios.
5. No subir cambios a `main` hasta que las pruebas locales y el smoke test del entorno de staging terminen correctamente.

## Comandos habituales

```bash
npm test
npm run test:coverage
python verificar_entrega.py
python scripts/verificar_pages.py
npm run test:render
```

`npm run test:render` requiere conectividad hacia Render y comprueba rutas públicas mediante peticiones de solo lectura.

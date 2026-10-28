# Estructura del repositorio CódigoClaro

La raíz contiene la aplicación dentro de `CodigoClaro_v3/` y los workflows del repositorio.

## Árbol principal

```text
.
├── .github/
├── README.md
└── CodigoClaro_v3/
    ├── README.md
    ├── EMPEZAR_AQUI.md
    ├── package.json
    ├── server.js
    ├── server-postgres.js
    ├── render.yaml
    ├── lib/                    # Incluye el helper de errores HTTP
    ├── migrations/
    ├── scripts/
    ├── tests/
    ├── public/
    │   ├── 404.html
    │   ├── 500.html
    │   ├── ayuda/
    │   └── temarios/
    └── docs/
        ├── README.md
        ├── ESTRUCTURA_PROYECTO.md
        ├── NOVEDADES_v1.4.2.md
        ├── catalogo_temas.json
        ├── guias/
        └── temarios/
```

## Documentación

- [README general](../../README.md): orientación del repositorio.
- [Guía de la aplicación](../README.md): instalación y uso local.
- [Primeros pasos](../EMPEZAR_AQUI.md).
- [Índice de documentación](README.md).
- [Guías de desarrollo](guias/README.md).
- [Ayuda para usuarios](../public/ayuda/README.md).

`public/` contiene los recursos servidos por la aplicación. `docs/` incluye la demo estática, el catálogo y las copias de los temarios.

`lib/http-errors.js` sirve `public/404.html` en navegaciones a rutas inexistentes y `public/500.html` ante errores internos; las respuestas de API siguen siendo JSON. Las páginas HTML de error usan `Cache-Control: no-store`. Render usa este Blueprint con `REGISTRATION_OPEN=false` y almacenamiento persistente.

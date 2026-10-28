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
    ├── lib/
    ├── migrations/
    ├── scripts/
    ├── tests/
    ├── public/
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
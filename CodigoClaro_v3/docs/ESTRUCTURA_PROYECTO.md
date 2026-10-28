# Estructura del repositorio CódigoClaro

El repositorio contiene la aplicación dentro de `CodigoClaro_v3/`. Este mapa describe las ubicaciones en la rama actual; la raíz del repositorio conserva el README general y la configuración de GitHub.

## Árbol principal

```text
.
├── .gitattributes
├── .github/
├── README.md
└── CodigoClaro_v3/
    ├── README.md
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
        ├── guia-temarios.html
        ├── index.html
        ├── guias/
        └── temarios/
```

## Para encontrar cada documento

- [README general](../../README.md): presentación del repositorio y accesos principales.
- [Guía completa de la aplicación](../README.md): instalación local, uso, comprobaciones y límites.
- [Índice de documentación](README.md): documentos vigentes dentro de `docs/`.
- [Guías](guias/README.md): índice de las guías del proyecto.
- [Novedades v1.4.2](NOVEDADES_v1.4.2.md): nota de la versión vigente.

La carpeta `public/` contiene recursos de la aplicación y guías públicas. La carpeta `docs/` contiene la documentación del proyecto, el catálogo y la copia de temarios de la demo estática. Las rutas y los archivos de los temarios se mantienen intactos.

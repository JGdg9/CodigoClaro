"""Checks the static GitHub Pages demo and all linked PDF assets."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
index = DOCS / "index.html"
assert index.is_file(), "Falta docs/index.html"
html = index.read_text(encoding="utf-8")
assert "catalogo_temas.json" in html and "./temarios/" in html
catalog = json.loads((DOCS / "catalogo_temas.json").read_text(encoding="utf-8"))
assert isinstance(catalog, list) and catalog, "Catálogo vacío o inválido"
missing = [item.get("file", "") for item in catalog if not (DOCS / "temarios" / item.get("file", "")).is_file()]
assert not missing, f"PDFs enlazados ausentes: {missing}"
assert (DOCS / "guia-temarios.html").is_file(), "Falta la guía editorial"
assert (DOCS / ".nojekyll").is_file(), "Falta .nojekyll"
print(f"GitHub Pages OK: {len(catalog)} temarios y todos sus PDF disponibles.")

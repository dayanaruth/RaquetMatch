# RaquetMatch

Web app para campeonatos de ráquet: registra jugadores con nivel (1-5), arma equipos equilibrados, genera el fixture todos contra todos y calcula la tabla de posiciones.

**Autores:** Dayana Ruth y Kevin — Sistemas Informáticos (Módulo 2)

## Tecnologías
HTML5 semántico, CSS3 (Grid/Flex, variables, media queries) y JavaScript vanilla, sin frameworks.

## Cómo usar
- Abre `index.html` en el navegador (usa `css/`, `js/` y `assets/`).
- O abre `RaquetMatch_index.html`, la versión en un solo archivo.

## Estructura
```
index.html               Página principal
RaquetMatch_index.html   Versión autocontenida en un solo archivo
css/styles.css           Estilos
js/main.js               Lógica (equipos, fixture, tabla)
assets/                  Imágenes y logos
docs/contexto.md         Contexto y reglas del proyecto
```

## Algoritmos
- Reparto "serpiente" por nivel para equilibrar equipos.
- Fixture por rotación circular (round-robin).
- 3 puntos por victoria; desempate por diferencia de sets.

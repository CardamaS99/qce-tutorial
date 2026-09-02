# Tutorial QCE26 · De circuitos monolíticos a redes multi-QPU

Libro de texto bilingüe (español / inglés) de apoyo al primer bloque del tutorial
*Practical Distributed Quantum Computing* de IEEE Quantum Week 2026.

Sitio estático construido con [Astro](https://astro.build). No envía JavaScript
salvo cinco líneas para conservar el ancla al cambiar de idioma, así que la salida
funciona proyectada y sin conexión.

## Uso

```bash
npm install
npm run dev      # servidor local con recarga en caliente
npm run build    # genera dist/ y ejecuta las comprobaciones de integridad
npm run preview  # sirve dist/ tal como quedará publicado
```

Para publicar, sube el contenido de `dist/`. No hay nada que quitar antes.

## Dónde está cada cosa

```
src/
  content/chapters/{es,en}/NN.mdx   un fichero por capítulo e idioma
  figures/<id>.{es,en}.svg          las figuras, una variante por idioma
  data/references.json              bibliografía, bilingüe
  data/i18n.json                    cadenas de la interfaz
  components/                       Figure, Bridge, Warning, Note, Exercise, Formula, Ref, Toc
  layouts/Book.astro                estructura de página
  styles/                           tokens · base · layout · content · print
  pages/{es,en}/index.astro         montaje de cada idioma
scripts/check.mjs                   comprobaciones que corren tras cada build
```

## Tareas habituales

**Añadir un capítulo.** Crea `src/content/chapters/es/16.mdx` y su pareja en `en/`.
El preámbulo se valida contra un esquema, así que un campo mal escrito rompe el
build en vez de colarse:

```yaml
---
lang: es
order: 16
part: "Parte IV · Ruido"
title: "Modelos de ruido"
lead: "Entradilla del capítulo."
accent: quantum      # classical | quantum
---
```

El índice, la numeración y la agrupación por partes se derivan solos. Una parte
nueva existe por el mero hecho de escribir su nombre en `part`.

**Añadir una figura.** Guarda `src/figures/mi-figura.es.svg` y `.en.svg`, y en el
capítulo escribe:

```mdx
<Figure id="mi-figura">
  Pie de la figura, con *cursivas* y <Ref n={3} /> si hace falta.
</Figure>
```

La numeración la lleva un contador de CSS, de modo que insertar una figura en
medio renumera el resto sin tocar nada. Usa las clases `sv-t`, `sv-th`, `sv-s` y
`sv-m` en los textos del SVG para heredar la tipografía y los colores.

**Añadir una referencia.** Añade una entrada al final de `src/data/references.json`
con su `id`, y cítala con `<Ref n={25} />`. El número es la posición en el fichero;
`Ref` falla en tiempo de build si apuntas a una que no existe.

**Cajas destacadas.** `<Bridge>`, `<Warning>`, `<Note>` y `<Exercise>`, todas con
un `label` opcional.

**Código.** Bloques cercados normales. El resaltado lo hace Shiki en tiempo de
build; `title=` rotula el bloque:

````mdx
```python title="Solución de referencia"
comm.Scatter(a, a_local, root=0)
```
````

## Comprobaciones

`npm run build` verifica que ambos idiomas tienen el mismo número de capítulos y
figuras, que no hay identificadores repetidos ni enlaces internos rotos, que cada
figura trae su SVG y que no quedan restos de la conversión. Falla con código
distinto de cero, así que sirve tal cual en integración continua.

# CalzaTodo

**Laboratorio 4 - Fundacion Kinal**
Mini tienda de zapatos en JavaScript vanilla que consume la API publica de
Platzi (Escuela JS) y muestra unicamente los productos de la categoria
**`Shoes`**.

---

## 1. Que hace la aplicacion

| Funcionalidad | Detalle |
|---|---|
| Consumo de API | `GET https://api.escuelajs.co/api/v1/products` |
| Filtro por categoria | Se queda solo con los productos cuya categoria es `Shoes` |
| Busqueda | Filtra por nombre **y** descripcion, sin distinguir mayusculas, con *debounce* de 250 ms |
| Ordenamiento | Precio ascendente, precio descendente, nombre A-Z y nombre Z-A |
| Interaccion extra | Boton "Ver detalle" por tarjeta y miniaturas para cambiar la foto |
| Estados de UI | Esqueleto de carga, mensaje de error con boton "Reintentar" y estado "sin resultados" |

### Decisiones tecnicas

- **JavaScript vanilla, sin frameworks ni librerias.** El unico script es
  `script.js`, cargado como *script clasico* (sin `type="module"`) para que la
  pagina tambien funcione abriendo `index.html` con doble clic.
- **Un solo objeto `state`** concentra los datos de la aplicacion
  (catalogo, busqueda, orden, estado y tarjetas abiertas).
- **Un unico punto de renderizado** (`render()`): toda actualizacion de la
  interfaz pasa por ahi, lo que evita estados inconsistentes.
- **Plantilla `<template>` en el HTML** + `cloneNode()` en vez de construir
  cadenas de HTML. Los datos de la API se insertan con `textContent`, no con
  `innerHTML`, para evitar inyeccion de codigo.
- **Delegacion de eventos** en la rejilla: un solo listener atiende el boton
  de detalle y las miniaturas de todas las tarjetas.
- **`sortProducts()` no muta el catalogo**: trabaja sobre una copia.

### Detalle importante sobre la API

La API entrega la categoria como un **objeto**, no como texto:

```json
{ "id": 35, "title": "...", "price": 39, "images": ["..."],
  "category": { "id": 4, "name": "Shoes", "slug": "shoes" } }
```

Por eso el filtro no puede ser `producto.category === 'Shoes'`. La funcion
`getCategoryName()` resuelve ambos casos (objeto o texto plano), de modo que
el proyecto no se rompe si la API cambia su formato.

Ademas, **el catalogo es dinamico**: la cantidad de productos varia entre
llamadas (se han observado entre 86 y 87 productos, y entre 18 y 19 zapatos).
La aplicacion no asume ninguna cantidad fija.

---

## 2. Estructura del proyecto

```
CalzaTodo/
├── .husky/
│   └── pre-commit      # hook que ejecuta ESLint antes de cada commit
├── .gitignore          # excluye node_modules y archivos del sistema
├── eslint.config.js    # configuracion de ESLint (formato flat config)
├── index.html          # estructura de la pagina + <template> de la tarjeta
├── package.json        # dependencias y scripts
├── package-lock.json   # versiones exactas (se genera con npm install)
├── script.js           # logica: API, busqueda, orden y renderizado
└── style.css           # diseno, paleta y adaptacion a movil
```

---

## 3. Requisitos

- **Node.js 20.19 o superior** (probado en Node v20.19.6)
- **npm 10 o superior** (probado en npm 10.8.2)
- **Git**

---

## 4. Configuracion paso a paso

Estos son los comandos que se ejecutaron, en orden.

### Paso 1 - Instalar las dependencias

```bash
npm install
```

Instala **eslint**, **husky** y **globals** (esta ultima agrega los
identificadores del navegador y de Node que ESLint necesita conocer).
Resultado obtenido:

```
added 88 packages, and audited 89 packages in 44s
found 0 vulnerabilities
```

Durante la instalacion se ejecuto automaticamente el script `prepare`, que
llama a `husky` y prepara los hooks.

> **Nota:** al instalar se comprueba que `eslint@9` aparece marcado como
> obsoleto, por lo que se actualizo a la version soportada:
>
> ```bash
> npm install --save-dev eslint@latest @eslint/js@latest globals@latest husky@latest
> ```

Versiones finalmente instaladas:

| Paquete | Version |
|---|---|
| eslint | 10.11.0 |
| @eslint/js | 10.0.1 |
| globals | 17.12.0 |
| husky | 9.1.7 |

### Paso 2 - Inicializar Husky

```bash
npx husky init
```

Este comando creo `.husky/pre-commit` con el contenido `npm test`. Como el
laboratorio pide que el hook ejecute ESLint, el archivo se dejo con:

```bash
npx eslint .
```

Contenido final verificado de `.husky/pre-commit`:

```
npx eslint .
```

Ademas, `husky init` deja el script `prepare` en `package.json`, que es lo que
permite que los hooks se activen automaticamente despues de `npm install`:

```json
"scripts": {
  "lint": "eslint .",
  "test": "eslint .",
  "prepare": "husky"
}
```

### Paso 3 - Comprobar que el proyecto pasa el lint

```bash
npx eslint .
```

Salida: **ninguna**, y codigo de salida `0`. ESLint revisa los dos archivos
JavaScript del proyecto:

```
eslint.config.js  (errores: 0, avisos: 0)
script.js         (errores: 0, avisos: 0)
```

### Paso 4 - Reglas de calidad activadas

En `eslint.config.js` se combina el juego recomendado de reglas
(`@eslint/js`) con las reglas exigidas por el laboratorio:

| Regla | Nivel | Para sirve |
|---|---|---|
| `no-unused-vars` | error | Detectar variables o funciones declaradas y nunca usadas |
| `no-undef` | error | Detectar nombres no declarados |
| `eqeqeq` | error | Prohibir `==` en lugar de `===` |
| `prefer-const` | error | Obligar `const` en vez de `let` cuando no se reasigna |
| `no-var` | error | Prohibir `var` |
| `curly` | error | Exigir llaves en `if` / `else` |
| `no-console` | error | No dejar `console.log` en el codigo |

---

## 5. Prueba funcional del hook (bloqueo de commits)

Se realizo una prueba real, no simulada.

### 5.1 Commit en verde (linea base)

Con el proyecto limpio, el commit se completa normalmente y el hook no
obstruye nada:

```
[main (root-commit) 096bb21] feat: tienda de zapatos CalzaTodo con API de Platzi, busqueda y orden
 8 files changed, 2280 insertions(+)
=== EXIT: 0 ===
```

### 5.2 Se rompe una regla a proposito

Se agrego una variable que nunca se usa en `script.js`:

```js
/** PRUEBA DE HUSKY: esta variable no se usa en ninguna parte. */
const descuentoPromocional = 15;
```

### 5.3 El commit es RECHAZADO

```bash
git add script.js
git commit -m "test: agregar descuento"
```

Salida real de la terminal:

```
C:\Users\Jaqueline\OneDrive\Escritorio\CalzaTodo\script.js
  37:7  error  'descuentoPromocional' is assigned a value but never used  no-unused-vars
✖ 1 problem (1 error, 0 warnings)
husky - pre-commit script failed (code 1)
```

```
=== git commit EXIT: 1 ===
```

**El commit fue bloqueado.** Comprobaciones adicionales:

```
$ git log --oneline
096bb21 feat: tienda de zapatos CalzaTodo con API de Platzi, busqueda y orden

Numero de commits: 1
El cambio sigue en el area de staging (aun sin commitear):
 script.js | 3 +++
 1 file changed, 3 insertions(+)
```

El commit **no** se creo y el cambio incorrecto permanecio sin commitear.

### 5.4 Se revierte el cambio y el commit SI se completa

Se elimino la variable, se confirmo que `npx eslint .` volvio a dar codigo `0`
y se intento el commit de nuevo:

```bash
git add style.css
git commit -m "fix: estilo para la imagen de respaldo cuando un producto no carga"
```

Salida real de la terminal:

```
[main 061ccdc] fix: estilo para la imagen de respaldo cuando un producto no carga
 1 file changed, 7 insertions(+)
=== git commit EXIT: 0 ===
```

**El commit se completo.** El hook bloquea el codigo con errores y deja pasar
el codigo correcto.

### 5.5 Conclusion de la prueba

| Escenario | `npx eslint .` | `git commit` | Resultado |
|---|---|---|---|
| Codigo con `no-unused-vars` | 1 error | exit `1` | **Bloqueado** |
| Codigo correcto | 0 errores | exit `0` | **Completado** |

---

## 6. Como ejecutar la aplicacion

No necesita compilacion ni build. Basta con abrir `index.html` en el navegador,
o servir la carpeta con cualquier servidor estatico:

```bash
# Opcion 1: doble clic en index.html

# Opcion 2: servidor local
npx serve .
# o, con Python instalado:
py -m http.server 8080
```

Luego visitar `http://localhost:8080`.

### Comandos utiles

```bash
npm run lint     # ejecuta ESLint
npm test         # mismo: tambien ejecuta ESLint (lo que ejecuta el hook)
```

---

## 7. Verificacion realizada

Ademas del lint, la logica se ejercito contra la API en vivo con un arnes
temporal de Node (no forma parte de la entrega). Resultado: **36 de 36
comprobaciones correctas**, incluyendo:

- El filtro por `Shoes` coincide con el conteo manual de la categoria.
- Los cuatro criterios de ordenamiento producen el orden esperado.
- `sortProducts()` no modifica el catalogo original.
- La busqueda funciona por titulo y por descripcion, e ignora mayusculas.
- Busqueda y orden funcionan de forma combinada.
- `loadProducts()` completa contra la API real y deja el estado en `ready`.
- Se crea una tarjeta por cada zapato, con precio, categoria y codigo correctos.

---

## 8. Technologies y recursos

- **HTML5, CSS3 y JavaScript (ES2022) sin frameworks ni dependencias en tiempo de ejecucion.**
- **ESLint 10** + **Husky 9** como control de calidad.
- API de datos: <https://api.escuelajs.co/api/v1/products>

---

Proyecto educativo desarrollado para el Laboratorio 4 de Fundacion Kinal.
Los productos y sus imagenes pertenecen a Escuela JS / Platzi y se usan solo
con fines educativos.

/* ============================================================
 * CalzaTodo - logica de la aplicacion
 * Laboratorio 4 | Fundacion Kinal
 * ------------------------------------------------------------
 * El archivo se divide en 8 bloques:
 *   1. Constantes
 *   2. Referencias al DOM
 *   3. Estado de la aplicacion
 *   4. Obtener y preparar los datos (API + filtro por categoria)
 *   5. Busqueda y ordenamiento
 *   6. Renderizado en el DOM
 *   7. Manejo de eventos
 *   8. Inicializacion
 * ============================================================ */

/* ============================================================
 * 1. CONSTANTES
 * ============================================================ */

/** Endpoint publico de la API de Platzi (Escuela JS). */
const API_URL = 'https://api.escuelajs.co/api/v1/products';

/** Unica categoria que nos interesa para este laboratorio. */
const TARGET_CATEGORY = 'Shoes';

/** Espera antes de volver a renderizar al escribir en el buscador. */
const SEARCH_DEBOUNCE_MS = 250;

/** Cuantas tarjetas de esqueleto mostrar mientras llegan los datos. */
const SKELETON_COUNT = 8;

/** Imagen de respaldo por si un producto no carga o no trae imagen. */
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23eef2ff'/%3E%3Ctext x='200' y='158' fill='%234338ca' font-family='sans-serif' font-size='22' text-anchor='middle'%3ECalzaTodo%3C/text%3E%3C/svg%3E";

/** Formato de moneda para mostrar los precios (la API los entrega en USD). */
const priceFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'USD',
  // narrowSymbol muestra "$951" en vez de "USD 951", que ocupa mucho en la tarjeta.
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/* ============================================================
 * 2. REFERENCIAS AL DOM
 * Se guardan en constantes para no consultarlas en cada evento.
 * ============================================================ */
const searchInput = document.querySelector('#searchInput');
const sortSelect = document.querySelector('#sortSelect');
const productGrid = document.querySelector('#productGrid');
const resultInfo = document.querySelector('#resultInfo');
const errorState = document.querySelector('#errorState');
const errorMessage = document.querySelector('#errorMessage');
const emptyState = document.querySelector('#emptyState');
const retryButton = document.querySelector('#retryButton');
const clearSearchButton = document.querySelector('#clearSearchButton');
const cardTemplate = document.querySelector('#productCardTemplate');

/* ============================================================
 * 3. ESTADO DE LA APLICACION
 * Un unico objeto concentra lo que la app necesita saber.
 * ============================================================ */
const state = {
  /** Zapatos ya filtrados por categoria. */
  shoes: [],
  /** Texto actual del buscador (en minusculas). */
  search: '',
  /** Criterio de ordenamiento elegido en el <select>. */
  sort: 'default',
  /** 'loading' | 'ready' | 'error'. */
  status: 'loading',
  /** Mensaje de error para mostrar si status === 'error'. */
  error: '',
  /** IDs de las tarjetas con el detalle abierto. */
  expanded: new Set(),
};

/* ============================================================
 * 4. OBTENER Y PREPARAR LOS DATOS
 * ============================================================ */

/**
 * Descarga el catalogo y se queda solo con la categoria "Shoes".
 * @returns {Promise<void>} resuelve cuando la interfaz ya esta actualizada.
 */
async function loadProducts() {
  state.status = 'loading';
  state.error = '';
  render();

  try {
    const response = await fetch(API_URL);

    // fetch solo falla por red; un 404/500 hay que detectarlo a mano.
    if (!response.ok) {
      throw new Error(`La API respondio con el estado ${response.status}`);
    }

    const products = await response.json();

    // Nos quedamos unicamente con los zapatos.
    state.shoes = filterByCategory(products, TARGET_CATEGORY);
    state.status = 'ready';
  } catch (error) {
    state.status = 'error';
    state.error =
      error instanceof Error
        ? error.message
        : 'Ocurrio un error inesperado al conectar con la API.';
  }

  render();
}

/**
 * La API entrega la categoria como texto plano o como objeto
 * ({ id, name, slug, image }). Esta funcion cubre ambos casos.
 * @param {{category: unknown}} product producto de la API.
 * @returns {string} nombre de la categoria, o cadena vacia.
 */
function getCategoryName(product) {
  if (typeof product.category === 'string') {
    return product.category;
  }

  if (product.category && typeof product.category === 'object') {
    return String(product.category.name ?? '');
  }

  return '';
}

/**
 * Filtra el catalogo conservando una sola categoria.
 * @param {Array<object>} products catalogo completo de la API.
 * @param {string} category categoria a conservar.
 * @returns {Array<object>} productos de esa categoria.
 */
function filterByCategory(products, category) {
  if (!Array.isArray(products)) {
    return [];
  }

  const objetivo = category.toLowerCase();
  return products.filter(
    (product) => getCategoryName(product).toLowerCase() === objetivo,
  );
}

/* ============================================================
 * 5. BUSQUEDA Y ORDENAMIENTO
 * ============================================================ */

/**
 * Indica si un producto coincide con el texto buscado.
 * @param {{title: string, description: string}} product producto.
 * @param {string} term texto de busqueda en minusculas.
 * @returns {boolean} true si coincide.
 */
function matchesSearch(product, term) {
  if (!term) {
    return true;
  }

  const titulo = String(product.title ?? '').toLowerCase();
  const descripcion = String(product.description ?? '').toLowerCase();
  return titulo.includes(term) || descripcion.includes(term);
}

/**
 * Devuelve una copia del catalogo ordenada segun el criterio elegido.
 * No modifica el arreglo original.
 * @param {Array<object>} products catalogo de zapatos.
 * @param {string} sortBy criterio de ordenamiento.
 * @returns {Array<object>} catalogo ordenado.
 */
function sortProducts(products, sortBy) {
  const copia = [...products];

  // "es" para comparar correctamente los acentos (ej. "Raqueta" vs "Raquetas").
  const compararNombres = (a, b) =>
    String(a.title).localeCompare(String(b.title), 'es', {
      sensitivity: 'base',
    });

  switch (sortBy) {
    case 'price-asc':
      return copia.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return copia.sort((a, b) => b.price - a.price);
    case 'name-asc':
      return copia.sort(compararNombres);
    case 'name-desc':
      return copia.sort((a, b) => compararNombres(b, a));
    default:
      // "Relevancia": se respeta el orden en que llega la API.
      return copia;
  }
}

/**
 * Aplica busqueda + ordenamiento sobre el catalogo ya filtrado.
 * @returns {Array<object>} zapatos visibles segun el estado actual.
 */
function getVisibleProducts() {
  const filtrados = state.shoes.filter((product) =>
    matchesSearch(product, state.search),
  );

  return sortProducts(filtrados, state.sort);
}

/* ============================================================
 * 6. RENDERIZADO EN EL DOM
 * ============================================================ */

/**
 * Convierte un precio numerico en texto con signo de moneda.
 * @param {number} value precio del producto.
 * @returns {string} precio formateado.
 */
function formatPrice(value) {
  return priceFormatter.format(Number(value) || 0);
}

/**
 * Muestra un placeholder si la imagen del producto no se puede cargar.
 * @param {HTMLImageElement} img elemento de imagen a vigilar.
 */
function applyImageFallback(img) {
  img.addEventListener('error', () => {
    img.src = PLACEHOLDER_IMAGE;
    img.classList.add('card__image--fallback');
  });
}

/**
 * Pinta las tarjetas de esqueleto mientras se espera la respuesta de la API.
 */
function renderSkeletons() {
  const frag = document.createDocumentFragment();

  for (let i = 0; i < SKELETON_COUNT; i += 1) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton';
    skeleton.innerHTML = `
      <div class="skeleton__media"></div>
      <div class="skeleton__body">
        <div class="skeleton__line skeleton__line--short"></div>
        <div class="skeleton__line skeleton__line--medium"></div>
      </div>`;
    frag.appendChild(skeleton);
  }

  productGrid.replaceChildren(frag);
}

/**
 * Crea una miniatura del producto dentro de la tarjeta.
 * @param {string} src url de la imagen.
 * @param {string} alt texto alternativo.
 * @returns {HTMLImageElement} miniatura lista.
 */
function createThumbnail(src, alt) {
  const thumb = document.createElement('img');
  thumb.className = 'card__thumb';
  thumb.src = src;
  thumb.alt = alt;
  thumb.loading = 'lazy';
  applyImageFallback(thumb);
  return thumb;
}

/**
 * Construye una tarjeta de producto clonando la plantilla del HTML.
 * Nunca se usa innerHTML con datos de la API: todos los textos se
 * asignan con textContent, lo que evita inyeccion de codigo.
 * @param {object} product producto a mostrar.
 * @returns {HTMLElement} tarjeta completa.
 */
function createCard(product) {
  const card = cardTemplate.content.firstElementChild.cloneNode(true);

  const imagen = card.querySelector('.card__image');
  const etiqueta = card.querySelector('.card__tag');
  const titulo = card.querySelector('.card__title');
  const precio = card.querySelector('.card__price');
  const botonDetalle = card.querySelector('.card__toggle');
  const detalles = card.querySelector('.card__details');
  const descripcion = card.querySelector('.card__description');
  const miniaturas = card.querySelector('.card__thumbs');
  const identificador = card.querySelector('.card__id');

  // Imagen principal: la API puede mandar varias, usamos la primera.
  const imagenes = Array.isArray(product.images) ? product.images : [];
  imagen.src = imagenes[0] ?? PLACEHOLDER_IMAGE;
  imagen.alt = `Fotografia de ${product.title}`;
  applyImageFallback(imagen);

  etiqueta.textContent = getCategoryName(product);
  titulo.textContent = product.title;
  precio.textContent = formatPrice(product.price);
  descripcion.textContent = product.description;
  identificador.textContent = `Codigo de producto: #${product.id}`;

  // Miniaturas: permiten cambiar la foto principal de la tarjeta.
  imagenes.forEach((src) => {
    miniaturas.appendChild(createThumbnail(src, `Vista alternativa de ${product.title}`));
  });

  // El detalle permanece abierto aunque el usuario vuelva a buscar o ordenar.
  const estaAbierto = state.expanded.has(product.id);
  detalles.hidden = !estaAbierto;
  botonDetalle.setAttribute('aria-expanded', String(estaAbierto));
  botonDetalle.textContent = estaAbierto ? 'Ocultar detalle' : 'Ver detalle';

  // Guardamos el id en el DOM para recuperarlo al hacer clic.
  card.dataset.id = String(product.id);

  return card;
}

/**
 * Reemplaza el contenido de la rejilla por las tarjetas dadas.
 * @param {Array<object>} products productos a pintar.
 */
function renderCards(products) {
  const frag = document.createDocumentFragment();

  products.forEach((product) => {
    frag.appendChild(createCard(product));
  });

  // replaceChildren es mas rapido que innerHTML = '' + bucles.
  productGrid.replaceChildren(frag);
}

/**
 * Muestra u oculta los paneles de error y de "sin resultados".
 * @param {Array<object>} visible productos visibles en este momento.
 */
function updatePanels(visible) {
  const hayError = state.status === 'error';
  errorState.hidden = !hayError;

  if (hayError) {
    errorMessage.textContent = state.error;
    emptyState.hidden = true;
    return;
  }

  const sinResultados = state.status === 'ready' && visible.length === 0;
  emptyState.hidden = !sinResultados;
}

/**
 * Actualiza el texto que resume lo que hay en pantalla.
 * @param {Array<object>} visible productos visibles en este momento.
 */
function renderResultInfo(visible) {
  if (state.status === 'loading') {
    resultInfo.textContent = 'Cargando productos...';
    return;
  }

  if (state.status === 'error') {
    resultInfo.textContent = 'No se pudieron cargar los productos.';
    return;
  }

  const total = state.shoes.length;
  const mostrados = visible.length;

  if (state.search) {
    resultInfo.textContent = `Mostrando ${mostrados} de ${total} zapatos para "${state.search}".`;
    return;
  }

  resultInfo.textContent = `Mostrando ${mostrados} de ${total} zapatos disponibles.`;
}

/**
 * Punto unico de renderizado: decide que mostrar y lo pinta.
 * Todas las actualizaciones de la interfaz pasan por aqui.
 */
function render() {
  const visible = getVisibleProducts();

  if (state.status === 'loading') {
    renderSkeletons();
  } else if (state.status === 'error') {
    productGrid.replaceChildren();
  } else {
    renderCards(visible);
  }

  updatePanels(visible);
  renderResultInfo(visible);
  productGrid.setAttribute('aria-busy', String(state.status === 'loading'));
}

/* ============================================================
 * 7. MANEJO DE EVENTOS
 * ============================================================ */

/**
 * Retrasa la ejecucion de una funcion hasta que deja de llamarse.
 * Evita renderizar en cada tecla presionada.
 * @param {Function} fn funcion a envolver.
 * @param {number} delay espera en milisegundos.
 * @returns {Function} funcion con el retardo aplicado.
 */
function debounce(fn, delay) {
  let temporizador;

  return function esperando(...args) {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => fn(...args), delay);
  };
}

/** Al escribir en el buscador: actualiza el estado y vuelve a pintar. */
const handleSearchInput = debounce((event) => {
  state.search = event.target.value.trim().toLowerCase();
  render();
}, SEARCH_DEBOUNCE_MS);

/** Al cambiar el criterio de ordenamiento. */
function handleSortChange(event) {
  state.sort = event.target.value;
  render();
}

/**
 * Un solo listener para toda la rejilla (delegacion de eventos):
 *   - si se pulsa "Ver detalle", abre o cierra la tarjeta;
 *   - si se pulsa una miniatura, cambia la imagen principal.
 * @param {MouseEvent} event evento del clic.
 */
function handleGridClick(event) {
  const miniatura = event.target.closest('.card__thumb');
  if (miniatura) {
    const card = miniatura.closest('.card');
    card.querySelector('.card__image').src = miniatura.src;
    return;
  }

  const botonDetalle = event.target.closest('.card__toggle');
  if (!botonDetalle) {
    return;
  }

  const card = botonDetalle.closest('.card');
  const id = Number(card.dataset.id);
  const detalles = card.querySelector('.card__details');
  const ahoraVisible = detalles.hidden;

  // El atributo hidden se refleja tambien en el estado global, de modo que
  // el detalle siga abierto aunque el usuario vuelva a buscar o a ordenar.
  detalles.hidden = !ahoraVisible;
  botonDetalle.setAttribute('aria-expanded', String(ahoraVisible));
  botonDetalle.textContent = ahoraVisible ? 'Ocultar detalle' : 'Ver detalle';

  if (ahoraVisible) {
    state.expanded.add(id);
  } else {
    state.expanded.delete(id);
  }
}

/** Limpia el buscador y vuelve a mostrar todo el catalogo. */
function handleClearSearch() {
  searchInput.value = '';
  state.search = '';
  state.expanded.clear();
  render();
  searchInput.focus();
}

/** Reintenta la carga despues de un error de red. */
function handleRetry() {
  loadProducts();
}

/** Registra todos los listeners de la aplicacion. */
function bindEvents() {
  searchInput.addEventListener('input', handleSearchInput);
  sortSelect.addEventListener('change', handleSortChange);
  productGrid.addEventListener('click', handleGridClick);
  clearSearchButton.addEventListener('click', handleClearSearch);
  retryButton.addEventListener('click', handleRetry);
}

/* ============================================================
 * 8. INICIALIZACION
 * ============================================================ */

/** Arranca la aplicacion: registra eventos y pide los datos. */
function init() {
  bindEvents();
  loadProducts();
}

document.addEventListener('DOMContentLoaded', init);

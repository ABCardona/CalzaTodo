const API_URL = 'https://api.escuelajs.co/api/v1/products';
const TARGET_CATEGORY = 'Shoes';
const SEARCH_DEBOUNCE_MS = 250;
const SKELETON_COUNT = 8;

// Se usa si un producto no trae imagen o la URL esta caida.
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23eef2ff'/%3E%3Ctext x='200' y='158' fill='%234338ca' font-family='sans-serif' font-size='22' text-anchor='middle'%3ECalzaTodo%3C/text%3E%3C/svg%3E";

// narrowSymbol da "$951" en lugar de "USD 951", que ocupa mucho en la tarjeta.
const priceFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'USD',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

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

const state = {
  shoes: [],
  search: '',
  sort: 'default',
  status: 'loading', // 'loading' | 'ready' | 'error'
  error: '',
  expanded: new Set(), // ids de las tarjetas con el detalle abierto
};

/**
 * Descarga el catalogo y conserva solo la categoria "Shoes".
 * @returns {Promise<void>} resuelve cuando la interfaz ya esta actualizada.
 */
async function loadProducts() {
  state.status = 'loading';
  state.error = '';
  render();

  try {
    const response = await fetch(API_URL);

    // fetch solo falla por red; un 404 o 500 hay que detectarlo a mano.
    if (!response.ok) {
      throw new Error(`La API respondio con el estado ${response.status}`);
    }

    const products = await response.json();
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
 * La API entrega la categoria como objeto ({ id, name, slug }) o como texto
 * plano, segun la version, asi que se cubren los dos casos.
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
 * Trabaja sobre una copia para no modificar el arreglo original.
 * @param {Array<object>} products catalogo de zapatos.
 * @param {string} sortBy criterio de ordenamiento.
 * @returns {Array<object>} catalogo ordenado.
 */
function sortProducts(products, sortBy) {
  const copia = [...products];

  // "es" para que localeCompare trate bien los acentos y la ñ.
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
      return copia; // "Relevancia": se respeta el orden de la API.
  }
}

/**
 * Aplica busqueda y ordenamiento sobre el catalogo ya filtrado.
 * @returns {Array<object>} zapatos visibles segun el estado actual.
 */
function getVisibleProducts() {
  const filtrados = state.shoes.filter((product) =>
    matchesSearch(product, state.search),
  );

  return sortProducts(filtrados, state.sort);
}

/**
 * Convierte un precio numerico en texto con signo de moneda.
 * @param {number} value precio del producto.
 * @returns {string} precio formateado.
 */
function formatPrice(value) {
  return priceFormatter.format(Number(value) || 0);
}

/**
 * Cambia la imagen por el placeholder si la URL falla.
 * @param {HTMLImageElement} img elemento a vigilar.
 */
function applyImageFallback(img) {
  img.addEventListener('error', () => {
    img.src = PLACEHOLDER_IMAGE;
    img.classList.add('card__image--fallback');
  });
}

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
 * Construye una tarjeta clonando la plantilla del HTML. Los datos de la API
 * se asignan con textContent, nunca con innerHTML, para evitar inyeccion.
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

  // La API puede mandar varias imagenes por producto; se usa la primera.
  const imagenes = Array.isArray(product.images) ? product.images : [];
  imagen.src = imagenes[0] ?? PLACEHOLDER_IMAGE;
  imagen.alt = `Fotografia de ${product.title}`;
  applyImageFallback(imagen);

  etiqueta.textContent = getCategoryName(product);
  titulo.textContent = product.title;
  precio.textContent = formatPrice(product.price);
  descripcion.textContent = product.description;
  identificador.textContent = `Codigo de producto: #${product.id}`;

  imagenes.forEach((src) => {
    miniaturas.appendChild(createThumbnail(src, `Vista alternativa de ${product.title}`));
  });

  // El detalle sigue abierto aunque el usuario vuelva a buscar o a ordenar.
  const estaAbierto = state.expanded.has(product.id);
  detalles.hidden = !estaAbierto;
  botonDetalle.setAttribute('aria-expanded', String(estaAbierto));
  botonDetalle.textContent = estaAbierto ? 'Ocultar detalle' : 'Ver detalle';

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

  emptyState.hidden = !(state.status === 'ready' && visible.length === 0);
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
 * Punto unico de renderizado: toda actualizacion de la interfaz pasa aqui.
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

/**
 * Retrasa la ejecucion hasta que la funcion deja de ser llamada.
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

const handleSearchInput = debounce((event) => {
  state.search = event.target.value.trim().toLowerCase();
  render();
}, SEARCH_DEBOUNCE_MS);

function handleSortChange(event) {
  state.sort = event.target.value;
  render();
}

/**
 * Un solo listener para toda la rejilla (delegacion de eventos): si se pulsa
 * "Ver detalle" abre o cierra la tarjeta, y si se pulsa una miniatura cambia
 * la imagen principal.
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

  detalles.hidden = !ahoraVisible;
  botonDetalle.setAttribute('aria-expanded', String(ahoraVisible));
  botonDetalle.textContent = ahoraVisible ? 'Ocultar detalle' : 'Ver detalle';

  if (ahoraVisible) {
    state.expanded.add(id);
  } else {
    state.expanded.delete(id);
  }
}

function handleClearSearch() {
  searchInput.value = '';
  state.search = '';
  state.expanded.clear();
  render();
  searchInput.focus();
}

function handleRetry() {
  loadProducts();
}

function bindEvents() {
  searchInput.addEventListener('input', handleSearchInput);
  sortSelect.addEventListener('change', handleSortChange);
  productGrid.addEventListener('click', handleGridClick);
  clearSearchButton.addEventListener('click', handleClearSearch);
  retryButton.addEventListener('click', handleRetry);
}

function init() {
  bindEvents();
  loadProducts();
}

document.addEventListener('DOMContentLoaded', init);

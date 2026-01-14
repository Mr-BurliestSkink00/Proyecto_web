// js/filters.js


import { abrirModal, setupPagination, renderPagination } from './products.js';
let gridProductos, inputBusqueda, botonesCategoria, mensajeEstado;

// 1. Función para obtener productos de DummyJSON (la versión paginada está implementada más abajo)



// 2. Función para renderizar los productos en el HTML
let paginaActual = 1;
let totalProductos = 0;
const productosPorPagina = 10;
let urlActual = 'https://dummyjson.com/products';

// Función para cargar productos con paginación
export async function cargarProductos(url = 'https://dummyjson.com/products', pagina = 1) {
    console.log('cargarProductos called with', url, 'page', pagina);
    try {
        // ensure DOM refs exist
        if(!gridProductos) gridProductos = document.getElementById('productos-grid');
        if(!mensajeEstado) mensajeEstado = document.getElementById('mensaje-estado');
        if(mensajeEstado) mensajeEstado.innerText = 'Cargando productos...';
        if(!gridProductos){ console.error('Element #productos-grid no encontrado'); if(mensajeEstado) mensajeEstado.innerText = 'Error interno: No se encontró el contenedor.'; return; }
        gridProductos.innerHTML = ''; // Limpiar grid

        // Guardar URL actual para que la paginación vuelva a cargar la misma consulta
        urlActual = url;

        // Construir URL con limit/skip de forma segura (no romper querys existentes)
        const urlObj = new URL(url);
        urlObj.searchParams.set('limit', productosPorPagina);
        const skip = Math.max(0, (pagina - 1) * productosPorPagina);
        urlObj.searchParams.set('skip', skip);

        const response = await fetch(urlObj.toString());
        const data = await response.json();

        // Guardar meta
        totalProductos = data.total ?? (data.products ? data.products.length : 0);
        paginaActual = pagina;

        renderizarProductos(data.products);
        // Usar la paginación provista por products.js (Bootstrap)
        renderPagination(totalProductos, productosPorPagina, paginaActual);

        if(mensajeEstado) mensajeEstado.innerText = '';
    } catch (error) {
        console.error('Error cargando productos:', error);
        if(mensajeEstado) mensajeEstado.innerText = 'Error al conectar con la tienda. Intenta de nuevo.';
    }
}


export function renderizarProductos(productos) {
    if (!productos || productos.length === 0) {
        gridProductos.innerHTML = "<p>No se encontraron productos.</p>";
        return;
    }

    productos.forEach(prod => {
        const col = document.createElement('div');
        col.className = 'col-12 col-sm-6 col-md-4 col-lg-3 mb-4';

        const article = document.createElement('article');
        article.className = 'producto-card card h-100';
        const imgSrc = prod.thumbnail || (prod.images && prod.images[0]) || '';

        article.innerHTML = `
            <img src="${imgSrc}" alt="${prod.title}" class="producto-imagen card-img-top" data-id="${prod.id}">
            <div class="card-body d-flex flex-column">
                <h3 class="producto-nombre card-title">${prod.title}</h3>
                <div class="producto-precio mb-3">US$ ${prod.price}</div>
                <div class="mt-auto">
                  <button class="producto-boton btn btn-primary w-100" data-id="${prod.id}">Agregar</button>
                </div>
            </div>
        `;

        col.appendChild(article);
        gridProductos.appendChild(col);

        const img = article.querySelector('.producto-imagen');
        if(img){
            img.style.cursor = 'zoom-in';
            img.addEventListener('click', () => abrirModal(prod.id));
        }
    });
}

let timeoutBusqueda;

export function initFilters(){
  gridProductos = document.getElementById('productos-grid');
  inputBusqueda = document.getElementById('input-busqueda');
  botonesCategoria = document.querySelectorAll('.categoria-btn');
  mensajeEstado = document.getElementById('mensaje-estado');

  // Inicializar paginación: pasar callback para cargar página seleccionada
  try { setupPagination((page) => cargarProductos(urlActual, page)); } catch(err){ console.error('Error inicializando paginación', err); }

  // category buttons
  if(botonesCategoria && botonesCategoria.length){
    botonesCategoria.forEach(boton => {
      boton.addEventListener('click', (e) => {
        botonesCategoria.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        const categoria = e.target.dataset.category;
        if (categoria === "all") {
            cargarProductos();
        } else {
            cargarProductos(`https://dummyjson.com/products/category/${categoria}`);
        }
      });
    });
  } else { console.warn('No se encontraron botones de categoria (.categoria-btn)'); }

  // search input
  if(inputBusqueda){
    inputBusqueda.addEventListener('input', () => {
      clearTimeout(timeoutBusqueda);
      timeoutBusqueda = setTimeout(() => {
        const query = inputBusqueda.value;
        if (query.length > 2) {
            cargarProductos(`https://dummyjson.com/products/search?q=${encodeURIComponent(query)}`);
        } else if (query.length === 0) {
            cargarProductos();
        }
      }, 500);
    });
  } else { console.warn('Input #input-busqueda no encontrado'); }
} 
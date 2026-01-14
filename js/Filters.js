// js/filters.js


import { abrirModal } from './products.js';
let gridProductos, inputBusqueda, botonesCategoria, mensajeEstado;

// 1. Función para obtener productos de DummyJSON
export async function cargarProductos(url = 'https://dummyjson.com/products') {
    console.log('cargarProductos called with', url);
    try {
        // ensure DOM refs exist
        if(!gridProductos) gridProductos = document.getElementById('productos-grid');
        if(!mensajeEstado) mensajeEstado = document.getElementById('mensaje-estado');
        if(mensajeEstado) mensajeEstado.innerText = "Cargando productos...";
        if(!gridProductos){ console.error('Element #productos-grid no encontrado'); if(mensajeEstado) mensajeEstado.innerText = "Error interno: No se encontró el contenedor."; return; }
        gridProductos.innerHTML = ""; // Limpiar grid
        
        const response = await fetch(url);
        const data = await response.json();
        
        renderizarProductos(data.products);
        if(mensajeEstado) mensajeEstado.innerText = "";
    } catch (error) {
        console.error("Error cargando productos:", error);
        if(mensajeEstado) mensajeEstado.innerText = "Error al conectar con la tienda. Intenta de nuevo.";
    }
} 

// 2. Función para renderizar los productos en el HTML
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
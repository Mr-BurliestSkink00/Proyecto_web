// js/filters.js

const gridProductos = document.getElementById('productos-grid');
const inputBusqueda = document.getElementById('input-busqueda');
const botonesCategoria = document.querySelectorAll('.categoria-btn');
const mensajeEstado = document.getElementById('mensaje-estado');

// 1. Función para obtener productos de DummyJSON
async function cargarProductos(url = 'https://dummyjson.com/products') {
    try {
        mensajeEstado.innerText = "Cargando productos...";
        gridProductos.innerHTML = ""; // Limpiar grid
        
        const response = await fetch(url);
        const data = await response.json();
        
        renderizarProductos(data.products);
        mensajeEstado.innerText = "";
    } catch (error) {
        console.error("Error cargando productos:", error);
        mensajeEstado.innerText = "Error al conectar con la tienda. Intenta de nuevo.";
    }
}

// 2. Función para renderizar los productos en el HTML
function renderizarProductos(productos) {
    if (productos.length === 0) {
        gridProductos.innerHTML = "<p>No se encontraron productos.</p>";
        return;
    }

    productos.forEach(prod => {
        const article = document.createElement('article');
        article.innerHTML = `
            <h3 class="producto-nombre">${prod.title}</h3>
            <figure>
                <img src="${prod.thumbnail}" alt="${prod.title}">
                <div class="producto-precio">US$ ${prod.price}</div>
                <button class="producto-boton" onclick="agregarAlCarrito(${prod.id})">Agregar</button>
            </figure>
        `;
        gridProductos.appendChild(article);
    });
}

// 3. Evento: Filtrar por Categoría
botonesCategoria.forEach(boton => {
    boton.addEventListener('click', (e) => {
        // Estética de botones
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

// 4. Evento: Búsqueda por texto (con Delay para no saturar la API)
let timeoutBusqueda;
inputBusqueda.addEventListener('input', () => {
    clearTimeout(timeoutBusqueda);
    timeoutBusqueda = setTimeout(() => {
        const query = inputBusqueda.value;
        if (query.length > 2) {
            cargarProductos(`https://dummyjson.com/products/search?q=${query}`);
        } else if (query.length === 0) {
            cargarProductos();
        }
    }, 500);
});

// Inicializar carga al abrir la página
document.addEventListener('DOMContentLoaded', () => cargarProductos());
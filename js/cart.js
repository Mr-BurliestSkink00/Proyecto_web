
(function(){
  'use strict';

  const STORAGE_KEY = 'carrito';
  let carrito = [];

  function guardarCarrito(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(carrito));
    actualizarContador();
    renderizarCarrito();
    try{ window.dispatchEvent(new CustomEvent('cartUpdated', { detail: carrito })); }catch(_){/* ignore */}
  }

  function cargarCarrito(){
    carrito = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    actualizarContador();
    renderizarCarrito();
  }

  function actualizarContador(){
    const el = document.getElementById('contador_carrito');
    const cartCountEl = document.getElementById('cart-count');
    const total = carrito.reduce((s, p) => s + (p.cantidad || 0), 0);
    if(el) el.textContent = total;
    if(cartCountEl) cartCountEl.textContent = `${total} ${total===1? 'item' : 'items'}`;
  }

  function formatearPrecio(n){
    try{
      return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(n);
    }catch(e){
      return '$' + (n || 0).toFixed(2);
    }
  }

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, function(ch){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]);
    });
  }

  function agregarAlCarrito(id){
    if(!id) return;
    fetch(`https://dummyjson.com/products/${id}`)
      .then(r => r.json())
      .then(prod => {
        const producto = {
          id: String(prod.id),
          nombre: prod.title,
          precio: Number(prod.price) || 0,
          imagen: prod.thumbnail || '',
          cantidad: 1,
          category: prod.category || '',
          brand: prod.brand || ''
        };

        const existente = carrito.find(p => p.id === producto.id);
        if(existente){ existente.cantidad += 1; }
        else { carrito.push(producto); }

        guardarCarrito();
      })
      .catch(err => {
        console.error('Error al obtener producto:', err);
        alert('No se pudo agregar el producto. Intenta nuevamente');
      });
  }

  document.addEventListener('click', function(e){
    const btn = e.target.closest('.producto-boton-carrito');
    if(!btn) return;
    e.preventDefault();

    const card = btn.closest('.producto-destacado, article, .producto-card') || btn.closest('figure') || document.body;
    const nombre = (card.querySelector('h3')?.textContent || 'Producto').trim();
    const precioText = card.querySelector('.producto-precio')?.textContent || card.querySelector('.precio')?.textContent || '';
    const precio = parseFloat(String(precioText).replace(/[^0-9.,-]/g,'').replace(',', '.')) || 0;
    const imagen = card.querySelector('img')?.src || '';
    const id = `${nombre}|${precio}`; 

    const producto = { id: String(id), nombre, precio, imagen, cantidad: 1 };
    const existente = carrito.find(p => p.id === producto.id);
    if(existente) existente.cantidad += 1; else carrito.push(producto);
    guardarCarrito();

    try{
      const textoOrig = btn.textContent;
      btn.textContent = 'Añadido ✓';
      btn.disabled = true;
      setTimeout(()=>{ btn.textContent = textoOrig; btn.disabled = false; }, 700);
    }catch(_){/* ignorar */}
  });

  function renderizarCarrito(){
    const tbody = document.querySelector('#lista_Carrito tbody');
    if(!tbody) return;
    tbody.innerHTML = '';

    if(!carrito || carrito.length === 0){
      tbody.innerHTML = '<tr><td colspan="5">El carrito está vacío</td></tr>';
      const cartTotalEl = document.getElementById('cart-total'); if(cartTotalEl) cartTotalEl.textContent = formatearPrecio(0);
      const checkoutBtn = document.getElementById('checkout_btn'); if(checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    let total = 0;
    carrito.forEach(item => {
      total += (item.precio || 0) * (item.cantidad || 1);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="width:70px;"><img class="cart-thumb" src="${escapeHtml(item.imagen)}" alt="${escapeHtml(item.nombre)}"></td>
        <td>${escapeHtml(item.nombre)}</td>
        <td style="width:120px; text-align:center;">
          <div class="qty-controls" data-id="${escapeHtml(item.id)}">
            <button class="qty-decrease btn btn-sm btn-outline-secondary" data-id="${escapeHtml(item.id)}">-</button>
            <span class="qty-count" aria-live="polite">${item.cantidad}</span>
            <button class="qty-increase btn btn-sm btn-outline-secondary" data-id="${escapeHtml(item.id)}">+</button>
          </div>
        </td>
        <td>${formatearPrecio(item.precio * item.cantidad)}</td>
        <td><button class="borrar-elemento btn btn-sm btn-outline-danger" data-id="${escapeHtml(item.id)}" aria-label="Eliminar">Eliminar</button></td>
      `;
      tbody.appendChild(tr);
    });


    const cartTotalEl = document.getElementById('cart-total'); if(cartTotalEl) cartTotalEl.textContent = formatearPrecio(total);
    const checkoutBtn = document.getElementById('checkout_btn'); if(checkoutBtn) checkoutBtn.disabled = carrito.length === 0;
  }

  function eliminarProducto(id){
    if(!id) return;
    carrito = carrito.filter(p => p.id !== id);
    guardarCarrito();
  }


  function modificarCantidad(id, delta){
    if(!id || !delta) return;
    const idx = carrito.findIndex(p => String(p.id) === String(id));
    if(idx === -1) return;
    carrito[idx].cantidad = (carrito[idx].cantidad || 1) + Number(delta);
    if(carrito[idx].cantidad <= 0){

      carrito.splice(idx, 1);
    }
    guardarCarrito();
  }

  function vaciarCarrito(){
    carrito = [];
    guardarCarrito();
  }


  document.addEventListener('click', function(e){

    if(e.target.matches('#clean_cart')){ e.preventDefault(); vaciarCarrito(); return; }

    if(e.target.matches('#checkout_btn')){ e.preventDefault(); if(!carrito || carrito.length===0){ alert('El carrito está vacío'); } else { alert('Compra simulada — gracias por tu compra.'); vaciarCarrito(); const dd = document.getElementById('cart-dropdown'); if(dd){ dd.setAttribute('hidden',''); document.getElementById('btn-carrito')?.setAttribute('aria-expanded','false'); } } return; }

    const dec = e.target.closest('.qty-decrease');
    if(dec){ e.preventDefault(); const id = dec.dataset.id; if(id) modificarCantidad(id, -1); return; }

    const inc = e.target.closest('.qty-increase');
    if(inc){ e.preventDefault(); const id = inc.dataset.id; if(id) modificarCantidad(id, 1); return; }

    const rem = e.target.closest('.borrar-elemento');
    if(rem){ e.preventDefault(); const id = rem.dataset.id; eliminarProducto(id); return; }

    const toggle = e.target.closest('#btn-carrito');
    if(toggle){
      const dd = document.getElementById('cart-dropdown');
      if(!dd) return;
      const abierto = !dd.hasAttribute('hidden');
      if(abierto){ dd.setAttribute('hidden', ''); toggle.setAttribute('aria-expanded','false'); }
      else { dd.removeAttribute('hidden'); toggle.setAttribute('aria-expanded','true'); }
    }

    const listadoBtn = e.target.closest('.producto-boton[data-id]');
    if(listadoBtn){
      e.preventDefault();
      const id = listadoBtn.dataset.id;
      if(id) agregarAlCarrito(id);
      return;
    }
  });

  document.addEventListener('click', function(e){
    const dd = document.getElementById('cart-dropdown');
    const toggle = document.getElementById('btn-carrito');
    if(!dd || !toggle) return;
    if(!dd.contains(e.target) && !toggle.contains(e.target)){
      dd.setAttribute('hidden',''); toggle.setAttribute('aria-expanded','false');
    }
  });

  try{ window.initCart = cargarCarrito; }catch(_){ /* ignore */ }
})();
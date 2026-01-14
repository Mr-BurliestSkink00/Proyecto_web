export async function abrirModal(id){
    try{
        const res = await fetch(`https://dummyjson.com/products/${id}`);
        const prod = await res.json();

        let modalEl = document.getElementById('productModal');
        if(!modalEl){
            modalEl = document.createElement('div');
            modalEl.id = 'productModal';
            modalEl.className = 'modal fade';
            modalEl.tabIndex = -1;
            modalEl.innerHTML = `
              <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title">Producto</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                  </div>
                  <div class="modal-body d-flex flex-column flex-md-row gap-3">
                    <img class="modal-image" src="" alt="" style="max-width:320px; width:100%; object-fit:contain; border-radius:8px;">
                    <div class="modal-info">
                      <div class="modal-meta text-muted mb-2"></div>
                      <p class="modal-desc"></p>
                      <div class="modal-price h4 mt-2"></div>
                      <button class="btn btn-primary add-to-cart-btn mt-3" data-id="">Agregar al carrito</button>
                    </div>
                  </div>
                </div>
              </div>
            `;
            document.body.appendChild(modalEl);
        }

        modalEl.querySelector('.modal-title').textContent = prod.title || '';
        const imgEl = modalEl.querySelector('.modal-image');
        imgEl.src = (prod.images && prod.images[0]) || prod.thumbnail || '';
        imgEl.alt = prod.title || '';
        modalEl.querySelector('.modal-meta').textContent = `Marca: ${prod.brand || ''} • Categoría: ${prod.category || ''} • Stock: ${prod.stock || 0}`;
        modalEl.querySelector('.modal-desc').textContent = prod.description || '';
        modalEl.querySelector('.modal-price').textContent = `US$ ${prod.price}`;
        const addBtn = modalEl.querySelector('.add-to-cart-btn');
        if(addBtn) addBtn.dataset.id = prod.id;

        try{ window.dispatchEvent(new CustomEvent('productViewed', { detail: prod })); }catch(_){/* ignore */}

        const bsModal = new bootstrap.Modal(modalEl);
        bsModal.show();

    }catch(err){
        console.error('Error al cargar detalle del producto:', err);
        alert('No se pudieron cargar los detalles del producto. Intenta de nuevo.');
    }
}
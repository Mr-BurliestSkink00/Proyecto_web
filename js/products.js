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

// PAGINACIÓN (moved from Filters.js) — usa Bootstrap
let _onPageChange = null;

export function setupPagination(onPageChange) {
    _onPageChange = onPageChange;
}

export function renderPagination(totalItems, itemsPerPage, currentPage) {
    const container = document.getElementById('paginacion');
    if(!container) return;
    container.innerHTML = '';

    const totalPages = Math.max(1, Math.ceil((totalItems || 0) / itemsPerPage));

    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', 'Paginación del catálogo');
    const ul = document.createElement('ul');
    ul.className = 'pagination';

    // Previous
    const prevLi = document.createElement('li');
    prevLi.className = 'page-item' + (currentPage <= 1 ? ' disabled' : '');
    prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Anterior"><span aria-hidden="true">&laquo;</span></a>`;
    prevLi.addEventListener('click', (e) => {
        e.preventDefault();
        if(currentPage > 1) callPage(currentPage - 1);
    });
    ul.appendChild(prevLi);

    // Page range (sliding window)
    const maxButtons = 7;
    let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let end = start + maxButtons - 1;
    if (end > totalPages) { end = totalPages; start = Math.max(1, end - maxButtons + 1); }

    for (let i = start; i <= end; i++) {
        const li = document.createElement('li');
        li.className = 'page-item' + (i === currentPage ? ' active' : '');
        li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        li.addEventListener('click', (e) => { e.preventDefault(); if(i !== currentPage) callPage(i); });
        ul.appendChild(li);
    }

    // Next
    const nextLi = document.createElement('li');
    nextLi.className = 'page-item' + (currentPage >= totalPages ? ' disabled' : '');
    nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Siguiente"><span aria-hidden="true">&raquo;</span></a>`;
    nextLi.addEventListener('click', (e) => { e.preventDefault(); if(currentPage < totalPages) callPage(currentPage + 1); });
    ul.appendChild(nextLi);

    nav.appendChild(ul);
    container.appendChild(nav);

    function callPage(page){
        if(typeof _onPageChange === 'function'){
            _onPageChange(page);
        } else {
            window.dispatchEvent(new CustomEvent('pageChange', { detail: { page } }));
        }
    }
}
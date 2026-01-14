import { cargarProductos, initFilters } from './Filters.js';
import { initProfile } from './profile.js';

document.addEventListener('DOMContentLoaded', ()=>{
  console.log('main.js: DOMContentLoaded — initializing app');

  try{ initFilters(); }catch(e){ console.error('main.js: error initializing filters', e); }


  try{ if(window.initCart){ window.initCart(); } }catch(e){ console.error('main.js: error initializing cart', e); }

  try{ initProfile(); }catch(e){ console.error('main.js: error initializing profile', e); }

  try{ cargarProductos(); }catch(e){ console.error('main.js: error loading products', e); }
});

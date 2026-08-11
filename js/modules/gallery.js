// js/modules/gallery.js


async function initGallery() {
    const searchInput = document.getElementById('gallerySearch');
    searchInput.addEventListener('input', (e) => renderGallery(e.target.value));
    await renderGallery('');
}

async function renderGallery(searchTerm) {
    const fullVariants = await getFullVariants();
    const grid = document.getElementById('galleryGrid');
    grid.innerHTML = '';
    
    const term = searchTerm.toLowerCase();
    
    const filtered = fullVariants.filter(v => {
        if (v.product.category === 'Papelería') return false;
        
        return v.product.name.toLowerCase().includes(term) || 
               v.colorName.toLowerCase().includes(term) ||
               (v.product.category && v.product.category.toLowerCase().includes(term));
    });
    
    if (filtered.length === 0) {
        grid.innerHTML = '<p style="color:var(--text-secondary); grid-column: 1/-1;">No se encontraron resultados.</p>';
        return;
    }
    
    filtered.forEach(v => {
        let stockClass = 'stock-good';
        let stockText = 'Disponible';
        if (v.stock <= 0) { stockClass = 'stock-out'; stockText = 'Agotado'; }
        else if (v.stock <= v.minStock) { stockClass = 'stock-low'; stockText = 'Bajo Inventario'; }
        
        const card = document.createElement('div');
        card.className = 'gallery-card';
        card.innerHTML = `
            ${v.photo ? `<img src="${v.photo}" alt="${v.product.name}">` : `<div style="height:180px;background:#eee;display:flex;align-items:center;justify-content:center;color:#aaa;"><i data-lucide="image" style="width:48px;height:48px;"></i></div>`}
            <div class="gallery-card-content">
                <div class="gallery-card-title">${v.product.name}</div>
                <div class="gallery-card-variant">${v.colorName}</div>
                <div class="gallery-card-stock" style="margin-bottom: 10px;">
                    <span class="stock-indicator ${stockClass}"></span>
                    <span>${v.stock} unidades</span>
                </div>
                <span class="badge ${stockClass === 'stock-good' ? 'badge-success' : (stockClass === 'stock-low' ? 'badge-warning' : 'badge-danger')}">
                    ${stockText}
                </span>
            </div>
        `;
        grid.appendChild(card);
    });
    
    if (window.lucide) lucide.createIcons({ root: grid });
}

window.initGallery = initGallery;

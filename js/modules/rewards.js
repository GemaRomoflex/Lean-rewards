// js/modules/rewards.js

async function initRewards() {
    await loadRewardsCatalog();
}

async function loadRewardsCatalog() {
    const grid = document.getElementById('rewardsGrid');
    grid.innerHTML = '<div style="text-align:center; width:100%;">Cargando premios...</div>';
    
    const [products, variants] = await Promise.all([
        window.db.products.toArray(),
        window.db.variants.toArray()
    ]);
    
    // Filter only Premios Lean
    const premios = products.filter(p => p.category === 'Premios Lean' && p.status === 'Disponible');
    
    const catalog = [];
    premios.forEach(p => {
        const pVars = variants.filter(v => v.productId === p.id);
        pVars.forEach(v => {
            if (v.stock > 0) {
                catalog.push({
                    product: p,
                    variant: v
                });
            }
        });
    });
    
    grid.innerHTML = '';
    
    if (catalog.length === 0) {
        grid.innerHTML = '<div style="text-align:center; width:100%; color:var(--text-secondary);">No hay premios disponibles por el momento.</div>';
        return;
    }
    
    const user = window.getCurrentUserObj();
    const userPoints = user ? (user.points || 0) : 0;
    
    catalog.forEach(item => {
        const p = item.product;
        const v = item.variant;
        const cost = p.pointsCost || 0;
        const canAfford = userPoints >= cost;
        
        const div = document.createElement('div');
        div.className = 'gallery-card';
        div.style.cursor = canAfford ? 'pointer' : 'not-allowed';
        if (canAfford) {
            div.onclick = () => window.redeemReward(v.id, cost);
        }
        
        div.innerHTML = `
            ${v.photo ? `<img src="${v.photo}" alt="${p.name}">` : `<div style="height:180px;background:#eee;display:flex;align-items:center;justify-content:center;color:#aaa;"><i data-lucide="image" style="width:48px;height:48px;"></i></div>`}
            <div class="gallery-card-content">
                <div class="gallery-card-title">${p.name}</div>
                <div class="gallery-card-variant">${v.colorName}</div>
                <div class="gallery-card-stock" style="margin-bottom: 10px;">
                    <span class="stock-indicator stock-good"></span>
                    <span>${v.stock} unidades</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 15px;">
                    <span style="color:var(--primary); font-weight:bold; font-size:1.1rem;">
                        <i data-lucide="coins" style="width:16px;"></i> ${cost} Pts
                    </span>
                    ${!canAfford ? `<span class="badge badge-danger">Puntos Insuficientes</span>` : `<span class="badge badge-success">Canjear</span>`}
                </div>
            </div>
        `;
        grid.appendChild(div);
    });
    
    if (window.lucide) lucide.createIcons({ root: grid });
}

window.redeemReward = async (variantId, cost) => {
    const user = window.getCurrentUserObj();
    if (!user) return showToast('Error: Usuario no identificado', 'error');
    
    if (user.points < cost) {
        return showToast('No tienes puntos suficientes', 'warning');
    }
    
    if (!confirm(`¿Estás seguro de canjear este premio por ${cost} puntos?`)) return;
    
    try {
        // Fetch fresh variant to check stock
        const v = await window.db.variants.get(variantId);
        if (!v || v.stock < 1) {
            return showToast('El premio ya no está disponible (sin stock)', 'error');
        }
        
        // 1. Deduct points
        user.points -= cost;
        await window.db.users.put(user);
        
        // Update UI Header
        document.getElementById('currentUserPoints').textContent = user.points + ' Pts';
        
        // 2. Create Point Transaction
        const ptTx = {
            userId: user.employee_id,
            amount: cost,
            type: 'REDEEM',
            variantId: variantId,
            reason: 'Canje de Premio',
            adminId: null
        };
        await window.db.point_transactions.add(ptTx);
        
        // 3. Deduct Inventory
        v.stock -= 1;
        await window.db.variants.put(v);
        
        // 4. Create Inventory Transaction
        const invTx = {
            date: new Date().toISOString(),
            type: 'OUT',
            variantId: variantId,
            userId: user.name,
            quantity: 1,
            comments: 'Canje de Premio mediante Puntos'
        };
        await window.db.transactions.add(invTx);
        
        showToast('¡Premio canjeado exitosamente!', 'success');
        
        // Reload Catalog
        await loadRewardsCatalog();
        
    } catch (e) {
        console.error(e);
        showToast('Ocurrió un error al canjear el premio', 'error');
    }
};

window.initRewards = initRewards;

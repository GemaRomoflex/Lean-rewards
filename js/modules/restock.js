// js/modules/restock.js

async function initRestock() {
    await loadRestockData();
    
    const btnExport = document.getElementById('btnExportRestock');
    if (btnExport) {
        // Prevent multiple listeners if re-initialized
        btnExport.removeEventListener('click', exportRestockExcel);
        btnExport.addEventListener('click', exportRestockExcel);
    }
}

async function loadRestockData() {
    const tbody = document.getElementById('restockTableBody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Analizando inventario...</td></tr>';
    
    const [products, variants, providers] = await Promise.all([
        window.db.products.toArray(),
        window.db.variants.toArray(),
        window.db.providers.toArray()
    ]);
    
    // Map providers for quick lookup
    const provMap = {};
    providers.forEach(p => provMap[p.id] = p.name);
    
    // Map products for quick lookup
    const prodMap = {};
    products.forEach(p => prodMap[p.id] = p);
    
    const suggestions = [];
    
    variants.forEach(v => {
        const p = prodMap[v.productId];
        if (!p) return; // Orphan variant?
        
        // Skip "Premios Lean" if they don't want restock for it, but the spec says "Mantienen alertas de reabastecimiento" for others, so we just do it for all.
        const stock = v.stock || 0;
        const min = v.minStock || 0;
        const max = v.maxStock || 0;
        
        if (stock <= min) {
            const suggestionQty = max > stock ? (max - stock) : (min > 0 ? min * 2 : 10); // Fallback if max is not set correctly
            
            suggestions.push({
                providerName: provMap[p.providerId] || 'Sin Proveedor',
                providerId: p.providerId,
                productName: `${p.name} - ${v.colorName}`,
                stock: stock,
                min: min,
                max: max,
                suggestion: suggestionQty,
                leadTime: providers.find(prov => prov.id == p.providerId)?.leadTimeDays || 7
            });
        }
    });
    
    // Sort by Provider, then Product
    suggestions.sort((a, b) => a.providerName.localeCompare(b.providerName));
    
    window.currentRestockSuggestions = suggestions;
    
    tbody.innerHTML = '';
    
    if (suggestions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Inventario saludable. No hay sugerencias de compra.</td></tr>';
        return;
    }
    
    suggestions.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${s.providerName}</strong></td>
            <td>${s.productName}</td>
            <td><span style="color:var(--danger); font-weight:bold;">${s.stock}</span></td>
            <td>${s.min} / ${s.max}</td>
            <td><span class="badge badge-success">+ ${s.suggestion}</span></td>
            <td><span class="badge badge-warning">Requiere Reorden</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function exportRestockExcel() {
    const suggestions = window.currentRestockSuggestions || [];
    if (suggestions.length === 0) {
        return showToast('No hay sugerencias para exportar', 'warning');
    }
    
    // Group by provider
    const grouped = {};
    suggestions.forEach(s => {
        if (!grouped[s.providerName]) grouped[s.providerName] = [];
        grouped[s.providerName].push(s);
    });
    
    const wb = XLSX.utils.book_new();
    const today = new Date().toLocaleDateString();
    
    for (const provider in grouped) {
        const items = grouped[provider];
        
        // Convert to Array of Arrays for SheetJS
        const data = [
            ["Orden de Compra Sugerida"],
            ["Proveedor:", provider],
            ["Fecha:", today],
            [],
            ["Producto", "Stock Actual", "Mínimo", "Máximo", "Cantidad a Comprar", "Lead Time (Días)"]
        ];
        
        items.forEach(item => {
            data.push([
                item.productName,
                item.stock,
                item.min,
                item.max,
                item.suggestion,
                item.leadTime
            ]);
        });
        
        // Add sheet. Max sheet name length in excel is 31
        let safeSheetName = provider.replace(/[^a-zA-Z0-9]/g, ' ').substring(0, 30).trim();
        if (!safeSheetName) safeSheetName = 'Proveedor';
        
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
    }
    
    XLSX.writeFile(wb, `Ordenes_Sugeridas_${new Date().getTime()}.xlsx`);
    showToast('Archivo Excel generado correctamente');
}

window.initRestock = initRestock;

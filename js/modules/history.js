// js/modules/history.js


async function initHistory() {
    await renderHistoryTable();
    
    const btnExport = document.getElementById('btnExportHistory');
    const btnExportClone = btnExport.cloneNode(true);
    btnExport.parentNode.replaceChild(btnExportClone, btnExport);
    
    btnExportClone.addEventListener('click', exportToCSV);
}

async function renderHistoryTable() {
    const transactions = await db.transactions.orderBy('date').reverse().toArray();
    const fullVariants = await getFullVariants();
    
    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '';
    
    transactions.forEach(t => {
        const variant = fullVariants.find(v => v.id === t.variantId);
        const tr = document.createElement('tr');
        
        const dateObj = new Date(t.date);
        const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();
        
        let typeBadge = '';
        if (t.type === 'IN') typeBadge = '<span class="badge badge-success"><i data-lucide="arrow-down-to-line" style="width:12px;height:12px;"></i> Entrada</span>';
        else if (t.type === 'OUT') typeBadge = '<span class="badge badge-danger"><i data-lucide="arrow-up-right" style="width:12px;height:12px;"></i> Salida</span>';
        else typeBadge = '<span class="badge badge-warning"><i data-lucide="clipboard-check" style="width:12px;height:12px;"></i> Ajuste Auditoría</span>';
        
        tr.innerHTML = `
            <td><small>${dateStr}</small></td>
            <td><strong>${t.userId}</strong></td>
            <td>${typeBadge}</td>
            <td>${variant ? `${variant.product.name} - ${variant.colorName}` : 'Desconocido'}</td>
            <td><strong>${t.type === 'OUT' ? '-' : (t.type === 'IN' ? '+' : '')}${t.quantity}</strong></td>
            <td><small>${t.comments}</small></td>
        `;
        tbody.appendChild(tr);
    });
    
    if (window.lucide) lucide.createIcons({ root: tbody });
}

async function exportToCSV() {
    const transactions = await db.transactions.orderBy('date').reverse().toArray();
    const fullVariants = await getFullVariants();
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Fecha,Usuario,Tipo,Producto,Variante,Cantidad,Comentarios\n";
    
    transactions.forEach(t => {
        const variant = fullVariants.find(v => v.id === t.variantId);
        const dateStr = new Date(t.date).toLocaleString().replace(',', '');
        const pName = variant ? variant.product.name : '';
        const vName = variant ? variant.colorName : '';
        
        // Escape quotes and commas in comments
        const comments = `"${t.comments.replace(/"/g, '""')}"`;
        
        const row = `${dateStr},${t.userId},${t.type},"${pName}","${vName}",${t.quantity},${comments}`;
        csvContent += row + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "historial_inventario.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.initHistory = initHistory;

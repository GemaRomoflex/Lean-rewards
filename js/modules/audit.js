// js/modules/audit.js




let physicalCount = {}; // variantId -> qty
let auditScanner = null;
let currentFullVariants = [];

async function initAudit() {
    const btnStart = document.getElementById('btnStartAudit');
    const btnAddManual = document.getElementById('btnAuditManualAdd');
    const btnFinish = document.getElementById('btnFinishAudit');
    
    // Evitar listeners múltiples
    const btnStartClone = btnStart.cloneNode(true);
    btnStart.parentNode.replaceChild(btnStartClone, btnStart);
    btnStartClone.addEventListener('click', startAudit);
    
    const btnAddClone = btnAddManual.cloneNode(true);
    btnAddManual.parentNode.replaceChild(btnAddClone, btnAddManual);
    btnAddClone.addEventListener('click', addManualAudit);
    
    const btnFinishClone = btnFinish.cloneNode(true);
    btnFinish.parentNode.replaceChild(btnFinishClone, btnFinish);
    btnFinishClone.addEventListener('click', finishAudit);
}

async function startAudit() {
    document.getElementById('btnStartAudit').classList.add('hidden');
    document.getElementById('auditActiveArea').classList.remove('hidden');
    document.getElementById('auditResultsArea').classList.add('hidden');
    
    physicalCount = {};
    currentFullVariants = await getFullVariants();
    
    renderAuditTable();
    populateAuditSelect();
    
    // Iniciar escáner
    if (auditScanner) {
        try { await auditScanner.clear(); } catch(e) {}
    }
    const config = { 
        fps: 10, 
        qrbox: function(viewfinderWidth, viewfinderHeight) {
            const minEdgePercentage = 0.7; 
            const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
            return { width: qrboxSize, height: qrboxSize };
        },
        aspectRatio: 1.0
    };
    
    if (typeof Html5QrcodeSupportedFormats !== 'undefined') {
        config.formatsToSupport = [ Html5QrcodeSupportedFormats.QR_CODE ];
    }
    
    auditScanner = new Html5QrcodeScanner("audit-qr-reader", config, false);
    auditScanner.render(onAuditScanSuccess, () => {});
}

function onAuditScanSuccess(decodedText) {
    // Para auditoría, el usuario escanea SKU de cada unidad o el SKU de la caja (asumiendo 1 unidad si no ingresa cantidad).
    // Aquí implementamos conteo +1 por cada lectura de QR.
    const variant = currentFullVariants.find(v => v.sku === decodedText);
    if (!variant) {
        showToast('SKU no encontrado: ' + decodedText, 'error');
        return;
    }
    
    addCount(variant.id, 1);
    
    // Pausar y reanudar para evitar múltiples escaneos accidentales
    auditScanner.pause(true);
    setTimeout(() => auditScanner.resume(), 1000);
}

function addManualAudit() {
    const variantId = parseInt(document.getElementById('auditVariantSelect').value);
    const qty = parseInt(document.getElementById('auditManualQty').value);
    if (variantId && qty > 0) {
        addCount(variantId, qty);
        document.getElementById('auditManualQty').value = 1;
    }
}

function addCount(variantId, qty) {
    if (!physicalCount[variantId]) physicalCount[variantId] = 0;
    physicalCount[variantId] += qty;
    
    showToast(`Registrado: +${qty}`, 'success');
    renderAuditTable();
}

function renderAuditTable() {
    const tbody = document.getElementById('auditCountTableBody');
    tbody.innerHTML = '';
    
    let hasItems = false;
    
    Object.keys(physicalCount).forEach(vid => {
        hasItems = true;
        const variant = currentFullVariants.find(v => v.id == vid);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${variant.product.name} - ${variant.colorName}</td>
            <td><strong>${physicalCount[vid]}</strong></td>
        `;
        tbody.appendChild(tr);
    });
    
    if (!hasItems) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:var(--text-secondary)">No se han registrado productos.</td></tr>';
    }
}

function populateAuditSelect() {
    const select = document.getElementById('auditVariantSelect');
    select.innerHTML = '<option value="">Seleccione para agregar manual...</option>';
    currentFullVariants.forEach(v => {
        const option = document.createElement('option');
        option.value = v.id;
        option.textContent = `${v.product.name} - ${v.colorName}`;
        select.appendChild(option);
    });
}

async function finishAudit() {
    if (auditScanner) {
        try { await auditScanner.clear(); } catch(e) {}
    }
    
    document.getElementById('auditActiveArea').classList.add('hidden');
    const resultsArea = document.getElementById('auditResultsArea');
    resultsArea.classList.remove('hidden');
    resultsArea.innerHTML = `<h3>Resultados de la Auditoría</h3><p>Calculando...</p>`;
    
    let matches = 0;
    let missing = 0;
    let extra = 0;
    let totalItemsSystem = 0;
    
    const resultsTableHTML = [];
    
    // Evaluamos contra TODOS los items del sistema
    for (const v of currentFullVariants) {
        const sysStock = v.stock;
        const physStock = physicalCount[v.id] || 0;
        const diff = physStock - sysStock;
        
        totalItemsSystem += sysStock;
        
        let statusHtml = '';
        if (diff === 0) {
            matches++;
            statusHtml = '<span class="badge badge-success"><i data-lucide="check" style="width:12px;height:12px;"></i> OK</span>';
        } else if (diff < 0) {
            missing += Math.abs(diff);
            statusHtml = `<span class="badge badge-danger">Faltan ${Math.abs(diff)}</span>`;
        } else {
            extra += diff;
            statusHtml = `<span class="badge badge-warning">Sobran ${diff}</span>`;
        }
        
        // Ajustar el sistema si el admin lo desea
        // Lo dejaremos visual por ahora, con un botón para "Aplicar Ajuste"
        
        resultsTableHTML.push(`
            <tr>
                <td>${v.product.name} - ${v.colorName}</td>
                <td>${sysStock}</td>
                <td><strong>${physStock}</strong></td>
                <td>${statusHtml}</td>
                <td>
                    ${diff !== 0 ? `<button class="btn btn-secondary btn-sm" onclick="window.applyAuditAdjust(${v.id}, ${physStock})">Ajustar Sistema</button>` : ''}
                </td>
            </tr>
        `);
    }
    
    const totalDiscrepancies = missing + extra;
    const accuracy = totalItemsSystem === 0 ? (totalDiscrepancies === 0 ? 100 : 0) : 
                     Math.max(0, 100 - ((totalDiscrepancies / totalItemsSystem) * 100)).toFixed(2);
    
    // Guardar auditoría en DB
    await db.audits.add({
        date: new Date().toISOString(),
        userId: window.getCurrentUser(),
        accuracy: parseFloat(accuracy)
    });
    
    resultsArea.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3>Resultados de la Auditoría</h3>
            <div style="background:var(--bg-base); padding:10px 20px; border-radius:var(--radius); border:1px solid var(--border-strong);">
                <span style="font-size:0.9rem; color:var(--text-secondary);">Exactitud de Inventario</span><br>
                <strong style="font-size:1.5rem; color:${accuracy >= 95 ? 'var(--success)' : 'var(--danger)'}">${accuracy}%</strong>
            </div>
        </div>
        
        <div style="display:flex; gap:20px; margin-bottom: 20px;">
            <div class="kpi-card" style="flex:1;">
                <span class="kpi-title">Coincidencias</span>
                <span class="kpi-value" style="color:var(--success)">${matches} items</span>
            </div>
            <div class="kpi-card" style="flex:1;">
                <span class="kpi-title">Faltantes</span>
                <span class="kpi-value" style="color:var(--danger)">${missing} unid.</span>
            </div>
            <div class="kpi-card" style="flex:1;">
                <span class="kpi-title">Sobrantes</span>
                <span class="kpi-value" style="color:var(--warning)">${extra} unid.</span>
            </div>
        </div>
        
        <div class="table-container">
            <table class="modern-table">
                <thead>
                    <tr>
                        <th>Producto / Variante</th>
                        <th>Sistema</th>
                        <th>Físico</th>
                        <th>Diferencia</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody>
                    ${resultsTableHTML.join('')}
                </tbody>
            </table>
        </div>
        
        <button class="btn btn-primary mt-20" onclick="document.getElementById('btnStartAudit').classList.remove('hidden'); document.getElementById('auditResultsArea').classList.add('hidden');">Terminar Revisión</button>
    `;
    if (window.lucide) lucide.createIcons({root: resultsArea});
}

window.applyAuditAdjust = async (variantId, finalQty) => {
    // Registrar ajuste
    const success = await processTransaction('AUDIT_ADJUST', variantId.toString(), finalQty, 'Ajuste de Auditoría');
    if (success) {
        // Actualizamos currentFullVariants para que la vista se refleje, o idealmente re-renderizamos la tabla
        // Para simplificar, recargamos la vista de auditoría.
        showToast('Inventario ajustado al físico', 'success');
        // Deshabilitar botón
        event.target.disabled = true;
        event.target.textContent = 'Ajustado';
    }
};

window.initAudit = initAudit;

// js/modules/catalog.js



async function initCatalog() {
    await renderCatalogTable();
    await renderVariantsTable();

    // Event listener for New Product
    const btnNewProduct = document.getElementById('btnNewProduct');
    // Eliminar listeners previos para evitar duplicados en SPA
    const newBtnClone = btnNewProduct.cloneNode(true);
    btnNewProduct.parentNode.replaceChild(newBtnClone, btnNewProduct);
    
    newBtnClone.addEventListener('click', () => {
        const modalForm = `
            <form id="formNewProduct" style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div class="form-group">
                    <label>Nombre del Producto</label>
                    <input type="text" id="pName" class="input-modern" required>
                </div>
                <div class="form-group">
                    <label>Categoría</label>
                    <input type="text" id="pCategory" class="input-modern" required>
                </div>
                <div class="form-group" style="grid-column: 1 / -1;">
                    <label>Descripción</label>
                    <input type="text" id="pDesc" class="input-modern">
                </div>
                <div class="form-group">
                    <label>Color (Variante)</label>
                    <input type="text" id="pColor" class="input-modern" required>
                </div>
                <div class="form-group">
                    <label>Costo Unitario ($)</label>
                    <input type="number" id="pCost" class="input-modern" required min="0" step="0.01">
                </div>
                <div class="form-group">
                    <label>Cantidad Inicial</label>
                    <input type="number" id="pStock" class="input-modern" required min="0">
                </div>
                <div class="form-group">
                    <label>Stock Mínimo</label>
                    <input type="number" id="pMinStock" class="input-modern" required min="1">
                </div>
                <div class="form-group">
                    <label>Ubicación Física</label>
                    <input type="text" id="pLocation" class="input-modern">
                </div>
                <div class="form-group">
                    <label>Fotografía del producto</label>
                    <input type="file" id="pPhoto" class="input-modern" accept="image/*">
                </div>
                <button type="submit" class="btn btn-primary" style="grid-column: 1 / -1; margin-top:10px;">Guardar Producto</button>
            </form>
        `;
        
        const closeModal = openModal('modalNewProduct', 'Crear Nuevo Producto', modalForm);
        
        document.getElementById('formNewProduct').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('pName').value;
            const category = document.getElementById('pCategory').value;
            const description = document.getElementById('pDesc').value;
            const color = document.getElementById('pColor').value;
            const cost = parseFloat(document.getElementById('pCost').value);
            const stock = parseInt(document.getElementById('pStock').value);
            const minStock = parseInt(document.getElementById('pMinStock').value);
            const location = document.getElementById('pLocation').value;
            
            const fileInput = document.getElementById('pPhoto');
            let photoBase64 = '';
            
            if (fileInput.files.length > 0) {
                try { photoBase64 = await fileToBase64(fileInput.files[0]); }
                catch(err) { showToast('Error al leer imagen', 'error'); return; }
            }
            
            try {
                const pId = await db.products.add({ name, category, description, provider: '', cost, location, status: 'Disponible' });
                const sku = `PRD-${pId}-${color.substring(0,3).toUpperCase()}-${Math.floor(1000+Math.random()*9000)}`;
                const vId = await db.variants.add({
                    productId: pId, colorName: color, stock: stock, minStock: minStock, sku: sku, photo: photoBase64
                });
                
                if (stock > 0) {
                    await db.transactions.add({
                        date: new Date().toISOString(), type: 'IN', variantId: vId, userId: window.getCurrentUser(), quantity: stock, comments: 'Inventario inicial (Creación)'
                    });
                }
                
                showToast('Producto registrado exitosamente');
                closeModal();
                initCatalog();
            } catch (err) {
                showToast('Error al registrar', 'error');
            }
        });
    });

    // Excel 
    const btnImportExcel = document.getElementById('btnImportExcel');
    const fileExcelImport = document.getElementById('fileExcelImport');
    if (btnImportExcel && fileExcelImport) {
        const btnImportClone = btnImportExcel.cloneNode(true);
        btnImportExcel.parentNode.replaceChild(btnImportClone, btnImportExcel);
        
        btnImportClone.addEventListener('click', () => {
            fileExcelImport.click();
        });
        
        fileExcelImport.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const data = new Uint8Array(event.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const rows = XLSX.utils.sheet_to_json(worksheet);
                    
                    if (rows.length === 0) {
                        showToast('El archivo Excel está vacío', 'warning');
                        return;
                    }
                    
                    let imported = 0;
                    for (const row of rows) {
                        // Expected columns: Nombre, Categoría, Color, Cantidad, Costo, Ubicación
                        const name = row['Nombre'];
                        const category = row['Categoría'] || 'Sin categoría';
                        const color = row['Color'] || 'Único';
                        const stock = parseInt(row['Cantidad']) || 0;
                        const cost = parseFloat(row['Costo']) || 0;
                        const location = row['Ubicación'] || '';
                        
                        if (!name) continue; // Skip if no name
                        
                        const pId = await db.products.add({ 
                            name, category, description: '', provider: '', cost, location, status: 'Disponible' 
                        });
                        
                        const sku = `PRD-${pId}-${color.substring(0,3).toUpperCase()}-${Math.floor(1000+Math.random()*9000)}`;
                        const vId = await db.variants.add({
                            productId: pId, colorName: color, stock: stock, minStock: 10, sku: sku, photo: ''
                        });
                        
                        if (stock > 0) {
                            await db.transactions.add({
                                date: new Date().toISOString(), type: 'IN', variantId: vId, userId: window.getCurrentUser(), quantity: stock, comments: 'Importación Excel'
                            });
                        }
                        imported++;
                    }
                    
                    showToast(`Se importaron ${imported} productos correctamente.`);
                    fileExcelImport.value = ''; // Reset file input
                    initCatalog();
                } catch (err) {
                    showToast('Error al leer el archivo Excel', 'error');
                    console.error(err);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    const btnPrintAllQRs = document.getElementById('btnPrintAllQRs');
    const printBtnClone = btnPrintAllQRs.cloneNode(true);
    btnPrintAllQRs.parentNode.replaceChild(printBtnClone, btnPrintAllQRs);
    printBtnClone.addEventListener('click', printAllQRs);
}

async function renderCatalogTable() {
    const products = await db.products.toArray();
    const tbody = document.getElementById('catalogTableBody');
    tbody.innerHTML = '';
    
    for (const p of products) {
        const tr = document.createElement('tr');
        // Usar un placeholder si no hay variante con foto
        tr.innerHTML = `
            <td><i data-lucide="package" style="color:var(--text-secondary)"></i></td>
            <td><strong>${p.name}</strong><br><small>${p.description}</small></td>
            <td>${p.category}</td>
            <td>$${p.cost}</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="window.addVariant(${p.id})">
                    <i data-lucide="plus"></i> Variante
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    }
    if (window.lucide) lucide.createIcons({ root: tbody });
}

async function renderVariantsTable() {
    const fullVariants = await getFullVariants();
    const tbody = document.getElementById('variantsTableBody');
    tbody.innerHTML = '';
    
    fullVariants.forEach(v => {
        const tr = document.createElement('tr');
        
        let stockClass = 'stock-good';
        let stockText = 'Disponible';
        if (v.stock <= 0) { stockClass = 'stock-out'; stockText = 'Agotado'; }
        else if (v.stock <= v.minStock) { stockClass = 'stock-low'; stockText = 'Bajo'; }
        
        tr.innerHTML = `
            <td><strong>${v.product.name}</strong></td>
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    ${v.photo ? `<img src="${v.photo}" alt="${v.colorName}">` : `<div style="width:40px;height:40px;background:#eee;border-radius:4px;"></div>`}
                    ${v.colorName}
                </div>
            </td>
            <td><strong>${v.stock}</strong></td>
            <td>${v.minStock}</td>
            <td>
                <span class="badge ${stockClass === 'stock-good' ? 'badge-success' : (stockClass === 'stock-low' ? 'badge-warning' : 'badge-danger')}">
                    ${stockText}
                </span>
            </td>
            <td>
                <div id="qr-mini-${v.id}" style="width:40px;height:40px;"></div>
            </td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="window.printQR('${v.sku}', '${v.product.name} - ${v.colorName}')">
                    <i data-lucide="printer"></i> QR
                </button>
            </td>
        `;
        tbody.appendChild(tr);
        
        // Render QR
        setTimeout(() => {
            new QRCode(document.getElementById(`qr-mini-${v.id}`), {
                text: v.sku, width: 40, height: 40, colorDark : "#005A9C"
            });
        }, 100);
    });
    if (window.lucide) lucide.createIcons({ root: tbody });
}

// Global functions for inline onclick handlers
window.addVariant = async (productId) => {
    const modalForm = `
        <form id="formNewVariant">
            <div class="form-group">
                <label>Nombre de Variante / Color</label>
                <input type="text" id="vColor" class="input-modern" required>
            </div>
            <div class="form-group">
                <label>Stock Mínimo (Alerta)</label>
                <input type="number" id="vMinStock" class="input-modern" required min="1" value="10">
            </div>
            <div class="form-group">
                <label>Fotografía (Opcional)</label>
                <input type="file" id="vPhoto" class="input-modern" accept="image/*">
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%; margin-top:10px;">Guardar Variante</button>
        </form>
    `;
    
    const closeModal = openModal('modalNewVariant', 'Agregar Variante', modalForm);
    
    document.getElementById('formNewVariant').addEventListener('submit', async (e) => {
        e.preventDefault();
        const colorName = document.getElementById('vColor').value;
        const minStock = parseInt(document.getElementById('vMinStock').value);
        const fileInput = document.getElementById('vPhoto');
        let photoBase64 = '';
        
        if (fileInput.files.length > 0) {
            try { photoBase64 = await fileToBase64(fileInput.files[0]); }
            catch(err) { showToast('Error al leer imagen', 'error'); return; }
        }
        
        // Generar SKU único
        const sku = `PRD-${productId}-${colorName.substring(0,3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
        
        try {
            await db.variants.add({ productId, colorName, stock: 0, minStock, sku, photo: photoBase64 });
            showToast('Variante agregada');
            closeModal();
            initCatalog();
        } catch (err) {
            showToast('Error', 'error');
        }
    });
};

window.printQR = (sku, label) => {
    const printArea = document.getElementById('printArea');
    printArea.innerHTML = `
        <div class="qr-print-card">
            <h4>${label}</h4>
            <div id="print-qr-canvas" class="qr-print-img"></div>
            <p>${sku}</p>
        </div>
    `;
    new QRCode(document.getElementById('print-qr-canvas'), { text: sku, width: 150, height: 150, colorDark: "#000" });
    
    setTimeout(() => {
        window.print();
        printArea.innerHTML = '';
    }, 500);
};

async function printAllQRs() {
    const fullVariants = await getFullVariants();
    if (fullVariants.length === 0) {
        showToast('No hay variantes para imprimir', 'warning');
        return;
    }
    
    const printArea = document.getElementById('printArea');
    printArea.innerHTML = '';
    
    fullVariants.forEach((v, idx) => {
        const card = document.createElement('div');
        card.className = 'qr-print-card';
        card.innerHTML = `
            <h4>${v.product.name} - ${v.colorName}</h4>
            <div id="print-qr-${idx}" class="qr-print-img"></div>
            <p>${v.sku}</p>
        `;
        printArea.appendChild(card);
        setTimeout(() => {
            new QRCode(document.getElementById(`print-qr-${idx}`), { text: v.sku, width: 150, height: 150, colorDark: "#000" });
        }, 50);
    });
    
    setTimeout(() => {
        window.print();
        printArea.innerHTML = '';
    }, 1000);
}

window.initCatalog = initCatalog;

// js/modules/catalog.js



async function initCatalog() {
    await renderCatalogTable();
    await renderVariantsTable();

    // Event listener for New Product
    const btnNewProduct = document.getElementById('btnNewProduct');
    if (btnNewProduct) {
        btnNewProduct.addEventListener('click', async () => {
            const providers = await db.providers.toArray();
            let providerOptions = '<option value="">Sin Proveedor</option>';
            providers.forEach(p => {
                providerOptions += `<option value="${p.id}">${p.name}</option>`;
            });

            const modalForm = `
                <form id="formNewProduct" style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="form-group">
                        <label>Nombre del Producto *</label>
                        <input type="text" id="pName" class="input-modern" required>
                    </div>
                    <div class="form-group">
                        <label>Categoría *</label>
                        <select id="pCategory" class="input-modern" required>
                            <option value="Premios Lean">Premios Lean</option>
                            <option value="Papelería">Papelería</option>
                            <option value="Tecnología">Tecnología</option>
                        </select>
                    </div>
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label>Descripción</label>
                        <input type="text" id="pDesc" class="input-modern">
                    </div>
                    <div class="form-group">
                        <label>Proveedor</label>
                        <select id="pProvider" class="input-modern">
                            ${providerOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Color (Variante) *</label>
                        <input type="text" id="pColor" class="input-modern" required>
                    </div>
                    <div class="form-group">
                        <label>Costo Monetario ($)</label>
                        <input type="number" id="pCost" class="input-modern" value="0" min="0" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>Costo en Puntos (Si es Premio)</label>
                        <input type="number" id="pPointsCost" class="input-modern" value="0" min="0">
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
                        <label>Stock Máximo</label>
                        <input type="number" id="pMaxStock" class="input-modern" required min="1" value="50">
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
                const providerId = parseInt(document.getElementById('pProvider').value) || null;
                const color = document.getElementById('pColor').value;
                const cost = parseFloat(document.getElementById('pCost').value) || 0;
                const pointsCost = parseInt(document.getElementById('pPointsCost').value) || 0;
                const stock = parseInt(document.getElementById('pStock').value) || 0;
                const minStock = parseInt(document.getElementById('pMinStock').value) || 1;
                const maxStock = parseInt(document.getElementById('pMaxStock').value) || 50;
                const location = document.getElementById('pLocation').value;
                
                const fileInput = document.getElementById('pPhoto');
                let photoBase64 = '';
                
                if (fileInput.files.length > 0) {
                    try { photoBase64 = await fileToBase64(fileInput.files[0]); }
                    catch(err) { showToast('Error al leer imagen', 'error'); return; }
                }
                
                try {
                    const pId = await db.products.add({ name, category, description, providerId, cost, pointsCost, location, status: 'Disponible' });
                    
                    const sku = `PRD-${pId}-${color.substring(0,3).toUpperCase()}-${Math.floor(1000+Math.random()*9000)}`;
                    const vId = await db.variants.add({
                        productId: pId, colorName: color, stock: stock, minStock: minStock, maxStock: maxStock, sku: sku, photo: photoBase64
                    });
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
    if (btnPrintAllQRs) {
        const printBtnClone = btnPrintAllQRs.cloneNode(true);
        btnPrintAllQRs.parentNode.replaceChild(printBtnClone, btnPrintAllQRs);
        printBtnClone.addEventListener('click', printAllQRs);
    }
    
    const catFilter = document.getElementById('catalogCategoryFilter');
    if (catFilter) {
        catFilter.addEventListener('change', renderCatalogTable);
    }
}

async function renderCatalogTable() {
    let products = await db.products.toArray();
    
    const filterVal = document.getElementById('catalogCategoryFilter')?.value || 'ALL';
    if (filterVal !== 'ALL') {
        products = products.filter(p => p.category === filterVal);
    }
    
    const fullVariants = await getFullVariants();
    const tbody = document.getElementById('catalogTableBody');
    tbody.innerHTML = '';
    
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-secondary);">No hay productos registrados en esta categoría.</td></tr>';
    } else {
        for (const p of products) {
            const productVariants = fullVariants.filter(v => v.productId === p.id);
            const photoVariant = productVariants.find(v => v.photo);
            const photoHtml = photoVariant && photoVariant.photo ? `<img src="${photoVariant.photo}" style="width:40px; height:40px; border-radius:4px; object-fit:cover;">` : `<i data-lucide="package" style="color:var(--text-secondary)"></i>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${photoHtml}</td>
                <td><strong>${p.name}</strong><br><small>${p.description}</small></td>
                <td>${p.category}</td>
                <td>$${p.cost}</td>
                <td style="display:flex; gap:5px;">
                    <button class="btn btn-primary btn-sm" onclick="window.editProduct(${p.id})">
                        <i data-lucide="edit"></i> Editar
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="window.addVariant(${p.id})">
                        <i data-lucide="plus"></i> Variante
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        }
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
            <td style="display:flex; gap:5px;">
                <button class="btn btn-primary btn-sm" onclick="window.editVariant(${v.id})" title="Editar Variante">
                    <i data-lucide="edit"></i>
                </button>
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
window.editProduct = async (productId) => {
    const product = await db.products.get(productId);
    if (!product) return;
    
    const allVariants = await db.variants.toArray();
    const productVariants = allVariants.filter(v => v.productId === productId);
    const primaryVariant = productVariants.length > 0 ? productVariants[0] : null;

    const providers = await db.providers.toArray();
    let providerOptions = '<option value="">Sin Proveedor</option>';
    providers.forEach(p => {
        providerOptions += `<option value="${p.id}" ${p.id == product.providerId ? 'selected' : ''}>${p.name}</option>`;
    });

    const modalForm = `
        <form id="formEditProduct" style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div class="form-group">
                <label>Nombre del Producto</label>
                <input type="text" id="eName" class="input-modern" value="${product.name}" required>
            </div>
            <div class="form-group">
                <label>Categoría</label>
                <select id="eCategory" class="input-modern" required>
                    <option value="Premios Lean" ${product.category === 'Premios Lean' ? 'selected' : ''}>Premios Lean</option>
                    <option value="Papelería" ${product.category === 'Papelería' ? 'selected' : ''}>Papelería</option>
                    <option value="Tecnología" ${product.category === 'Tecnología' ? 'selected' : ''}>Tecnología</option>
                </select>
            </div>
            <div class="form-group" style="grid-column: 1 / -1;">
                <label>Descripción</label>
                <input type="text" id="eDesc" class="input-modern" value="${product.description || ''}">
            </div>
            
            <div class="form-group">
                <label>Proveedor</label>
                <select id="eProvider" class="input-modern">
                    ${providerOptions}
                </select>
            </div>
            
            ${primaryVariant ? `
            <div class="form-group">
                <label>Color / Variante Principal</label>
                <input type="text" id="eColor" class="input-modern" value="${primaryVariant.colorName}" required>
            </div>
            <div class="form-group">
                <label>Stock Actual</label>
                <input type="number" id="eStock" class="input-modern" required min="0" value="${primaryVariant.stock}">
            </div>
            <div class="form-group">
                <label>Stock Mínimo (Alerta)</label>
                <input type="number" id="eMinStock" class="input-modern" required min="1" value="${primaryVariant.minStock}">
            </div>
            <div class="form-group">
                <label>Stock Máximo</label>
                <input type="number" id="eMaxStock" class="input-modern" required min="1" value="${primaryVariant.maxStock || 50}">
            </div>
            ` : ''}

            <div class="form-group">
                <label>Costo Monetario ($)</label>
                <input type="number" id="eCost" class="input-modern" required min="0" step="0.01" value="${product.cost || 0}">
            </div>
            <div class="form-group">
                <label>Costo en Puntos</label>
                <input type="number" id="ePointsCost" class="input-modern" required min="0" value="${product.pointsCost || 0}">
            </div>
            <div class="form-group" style="grid-column: 1 / -1;">
                <label>Ubicación Física</label>
                <input type="text" id="eLocation" class="input-modern" value="${product.location || ''}">
            </div>
            <button type="submit" class="btn btn-primary" style="grid-column: 1 / -1; margin-top:10px;">Guardar Cambios</button>
        </form>
    `;
    
    const closeModal = openModal('modalEditProduct', 'Editar Producto', modalForm);
    
    document.getElementById('formEditProduct').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('eName').value;
        const category = document.getElementById('eCategory').value;
        const description = document.getElementById('eDesc').value;
        const providerId = parseInt(document.getElementById('eProvider').value) || null;
        const cost = parseFloat(document.getElementById('eCost').value) || 0;
        const pointsCost = parseInt(document.getElementById('ePointsCost').value) || 0;
        const location = document.getElementById('eLocation').value;
        
        try {
            // Update product
            product.name = name;
            product.category = category;
            product.description = description;
            product.providerId = providerId;
            product.cost = cost;
            product.pointsCost = pointsCost;
            product.location = location;
            
            await db.products.put(product);
            
            // Update primary variant if exists
            if (primaryVariant) {
                const color = document.getElementById('eColor').value;
                const stock = parseInt(document.getElementById('eStock').value);
                const minStock = parseInt(document.getElementById('eMinStock').value);
                const maxStock = parseInt(document.getElementById('eMaxStock').value);
                
                const oldStock = primaryVariant.stock;
                
                primaryVariant.colorName = color;
                primaryVariant.stock = stock;
                primaryVariant.minStock = minStock;
                primaryVariant.maxStock = maxStock;
                
                await db.variants.put(primaryVariant);
                
                // Record transaction if stock changed manually
                if (stock !== oldStock) {
                    const diff = stock - oldStock;
                    await db.transactions.add({
                        date: new Date().toISOString(),
                        type: 'AUDIT_ADJUST',
                        variantId: primaryVariant.id,
                        userId: window.getCurrentUserObj()?.name || 'Admin',
                        quantity: diff,
                        comments: 'Ajuste manual al editar producto'
                    });
                }
            }
            
            showToast('Cambios guardados correctamente');
            closeModal();
            await renderCatalogTable();
            await renderVariantsTable();
        } catch (err) {
            showToast('Error al guardar', 'error');
        }
    });
};

window.editVariant = async (variantId) => {
    const variant = await db.variants.get(variantId);
    if (!variant) return;

    const modalForm = `
        <form id="formEditVariant">
            <div class="form-group">
                <label>Nombre de Variante / Color</label>
                <input type="text" id="evColor" class="input-modern" value="${variant.colorName}" required>
            </div>
            <div class="form-group">
                <label>Stock Actual</label>
                <input type="number" id="evStock" class="input-modern" value="${variant.stock}" required min="0">
            </div>
            <div class="form-group">
                <label>Stock Mínimo (Alerta)</label>
                <input type="number" id="evMinStock" class="input-modern" value="${variant.minStock}" required min="1">
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%; margin-top:10px;">Guardar Cambios</button>
        </form>
    `;
    
    const closeModal = openModal('modalEditVariant', 'Editar Variante', modalForm);
    
    document.getElementById('formEditVariant').addEventListener('submit', async (e) => {
        e.preventDefault();
        const colorName = document.getElementById('evColor').value;
        const newStock = parseInt(document.getElementById('evStock').value);
        const minStock = parseInt(document.getElementById('evMinStock').value);
        
        try {
            const diff = newStock - variant.stock;
            if (diff !== 0) {
                await db.transactions.add({
                    date: new Date().toISOString(), 
                    type: diff > 0 ? 'IN' : 'OUT', 
                    variantId: variant.id, 
                    userId: window.getCurrentUser(), 
                    quantity: Math.abs(diff), 
                    comments: 'Ajuste manual (Edición Variante)'
                });
            }
            await db.variants.put({ ...variant, colorName, minStock, stock: newStock });
            showToast('Variante actualizada');
            closeModal();
            initCatalog();
        } catch (err) {
            showToast('Error al actualizar', 'error');
        }
    });
};

window.addVariant = async (productId) => {
    const modalForm = `
        <form id="formNewVariant">
            <div class="form-group">
                <label>Nombre de Variante / Color</label>
                <input type="text" id="vColor" class="input-modern" required>
            </div>
            <div class="form-group">
                <label>Stock Actual (Inicial)</label>
                <input type="number" id="vStock" class="input-modern" required min="0" value="0">
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
        const stock = parseInt(document.getElementById('vStock').value);
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
            const vId = await db.variants.add({ productId, colorName, stock: stock, minStock, sku, photo: photoBase64 });
            
            if (stock > 0) {
                await db.transactions.add({
                    date: new Date().toISOString(), type: 'IN', variantId: vId, userId: window.getCurrentUser(), quantity: stock, comments: 'Inventario inicial (Nueva Variante)'
                });
            }
            
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
    printArea.classList.remove('hidden');
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
        window.addEventListener('afterprint', function onAfterPrint() {
            printArea.innerHTML = '';
            printArea.classList.add('hidden');
            window.removeEventListener('afterprint', onAfterPrint);
        });
    }, 500);
};

async function printAllQRs() {
    const fullVariants = await getFullVariants();
    if (fullVariants.length === 0) {
        showToast('No hay variantes para imprimir', 'warning');
        return;
    }
    
    const printArea = document.getElementById('printArea');
    printArea.classList.remove('hidden');
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
        // Listen for the print dialog to close, then clear the area
        window.addEventListener('afterprint', function onAfterPrint() {
            printArea.innerHTML = '';
            printArea.classList.add('hidden');
            window.removeEventListener('afterprint', onAfterPrint);
        });
    }, 1500);
}

window.initCatalog = initCatalog;

// js/modules/inventory.js

async function initInventory(type) {
    if (type === 'entries') {
        await populateSelect('entryVariantSelect');
        const form = document.getElementById('entryForm');
        form.onsubmit = async (e) => {
            e.preventDefault();
            await processTransaction('IN', 
                document.getElementById('entryVariantSelect').value,
                document.getElementById('entryQuantity').value,
                document.getElementById('entryComments').value
            );
            form.reset();
        };

        document.getElementById('btnEntryManual').onclick = () => {
            document.getElementById('entryFormContainer').classList.remove('hidden');
        };
        document.getElementById('btnEntryQR').onclick = () => {
            window.openQRScanner('IN');
        };

    } else if (type === 'exits') {
        await populateSelect('exitVariantSelect');
        const form = document.getElementById('exitForm');
        form.onsubmit = async (e) => {
            e.preventDefault();
            await processTransaction('OUT', 
                document.getElementById('exitVariantSelect').value,
                document.getElementById('exitQuantity').value,
                document.getElementById('exitComments').value
            );
            form.reset();
        };
        
        document.getElementById('btnExitManual').onclick = () => {
            document.getElementById('exitFormContainer').classList.remove('hidden');
        };
        document.getElementById('btnExitQR').onclick = () => {
            window.openQRScanner('OUT');
        };
    }
}

async function populateSelect(selectId) {
    const fullVariants = await getFullVariants();
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Seleccione un producto/variante...</option>';
    
    // Agrupar por categoria o producto para mejor visualizacion
    fullVariants.forEach(v => {
        const option = document.createElement('option');
        option.value = v.id;
        option.textContent = `${v.product.name} - ${v.colorName} (Stock: ${v.stock})`;
        // Si es salida, deshabilitar los que tienen stock 0
        if (selectId === 'exitVariantSelect' && v.stock <= 0) {
            option.disabled = true;
            option.textContent += ' [AGOTADO]';
        }
        select.appendChild(option);
    });
}

async function processTransaction(type, variantIdStr, qtyStr, comments) {
    const variantId = parseInt(variantIdStr);
    const quantity = parseInt(qtyStr);
    const user = window.getCurrentUser();
    
    if (!variantId || isNaN(quantity) || quantity <= 0) {
        showToast('Datos invalidos', 'error');
        return false;
    }
    
    try {
        await db.transaction('rw', db.variants, db.transactions, async () => {
            const variant = await db.variants.get(variantId);
            if (!variant) throw new Error('Variante no encontrada');
            
            if (type === 'OUT') {
                if (variant.stock < quantity) {
                    throw new Error(`Inventario insuficiente. Stock actual: ${variant.stock}`);
                }
                variant.stock -= quantity;
            } else if (type === 'IN') {
                variant.stock += quantity;
            } else if (type === 'AUDIT_ADJUST') {
                // quantity en este caso es la cantidad FINAL
                variant.stock = quantity;
            }
            
            await db.variants.put(variant);
            
            await db.transactions.add({
                date: new Date().toISOString(),
                type: type,
                variantId: variant.id,
                userId: user,
                quantity: quantity,
                comments: comments || ''
            });
        });
        
        showToast('Movimiento registrado correctamente');
        return true;
    } catch (err) {
        showToast(err.message, 'error');
        return false;
    }
}

window.initInventory = initInventory;
window.processTransaction = processTransaction;

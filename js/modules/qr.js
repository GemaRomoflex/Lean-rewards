// js/modules/qr.js




let html5QrcodeScanner = null;

async function initQR() {
    const readerElement = document.getElementById('qr-reader');
    const resultCard = document.getElementById('qr-result');
    resultCard.classList.add('hidden');
    resultCard.innerHTML = '';
    
    // Si ya existe un escáner corriendo, detenerlo
    if (html5QrcodeScanner) {
        try {
            await html5QrcodeScanner.clear();
        } catch(e) {}
    }

    const config = { 
        fps: 10, 
        qrbox: function(viewfinderWidth, viewfinderHeight) {
            // Dynamic qrbox to fit any screen size (mobile/desktop)
            const minEdgePercentage = 0.7; // 70% of screen
            const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
            return {
                width: qrboxSize,
                height: qrboxSize
            };
        },
        aspectRatio: 1.0
    };
    
    if (typeof Html5QrcodeSupportedFormats !== 'undefined') {
        config.formatsToSupport = [ Html5QrcodeSupportedFormats.QR_CODE ];
    }

    html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", config, false);
    
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

async function onScanSuccess(decodedText, decodedResult) {
    // Expected decodedText is the SKU
    // Detener temporalmente
    html5QrcodeScanner.pause(true);
    
    const fullVariants = await getFullVariants();
    const variant = fullVariants.find(v => v.sku === decodedText);
    
    const resultCard = document.getElementById('qr-result');
    resultCard.classList.remove('hidden');
    
    if (!variant) {
        resultCard.innerHTML = `
            <div style="color:var(--danger); text-align:center;">
                <i data-lucide="alert-triangle" style="width:48px;height:48px;"></i>
                <h3>SKU No Encontrado</h3>
                <p>El código <strong>${decodedText}</strong> no existe en el sistema.</p>
                <button class="btn btn-secondary mt-20" onclick="window.resumeScan()">Escanear otro</button>
            </div>
        `;
        if (window.lucide) lucide.createIcons({root: resultCard});
        return;
    }
    
    let stockClass = 'stock-good';
    if (variant.stock <= 0) stockClass = 'stock-out';
    else if (variant.stock <= variant.minStock) stockClass = 'stock-low';

    resultCard.innerHTML = `
        <div style="display:flex; gap: 20px; align-items:flex-start;">
            ${variant.photo ? `<img src="${variant.photo}" alt="Foto" style="width:100px; height:100px; object-fit:cover; border-radius:8px;">` : `<div style="width:100px;height:100px;background:#eee;border-radius:8px;"></div>`}
            <div style="flex:1;">
                <h3 style="margin-bottom:5px;">${variant.product.name}</h3>
                <p style="color:var(--text-secondary); margin-bottom:15px;">Variante: ${variant.colorName}</p>
                
                <div style="display:flex; justify-content:space-between; align-items:center; background:#f3f2f1; padding:10px; border-radius:4px; margin-bottom: 20px;">
                    <span>Stock Actual:</span>
                    <strong style="font-size:1.2rem;" class="${stockClass === 'stock-out' ? 'badge-danger' : ''}">${variant.stock}</strong>
                </div>
                
                ${variant.stock > 0 ? `
                <div class="form-group">
                    <label>Cantidad a retirar (Mejora Lean):</label>
                    <input type="number" id="qrQty" class="input-modern" value="1" min="1" max="${variant.stock}">
                </div>
                <div class="form-group">
                    <label>Motivo:</label>
                    <input type="text" id="qrComments" class="input-modern" placeholder="Ej. Premio mensual">
                </div>
                <div style="display:flex; gap:10px; justify-content:flex-end;">
                    <button class="btn btn-secondary" onclick="window.resumeScan()">Cancelar</button>
                    <button class="btn btn-danger" onclick="window.confirmQRScan(${variant.id})">Descontar</button>
                </div>
                ` : `
                <div class="badge badge-danger" style="display:block; text-align:center; padding: 10px;">Producto Agotado</div>
                <button class="btn btn-secondary mt-20" style="width:100%" onclick="window.resumeScan()">Escanear otro</button>
                `}
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons({root: resultCard});
}

function onScanFailure(error) {
    // Silently handle
}

window.resumeScan = () => {
    document.getElementById('qr-result').classList.add('hidden');
    document.getElementById('qr-result').innerHTML = '';
    html5QrcodeScanner.resume();
};

window.confirmQRScan = async (variantId) => {
    const qty = document.getElementById('qrQty').value;
    const comments = document.getElementById('qrComments').value || 'Retiro por QR (Mejora Lean)';
    
    const success = await processTransaction('OUT', variantId.toString(), qty, comments);
    
    if (success) {
        window.resumeScan();
        showToast('Transacción QR exitosa');
    }
};

window.initQR = initQR;

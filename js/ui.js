// js/ui.js

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icon based on type
    let icon = 'check-circle';
    if (type === 'error') icon = 'x-circle';
    if (type === 'warning') icon = 'alert-triangle';
    
    toast.innerHTML = `
        <i data-lucide="${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    if (window.lucide) {
        lucide.createIcons({ root: toast });
    }
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 3500);
}

function openModal(id, title, contentHTML, footerHTML = '') {
    const container = document.getElementById('modalsContainer');
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = id;
    
    let footerSection = '';
    if (footerHTML) {
        footerSection = `<div class="modal-footer">${footerHTML}</div>`;
    }

    overlay.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="btn-close" id="${id}-close"><i data-lucide="x"></i></button>
            </div>
            <div class="modal-body">
                ${contentHTML}
            </div>
            ${footerSection}
        </div>
    `;
    
    container.appendChild(overlay);
    if (window.lucide) lucide.createIcons({ root: overlay });
    
    // Timeout para permitir la animación
    setTimeout(() => overlay.classList.add('active'), 10);
    
    const closeModal = () => {
        overlay.classList.remove('active');
        setTimeout(() => {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 200);
    };
    
    document.getElementById(`${id}-close`).addEventListener('click', closeModal);
    
    return closeModal; // Devuelve la función para cerrar programáticamente
}

// Convert image file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

window.showToast = showToast;
window.openModal = openModal;
window.fileToBase64 = fileToBase64;

// js/modules/providers.js

let providers = [];

async function initProviders() {
    await loadProviders();
}

async function loadProviders() {
    const tbody = document.getElementById('providersTableBody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Cargando proveedores...</td></tr>';
    
    providers = await window.db.providers.toArray();
    renderProvidersTable();
}

function renderProvidersTable() {
    const tbody = document.getElementById('providersTableBody');
    tbody.innerHTML = '';
    
    if (providers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay proveedores registrados</td></tr>';
        return;
    }
    
    providers.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.id}</td>
            <td><strong>${p.name}</strong></td>
            <td>${p.contact || '-'}</td>
            <td>
                ${p.phone ? `<i data-lucide="phone" style="width:14px;"></i> ${p.phone}<br>` : ''}
                ${p.email ? `<i data-lucide="mail" style="width:14px;"></i> ${p.email}` : ''}
            </td>
            <td>${p.leadTimeDays} días</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="window.editProvider(${p.id})"><i data-lucide="edit"></i></button>
                <button class="btn btn-danger btn-sm" onclick="window.deleteProvider(${p.id})"><i data-lucide="trash-2"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    if (window.lucide) lucide.createIcons({ root: tbody });
}

window.openProviderModal = (provider = null) => {
    const isEdit = !!provider;
    
    const html = `
        <div class="form-group">
            <label>Nombre del Proveedor *</label>
            <input type="text" id="provName" class="form-control" value="${isEdit ? provider.name : ''}" />
        </div>
        <div class="form-group">
            <label>Contacto (Nombre persona)</label>
            <input type="text" id="provContact" class="form-control" value="${isEdit ? (provider.contact || '') : ''}" />
        </div>
        <div style="display:flex; gap:15px;">
            <div class="form-group" style="flex:1;">
                <label>Teléfono</label>
                <input type="text" id="provPhone" class="form-control" value="${isEdit ? (provider.phone || '') : ''}" />
            </div>
            <div class="form-group" style="flex:1;">
                <label>Email</label>
                <input type="email" id="provEmail" class="form-control" value="${isEdit ? (provider.email || '') : ''}" />
            </div>
        </div>
        <div class="form-group">
            <label>Tiempo de entrega (Lead Time en días) *</label>
            <input type="number" id="provLeadTime" class="form-control" value="${isEdit ? provider.leadTimeDays : '7'}" min="0" />
        </div>
        <div class="form-group">
            <label>Notas</label>
            <textarea id="provNotes" class="form-control" rows="3">${isEdit ? (provider.notes || '') : ''}</textarea>
        </div>
    `;
    
    const footer = `
        <button class="btn btn-secondary" onclick="document.getElementById('modal-provider-close').click()">Cancelar</button>
        <button class="btn btn-primary" onclick="window.saveProvider(${isEdit ? provider.id : 'null'})">Guardar</button>
    `;
    
    window.openModal('modal-provider', isEdit ? 'Editar Proveedor' : 'Nuevo Proveedor', html, footer);
};

window.editProvider = (id) => {
    const p = providers.find(x => x.id === id);
    if (p) window.openProviderModal(p);
};

window.saveProvider = async (id) => {
    const name = document.getElementById('provName').value.trim();
    if (!name) return showToast('El nombre es obligatorio', 'error');
    
    const record = {
        name: name,
        contact: document.getElementById('provContact').value.trim(),
        phone: document.getElementById('provPhone').value.trim(),
        email: document.getElementById('provEmail').value.trim(),
        leadTimeDays: parseInt(document.getElementById('provLeadTime').value) || 0,
        notes: document.getElementById('provNotes').value.trim()
    };
    
    if (id) record.id = id;
    
    const success = await window.db.providers.put(record);
    if (success) {
        showToast('Proveedor guardado exitosamente');
        document.getElementById('modal-provider-close').click();
        await loadProviders();
    } else {
        showToast('Error al guardar', 'error');
    }
};

window.deleteProvider = async (id) => {
    if (confirm('¿Estás seguro de eliminar este proveedor?')) {
        const success = await window.db.providers.delete(id);
        if (success) {
            showToast('Proveedor eliminado');
            await loadProviders();
        } else {
            showToast('Error al eliminar', 'error');
        }
    }
};

window.initProviders = initProviders;

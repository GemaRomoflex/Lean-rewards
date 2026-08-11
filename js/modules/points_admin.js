// js/modules/points_admin.js

let usersList = [];

async function initPointsAdmin() {
    await loadPointsAdmin();
    
    const btnAddUser = document.getElementById('btnAddUser');
    if (btnAddUser) {
        btnAddUser.addEventListener('click', () => {
            const html = `
                <div class="form-group">
                    <label>Nombre del Empleado *</label>
                    <input type="text" id="newUserName" class="form-control" required />
                </div>
                <div class="form-group">
                    <label>Número de Nómina (ID) *</label>
                    <input type="text" id="newUserNum" class="form-control" required />
                </div>
                <div class="form-group">
                    <label>Puntos Iniciales</label>
                    <input type="number" id="newUserPts" class="form-control" value="0" min="0" />
                </div>
            `;
            
            const footer = `
                <button class="btn btn-secondary" onclick="document.getElementById('modal-newuser-close').click()">Cancelar</button>
                <button class="btn btn-primary" onclick="window.saveNewUser()">Guardar</button>
            `;
            
            window.openModal('modal-newuser', 'Agregar Empleado Manual', html, footer);
        });
    }
    
    const btnImportUsers = document.getElementById('btnImportUsers');
    const fileExcelUsers = document.getElementById('fileExcelUsers');
    
    if (btnImportUsers && fileExcelUsers) {
        btnImportUsers.addEventListener('click', () => fileExcelUsers.click());
        
        fileExcelUsers.addEventListener('change', (e) => {
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
                        const numNomina = row['No. Nomina'] || row['Nomina'] || row['ID'] || row['employeeId'];
                        const nombre = row['Nombre'] || row['Name'];
                        const puntos = parseInt(row['Puntos'] || row['Points']) || 0;
                        
                        if (!numNomina || !nombre) continue;
                        
                        // Check if exists
                        const existing = await window.db.users.get(numNomina.toString());
                        if (existing) {
                            existing.points = (existing.points || 0) + puntos;
                            await window.db.users.put(existing);
                        } else {
                            await window.db.users.add({
                                employeeId: numNomina.toString(),
                                name: nombre,
                                points: puntos,
                                role: 'user'
                            });
                        }
                        imported++;
                    }
                    
                    showToast(`Se importaron/actualizaron ${imported} empleados correctamente.`);
                    fileExcelUsers.value = '';
                    await loadPointsAdmin();
                } catch (err) {
                    showToast('Error al leer el archivo Excel', 'error');
                    console.error(err);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }
}

window.saveNewUser = async () => {
    const name = document.getElementById('newUserName').value.trim();
    const id = document.getElementById('newUserNum').value.trim();
    const pts = parseInt(document.getElementById('newUserPts').value) || 0;
    
    if (!name || !id) return showToast('Nombre y Número de nómina son obligatorios', 'warning');
    
    const existing = await window.db.users.get(id);
    if (existing) return showToast('Ese número de nómina ya está registrado', 'error');
    
    await window.db.users.add({
        employeeId: id,
        name: name,
        points: pts,
        role: 'user'
    });
    
    showToast('Empleado agregado exitosamente');
    document.getElementById('modal-newuser-close').click();
    await loadPointsAdmin();
};

async function loadPointsAdmin() {
    const tbody = document.getElementById('pointsAdminTableBody');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Cargando usuarios...</td></tr>';
    
    usersList = await window.db.users.toArray();
    renderPointsAdminTable();
}

function renderPointsAdminTable() {
    const tbody = document.getElementById('pointsAdminTableBody');
    tbody.innerHTML = '';
    
    if (usersList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay usuarios registrados</td></tr>';
        return;
    }
    
    usersList.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${u.employeeId}</td>
            <td><strong>${u.name}</strong></td>
            <td><span class="badge ${u.points > 0 ? 'badge-success' : 'badge-warning'}">${u.points} Pts</span></td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="window.openAdjustPointsModal('${u.employeeId}')">
                    <i data-lucide="plus-circle"></i> Ajustar Puntos
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    if (window.lucide) lucide.createIcons({ root: tbody });
}

window.openAdjustPointsModal = (employeeId) => {
    const user = usersList.find(x => x.employeeId === employeeId);
    if (!user) return;
    
    const html = `
        <div class="form-group">
            <label>Empleado</label>
            <input type="text" class="form-control" value="${user.name} (${user.employeeId})" disabled />
        </div>
        <div class="form-group">
            <label>Puntos a agregar (usa negativo para restar)</label>
            <input type="number" id="adjustPointsAmount" class="form-control" value="0" />
        </div>
        <div class="form-group">
            <label>Motivo del ajuste</label>
            <input type="text" id="adjustPointsReason" class="form-control" placeholder="Ej. Bono de puntualidad" />
        </div>
    `;
    
    const footer = `
        <button class="btn btn-secondary" onclick="document.getElementById('modal-points-close').click()">Cancelar</button>
        <button class="btn btn-primary" onclick="window.saveAdjustPoints('${employeeId}')">Guardar</button>
    `;
    
    window.openModal('modal-points', 'Ajustar Puntos', html, footer);
};

window.saveAdjustPoints = async (employeeId) => {
    const user = usersList.find(x => x.employeeId === employeeId);
    if (!user) return;
    
    const amount = parseInt(document.getElementById('adjustPointsAmount').value) || 0;
    const reason = document.getElementById('adjustPointsReason').value.trim();
    
    if (amount === 0) {
        return showToast('El monto no puede ser 0', 'warning');
    }
    
    if (!reason) {
        return showToast('El motivo es obligatorio', 'error');
    }
    
    // Create transaction
    const admin = window.getCurrentUserObj();
    const type = amount > 0 ? 'ADD' : 'REMOVE';
    const tx = {
        userId: employeeId,
        amount: Math.abs(amount),
        type: type,
        adminId: admin ? admin.employee_id : 'System',
        reason: reason
    };
    
    const txSuccess = await window.db.point_transactions.add(tx);
    if (txSuccess) {
        user.points = (user.points || 0) + amount;
        if (user.points < 0) user.points = 0; // Prevent negative
        
        await window.db.users.put(user);
        
        showToast('Puntos actualizados correctamente');
        document.getElementById('modal-points-close').click();
        await loadPointsAdmin();
    } else {
        showToast('Error al guardar la transacción', 'error');
    }
};

window.initPointsAdmin = initPointsAdmin;

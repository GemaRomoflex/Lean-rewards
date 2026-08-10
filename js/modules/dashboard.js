// js/modules/dashboard.js


let chartsInstance = [];

async function initDashboard() {
    await renderDashboard();
}

async function updateAlertsHeader() {
    const fullVariants = await getFullVariants();
    const alertsContainer = document.getElementById('headerAlerts');
    alertsContainer.innerHTML = '';
    
    let outOfStock = 0;
    let lowStock = 0;
    
    fullVariants.forEach(v => {
        if (v.stock <= 0) outOfStock++;
        else if (v.stock <= v.minStock) lowStock++;
    });
    
    if (outOfStock > 0) {
        alertsContainer.innerHTML += `
            <div class="badge badge-danger" title="Productos Agotados" style="cursor:pointer;" onclick="document.querySelector('.nav-btn[data-target=\\'gallery\\']').click()">
                <i data-lucide="alert-octagon"></i> ${outOfStock} Agotados
            </div>
        `;
    }
    
    if (lowStock > 0) {
        alertsContainer.innerHTML += `
            <div class="badge badge-warning" title="Productos por Agotarse" style="cursor:pointer;" onclick="document.querySelector('.nav-btn[data-target=\\'gallery\\']').click()">
                <i data-lucide="alert-triangle"></i> ${lowStock} Por reabastecer
            </div>
        `;
    }
    
    if (window.lucide) lucide.createIcons({ root: alertsContainer });
}

async function renderDashboard() {
    // Clear previous charts
    chartsInstance.forEach(c => c.destroy());
    chartsInstance = [];
    
    const dashboardGrid = document.getElementById('dashboardContent');
    dashboardGrid.innerHTML = `
        <div class="kpi-card">
            <span class="kpi-title">Total Variantes</span>
            <span class="kpi-value" id="kpiTotalProducts">-</span>
            <i class="kpi-icon" data-lucide="package" style="width:40px;height:40px;"></i>
        </div>
        <div class="kpi-card">
            <span class="kpi-title">Valor del Inventario</span>
            <span class="kpi-value" id="kpiTotalValue">$-</span>
            <i class="kpi-icon" data-lucide="dollar-sign" style="width:40px;height:40px;"></i>
        </div>
        <div class="kpi-card">
            <span class="kpi-title">Agotados / Críticos</span>
            <span class="kpi-value" id="kpiCritical" style="color:var(--danger)">-</span>
            <i class="kpi-icon" data-lucide="alert-octagon" style="width:40px;height:40px;color:var(--danger);"></i>
        </div>
        <div class="kpi-card">
            <span class="kpi-title">Precisión Auditoría</span>
            <span class="kpi-value" id="kpiAccuracy">-</span>
            <i class="kpi-icon" data-lucide="check-circle" style="width:40px;height:40px;"></i>
        </div>
        
        <div class="charts-container" style="grid-column: 1 / -1;">
            <div class="card">
                <h3 style="margin-bottom:15px; font-size:1rem; color:var(--text-secondary);">Salidas de Premios (Últimos 30 días)</h3>
                <canvas id="chartExits"></canvas>
            </div>
            <div class="card">
                <h3 style="margin-bottom:15px; font-size:1rem; color:var(--text-secondary);">Top 5 Productos Más Utilizados</h3>
                <canvas id="chartTop"></canvas>
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons({ root: dashboardGrid });

    // Fetch Data
    const fullVariants = await getFullVariants();
    const transactions = await db.transactions.toArray();
    const audits = await db.audits.orderBy('date').reverse().toArray();
    
    // Calculate KPIs
    let totalValue = 0;
    let criticalCount = 0;
    fullVariants.forEach(v => {
        totalValue += v.stock * (v.product.cost || 0);
        if (v.stock <= 0) criticalCount++;
    });
    
    document.getElementById('kpiTotalProducts').textContent = fullVariants.length;
    document.getElementById('kpiTotalValue').textContent = '$' + totalValue.toLocaleString();
    document.getElementById('kpiCritical').textContent = criticalCount;
    
    if (audits.length > 0) {
        document.getElementById('kpiAccuracy').textContent = audits[0].accuracy + '%';
        if (audits[0].accuracy >= 95) document.getElementById('kpiAccuracy').style.color = 'var(--success)';
        else document.getElementById('kpiAccuracy').style.color = 'var(--danger)';
    } else {
        document.getElementById('kpiAccuracy').textContent = 'N/A';
    }
    
    // Setup Charts
    setupExitsChart(transactions);
    setupTopProductsChart(transactions, fullVariants);
}

function setupExitsChart(transactions) {
    const ctx = document.getElementById('chartExits').getContext('2d');
    
    // Group OUT transactions by date
    const exits = transactions.filter(t => t.type === 'OUT');
    const grouped = {};
    exits.forEach(t => {
        const dateStr = new Date(t.date).toLocaleDateString();
        if (!grouped[dateStr]) grouped[dateStr] = 0;
        grouped[dateStr] += t.quantity;
    });
    
    // Get last 7 days keys
    const labels = Object.keys(grouped).slice(-7);
    const data = labels.map(l => grouped[l]);
    
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.length ? labels : ['Sin datos'],
            datasets: [{
                label: 'Unidades Entregadas',
                data: data.length ? data : [0],
                borderColor: '#005A9C',
                backgroundColor: 'rgba(0, 90, 156, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
    chartsInstance.push(chart);
}

function setupTopProductsChart(transactions, fullVariants) {
    const ctx = document.getElementById('chartTop').getContext('2d');
    
    // Count total exits per variant
    const exits = transactions.filter(t => t.type === 'OUT');
    const counts = {};
    exits.forEach(t => {
        if (!counts[t.variantId]) counts[t.variantId] = 0;
        counts[t.variantId] += t.quantity;
    });
    
    // Sort and get top 5
    const sorted = Object.keys(counts).map(vid => ({
        vid: parseInt(vid),
        qty: counts[vid]
    })).sort((a,b) => b.qty - a.qty).slice(0, 5);
    
    const labels = [];
    const data = [];
    
    sorted.forEach(item => {
        const v = fullVariants.find(fv => fv.id === item.vid);
        if (v) {
            labels.push(`${v.product.name} (${v.colorName})`);
            data.push(item.qty);
        }
    });
    
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.length ? labels : ['Sin datos'],
            datasets: [{
                label: 'Unidades',
                data: data.length ? data : [0],
                backgroundColor: '#28a745',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
    chartsInstance.push(chart);
}

window.initDashboard = initDashboard;
window.updateAlertsHeader = updateAlertsHeader;

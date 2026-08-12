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
        else if (v.stock <= (v.minStock || 0)) lowStock++;
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
    if (window.Chart && Chart.instances) {
        for (let id in Chart.instances) {
            Chart.instances[id].destroy();
        }
    }
    chartsInstance = [];
    
    const dashboardGrid = document.getElementById('dashboardContent');
    dashboardGrid.innerHTML = `
        <div class="kpi-card">
            <span class="kpi-title">Total Variantes</span>
            <span class="kpi-value" id="kpiTotalProducts">-</span>
            <i class="kpi-icon" data-lucide="package" style="width:40px;height:40px;"></i>
        </div>
        <div class="kpi-card">
            <span class="kpi-title">Agotados / Críticos</span>
            <span class="kpi-value" id="kpiCritical" style="color:var(--danger)">-</span>
            <i class="kpi-icon" data-lucide="alert-octagon" style="width:40px;height:40px;color:var(--danger);"></i>
        </div>
        
        <div class="charts-container" style="grid-column: 1 / -1;">
            <div class="card">
                <h3 style="margin-bottom:15px; font-size:1rem; color:var(--text-secondary);">Salidas de Inventario (Últimos 30 días)</h3>
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
    
    // Calculate KPIs
    let criticalCount = 0;
    fullVariants.forEach(v => {
        if (v.stock <= 0 || v.stock <= (v.minStock || 0)) criticalCount++;
    });
    
    document.getElementById('kpiTotalProducts').textContent = fullVariants.length;
    document.getElementById('kpiCritical').textContent = criticalCount;

    // Charts
    const exitsData = {};
    const topProducts = {};
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    transactions.forEach(t => {
        if (t.type === 'OUT') {
            const dateStr = new Date(t.date).toLocaleDateString();
            const txDate = new Date(t.date);
            if (txDate >= thirtyDaysAgo) {
                exitsData[dateStr] = (exitsData[dateStr] || 0) + t.quantity;
            }
            
            // Top Products
            const v = fullVariants.find(x => x.id === t.variantId);
            if (v) {
                const pName = v.product.name;
                topProducts[pName] = (topProducts[pName] || 0) + t.quantity;
            }
        }
    });

    const dates = Object.keys(exitsData).sort((a,b) => new Date(a) - new Date(b));
    const exitsCount = dates.map(d => exitsData[d]);

    const ctxExits = document.getElementById('chartExits').getContext('2d');
    chartsInstance.push(new Chart(ctxExits, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Salidas (Cantidad)',
                data: exitsCount,
                borderColor: '#005A9C',
                backgroundColor: 'rgba(0, 90, 156, 0.1)',
                fill: true,
                tension: 0.4
            }]
        }
    }));

    const sortedTop = Object.entries(topProducts).sort((a,b) => b[1] - a[1]).slice(0,5);
    const topLabels = sortedTop.map(x => x[0]);
    const topValues = sortedTop.map(x => x[1]);

    const ctxTop = document.getElementById('chartTop').getContext('2d');
    chartsInstance.push(new Chart(ctxTop, {
        type: 'bar',
        data: {
            labels: topLabels,
            datasets: [{
                label: 'Cantidad Saliente',
                data: topValues,
                backgroundColor: '#FF6B6B',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y'
        }
    }));
}
window.initDashboard = initDashboard;
window.updateAlertsHeader = updateAlertsHeader;

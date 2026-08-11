// js/app.js










document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize Icons
        if (window.lucide) {
        lucide.createIcons();
    }

    // Initialize Database
    await initDB();

    // Role Management
    const roleSelect = document.getElementById('roleSelect');
    roleSelect.addEventListener('change', (e) => {
        document.body.setAttribute('data-role', e.target.value);
        // Default redirect if viewing an admin page as user
        const activeNav = document.querySelector('.nav-btn.active');
        if (e.target.value === 'user' && activeNav && activeNav.getAttribute('data-admin-only') === 'true') {
            document.querySelector('.nav-btn[data-target="gallery"]').click();
        }
    });
    // Set initial role
    document.body.setAttribute('data-role', roleSelect.value);

    // Mobile Sidebar Toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    function toggleSidebar() {
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('open');
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');
    }

    if (mobileMenuBtn && sidebarOverlay) {
        mobileMenuBtn.addEventListener('click', toggleSidebar);
        sidebarOverlay.addEventListener('click', closeSidebar);
    }

    // Routing (Simple SPA Navigation)
    const navButtons = document.querySelectorAll('.nav-btn');
    const viewSections = document.querySelectorAll('.view-section');
    const currentViewTitle = document.getElementById('currentViewTitle');

    const modulesInit = {
        'dashboard': initDashboard,
        'gallery': initGallery,
        'catalog': initCatalog,
        'entries': () => initInventory('entries'),
        'exits': () => initInventory('exits'),
        'qr-scan': initQR,
        'audit': initAudit,
        'history': initHistory
    };

    function switchView(targetId, title) {
        // Update Nav
        navButtons.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.nav-btn[data-target="${targetId}"]`).classList.add('active');
        
        // Update Views
        viewSections.forEach(section => section.classList.add('hidden'));
        document.getElementById(targetId).classList.remove('hidden');
        
        // Update Title
        currentViewTitle.textContent = title;

        // Initialize Module if necessary
        if (modulesInit[targetId]) {
            modulesInit[targetId]();
        }
        
        // Always update top alerts
        updateAlertsHeader();
    }

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');
            const title = btn.textContent.trim();
            switchView(target, title);
            if (typeof closeSidebar === 'function') closeSidebar();
        });
    });

    // Initial Load
    switchView('dashboard', 'Dashboard');
    
    } catch (e) {
        alert("APP.JS CRASH: " + e.message + "\n\n" + e.stack);
    }
});

// Expose standard user to global for simple auth tracking across modules
window.getCurrentUser = () => {
    return document.getElementById('roleSelect').value;
};

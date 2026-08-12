// js/app.js










document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize Icons
        if (window.lucide) {
        lucide.createIcons();
    }

    // Initialize Database
    await initDB();

    // Login Logic
    const loginScreen = document.getElementById('loginScreen');
    const appContainer = document.getElementById('app');
    const btnLogin = document.getElementById('btnLogin');
    const loginEmployeeId = document.getElementById('loginEmployeeId');
    const loginError = document.getElementById('loginError');
    const roleSelect = document.getElementById('roleSelect');

    let currentUser = null;

    async function performLogin(empId) {
        if (!empId) {
            loginError.textContent = 'Ingresa un número de nómina válido';
            loginError.style.display = 'block';
            return;
        }

        try {
            // Check if user exists in DB
            let user = null;
            if (window.db && window.db.users) {
                user = await window.db.users.get(empId);
            }

            // For now, if no users table implemented yet, or user not found, auto-create a mock
            if (!user) {
                // Determine Role
                const isAdmin = (empId === '1231501' || empId === '4125715' || empId === '12345678');
                const role = isAdmin ? 'admin' : 'user';
                user = { employee_id: empId, name: 'Empleado ' + empId, role: role };
            } else {
                user.role = (user.employee_id === '1231501' || user.employee_id === '4125715' || user.employee_id === '12345678') ? 'admin' : 'user';
            }

            currentUser = user;
            roleSelect.value = user.role;
            document.body.setAttribute('data-role', user.role);

            // Save to localStorage
            localStorage.setItem('loggedInUser', empId);

            // Update UI
            document.getElementById('currentUserName').textContent = user.name;

            // Hide Login, Show App
            loginScreen.classList.add('hidden');
            appContainer.classList.remove('hidden');

            // Default Route based on role
            if (user.role === 'admin') {
                document.querySelector('.nav-btn[data-target="dashboard"]').click();
            } else {
                document.querySelector('.nav-btn[data-target="gallery"]').click();
            }
        } catch (error) {
            loginError.textContent = 'Error al conectar con la base de datos';
            loginError.style.display = 'block';
        }
    }

    btnLogin.addEventListener('click', () => {
        performLogin(loginEmployeeId.value.trim());
    });

    // Auto-login on load
    const savedUser = localStorage.getItem('loggedInUser');
    if (savedUser) {
        performLogin(savedUser);
    }

    loginEmployeeId.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') btnLogin.click();
    });

    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('loggedInUser');
            currentUser = null;
            appContainer.classList.add('hidden');
            loginScreen.classList.remove('hidden');
            loginEmployeeId.value = '';
        });
    }

    window.getCurrentUserObj = () => currentUser;

    // Mobile Sidebar Toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    function toggleSidebar() {
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('open');
            sidebarOverlay.classList.toggle('open');
        } else {
            sidebar.classList.toggle('collapsed');
        }
    }

    function closeSidebar() {
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('open');
        }
        // No auto-close en desktop
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
        'dashboard': () => { if(window.initDashboard) initDashboard(); },
        'gallery': () => { if(window.initGallery) initGallery(); },
        'catalog': () => { if(window.initCatalog) initCatalog(); },
        'entries': () => { if(window.initInventory) initInventory('entries'); },
        'exits': () => { if(window.initInventory) initInventory('exits'); },
        'qr-scan': () => { if(window.initQR) initQR(); },
        'audit': () => { if(window.initAudit) initAudit(); },
        'history': () => { if(window.initHistory) initHistory(); },
        'providers': () => { if(window.initProviders) initProviders(); },
        'restock': () => { if(window.initRestock) initRestock(); }
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

// Variables globales adicionales
let currentCategory = 'all';
let searchQuery = '';

// Nueva función: Renderizar grid de items
function renderItemGrid() {
    const grid = document.getElementById('item-grid');
    grid.innerHTML = '';
    
    const tierSelect = document.getElementById('tier-select');
    const currentTier = parseInt(tierSelect.value);
    
    Object.entries(gameData.items).forEach(([id, item]) => {
        // Filtrar por tier y categoría
        if (item.unlock_tier > currentTier) return;
        if (currentCategory !== 'all' && item.category !== currentCategory) return;
        
        // Filtrar por búsqueda
        if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return;
        
        // Crear card
        const card = document.createElement('div');
        card.className = 'item-card';
        card.dataset.itemId = id;
        
        card.innerHTML = `
            <img src="${item.icon_url}" alt="${item.name}">
            <div class="item-name">${item.name}</div>
        `;
        
        card.addEventListener('click', () => selectItem(id, item.name));
        
        grid.appendChild(card);
    });
}

// Nueva función: Seleccionar item
function selectItem(itemId, itemName) {
    document.getElementById('item-select').value = itemId;
    
    // Actualizar display
    const display = document.getElementById('selected-item-display');
    display.textContent = `Seleccionado: ${itemName}`;
    
    // Marcar card como seleccionada
    document.querySelectorAll('.item-card').forEach(card => {
        card.classList.remove('selected');
        if (card.dataset.itemId === itemId) {
            card.classList.add('selected');
        }
    });
}

// Modificar populateItemSelect para que llame a renderItemGrid
function populateItemSelect() {
    renderItemGrid();
}

// Agregar event listeners para tabs y búsqueda
function setupCategoryTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remover active de todos
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            // Agregar active al clickeado
            e.target.classList.add('active');
            // Actualizar categoría
            currentCategory = e.target.dataset.category;
            // Re-renderizar
            renderItemGrid();
        });
    });
}

function setupSearch() {
    const searchInput = document.getElementById('item-search');
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderItemGrid();
    });
}

// Modificar setupEventListeners
function setupEventListeners() {
    document.getElementById('calculate-btn').addEventListener('click', calculate);
    
    document.getElementById('tier-select').addEventListener('change', () => {
        populateItemSelect();
        updateMachineSelectors();
    });
    
    setupCategoryTabs();
    setupSearch();
}

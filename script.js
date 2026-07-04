// Variables globales
let gameData = null;
let selectedMachines = {}; // Almacena qué máquina está seleccionada para cada categoría
let currentCategory = 'all';
let searchQuery = '';

// Al iniciar
document.addEventListener('DOMContentLoaded', async () => {
    await loadGameData();
    
    // Set default category to logistics
    currentCategory = 'logistics';
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === 'logistics') {
            btn.classList.add('active');
        }
    });
    
    populateItemSelect();
    updateMachineSelectors();
    setupEventListeners();
    renderItemGrid();
});

// Cargar JSON
async function loadGameData() {
    try {
        const response = await fetch('data/recipes.json');
        gameData = await response.json();
        console.log('Datos cargados:', gameData);
    } catch (error) {
        console.error('Error cargando datos:', error);
        alert('Error cargando los datos del juego');
    }
}

// Llenar el select de items filtrado por Tier -> Modificado para que llame a renderItemGrid
function populateItemSelect() {
    renderItemGrid();
}

// Actualizar los selectores de máquinas según el Tier
function updateMachineSelectors() {
    const itemId = document.getElementById('item-select').value;
    const container = document.getElementById('machine-upgrades-content');
    container.innerHTML = '';

    // Determinar tier del item
    let currentTier = 0;
    if (itemId && gameData.items[itemId]) {
        currentTier = gameData.items[itemId].unlock_tier;
    }

    // SOLO mostrar máquinas con upgrades (QUITAR oil-processing y chemistry)
    const categories = ['crafting', 'smelting', 'mining'];
    const categoryNames = {
        'crafting': 'Ensamblaje',
        'smelting': 'Fundición',
        'mining': 'Minería / Extracción'
    };

    categories.forEach(cat => {
        const allMachines = Object.entries(gameData.machines).filter(([id, m]) => m.categories.includes(cat));
        const tierMachines = allMachines.filter(([id, m]) => m.tier <= currentTier);

        if (allMachines.length === 0) return;

        allMachines.sort((a, b) => b[1].tier - a[1].tier);

        const groupDiv = document.createElement('div');
        groupDiv.className = 'machine-upgrade-group';

        const label = document.createElement('label');
        label.textContent = categoryNames[cat] + ':';
        groupDiv.appendChild(label);

        const select = document.createElement('select');
        select.id = `machine-select-${cat}`;
        select.className = 'machine-select';

        let defaultMachineId = null;

        if (tierMachines.length > 0) {
            tierMachines.sort((a, b) => b[1].tier - a[1].tier);
            defaultMachineId = tierMachines[0][0];
        } else {
            defaultMachineId = allMachines[0][0];
        }

        allMachines.forEach(([id, m]) => {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = m.name;
            if (id === defaultMachineId) opt.selected = true;
            select.appendChild(opt);
        });

        selectedMachines[cat] = defaultMachineId;

        select.addEventListener('change', (e) => {
            selectedMachines[cat] = e.target.value;
        });

        groupDiv.appendChild(select);
        container.appendChild(groupDiv);
    });
}

// Configurar eventos
function setupEventListeners() {
    document.getElementById('calculate-btn').addEventListener('click', calculate);
    
    // Eliminado el event listener del tier-select
    
    setupCategoryTabs();
    setupSearch();
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

// Renderizar grid de items
function renderItemGrid() {
    const grid = document.getElementById('item-grid');
    if (!grid) return;
    
    if (!gameData || !gameData.items) {
        grid.innerHTML = '<p style="color: red;">Error: Datos no cargados</p>';
        return;
    }
    
    grid.innerHTML = '';
    
    let itemCount = 0;
    
    Object.entries(gameData.items).forEach(([id, item]) => {
        // Filtrar por categoría
        if (currentCategory && item.category !== currentCategory) return;
        
        // Filtrar por búsqueda
        if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return;
        
        // MOSTRAR TODO: recursos, intermedios, productos
        // if (item.type === 'resource') return;  <-- ELIMINAR ESTA LÍNEA
        
        // Crear card
        const card = document.createElement('div');
        card.className = 'item-card';
        card.dataset.itemId = id;
        
        card.innerHTML = `
            <img src="${item.icon_url}" alt="${item.name}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2232%22 height=%2232%22%3E%3Crect fill=%22%23333%22 width=%2232%22 height=%2232%22/%3E%3C/svg%3E'">
            <div class="item-name">${item.name}</div>
        `;
        
        card.addEventListener('click', () => selectItem(id, item.name));
        
        grid.appendChild(card);
        itemCount++;
    });
    
    if (itemCount === 0) {
        grid.innerHTML = '<p style="color: #888; text-align: center; padding: 20px; grid-column: 1/-1;">No hay items disponibles</p>';
    }
}

// Seleccionar item
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

// ============================================
// LÓGICA PRINCIPAL DE CÁLCULO
// ============================================

function calculate() {
    const itemId = document.getElementById('item-select').value;
    const ratePerMinute = parseFloat(document.getElementById('rate-input').value);
    
    if (!itemId || !ratePerMinute || ratePerMinute <= 0) {
        alert('Por favor selecciona un item y una cantidad válida');
        return;
    }
    
    const ratePerSecond = ratePerMinute / 60;
    const productionNodes = [];
    
    calculateItemRecursive(itemId, ratePerSecond, productionNodes);
    displayResults(itemId, ratePerMinute, productionNodes);
}

function calculateItemRecursive(itemId, ratePerSecond, nodes) {
    const item = gameData.items[itemId];
    
    // CASO 1: Recurso crudo
    if (item.type === 'resource') {
        const recipeId = `mining-${itemId}`;
        let recipe = gameData.recipes[recipeId];
        
        // Si no hay receta de mining, buscar otras (pumping, etc)
        if (!recipe) {
            recipe = Object.values(gameData.recipes).find(r => r.result === itemId);
        }
        
        if (!recipe) return;

        let machine = null;
        
        // MÁQUINAS AUTOMÁTICAS para extracción de recursos
        if (recipe.category === 'pumping') {
            // Agua y otros fluidos usan Bomba Costera o Extractora
            if (itemId === 'water' || itemId === 'lava') {
                machine = gameData.machines['offshore-pump'];
            } else {
                machine = gameData.machines['pumpjack'];
            }
        } else {
            // Minería normal
            const machineId = selectedMachines['mining'];
            machine = machineId ? gameData.machines[machineId] : null;
        }

        if (!machine) {
            nodes.push({
                itemId, itemName: item.name, ratePerSecond, recipe,
                machine: { name: 'Extracción Manual' }, machinesNeeded: 0
            });
            return;
        }

        const productionPerMachine = (machine.speed / recipe.time) * recipe.result_count;
        const machinesNeeded = ratePerSecond / productionPerMachine;
        
        nodes.push({ itemId, itemName: item.name, ratePerSecond, recipe, machine, machinesNeeded });
        return;
    }
    
    // CASO 2: Item intermedio o producto
    const recipe = findRecipeForItem(itemId);
    if (!recipe) return;
    
    // MÁQUINAS FIJAS para categorías especiales
    let machine = null;
    
    if (recipe.category === 'oil-processing') {
        machine = gameData.machines['oil-refinery'];
    } else if (recipe.category === 'chemistry') {
        machine = gameData.machines['chemical-plant'];
    } else if (recipe.category === 'centrifuging') {
        machine = gameData.machines['centrifuge'];
    } else if (recipe.category === 'crushing') {
        machine = gameData.machines['crusher'];
    } else {
        // Usar máquina seleccionada por el usuario
        const machineId = selectedMachines[recipe.category];
        machine = machineId ? gameData.machines[machineId] : null;
    }

    if (!machine) {
        nodes.push({
            itemId, itemName: item.name, ratePerSecond, recipe,
            machine: { name: 'Manual' }, machinesNeeded: 0
        });
    } else {
        const productionPerMachine = (machine.speed / recipe.time) * recipe.result_count;
        const machinesNeeded = ratePerSecond / productionPerMachine;
        nodes.push({ itemId, itemName: item.name, ratePerSecond, recipe, machine, machinesNeeded });
    }
    
    // RECURSIÓN
    recipe.ingredients.forEach(ingredient => {
        const ingredientRate = ratePerSecond * ingredient.amount;
        calculateItemRecursive(ingredient.item, ingredientRate, nodes);
    });
}

function findRecipeForItem(itemId) {
    return Object.values(gameData.recipes).find(r => r.result === itemId);
}

// ============================================
// MOSTRAR RESULTADOS
// ============================================

function displayResults(itemId, ratePerMinute, nodes) {
    const resultsSection = document.getElementById('results');
    const resultsContent = document.getElementById('results-content');
    
    resultsSection.classList.remove('hidden');
    const targetItem = gameData.items[itemId];
    
    let html = `
        <div class="result-summary">
            <h3>
                <img src="${targetItem.icon_url}" alt="${targetItem.name}" class="item-icon"> 
                Objetivo: ${targetItem.name}
            </h3>
            <p>Tasa deseada: <strong>${ratePerMinute} por minuto</strong> (${(ratePerMinute/60).toFixed(3)}/seg)</p>
        </div>
        
        <h3 style="margin-top: 20px;">Máquinas necesarias:</h3>
        <table class="results-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Tasa (/seg)</th>
                    <th>Máquina Usada</th>
                    <th>Cantidad</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    nodes.forEach(node => {
        const machinesRounded = Math.ceil(node.machinesNeeded);
        const item = gameData.items[node.itemId];
        const machine = node.machine;
        
        html += `
            <tr>
                <td class="item-cell">
                    <img src="${item.icon_url}" alt="${item.name}" class="item-icon-small">
                    <strong>${item.name}</strong>
                </td>
                <td>${node.ratePerSecond.toFixed(3)}</td>
                <td class="machine-cell">
                    ${machine.icon_url ? `<img src="${machine.icon_url}" alt="${machine.name}" class="item-icon-small">` : ''}
                    ${machine.name}
                </td>
                <td class="machines-count">${machinesRounded} <span class="exact">(${node.machinesNeeded.toFixed(2)})</span></td>
            </tr>
        `;
    });
    
    html += `</tbody></table>
        <div class="note">
            <p>💡 <em>Nota: Las cantidades se redondean hacia arriba.</em></p>
        </div>`;
    
    resultsContent.innerHTML = html;
}
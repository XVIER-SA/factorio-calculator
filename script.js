// Variables globales
let gameData = null;
let selectedMachines = {}; // Almacena qué máquina está seleccionada para cada categoría
let currentCategory = 'all';
let currentGameMode = 'space-age'; // 'base' o 'space-age'
let currentOilMode = 'basic'; // 'basic' o 'advanced'
let productivityLevels = {
    mining: 0,
    steel: 0,
    'low-density': 0,
    scrap: 0,
    processing: 0,
    plastic: 0,
    'rocket-fuel': 0,
    asteroid: 0,
    'rocket-part': 0
};
let byproductTracker = {
    produced: {}, // Fluidos producidos como subproductos
    consumed: {}  // Fluidos consumidos en otras recetas
};
let searchQuery = '';

// Al iniciar
document.addEventListener('DOMContentLoaded', async () => {
    const oilToggle = document.querySelector('.oil-mode-toggle');
    if (oilToggle) oilToggle.style.display = 'none';
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

    // 1. Obtener el tier EXACTO del item seleccionado
    let currentTier = 0;
    if (itemId && gameData.items[itemId]) {
        currentTier = gameData.items[itemId].unlock_tier;
    }

    const categories = ['crafting', 'smelting', 'mining'];
    const categoryNames = {
        'crafting': 'Ensamblaje',
        'smelting': 'Fundición',
        'mining': 'Minería / Extracción'
    };

    categories.forEach(cat => {
        const allMachines = Object.entries(gameData.machines).filter(([id, m]) => m.categories.includes(cat));
        
        // 2. Filtrar máquinas disponibles para el tier del item
        const tierMachines = allMachines.filter(([id, m]) => m.tier <= currentTier);

        if (allMachines.length === 0) return;

        const groupDiv = document.createElement('div');
        groupDiv.className = 'machine-upgrade-group';

        const label = document.createElement('label');
        label.textContent = categoryNames[cat] + ':';
        groupDiv.appendChild(label);

        const select = document.createElement('select');
        select.id = `machine-select-${cat}`;
        select.className = 'machine-select';

        // 3. Lógica de selección por defecto
        let defaultMachineId = null;
        
        if (tierMachines.length > 0) {
            // Si hay máquinas para este tier, elegir la MEJOR (mayor tier)
            tierMachines.sort((a, b) => b[1].tier - a[1].tier);
            defaultMachineId = tierMachines[0][0];
        } else {
            // Si no hay máquinas para este tier, elegir la MÁS BÁSICA (menor tier)
            allMachines.sort((a, b) => a[1].tier - b[1].tier);
            defaultMachineId = allMachines[0][0];
        }

        // 4. Llenar el select con TODAS las máquinas (ordenadas de mejor a peor)
        allMachines.sort((a, b) => b[1].tier - a[1].tier);
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

function updateProductivityBonus() {
    const categories = ['mining', 'steel', 'low-density', 'scrap', 'processing', 'plastic', 'rocket-fuel', 'asteroid', 'rocket-part'];
    
    categories.forEach(cat => {
        const input = document.getElementById(`prod-${cat}`);
        const bonusDisplay = document.getElementById(`bonus-${cat}`);
        
        if (input && bonusDisplay) {
            let level = parseInt(input.value) || 0;
            
            // Validar límites
            if (level > 30) {
                level = 30;
                input.value = 30;
                bonusDisplay.classList.add('warning');
            } else {
                bonusDisplay.classList.remove('warning');
            }
            
            productivityLevels[cat] = level;
            const bonus = level * 10;
            bonusDisplay.textContent = `+${bonus}%`;
        }
    });
}

// Configurar eventos
function setupEventListeners() {
    document.getElementById('calculate-btn').addEventListener('click', calculate);
    
    // Event listeners para el toggle de modo de juego
    document.querySelectorAll('input[name="game-mode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentGameMode = e.target.value;
            const tabSpace = document.getElementById('tab-space');
            
            if (currentGameMode === 'base') {
                // Ocultar pestaña Espacio
                tabSpace.style.display = 'none';
                
                // Si la pestaña activa era Espacio, cambiar a Producción
                if (currentCategory === 'space') {
                    currentCategory = 'production';
                    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                    document.querySelector('.tab-btn[data-category="production"]').classList.add('active');
                }
            } else {
                // Mostrar pestaña Espacio
                tabSpace.style.display = ''; 
            }
            
            renderItemGrid();
        });
    });

    // Event listeners para investigaciones de productividad
    document.querySelectorAll('.research-input').forEach(input => {
        input.addEventListener('input', updateProductivityBonus);
    });

    // Inicializar bonus al cargar
    updateProductivityBonus();
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
        // === FILTRO DE MODO DE JUEGO ===
        if (currentGameMode === 'base') {
            // Ocultar items exclusivos de Space Age
            if (item.game_mode === 'space-age') return;
        } else {
            // En Space Age: ocultar items exclusivos de Base
            if (item.game_mode === 'base') return;
        }
        
        // === CATEGORÍA DINÁMICA ===
        let displayCategory = item.category;
        
        // El Silo de Cohetes cambia de categoría según el modo
        if (id === 'rocket-silo') {
            displayCategory = currentGameMode === 'base' ? 'production' : 'space';
        } else if (id === 'rocket-part') {
            displayCategory = currentGameMode === 'base' ? 'resources' : 'space';
        }        
        // Filtrar por categoría (usando la categoría dinámica)
        if (currentCategory && displayCategory !== currentCategory) return;
        
        // Filtrar por búsqueda
        if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return;
        
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

// Caché para no recalcular lo mismo varias veces
const oilDependencyCache = {};

function requiresOilProcessing(itemId, visited = new Set()) {
    // Si ya lo calculamos, devolver el resultado guardado
    if (oilDependencyCache[itemId] !== undefined) return oilDependencyCache[itemId];
    
    // Evitar bucles infinitos si hay recetas circulares
    if (visited.has(itemId)) return false;
    visited.add(itemId);

    // Buscar TODAS las recetas que producen este item
    const recipes = Object.values(gameData.recipes).filter(r => r.result === itemId);

    for (const recipe of recipes) {
        // Si la receta es de refinería o química, DEPENDE del petróleo
        if (recipe.category === 'oil-processing' || recipe.category === 'chemistry') {
            oilDependencyCache[itemId] = true;
            return true;
        }
        
        // Revisar recursivamente los ingredientes
        if (recipe.ingredients) {
            for (const ing of recipe.ingredients) {
                if (requiresOilProcessing(ing.item, new Set(visited))) {
                    oilDependencyCache[itemId] = true;
                    return true;
                }
            }
        }
    }

    oilDependencyCache[itemId] = false;
    return false;
}

function checkOilToggleVisibility(itemId) {
    const oilToggle = document.querySelector('.oil-mode-toggle');
    if (!oilToggle) return;

    // Limpiar caché si cambiamos de modo de juego (opcional, pero buena práctica)
    // Object.keys(oilDependencyCache).forEach(key => delete oilDependencyCache[key]);

    if (requiresOilProcessing(itemId)) {
        oilToggle.style.display = 'flex';
    } else {
        oilToggle.style.display = 'none';
    }
}

// Seleccionar item
function selectItem(itemId, itemName) {
    // === AUTO-SELECCIÓN DE MODO DE PETRÓLEO SEGÚN TIER ===
    const itemTier = gameData.items[itemId].unlock_tier;
    const oilBasicRadio = document.getElementById('oil-basic');
    const oilAdvancedRadio = document.getElementById('oil-advanced');
    
    if (itemTier >= 3) {
        currentOilMode = 'advanced';
        oilAdvancedRadio.checked = true;
    } else {
        currentOilMode = 'basic';
        oilBasicRadio.checked = true;
    }
    // ====================================================

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
    checkOilToggleVisibility(itemId);
    updateMachineSelectors();
}

// ============================================
// LÓGICA PRINCIPAL DE CÁLCULO
// ============================================

function calculate() {
    // Limpiar el rastreador de subproductos
    byproductTracker = { produced: {}, consumed: {} };
    
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

        // Calcular producción - manejar recetas con múltiples resultados
        let productionPerMachine = 0;
        let recipeResults = [];

        if (recipe.results) {
            // Receta con múltiples resultados (ej. procesamiento avanzado)
            recipeResults = recipe.results;
            const mainResult = recipe.results.find(r => r.item === itemId) || recipe.results[0];
            productionPerMachine = (machine.speed / recipe.time) * mainResult.amount;
        } else {
            // Receta normal con un solo resultado
            productionPerMachine = (machine.speed / recipe.time) * recipe.result_count;
            recipeResults = [{item: itemId, amount: recipe.result_count}];
        }

        // Aplicar bonus de productividad si existe
        let productivityBonus = 0;
        if (itemId === 'iron-ore' || itemId === 'copper-ore' || itemId === 'coal' || itemId === 'stone' || itemId === 'uranium-ore' || itemId === 'crude-oil' || itemId === 'water' || itemId === 'lava' || itemId === 'heavy-oil' || itemId === 'light-oil') {
            productivityBonus = productivityLevels.mining * 0.1;
        } else if (itemId === 'steel') {
            productivityBonus = productivityLevels.steel * 0.1;
        } else if (itemId === 'low-density-structure') {
            productivityBonus = productivityLevels['low-density'] * 0.1;
        } else if (itemId === 'processing-unit') {
            productivityBonus = productivityLevels.processing * 0.1;
        } else if (itemId === 'plastic-bar') {
            productivityBonus = productivityLevels.plastic * 0.1;
        } else if (itemId === 'rocket-fuel') {
            productivityBonus = productivityLevels['rocket-fuel'] * 0.1;
        } else if (itemId === 'rocket-part') {
            productivityBonus = productivityLevels['rocket-part'] * 0.1;
        }

        // Ajustar producción con el bonus
        const adjustedProduction = productionPerMachine * (1 + productivityBonus);
        const machinesNeeded = ratePerSecond / adjustedProduction;

        // === RASTREO DE SUBPRODUCTOS ===
        if (recipeResults.length > 1 && currentOilMode === 'advanced') {
            recipeResults.forEach(result => {
                const resultRate = (ratePerSecond / (recipe.results ? recipe.results.find(r => r.item === itemId).amount : recipe.result_count)) * result.amount;
                byproductTracker.produced[result.item] = (byproductTracker.produced[result.item] || 0) + resultRate;
            });
        }

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
    } else if (recipe.category === 'rocket-building') {
        machine = gameData.machines['rocket-silo'];
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
        // Aplicar bonus de productividad si existe
        let productivityBonus = 0;
        if (itemId === 'iron-ore' || itemId === 'copper-ore' || itemId === 'coal' || itemId === 'stone' || itemId === 'uranium-ore' || itemId === 'crude-oil' || itemId === 'water' || itemId === 'lava' || itemId === 'heavy-oil' || itemId === 'light-oil') {
            productivityBonus = productivityLevels.mining * 0.1;
        } else if (itemId === 'steel') {
            productivityBonus = productivityLevels.steel * 0.1;
        } else if (itemId === 'low-density-structure') {
            productivityBonus = productivityLevels['low-density'] * 0.1;
        } else if (itemId === 'processing-unit') {
            productivityBonus = productivityLevels.processing * 0.1;
        } else if (itemId === 'plastic-bar') {
            productivityBonus = productivityLevels.plastic * 0.1;
        } else if (itemId === 'rocket-fuel') {
            productivityBonus = productivityLevels['rocket-fuel'] * 0.1;
        } else if (itemId === 'rocket-part') {
            productivityBonus = productivityLevels['rocket-part'] * 0.1;
        }

        // Ajustar producción con el bonus
        const adjustedProduction = productionPerMachine * (1 + productivityBonus);
        const machinesNeeded = ratePerSecond / adjustedProduction;
        nodes.push({ itemId, itemName: item.name, ratePerSecond, recipe, machine, machinesNeeded });
    }
    
    // RECURSIÓN
    recipe.ingredients.forEach(ingredient => {
        const ingredientRate = ratePerSecond * ingredient.amount;
        calculateItemRecursive(ingredient.item, ingredientRate, nodes);
    });
}

function findRecipeForItem(itemId) {
    // CASO ESPECIAL: Gas de Petróleo
    if (itemId === 'petroleum-gas') {
        if (currentOilMode === 'advanced') {
            return gameData.recipes['advanced-oil-processing'];
        }
        return gameData.recipes['basic-oil-processing'];
    }

    // Lógica normal para el resto
    return Object.values(gameData.recipes).find(r => {
        if (r.result !== itemId) return false;
        if (r.game_mode && r.game_mode !== currentGameMode) return false;
        return true;
    });
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
    
    // === REPORTE DE BALANCE DE FLUIDOS ===
    if (currentOilMode === 'advanced' && Object.keys(byproductTracker.produced).length > 0) {
        html += `
            <div class="fluid-balance-report" style="background: rgba(138, 43, 226, 0.1); padding: 15px; border-radius: 5px; margin-top: 20px; border-left: 4px solid #8a2be2;">
                <h3 style="color: #8a2be2; margin-bottom: 10px;">⚖️ Balance de Fluidos (Procesamiento Avanzado)</h3>
                <p style="color: #ccc; margin-bottom: 10px;">Tu producción genera automáticamente estos subproductos:</p>
                <ul style="list-style: none; padding: 0;">
        `;
        
        const fluids = ['heavy-oil', 'light-oil', 'petroleum-gas'];
        fluids.forEach(fluidId => {
            const produced = byproductTracker.produced[fluidId] || 0;
            const consumed = byproductTracker.consumed[fluidId] || 0;
            const balance = produced - consumed;
            const fluidName = gameData.items[fluidId]?.name || fluidId;
            
            let statusText = '';
            let statusColor = '';
            
            if (balance > 0.01) {
                statusText = `Te sobran ${balance.toFixed(2)}/s (puedes convertirlo o usarlo para otra cosa)`;
                statusColor = '#00ff00';
            } else if (balance < -0.01) {
                statusText = `Te faltan ${Math.abs(balance).toFixed(2)}/s (necesitas más producción)`;
                statusColor = '#ff6600';
            } else {
                statusText = 'Balance perfecto';
                statusColor = '#4a90e2';
            }
            
            html += `
                <li style="margin-bottom: 8px; color: #ccc;">
                    <strong style="color: #b266ff;">${fluidName}:</strong> 
                    Producido ${produced.toFixed(2)}/s - Consumido ${consumed.toFixed(2)}/s = 
                    <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>
                </li>
            `;
        });
        
        html += `
                </ul>
            </div>
        `;
    }
    // ========================================
    
    resultsContent.innerHTML = html;
    resultsContent.innerHTML = html;
}
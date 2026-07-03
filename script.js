// Variables globales
let gameData = null;
let selectedMachines = {}; // Almacena qué máquina está seleccionada para cada categoría

// Al iniciar
document.addEventListener('DOMContentLoaded', async () => {
    await loadGameData();
    populateItemSelect();
    updateMachineSelectors(); // Inicializa los selectores de máquinas
    setupEventListeners();
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

// Llenar el select de items filtrado por Tier
function populateItemSelect() {
    const select = document.getElementById('item-select');
    const tierSelect = document.getElementById('tier-select');
    const currentTier = parseInt(tierSelect.value);
    
    select.innerHTML = ''; 
    
    Object.entries(gameData.items).forEach(([id, item]) => {
        // Solo items con receta y desbloqueados en el tier actual
        if (item.type !== 'resource' && item.unlock_tier === currentTier) {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = item.name;
            select.appendChild(option);
        }
    });
    
    if (select.options.length > 0) {
        select.selectedIndex = 0;
    }
}

// Actualizar los selectores de máquinas según el Tier
function updateMachineSelectors() {
    const tierSelect = document.getElementById('tier-select');
    const currentTier = parseInt(tierSelect.value);
    const container = document.getElementById('machine-upgrades-content');
    container.innerHTML = '';

    const categories = ['crafting', 'smelting', 'mining'];
    const categoryNames = {
        'crafting': 'Ensamblaje',
        'smelting': 'Fundición',
        'mining': 'Minería / Extracción',
        'oil-processing': 'Refinería',
        'chemistry': 'Planta Química'
    };

    categories.forEach(cat => {
        const allMachines = Object.entries(gameData.machines).filter(([id, m]) => m.categories.includes(cat));
        const tierMachines = allMachines.filter(([id, m]) => m.tier <= currentTier);

        if (allMachines.length === 0) return; // Si no hay máquinas para esta categoría, no crear selector

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
            // Si no hay máquinas para este tier, usar la mejor disponible de cualquier tier
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
    
    // Cuando cambia el Tier, actualizamos items y máquinas
    document.getElementById('tier-select').addEventListener('change', () => {
        populateItemSelect();
        updateMachineSelectors();
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
        const recipe = gameData.recipes[recipeId];
        if (!recipe) return; // Si no hay receta de minería (ej. agua a veces)

        const machineId = selectedMachines['mining'];
        const machine = machineId ? gameData.machines[machineId] : null;

        if (!machine) {
            // Si es manual o no hay máquina, no calculamos máquinas
            nodes.push({
                itemId, itemName: item.name, ratePerSecond, recipe,
                machine: { name: 'Manual' }, machinesNeeded: 0
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
    
    const machineId = selectedMachines[recipe.category];
    const machine = machineId ? gameData.machines[machineId] : null;

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
// Variables globales
let gameData = null;

// Al iniciar
document.addEventListener('DOMContentLoaded', async () => {
    await loadGameData();
    populateItemSelect();
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

// Llenar el select con items que TIENEN receta (no recursos crudos)
function populateItemSelect() {
    const select = document.getElementById('item-select');
    const tierSelect = document.getElementById('tier-select');
    const currentTier = parseInt(tierSelect.value);
    
    select.innerHTML = ''; // Limpiar opciones
    
    Object.entries(gameData.items).forEach(([id, item]) => {
        // Solo mostrar items que se pueden producir (tienen receta) Y están desbloqueados en el tier actual
        if (item.type !== 'resource' && item.unlock_tier <= currentTier) {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = item.name;
            select.appendChild(option);
        }
    });
    
    Object.entries(gameData.items).forEach(([id, item]) => {
        // Solo mostrar items que se pueden producir (tienen receta)
        if (item.type !== 'resource') {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = item.name; // Solo el nombre, sin placeholder
            select.appendChild(option);
        }
    });
    
    // Seleccionar el primer item por defecto (opcional)
    if (select.options.length > 0) {
        select.selectedIndex = 0;
    }
}

function setupEventListeners() {
    document.getElementById('calculate-btn').addEventListener('click', calculate);
    document.getElementById('tier-select').addEventListener('change', populateItemSelect);
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
    
    // Estructura para acumular resultados
    const productionNodes = [];
    
    // Calcular recursivamente
    calculateItemRecursive(itemId, ratePerSecond, productionNodes);
    
    displayResults(itemId, ratePerMinute, productionNodes);
}

/**
 * Calcula recursivamente qué se necesita para producir un item
 * @param {string} itemId - ID del item a producir
 * @param {number} ratePerSecond - Cuántos por segundo se necesitan
 * @param {Array} nodes - Array donde acumulamos los resultados
 */
function calculateItemRecursive(itemId, ratePerSecond, nodes) {
    const item = gameData.items[itemId];
    
    // CASO 1: Es un recurso crudo (mineral) -> necesita minería
    if (item.type === 'resource') {
        const recipeId = `mining-${itemId}`;
        const recipe = gameData.recipes[recipeId];
        const machine = findMachineForCategory('mining');
        
        // Producción real de 1 máquina: speed / time * result_count
        const productionPerMachine = (machine.speed / recipe.time) * recipe.result_count;
        const machinesNeeded = ratePerSecond / productionPerMachine;
        
        nodes.push({
            itemId: itemId,
            itemName: item.name,
            ratePerSecond: ratePerSecond,
            recipe: recipe,
            machine: machine,
            machinesNeeded: machinesNeeded
        });
        return;
    }
    
    // CASO 2: Es un item intermedio o producto -> buscar receta
    const recipe = findRecipeForItem(itemId);
    if (!recipe) {
        console.warn(`No se encontró receta para ${itemId}`);
        return;
    }
    
    const machine = findMachineForCategory(recipe.category);
    
    // Producción real de 1 máquina
    const productionPerMachine = (machine.speed / recipe.time) * recipe.result_count;
    const machinesNeeded = ratePerSecond / productionPerMachine;
    
    // Registrar este nodo de producción
    nodes.push({
        itemId: itemId,
        itemName: item.name,
        ratePerSecond: ratePerSecond,
        recipe: recipe,
        machine: machine,
        machinesNeeded: machinesNeeded
    });
    
    // RECURSIÓN: calcular cada ingrediente
    recipe.ingredients.forEach(ingredient => {
        // Cantidad por segundo del ingrediente = tasa del producto * cantidad en receta
        const ingredientRate = ratePerSecond * ingredient.amount;
        calculateItemRecursive(ingredient.item, ingredientRate, nodes);
    });
}

// Buscar la receta que produce un item
function findRecipeForItem(itemId) {
    return Object.values(gameData.recipes).find(r => r.result === itemId);
}

// Buscar la primera máquina disponible para una categoría
function findMachineForCategory(category) {
    return Object.values(gameData.machines).find(m => m.categories.includes(category));
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
                    <th>Máquina</th>
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
                    <img src="${machine.icon_url}" alt="${machine.name}" class="item-icon-small">
                    ${machine.name}
                </td>
                <td class="machines-count">${machinesRounded} <span class="exact">(${node.machinesNeeded.toFixed(2)})</span></td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
        
        <div class="note">
            <p>💡 <em>Nota: Las cantidades se redondean hacia arriba (no puedes tener media máquina).</em></p>
            <p>️ <em>Los valores entre paréntesis son los valores exactos para referencia.</em></p>
        </div>
    `;
    
    resultsContent.innerHTML = html;
}


// Variables globales
let gameData = null;

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', async () => {
    await loadGameData();
    populateItemSelect();
    setupEventListeners();
});

// Cargar JSON de recetas
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

// Llenar el select con items disponibles
function populateItemSelect() {
    const select = document.getElementById('item-select');
    select.innerHTML = '<option value="">Selecciona un item...</option>';
    
    Object.entries(gameData.items).forEach(([id, item]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = item.name;
        select.appendChild(option);
    });
}

// Configurar eventos
function setupEventListeners() {
    document.getElementById('calculate-btn').addEventListener('click', calculate);
}

// Función principal de cálculo
function calculate() {
    const itemId = document.getElementById('item-select').value;
    const ratePerMinute = parseFloat(document.getElementById('rate-input').value);
    
    if (!itemId || !ratePerMinute) {
        alert('Por favor selecciona un item y una cantidad');
        return;
    }
    
    // Convertir a por segundo
    const ratePerSecond = ratePerMinute / 60;
    
    // Calcular producción (aquí irá la lógica recursiva)
    const results = calculateProduction(itemId, ratePerSecond);
    
    // Mostrar resultados
    displayResults(results);
}

// Calcular producción recursivamente
function calculateProduction(itemId, ratePerSecond) {
    // TODO: Implementar lógica de cálculo
    return {
        item: itemId,
        rate: ratePerSecond,
        machines: {},
        resources: {}
    };
}

// Mostrar resultados en pantalla
function displayResults(results) {
    const resultsSection = document.getElementById('results');
    const resultsContent = document.getElementById('results-content');
    
    resultsSection.classList.remove('hidden');
    resultsContent.innerHTML = `
        <div class="result-item">
            <h3>Resultados para ${gameData.items[results.item].name}</h3>
            <p>Tasa: ${(results.rate * 60).toFixed(2)} por minuto</p>
            <p>Funcionalidad básica lista - Próximo paso: implementar cálculo recursivo</p>
        </div>
    `;
}
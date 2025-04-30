// Configuration
const BLYNK_AUTH = "v7YICJABJ_-P-TWzjuPL2PXXRBRbYfr-";
const BLYNK_URL = "https://blynk.cloud/external/api/get";
const UPDATE_INTERVAL = 5000; // 5 seconds
let dashboardInterval = null;

// DOM Elements
const elements = {
    entryScreen: document.getElementById('entry-screen'),
    loadingScreen: document.getElementById('loading-screen'),
    mainContainer: document.querySelector('.container'),
    yesBtn: document.getElementById('yes-btn'),
    noBtn: document.getElementById('no-btn'),
    submitBtn: document.getElementById('submitBtn'),
    sensorValues: {
        ph: document.getElementById('ph-value'),
        tds: document.getElementById('tds-value'),
        temp: document.getElementById('temperature-value'),
        turbidity: document.getElementById('turbidity-value')
    }
};

// Initialize the application
function initApp() {
    // Set up event listeners
    elements.yesBtn.addEventListener('click', handleYesClick);
    elements.noBtn.addEventListener('click', handleNoClick);
    elements.submitBtn.addEventListener('click', handleFormSubmit);

    // Hide main content initially
    elements.mainContainer.style.display = 'none';
}

// Handle "Yes" button click
async function handleYesClick() {
    // Hide entry screen
    elements.entryScreen.style.display = 'none';

    // Show loading screen
    elements.loadingScreen.style.display = 'flex';

    // Clear any existing interval
    if (dashboardInterval) {
        clearInterval(dashboardInterval);
    }

    // Simulate loading (3 seconds)
    setTimeout(async () => {
        // Hide loading screen
        elements.loadingScreen.style.display = 'none';

        // Show main content
        elements.mainContainer.style.display = 'block';

        // Initial data fetch
        await updateDashboard();

        // Set up periodic updates
        dashboardInterval = setInterval(updateDashboard, UPDATE_INTERVAL);
    }, 3000);
}

// Handle "No" button click
function handleNoClick() {
    alert("Come back when you're ready to test water quality!");
}

// Handle form submission
function handleFormSubmit() {
    const location = document.getElementById('location').value;
    const source = document.getElementById('source').value;
    const datetime = document.getElementById('datetime').value;
    const collector = document.getElementById('collector').value;
    const industry = document.getElementById('industry').value;

    if (!location || !source || !datetime || !collector) {
        alert("Please fill in all required fields!");
        return;
    }

    const testData = {
        location,
        source,
        datetime,
        collector,
        industry: industry || "N/A"
    };

    localStorage.setItem('latestTestDetails', JSON.stringify(testData));
    alert("Details submitted successfully!");
}

// Update dashboard with sensor data
async function updateDashboard() {
    try {
        // Corrected order: [pH, TDS, Temperature, Turbidity]
        const [ph, tds, temp, turbidity] = await Promise.all([
            fetchSensorData('V1'),
            fetchSensorData('V2'),
            fetchSensorData('V3'),
            fetchSensorData('V4')
        ]);

        // Update displays with correct mapping
        updateSensorDisplay('ph', ph);
        updateSensorDisplay('tds', tds);
        updateSensorDisplay('temp', temp);
        updateSensorDisplay('turbidity', turbidity);

        updateReportsTable(ph, tds, temp, turbidity);

    } catch (error) {
        console.error("Update failed:", error);
    }
}


// Fetch data from Blynk API
async function fetchSensorData(pin) {
    const response = await fetch(`${BLYNK_URL}?token=${BLYNK_AUTH}&${pin}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${pin} data`);
    }
    return parseFloat(await response.text());
}

// Update sensor value display
function updateSensorDisplay(type, value) {
    if (!elements.sensorValues[type]) return;

    let formattedValue;
    switch (type) {
        case 'ph':
        case 'turbidity':
            formattedValue = value.toFixed(2);
            break;
        case 'tds':
            formattedValue = Math.round(value);
            break;
        case 'temp':
            formattedValue = value.toFixed(1);
            break;
        default:
            formattedValue = value;
    }

    elements.sensorValues[type].textContent = formattedValue;
}

// Update reports table
function updateReportsTable(ph, tds, temp, turbidity) {
    const tableBody = document.querySelector('table tbody');
    if (!tableBody) return;

    // Clear existing rows
    tableBody.innerHTML = '';

    // Add rows for each parameter
    addReportRow(tableBody, 'pH', ph, '6.5-8.5');
    addReportRow(tableBody, 'TDS', tds, '0-500 ppm');
    addReportRow(tableBody, 'Temperature', temp, '0-32°C');
    addReportRow(tableBody, 'Turbidity', turbidity, '0-5 NTU');
}

// Add a row to the reports table
function addReportRow(tableBody, parameter, value, idealRange) {
    const row = document.createElement('tr');

    const paramCell = document.createElement('td');
    paramCell.textContent = parameter;

    const valueCell = document.createElement('td');
    valueCell.textContent = parameter === 'TDS'
        ? Math.round(value)
        : parameter === 'Temperature'
            ? value.toFixed(1)
            : value.toFixed(2);

    const rangeCell = document.createElement('td');
    rangeCell.textContent = idealRange;

    const statusCell = document.createElement('td');
    const isGood = checkParameterStatus(parameter, value);
    statusCell.textContent = isGood ? 'Good' : 'Poor';
    statusCell.className = isGood ? 'status-good' : 'status-poor';

    const remarksCell = document.createElement('td');
    remarksCell.textContent = getRemarks(parameter, value, isGood);

    row.append(paramCell, valueCell, rangeCell, statusCell, remarksCell);

    tableBody.appendChild(row);
}

// Check if parameter value is within ideal range
function checkParameterStatus(parameter, value) {
    switch (parameter) {
        case 'pH': return value >= 6.5 && value <= 8.5;
        case 'TDS': return value <= 500;
        case 'Temperature': return value >= 0 && value <= 32;
        case 'Turbidity': return value <= 5;
        default: return true;
    }
}

// Get remarks based on parameter value
function getRemarks(parameter, value, isGood) {
    if (isGood) return "Within safe limits";

    switch (parameter) {
        case 'pH':
            return value < 6.5 ? "Too acidic" : "Too alkaline";
        case 'TDS':
            return "High dissolved solids";
        case 'Temperature':
            return value < 0 ? "Too cold" : "Too warm";
        case 'Turbidity':
            return "Water not clear";
        default:
            return "Check parameter";
    }
}

document.getElementById('yes-btn').addEventListener('click', function () {
    fetch('https://blynk.cloud/external/api/update?token=YOUR_TOKEN&V0=1');
});

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);


const objective = 18500;
let savings = 0;

function loadFromDB(callback) {
    // Simulating loading from IndexedDB, replace with actual implementation if needed
    setTimeout(() => {
        callback(savings);
    }, 100);
}

function saveToDB(value, callback) {
    // Simulating saving to IndexedDB, replace with actual implementation if needed
    setTimeout(() => {
        savings = value;
        callback();
    }, 100);
}

function calculateRemainingDays() {
    const currentDate = new Date();
    const targetDate = new Date('July 1, 2024');
    const timeDifference = targetDate.getTime() - currentDate.getTime();
    const daysDifference = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
    return daysDifference > 0 ? daysDifference : 0;
}

function calculateSavingsPerDay() {
    const remainingDays = calculateRemainingDays();
    return remainingDays > 0 ? (objective - savings) / remainingDays : 0;
}

function displaySavingsInfo() {
    const savingsDisplay = document.getElementById('savings');
    const remainingAmountDisplay = document.getElementById('remaining-amount');
    const remainingDaysDisplay = document.getElementById('remaining-days');
    const savingsPerDayDisplay = document.getElementById('savings-per-day');
    const progressBar = document.getElementById('progress-bar');
    const progressBarText = document.getElementById('progress-bar-text');

    loadFromDB(function (result) {
        savings = result || 0;
        const remainingAmount = objective - savings;
        const remainingDays = calculateRemainingDays();
        const savingsPerDay = calculateSavingsPerDay();
        const progressPercentage = (savings / objective) * 100;

        savingsDisplay.innerText = savings.toFixed(2);
        remainingAmountDisplay.innerText = remainingAmount.toFixed(2);
        remainingDaysDisplay.innerText = remainingDays;
        savingsPerDayDisplay.innerText = savingsPerDay.toFixed(2);

        progressBar.style.width = `${progressPercentage}%`;
        progressBarText.innerText = `Progress: ${progressPercentage.toFixed(2)}%`;
    });
}

function saveMoney() {
    const amountInput = document.getElementById('amount');
    const amount = parseFloat(amountInput.value) || 0;

    if (amount > 0) {
        loadFromDB(function (result) {
            const currentSavings = result || 0;
            const newSavings = currentSavings + amount;

            saveToDB(newSavings, function () {
                displaySavingsInfo();
                amountInput.value = ''; // Clear input after saving
                confetti(); // Celebrate the savings!
            });
        });
    }
}

// Initial display on page load
displaySavingsInfo();

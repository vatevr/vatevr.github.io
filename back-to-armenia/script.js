let savings = null;
let target = null;

const url = 'https://e0jzl6ej38.execute-api.us-east-1.amazonaws.com/production/savings-api';

async function readSavings() {
    const body = JSON.stringify({});
    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            "Access-Control-Allow-Credentials": true,
            "Access-Control-Request-Headers": "X-Requested-With",
        },
        body
    });

    if (!response.ok) {
        throw new Error('Network response was not ok');
    }

    const data = await response.json();
    console.log(data);
    return data;
}

async function save(amount) {
    let body = JSON.stringify({amount});
    const response = await fetch('https://e0jzl6ej38.execute-api.us-east-1.amazonaws.com/production/savings-api', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true, // Required for cookies, authorization headers with HTTPS
        },
        body
    });

    if (!response.ok) {
        throw new Error('Network response was not ok');
    }

    const data = await response.json();
    console.log(data);
    return data;

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
    return remainingDays > 0 ? (target - savings) / remainingDays : 0;
}

async function displaySavingsInfo() {
    const savingsDisplay = document.getElementById('savings');
    const remainingAmountDisplay = document.getElementById('remaining-amount');
    const remainingDaysDisplay = document.getElementById('remaining-days');
    const savingsPerDayDisplay = document.getElementById('savings-per-day');
    const progressBar = document.getElementById('progress-bar');
    const progressBarText = document.getElementById('progress-bar-text');

    const response = await readSavings();

    savings = response.value;
    target = response.target;
    const remainingAmount = target - savings;
    const remainingDays = calculateRemainingDays();
    const savingsPerDay = calculateSavingsPerDay();
    const progressPercentage = (savings / target) * 100;

    savingsDisplay.innerText = savings.toFixed(2);
    remainingAmountDisplay.innerText = remainingAmount.toFixed(2);
    remainingDaysDisplay.innerText = remainingDays;
    savingsPerDayDisplay.innerText = savingsPerDay.toFixed(2);

    progressBar.style.width = `${progressPercentage}%`;
    progressBarText.innerText = `Progress: ${progressPercentage.toFixed(2)}%`;
}

async function saveMoney() {
    const amountInput = document.getElementById('amount');
    const amount = parseFloat(amountInput.value) || 0;

    if (amount > 0) {
        await save(amount);
        displaySavingsInfo();
        amountInput.value = ''; // Clear input after saving
        confetti();
    }
}

displaySavingsInfo();

let savings = null;
let target = null;
let loading = false;

const url = 'https://e0jzl6ej38.execute-api.us-east-1.amazonaws.com/production/savings-api';

const motivationalQuotes = [
    "I don't want no teen-aged queen, I just want my M-14",
    "I don't know but I've been told, Eskimo pussy is mighty cold",
    "I signed up for thrills, but I'm climbing this hill"
]
async function readSavings() {
    const debug = localStorage.getItem('debug');
    console.log(debug);
    if (debug) {
        return {value: 101, target: 1000};
    }
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
    const debug = localStorage.getItem('debug');
    console.log(debug);
    if (debug) {
        return {value: savings + amount, target: target - amount};
    }
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

function chooseQuote() {
    return motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
}

async function displaySavingsInfo() {
    loading = true;
    updateLoading();
    try {
        const motivationalQuote = document.getElementById('motivational-quote');
        motivationalQuote.innerText = chooseQuote();
        const savingsDisplay = document.getElementById('savings');
        const remainingAmountDisplay = document.getElementById('remaining-amount');
        const remainingDaysDisplay = document.getElementById('remaining-days');
        const savingsPerDayDisplay = document.getElementById('savings-per-day');
        const progressBar = document.getElementById('progress-bar');
        const response = await readSavings();

        savings = response.value;
        target = response.target;
        const remainingAmount = target - savings;
        const remainingDays = calculateRemainingDays();
        const savingsPerDay = calculateSavingsPerDay();
        const progressPercentage = (savings / target) * 100;

        savingsDisplay.innerText = `€${savings.toFixed(1)}`;
        remainingAmountDisplay.innerText = `€${remainingAmount.toFixed(1)}`;
        remainingDaysDisplay.innerText = remainingDays;
        savingsPerDayDisplay.innerText = `€${savingsPerDay.toFixed(1)}`;

        progressBar.style.width = `${progressPercentage}%`;
        if (progressPercentage > 25) {
            progressBar.innerText = `${progressPercentage.toFixed(1)}%`;
        }

    } catch (e) {
        console.log(e);
    } finally {
        loading = false;
        updateLoading();
    }
}

async function saveMoney() {
    const amountInput = document.getElementById('amount');
    const amount = parseFloat(amountInput.value) || 0;

    if (amount > 0) {
        loading = true;
        await save(amount);
        displaySavingsInfo();
        amountInput.value = ''; // Clear input after saving
        confetti();
    }
}


function updateLoading() {
    const loadingContainer = document.getElementById('loadingContainer');
    loadingContainer.style.display = loading ? 'flex' : 'none';
}

setTimeout(() => {
    displaySavingsInfo();
}, Math.floor(Math.random() * (2001 - 350) + 350));

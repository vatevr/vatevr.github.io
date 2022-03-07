function showCongrats() {
    document.getElementById("timer").innerHTML = '<div>Բարի գալուստ տուն</div>'
}


function showCountdown(diff) {
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor(diff / (1000 * 60));
    const secs = Math.floor(diff / 1000);

    const d = days;
    const h = hours - days * 24;
    const m = mins - hours * 60;
    const s = secs - mins * 60;

    document.getElementById("timer")
        .innerHTML =
        '<div>' + d + '<span> օր</span></div>' +
        '<div>' + h + '<span> ժամ</span></div>' +
        '<div>' + m + '<span> րոպե</span></div>' +
        '<div>' + s + '<span> վայրկյան</span></div>';
}

function updateTimer() {
    const future = Date.parse("March 20, 2022 06:30:00");
    const now = new Date();
    const diff = future - now;

    diff <= 0 ? showCongrats() : showCountdown(diff);
}

// show instantly
updateTimer();
setInterval('updateTimer()', 1000);

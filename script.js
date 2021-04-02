const toggleStartOptionsButton = document.getElementById('toggle-start-options');
const startOptions = document.getElementById('start-options');

toggleStartOptionsButton.addEventListener('click', () => {
    if (startOptions.hidden) {
        startOptions.hidden = false;
        toggleStartOptionsButton.innerText = 'Skjul omstartsmuligheter';
    } else {
        startOptions.hidden = true;
        toggleStartOptionsButton.innerText = 'Vis omstartsmuligheter';
    }
});

const pairsTextarea = document.getElementById('pairs');

const loadFromLocalStorageButton = document.getElementById('load-from-local-storage');
if (localStorage.getItem('state') != null) {
    loadFromLocalStorageButton.hidden = false;
}
loadFromLocalStorageButton.addEventListener('click', async () => {
    const state = localStorage.getItem('state');
    if (state == null) {
        alert('Det er ingenting lagret');
        return;
    }

    const {entries, entryIndexComparisons, comparisonIndex} = JSON.parse(state);
    const comparisons = entryIndexComparisons.map(
        ([left, right]) => [entries[left], entries[right]]
    );
    await start(entries, comparisons, comparisonIndex);
});


const ranksList = document.getElementById('ranks');
const toggleRanksButton = document.getElementById('toggle-ranks');
toggleRanksButton.addEventListener('click', () => {
    if (ranksList.hidden) {
        ranksList.hidden = false;
        toggleRanksButton.innerText = 'Skjul rangering';
    } else {
        ranksList.hidden = true;
        toggleRanksButton.innerText = 'Vis rangering';
    }
});

const comparisonHeading = document.getElementById('comparison-heading');
const progress = document.getElementById('progress');

const tbody = document.getElementById('comparisons').querySelector('tbody');

function repopulateRanksList(entries) {
    ranksList.innerHTML = ''; // remove all children
    const rankNodes = Array.from(entries)
        .sort((a, b) => b.score - a.score)
        .forEach(({label, score}) => {
            const li = document.createElement('li');
            li.textContent = `${label} (${score})`;
            ranksList.appendChild(li);
        });
}

function createTd(entry, next) {
    const td = document.createElement('td');
    const button = document.createElement('button');
    button.innerHTML = entry.label;
    button.addEventListener('click', () => {
        entry.score = entry.score + 1;
        next();
    });
    td.appendChild(button);
    return td;
}

function repopulateComparisons(row) {
    tbody.innerHTML = '';
    tbody.appendChild(row);
}

function generateComparisonsForEntry(entry, index, entries) {
    const otherEntries = entries.filter(e => entry.label !== e.label);

    // sort alphabetically so we can filter out duplicates later
    return otherEntries.map(e => {
        return [entry, e].sort((left, right) => left.label.localeCompare(right.label));
    });
}

document.getElementById('input').addEventListener('submit', async (e) => {
    e.preventDefault();

    const entries = Array.from(
        new Set(
            pairsTextarea
                .value
                .split('\n')
                .map(label => label.trim())
                .filter(label => label.length > 0)
        ))
        .map(label => ({
            label: label.trim(),
            score: 0,
        }))
        .sort((left, right) => left.label.localeCompare(right.label));

    const comparisons = entries.map(generateComparisonsForEntry).flat();
    shuffle(comparisons);

    await start(entries, comparisons);
});

function generateUniqueComparisons(entries, comparisons) {
    const uniqueComparisons = [];

    for (const comparison of comparisons) {
        if (
            uniqueComparisons.find(
                // filter out duplicates
                c => c[0].label === comparison[0].label && c[1].label === comparison[1].label
            ) == null
        ) {
            uniqueComparisons.push(comparison);
        }
    }

    return uniqueComparisons;
}

async function start(entries, comparisons, comparisonIndex = 0) {
    startOptions.hidden = true;
    toggleStartOptionsButton.innerText = 'Vis omstartsmuligheter';
    toggleStartOptionsButton.hidden = false;

    toggleRanksButton.hidden = false;
    comparisonHeading.hidden = false;

    repopulateRanksList(entries);

    const uniqueComparisons = generateUniqueComparisons(entries, comparisons);

    const comparisonRows = uniqueComparisons.map(([left, right]) => {
        const row = document.createElement('tr');
        const next = new Promise(resolve => {
            const leftTd = createTd(left, resolve);
            const rightTd = createTd(right, resolve);
            
            row.appendChild(leftTd);
            row.appendChild(rightTd);
        });

        return {row, next};
    });


    // Used to store progress in localStorage; kinda expensive to
    // calculate and doesn't change, so we just do it once.
    const entryIndexComparisons = comparisons.map(comparison => [
        entries.findIndex(entry => entry.label === comparison[0].label),
        entries.findIndex(entry => entry.label === comparison[1].label),
    ]);

    for (const [index, row] of comparisonRows.entries()) {
        if (index < comparisonIndex) {
            // fast-forward to the correct index
            continue;
        }

        progress.innerText = `(${index + 1} / ${comparisonRows.length})`
        repopulateComparisons(row.row);
        await row.next;
        repopulateRanksList(entries);

        localStorage.setItem('state', JSON.stringify({entries, entryIndexComparisons, comparisonIndex: index + 1}));
    }

    comparisonHeading.hidden = true;
    progress.innerText = 'Ferdig!';
    tbody.innerHTML = '';
}

function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

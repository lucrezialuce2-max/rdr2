// --- DATABASE DEI NODI ---
const gameNodes = [
    {
        id: 'nodo1', x: 20, y: 30, unlocked: true,
        type: 'video', 
        title: 'L\'Imboscata',
        content: 'video1.mp4', 
        clue: '15 anni e devi già schivare i proiettili dei Pinkerton. Per iniziare, devi forzare la cassaforte virtuale qui sull\'app.', 
        unlocks: 'nodo2',
        successObjective: 'Forza la cassaforte per recuperare la bisaccia.'
    },
    {
        id: 'nodo2', x: 50, y: 60, unlocked: false,
        type: 'safe', 
        unlocks: 'nodo3',
        successObjective: 'Controlla il contenuto della bisaccia.'
    },
    {
        id: 'nodo3', x: 40, y: 75, unlocked: false,
        type: 'video', 
        title: 'La Mappa Strappata',
        content: 'video2.mp4', 
        clue: 'La mappa è volata via durante l\'attacco. I pezzi sono sparsi per la casa.', 
        unlocks: 'nodo4',
        successObjective: 'Esplora la casa e scansiona i 4 pezzi di mappa (QR Code).'
    },
    {
        id: 'nodo4', x: 65, y: 20, unlocked: false,
        type: 'qr', 
        unlocks: 'nodo5',
        successObjective: 'Mappa completata! Dirigiti in CUCINA per cercare il prossimo indizio.'
    },
    {
        id: 'nodo5', x: 80, y: 55, unlocked: false,
        type: 'video', 
        title: 'Il Terminale',
        content: 'video3.mp4',
        clue: 'Hai trovato la pista in cucina. Vai al COMPUTER DI CASA, cerca l\'indizio nascosto sotto la tastiera e inseriscilo nel terminale.', 
        unlocks: 'nodo6',
        successObjective: 'Inserisci il codice segreto per decifrare l\'ultima coordinata.'
    },
    {
        id: 'nodo6', x: 85, y: 40, unlocked: false,
        type: 'puzzle', 
        title: 'Terminale Crittografato',
        description: 'In base al biglietto trovato vicino al computer, qual è la parola d\'ordine? (Dimostra di saper usare la testa e il...).', 
        answer: 'GRILLETTO',
        unlocks: 'nodo7',
        successObjective: 'Ottimo! Guarda l\'ultimo messaggio di Arthur.'
    },
    {
        id: 'nodo7', x: 85, y: 80, unlocked: false,
        type: 'video', 
        title: 'Il Bottino',
        content: 'video4.mp4',
        clue: 'L\'hai trovato! Vai a prendere il bottino Ludovico. L\'ho nascosto nel PIANOFORTE.', 
        unlocks: null,
        successObjective: 'Corri al PIANOFORTE, distruggi lo stemma dei Pinkerton e prendi il tuo regalo!'
    }
];

let currentNode = null;

// --- AVVIO GIOCO ---
document.getElementById('start-game-btn').addEventListener('click', () => {
    document.getElementById('intro-screen').classList.add('hidden');
    handleNodeClick(gameNodes[0]);
});

// --- GESTIONE MAPPA E AUTO-SCROLL ---
function initMap(focusNodeId = null) {
    const container = document.getElementById('map-container');
    container.innerHTML = ''; 
    let latestUnlockedNode = gameNodes[0];

    gameNodes.forEach(node => {
        if (node.unlocked) latestUnlockedNode = node;

        const marker = document.createElement('div');
        marker.className = `map-marker ${node.unlocked ? '' : 'locked'}`;
        marker.style.left = `${node.x}%`;
        marker.style.top = `${node.y}%`;
        
        const label = document.createElement('span');
        label.innerText = `\nLocazione`;
        label.style.fontSize = "0.8rem";
        label.style.fontFamily = "'Special Elite', monospace";
        label.style.color = "#111";
        marker.appendChild(label);

        marker.addEventListener('click', () => handleNodeClick(node));
        container.appendChild(marker);
    });

    const nodeToFocus = focusNodeId ? gameNodes.find(n => n.id === focusNodeId) : latestUnlockedNode;
    centerMapOnNode(nodeToFocus);
}

function centerMapOnNode(node) {
    setTimeout(() => {
        const mapArea = document.getElementById('map-area');
        const container = document.getElementById('map-container');
        if (!mapArea || !container || !node) return;

        const targetX = (node.x / 100) * container.offsetWidth;
        const targetY = (node.y / 100) * container.offsetHeight;

        mapArea.scrollTo({
            left: targetX - mapArea.offsetWidth / 2,
            top: targetY - mapArea.offsetHeight / 2,
            behavior: 'smooth'
        });
    }, 300);
}

function handleNodeClick(node) {
    if (!node.unlocked) {
        if (navigator.vibrate) navigator.vibrate(200);
        return;
    }
    currentNode = node;

    if (node.type === 'video') openVideoModal(node);
    else if (node.type === 'puzzle') openPuzzleModal(node);
    else if (node.type === 'safe') openSafeModal(node);
    else if (node.type === 'qr') openQRScanner(node);
}

// --- GESTIONE MODALI GENERALI ---
function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
    
    if (modalId === 'video-modal') {
        const player = document.getElementById('video-player');
        player.pause(); 
        player.src = '';
        unlockNextNode(); 
    }
    if (modalId === 'safe-modal') {
        resetSafe();
    }
    if (modalId === 'qr-modal' && html5QrCode) {
        html5QrCode.stop().catch(err => console.log(err));
    }
}

function unlockNextNode() {
    if (!currentNode || !currentNode.unlocks) return;
    
    const nextNode = gameNodes.find(n => n.id === currentNode.unlocks);
    if (nextNode && !nextNode.unlocked) {
        nextNode.unlocked = true;
        if (currentNode.successObjective) {
            document.getElementById('current-objective').innerText = `Obiettivo: ${currentNode.successObjective}`;
        }
        initMap(nextNode.id); 
    }
}

// --- LOGICA SCANNER QR ---
let html5QrCode;
let foundPieces = [];
const requiredPieces = ['MAPPA_1', 'MAPPA_2', 'MAPPA_3', 'MAPPA_4'];

function openQRScanner(node) {
    document.getElementById('qr-modal').classList.remove('hidden');
    document.getElementById('qr-status').innerHTML = `Cerca in giro per casa i 4 frammenti di mappa e inquadrali.<br><br><strong>Frammenti: ${foundPieces.length}/4</strong>`;
    
    document.getElementById('reader-container').classList.remove('hidden');
    document.getElementById('reconstructed-map').classList.add('hidden');
    document.getElementById('qr-close-btn').classList.remove('hidden');

    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
            handleQRScanned(decodedText);
        },
        (errorMessage) => {
            // Errori background
        }
    ).catch(err => {
        alert("Errore fotocamera: Devi consentire l'accesso alla fotocamera al sito (usa HTTPS).");
    });
}

function handleQRScanned(text) {
    if (requiredPieces.includes(text) && !foundPieces.includes(text)) {
        foundPieces.push(text);
        
        if (navigator.vibrate) navigator.vibrate([100, 50, 200]);
        playClick(800, 0.2); 

        document.getElementById('qr-status').innerHTML = `Ottimo, frammento trovato!<br><br><strong>Frammenti: ${foundPieces.length}/4</strong>`;
        
        if (foundPieces.length === 4) {
            playClick(400, 1.0);
            html5QrCode.stop().then(() => {
                document.getElementById('reader-container').classList.add('hidden');
                document.getElementById('qr-close-btn').classList.add('hidden');
                document.getElementById('qr-status').innerText = "Scansione completata.";
                document.getElementById('reconstructed-map').classList.remove('hidden');
            });
        }
    }
}

function closeQRAndProceed() {
    document.getElementById('qr-modal').classList.add('hidden');
    unlockNextNode();
}

// --- MODALE VIDEO ---
function openVideoModal(node) {
    document.getElementById('video-title').innerText = node.title;
    document.getElementById('video-clue').innerText = node.clue;
    
    const player = document.getElementById('video-player');
    const startBtn = document.getElementById('start-video-btn');

    player.src = '';
    player.classList.add('hidden');
    startBtn.classList.remove('hidden');

    startBtn.onclick = function() {
        startBtn.classList.add('hidden');
        player.classList.remove('hidden');
        player.src = node.content; 
        player.play(); 
    };

    document.getElementById('video-modal').classList.remove('hidden');
}

// --- MODALE PUZZLE ---
function openPuzzleModal(node) {
    document.getElementById('puzzle-title').innerText = node.title;
    document.getElementById('puzzle-description').innerText = node.description;
    document.getElementById('puzzle-answer').value = '';
    document.getElementById('error-message').classList.add('hidden');
    document.getElementById('puzzle-modal').classList.remove('hidden');
}

document.getElementById('submit-puzzle').addEventListener('click', () => {
    const userInput = document.getElementById('puzzle-answer').value.trim().toUpperCase();
    if (userInput === currentNode.answer) {
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        closeModal('puzzle-modal');
        unlockNextNode();
    } else {
        if (navigator.vibrate) navigator.vibrate(500);
        document.getElementById('error-message').classList.remove('hidden');
    }
});

// --- MOTORE MINIGIOCO CASSAFORTE ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playClick(frequency, duration) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime); 
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

const dial = document.getElementById('dial-container');
const dialInner = document.getElementById('dial');
const statusText = document.getElementById('status-text');
const pins = [document.getElementById('pin-1'), document.getElementById('pin-2'), document.getElementById('pin-3')];

const safeCombination = [60, 220, 310];
let safeStep = 0;
let isDraggingDial = false;
let currentRotation = 0;
let lastClickRotation = 0;
let holdTimer = null;
let isHoldingSweetSpot = false;

let rect, centerX, centerY;
function updateCenter() {
    if(dial.offsetParent !== null) {
        rect = dial.getBoundingClientRect();
        centerX = rect.left + rect.width / 2;
        centerY = rect.top + rect.height / 2;
    }
}

function openSafeModal(node) {
    document.getElementById('safe-modal').classList.remove('hidden');
    resetSafe();
    setTimeout(updateCenter, 100); 
}

dial.addEventListener('pointerdown', (e) => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    isDraggingDial = true;
    dial.setPointerCapture(e.pointerId);
});

dial.addEventListener('pointermove', (e) => {
    if (!isDraggingDial || safeStep >= safeCombination.length) return;

    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    
    let angleRad = Math.atan2(deltaY, deltaX);
    currentRotation = angleRad * (180 / Math.PI) + 90;
    if (currentRotation < 0) currentRotation += 360;

    dialInner.style.transform = `rotate(${currentRotation}deg)`;

    let diffRot = Math.abs(currentRotation - lastClickRotation);
    if (diffRot > 180) diffRot = 360 - diffRot;

    if (diffRot > 15) {
        playClick(100, 0.05); 
        if (navigator.vibrate) navigator.vibrate(10);
        lastClickRotation = currentRotation;
    }
    checkSafeLock(currentRotation);
});

function stopSafeInteraction(e) {
    isDraggingDial = false;
    resetHoldTimer();
    if (e && e.pointerId) dial.releasePointerCapture(e.pointerId);
}
window.addEventListener('pointerup', stopSafeInteraction);
window.addEventListener('pointercancel', stopSafeInteraction);

function checkSafeLock(angle) {
    let target = safeCombination[safeStep];
    let diff = Math.abs(angle - target);
    if (diff > 180) diff = 360 - diff;

    if (diff <= 10) { 
        if (!isHoldingSweetSpot) {
            isHoldingSweetSpot = true;
            statusText.style.color = "var(--rdr-red)";
            statusText.innerText = "Forzando il perno... Tieni fermo!";
            playClick(600, 0.1); 
            if (navigator.vibrate) navigator.vibrate(50);
            
            holdTimer = setTimeout(() => unlockPin(), 1000);
        }
    } else {
        resetHoldTimer();
    }
}

function resetHoldTimer() {
    if (isHoldingSweetSpot) {
        isHoldingSweetSpot = false;
        clearTimeout(holdTimer);
        statusText.style.color = "#a89f8d";
        statusText.innerText = "Gira la ghiera. Ascolta i clic metallici.";
    }
}

function unlockPin() {
    isHoldingSweetSpot = false;
    pins[safeStep].classList.add('unlocked');
    safeStep++;
    
    playClick(800, 0.3);
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

    if (safeStep >= safeCombination.length) {
        statusText.innerText = "CASSAFORTE APERTA!";
        playClick(300, 1.0);
        setTimeout(() => {
            closeModal('safe-modal');
            unlockNextNode();
        }, 1500);
    } else {
        statusText.style.color = "#a89f8d";
        statusText.innerText = "Perno scattato. Cerca il prossimo.";
    }
}

function resetSafe() {
    safeStep = 0;
    currentRotation = 0;
    lastClickRotation = 0;
    dialInner.style.transform = `rotate(0deg)`;
    pins.forEach(p => p.classList.remove('unlocked'));
    statusText.style.color = "#a89f8d";
    statusText.innerText = "Gira la ghiera. Ascolta i clic metallici.";
    resetHoldTimer();
}

window.onload = () => {
    initMap();
};
window.addEventListener('resize', updateCenter);
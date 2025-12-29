chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    removeExistingCard();

    if (request.action === "show_loading") {
        createLoadingCard();
    } 
    else if (request.action === "show_error") {
        showToast("❌ " + request.message);
    } 
    else if (request.action === "show_card") {
        removeExistingCard();
        if (request.payload.type === 'sentence') {
            createSentenceCard(request.payload);
        } else {
            createWordCard(request.payload);
        }
    }
});

document.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.altKey && (e.key === 't' || e.key === 'T')) {
        const selection = window.getSelection().toString().trim();
        if (selection) {
            e.preventDefault(); 
            e.stopPropagation();
            chrome.runtime.sendMessage({ action: "translate_selection", text: selection });
        }
    }
});

function removeExistingCard() {
    const existing = document.getElementById("ai-card-container");
    if (existing) existing.remove();
}

function showToast(text) {
    const toast = document.createElement("div");
    toast.id = "ai-card-container";
    toast.style.padding = "20px";
    toast.style.color = "var(--ai-text-sub)";
    toast.innerText = text;
    applySavedPosition(toast); 
    document.body.appendChild(toast);
    makeDraggable(toast);
    setTimeout(() => removeExistingCard(), 3000);
}

function applySavedPosition(card) {
    chrome.storage.local.get(['card_pos_left', 'card_pos_top', 'card_width', 'card_height'], (res) => {
        if (res.card_pos_left && res.card_pos_top) {
            card.style.left = res.card_pos_left;
            card.style.top = res.card_pos_top;

            if (parseInt(res.card_pos_top) < 0) card.style.top = '10px';
            if (parseInt(res.card_pos_left) < 0) card.style.left = '10px';
        } else {
            card.style.top = '20px';
            card.style.right = '20px';
            card.style.left = 'auto'; 
        }

        if (res.card_width) {
            card.style.width = res.card_width;
        }
        if (res.card_height && parseInt(res.card_height) > 50) {
            card.style.height = res.card_height;
        } else {
            card.style.height = 'auto'; 
        }
    });
}

function saveCardState(card) {
    if (!card) return;
    const rect = card.getBoundingClientRect();
    chrome.storage.local.set({
        'card_pos_left': rect.left + 'px',
        'card_pos_top': rect.top + 'px',
        'card_width': rect.width + 'px',
        'card_height': rect.height + 'px'
    });
}

function makeDraggable(el) {
    el.addEventListener('mouseup', () => saveCardState(el));

    const handle = el.querySelector('.ai-drag-handle');
    const dragTarget = handle || el; 

    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    dragTarget.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('ai-card-close')) return;

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;

        const rect = el.getBoundingClientRect();
        
        el.style.right = 'auto'; 
        el.style.bottom = 'auto';
        el.style.left = rect.left + 'px';
        el.style.top = rect.top + 'px';

        initialLeft = rect.left;
        initialTop = rect.top;
        
        if (handle) handle.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        el.style.left = `${initialLeft + dx}px`;
        el.style.top = `${initialTop + dy}px`;
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            if (handle) handle.style.cursor = 'grab';
            saveCardState(el);
        }
    });
}

const LOADING_QUOTES = [
    "起身活动活动吧...",
    "正在翻阅字典...",
    "喝口咖啡，马上就好...",
    "联系外星人翻译中...",
    "知识正在加载...",
    "放松一下...",
    "正在制作卡片...",
    "Find a way or make one",
    "正在放入单词...",
    "Don't worry, be happy",
    "Reinforcement ready...",
    "不积跬步，无以至千里",
    "You matter",
    "Several seconds...",
    "多陪陪家人...",
    "Hsin is watching you..."
];

function createLoadingCard() {
    const card = document.createElement("div");
    card.id = "ai-card-container";

    const randomText = LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)];

    card.innerHTML = `
        <div class="ai-drag-handle"></div>
        <div class="ai-loading-container">
            <div class="ai-loading-anim">
                <span></span><span></span><span></span>
            </div>
            <div class="ai-loading-text">${randomText}</div>
        </div>
    `;
    
    applySavedPosition(card);
    document.body.appendChild(card);
    makeDraggable(card);
}

function createWordCard(data) {
    const card = document.createElement("div");
    card.id = "ai-card-container";

    const imgHTML = data.image_base64 
        ? `<img src="${data.image_base64}" class="ai-card-image">` 
        : ``;

    card.innerHTML = `
        <div class="ai-drag-handle"></div> <div class="ai-card-close">×</div> <div class="ai-card-scroll-area">
            ${imgHTML}
            <div class="ai-card-text-wrapper">
                <div class="ai-card-header">
                    <span class="ai-card-word">${data.word}</span>
                    <span class="ai-card-pinyin">${data.pinyin || ''}</span>
                </div>
                <div class="ai-card-meaning">${data.meaning}</div>
                
                ${data.etymology ? `
                    <div class="ai-card-section-title"> 词源</div>
                    <div class="ai-card-text">${data.etymology}</div>
                ` : ''}
                
                ${data.example ? `
                    <div class="ai-card-section-title"> 例句</div>
                    <div class="ai-card-text">${data.example}</div>
                ` : ''}
            </div>
        </div>
    `;

    applySavedPosition(card);
    document.body.appendChild(card);
    bindCloseEvent(card);
    makeDraggable(card);
}

function createSentenceCard(data) {
    const card = document.createElement("div");
    card.id = "ai-card-container";
    card.className = "sentence-mode"; 

    card.innerHTML = `
        <div class="ai-drag-handle"></div>
        <div class="ai-card-close">×</div>
        <div class="ai-card-scroll-area">
            <div class="ai-card-text-wrapper" style="padding-top: 40px;"> 
                <div class="ai-card-sentence-origin">${data.word}</div>
                <div class="ai-card-sentence-trans">${data.meaning}</div>
            </div>
        </div>
    `;

    applySavedPosition(card);
    document.body.appendChild(card);
    bindCloseEvent(card);
    makeDraggable(card);
}

function bindCloseEvent(card) {
    card.querySelector(".ai-card-close").addEventListener("click", () => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(10px)';
        setTimeout(() => card.remove(), 200);
    });
}

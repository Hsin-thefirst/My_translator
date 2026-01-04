document.addEventListener('DOMContentLoaded', () => {
    const providerSelect = document.getElementById('providerSelect');
    const apiKeyGroup = document.getElementById('apiKeyGroup');
    const customSettings = document.getElementById('customSettings');
    
    const inputKey = document.getElementById('apiKeyInput');
    const inputBaseUrl = document.getElementById('baseUrlInput');
    const inputModel = document.getElementById('modelInput');
    
    const imageToggle = document.getElementById('imageToggle');
    const saveBtn = document.getElementById('saveBtn');
    const status = document.getElementById('status');

    function updateUI() {
        const provider = providerSelect.value;
        
        if (provider === 'chrome_local') {
            apiKeyGroup.classList.add('hidden');
            customSettings.classList.add('hidden');
        } else if (provider === 'custom') {
            apiKeyGroup.classList.remove('hidden');
            customSettings.classList.remove('hidden');
        } else {
            apiKeyGroup.classList.remove('hidden');
            customSettings.classList.add('hidden');
        }
    }

    providerSelect.addEventListener('change', updateUI);

    chrome.storage.local.get([
        'user_ai_provider', 'user_ai_key', 'user_show_image', 
        'user_custom_url', 'user_custom_model'
    ], (result) => {
        if (result.user_ai_provider) providerSelect.value = result.user_ai_provider;
        if (result.user_ai_key) inputKey.value = result.user_ai_key;
        if (result.user_show_image !== undefined) imageToggle.checked = result.user_show_image;
        
        if (result.user_custom_url) inputBaseUrl.value = result.user_custom_url;
        if (result.user_custom_model) inputModel.value = result.user_custom_model;
        
        updateUI(); 
    });

    saveBtn.addEventListener('click', () => {
        saveBtn.innerText = "保存中...";
        let rawUrl = inputBaseUrl.value.trim();
        let cleanUrl = rawUrl.replace(/\/+$/, ''); 

        chrome.storage.local.set({ 
            'user_ai_provider': providerSelect.value,
            'user_ai_key': inputKey.value.trim(),
            'user_show_image': imageToggle.checked,
            'user_custom_url': cleanUrl, // 保存处理后的干净 URL
            'user_custom_model': inputModel.value.trim()
        }, () => {
            setTimeout(() => {
                saveBtn.innerText = "保存更改";
                status.className = "status show";
                setTimeout(() => status.className = "status", 2000);
            }, 300);
        });
    });
});
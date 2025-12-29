const API_URL = "https://hsin11111-my-translator.hf.space/process"; 

async function translateWithLocalAI(text, tabId) {
    try {
        const hasDetector = self.ai && self.ai.languageDetector;
        const hasTranslator = self.translation && self.translation.createTranslator;

        if (!hasDetector || !hasTranslator) {
            throw new Error("您的浏览器未开启 AI Flags 或版本过低。请使用 Chrome Canary 并开启 Translation API。");
        }

        console.log("[Local AI] 1. 正在识别语言...");
        const detector = await self.ai.languageDetector.create();
        const detectionResult = await detector.detect(text);
        const sourceLang = detectionResult[0].detectedLanguage;
        console.log(`[Local AI] 识别结果: ${sourceLang}`);

        console.log("[Local AI] 2. 创建翻译器...");
        const targetLang = sourceLang.startsWith('zh') ? 'en' : 'zh';

        const translator = await self.translation.createTranslator({
            sourceLanguage: sourceLang,
            targetLanguage: targetLang
        });

        console.log("[Local AI] 3. 开始翻译...");
        const result = await translator.translate(text);
        const mockData = {
            type: "sentence", 
            word: text,
            meaning: result
        };

        chrome.tabs.sendMessage(tabId, { 
            action: "show_card", 
            payload: mockData 
        });

    } catch (err) {
        console.error("[Local AI Error]", err);
        chrome.tabs.sendMessage(tabId, { 
            action: "show_error", 
            message: "本地 AI 失败: " + err.message + " (请确保已下载离线语言包)"
        });
    }
}

async function handleTranslation(text, tabId) {
    if (!text || !text.trim()) return;

    chrome.tabs.sendMessage(tabId, { action: "show_loading" }).catch(() => {});

    try {
        const data = await chrome.storage.local.get([
            "user_ai_provider", "user_ai_key", "user_show_image",
            "user_custom_url", "user_custom_model"
        ]);
        
        const provider = data.user_ai_provider || "deepseek";

        if (provider === 'chrome_local') {
            await translateWithLocalAI(text, tabId);
            return; 
        }

        const userKey = data.user_ai_key || ""; 
        const needImage = data.user_show_image !== false;
        const customUrl = data.user_custom_url || "";
        const customModel = data.user_custom_model || "";

        console.log(`[Background] 请求云端 (${provider})...`);

        const pyResponse = await fetch(API_URL, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "x-user-key": userKey,
                "x-provider": provider,
                "x-custom-url": customUrl,     
                "x-custom-model": customModel
            },
            body: JSON.stringify({ 
                text: text,
                url: "chrome-extension",
                need_image: needImage
            }) 
        });
        
        const pyData = await pyResponse.json();

        if (pyData.status === "success") {
            chrome.tabs.sendMessage(tabId, { 
                action: "show_card", 
                payload: pyData.data 
            });
        } else {
            chrome.tabs.sendMessage(tabId, { action: "show_error", message: pyData.message || "AI 分析失败" });
        }
    } catch (err) {
        console.error("连接失败:", err);
        chrome.tabs.sendMessage(tabId, { 
            action: "show_error", 
            message: "网络请求失败，请检查网络或 Key" 
        });
    }
}

chrome.contextMenus.create({
    id: "explain_word",
    title: "A Translate: %s",
    contexts: ["selection"]
}, () => {
    if (chrome.runtime.lastError) console.log("菜单已存在");
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "explain_word") {
        handleTranslation(info.selectionText, tab.id);
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "translate_selection") {
        handleTranslation(request.text, sender.tab.id);
    }
});
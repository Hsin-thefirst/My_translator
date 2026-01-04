const API_URL = "https://hsin11111-my-translator.hf.space/process"; 

async function translateWithLocalAI(text, tabId) {
    try {
        if (!('Translator' in self)) {
            throw new Error("当前浏览器环境找不到 Translator API，请确认 Chrome 版本及 Flags 设置。");
        }

        console.log("[Local AI] API 检测通过，准备创建翻译器...");

        let sourceLang = 'en';

        if (self.ai && self.ai.languageDetector) {
            try {
                const detector = await self.ai.languageDetector.create();
                const results = await detector.detect(text);
                if (results.length > 0) {
                    sourceLang = results[0].detectedLanguage;
                    console.log(`[Local AI] 检测到语言: ${sourceLang}`);
                }
            } catch (e) {
                console.warn("[Local AI] 语言检测失败，回退到英文:", e);
            }
        }

        const targetLang = 'zh'; 

        const finalSource = sourceLang.startsWith('zh') ? 'zh' : sourceLang;
        const finalTarget = sourceLang.startsWith('zh') ? 'en' : 'zh';

        console.log(`[Local AI] 准备模型: ${finalSource} -> ${finalTarget}`);

        const availability = await self.Translator.availability({
            sourceLanguage: finalSource,
            targetLanguage: finalTarget
        });

        if (availability === 'no') {
            throw new Error(`无法翻译该语言对 (${finalSource}->${finalTarget})，可能不支持或被禁用。`);
        }

        const translator = await self.Translator.create({
            sourceLanguage: finalSource,
            targetLanguage: finalTarget,
            monitor(m) {
                m.addEventListener('downloadprogress', (e) => {
                    console.log(`[Local AI] 模型下载进度: ${Math.round(e.loaded / e.total * 100)}%`);
                });
            },
        });

        console.log("[Local AI] 翻译器创建成功，开始翻译...");

        const result = await translator.translate(text);
        console.log("[Local AI] 翻译结果:", result);

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

        let errorMsg = "本地 AI 调用失败: " + err.message;
        if (err.message.includes("download")) {
            errorMsg = "正在下载 AI 模型，请稍候再试...";
        }

        chrome.tabs.sendMessage(tabId, { 
            action: "show_error", 
            message: errorMsg
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

        if (provider === 'custom') {
            if (!customUrl) {
                chrome.tabs.sendMessage(tabId, { 
                    action: "show_error", 
                    message: "配置错误：请在插件设置中填写 Base URL" 
                });
                return;
            }

            if (customUrl.includes('localhost') || customUrl.includes('127.0.0.1')) {
                chrome.tabs.sendMessage(tabId, { 
                    action: "show_error", 
                    message: "不支持 Localhost：因经由云端中转，请使用公网可访问的 API 地址" 
                });
                return;
            }
        }

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
import uvicorn
import json
import requests
import re
import base64
import random
import os
from fastapi import FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from typing import Optional

# ================= 配置区 =================
SERVER_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
# ========================================

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextPayload(BaseModel):
    text: str
    url: Optional[str] = None
    need_image: bool = True

DEFAULT_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

def search_bing_image(search_query: str):
    print(f"🔍 Bing 正在搜索: '{search_query}' ...")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    try:
        url = f"https://www.bing.com/images/search?q={search_query}&first=1"
        response = requests.get(url, headers=headers, timeout=5)
        html = response.text
        matches = re.findall(r'murl&quot;:&quot;(http[^&]+?\.(?:jpg|jpeg|png))&quot;', html)
        
        if matches:
            selected_img = matches[0] if len(matches) == 1 else random.choice(matches[:3])
            return selected_img
        return None
    except Exception as e:
        print(f"❌ 搜索出错: {e}")
        return None

def get_image_base64(search_query: str):
    image_url = search_bing_image(search_query)
    
    if not image_url:
        print("🔄 搜索失败，使用随机图兜底")
        image_url = f"https://picsum.photos/seed/{random.randint(0,1000)}/400/300"

    try:
        img_response = requests.get(image_url, timeout=10)
        if img_response.status_code == 200:
            img_base64 = base64.b64encode(img_response.content).decode('utf-8')
            return f"data:image/jpeg;base64,{img_base64}"
        else:
            return DEFAULT_IMAGE
    except Exception as e:
        print(f"❌ 下载失败: {e}")
        return DEFAULT_IMAGE

def get_ai_definition(word: str, api_key: str, provider: str, custom_url: str = "", custom_model: str = ""):
    print(f" AI ({provider}) 正在思考: {word} ...")
    
    base_url = ""
    model = ""
    
    if provider == "custom":
        if not custom_url: return None
        base_url = custom_url
        model = custom_model if custom_model else "gpt-3.5-turbo"
    elif provider == "openai":
        base_url = "https://api.openai.com/v1"
        model = "gpt-4o-mini"
    elif provider == "gemini":
        base_url = "https://generativelanguage.googleapis.com/v1beta/openai/"
        model = "gemini-1.5-flash"
    else:
        base_url = "https://api.deepseek.com"
        model = "deepseek-chat"

    try:
        client = OpenAI(api_key=api_key, base_url=base_url)
        
        system_prompt ="""
        你是一位精通全球语言的语言学专家和视觉设计师，专职于英语教学。
        
        任务
        分析用户输入的文本（可能是单词、短语或句子）。
        识别源语言，并将其解释/翻译成【简体中文】。

        判断逻辑
        1. 判断输入类型：是 "word" (单词/短语) 还是 "sentence" (长句/段落)。
        2. 判断源语言：
           - 若是英文：提供音标、词源、例句等详细分析。
           - 若是其他语言（日/韩/法/德/西等）：重点提供准确的中文翻译，可适当补充词源。

        对于英语输入，你应注意：“
        你是一个精通词源学的英语老师和视觉设计师。
        请分析用户提供的单词或句子。
        必须返回严格的 JSON 格式，不要包含 ```json 标记。
    
        【核心指令】
        请首先判断用户输入的是“单词”还是“句子”。
        一些特定组合如书名、标题或缩写俚语等，如果没有构成句子，则应判定为“单词”
        并在 JSON 中包含一个字段 "type": 值为 "word" 或 "sentence"。
    
        === 情况 A：如果是句子 ===
        - type: "sentence"
        - meaning: 翻译整句
        - word: 原句
        - 不要输出 pinyin, etymology, example, image_keyword
        - 人名不翻译
    
        === 情况 B：如果是单词 ===
        - type: "word"
        - meaning: 中文释义（包含词性，如 v. n. adj. ，如果是书名或标题等非单词则不输出词性 ）
        - pinyin: IPA音标
        - etymology: 词源故事
        - example: 例句
        - image_keyword: 用于搜图的英语关键词（具体名词用photo，抽象概念用illustration）
    
        === 情况 C：无法解释或乱码 ===
        - 尝试猜测缩写或网络俚语
        - 若无结果则联网搜索逻辑
    
        再次申明：
        如果输入是句子：
        - 请结合整体输入进行翻译，这时无需输出词源故事和例句
        - 不要标注任何词性
        - 句子中的人名和特定称谓（如“Steven Jobs”）不翻译，展示原英语
        - 不要输出 "pinyin": "IPA音标",
        - 不要输出 "etymology": "词源故事(50字以内)"
        - 不要输出 "example": "例句"
    
        单词含义输出要求：
        - 请保持结构清晰整洁，多换行，有不同类别释义时也进行换行
        - 请在含义前输出其词性，用简写（例如，单词为动词则在含义前加上"v.", 是名词则加上"n.", 形容词则为"adj.", 副词则为"adv.", 谚语
        - 如果为句子或特定称呼（如“Deepseek”）则无需标明词性，特定称呼无需翻译
        - 如果单词有多个含义，请逐个展示出来,并说明每种的词性（如cook既可是动词"v. 烹饪"，也可以是名词"n. 厨师"）
    
        而如果单词为无法解释的单词或乱码：
            请先尝试搜索，看是否是简写或网络俚语：
            - 如果是缩写，请展示完整内容（如"btw是by the way(顺便问一下，顺便说说，在途中)"）
            - 如果是俚语，请解释其含义及演变过程
    
            若仍然无准确结果，则：
            - 请提醒用户："无该单词内容，以下为联网搜索结果"。
            - 然后尝试联网搜索该单词，并获取其大致含义
            - 尝试根据字母组成
        
        【重要】关于 image_keyword 字段：
        请生成一个用于必应图片搜索的“最佳英语关键词”。
        - 如果是具体名词（如 Apple），生成 "Apple fruit photo"。
        - 如果是动作或抽象概念（如 Reliability），生成 "Reliability minimalist illustration"（我们要插画风格，利于记忆）。
        - 如果是具体人物，则生成 人物名+"photo" （找到人物的具体照片）
        - 排除无关干扰（如电影、乐队、Logo）。
        - 如果输入是句子，直接复制粘贴该句子即可
    
        格式要求（所有字段必须存在，如果是句子模式，不需要的字段请留空字符串 ""）：
        {
            "type": "word" 或 "sentence",
            "word": "原词或原句",
            "pinyin": "IPA音标",
            "meaning": "中文释义",
            "etymology": "词源故事",
            "example": "例句",
            "image_keyword": "关键词"
        }”

        【输出格式 (JSON)】
        {
            "type": "word" 或 "sentence",
            "word": "用户原文",
            "pinyin": "IPA音标 (非英语可留空)",
            "meaning": "中文释义 (单词请标词性 v./n.；句子则直译)",
            "etymology": "词源或记忆法 (非英语可简略)",
            "example": "例句 (原文 + 中文)",
            "image_keyword": "搜图关键词 (必须翻译成英语名词)"
        }
        """
        
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"请解释: {word}"},
            ],
            response_format={ 'type': 'json_object' },
            stream=False
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"❌ AI ({provider}) 请求失败: {e}")
        return None

@app.post("/process")
def main_process(
    payload: TextPayload, 
    x_user_key: Optional[str] = Header(None, alias="x-user-key"),
    x_provider: Optional[str] = Header("deepseek", alias="x-provider"),
    x_custom_url: Optional[str] = Header("", alias="x-custom-url"),
    x_custom_model: Optional[str] = Header("", alias="x-custom-model")
):
    text = payload.text.strip()

    final_key = ""
    if x_provider == "deepseek":
        final_key = x_user_key if (x_user_key and x_user_key.strip()) else SERVER_API_KEY
    elif x_provider == "custom":
        final_key = x_user_key if x_user_key else "sk-placeholder"
    else:
        final_key = x_user_key
        
    if not final_key:
        return {"status": "error", "message": f"Missing API Key for {x_provider}"}

    ai_data = get_ai_definition(text, final_key, x_provider, x_custom_url, x_custom_model)
    if not ai_data: return {"status": "error", "message": "AI 解析失败"}

    image_base64 = ""
    if ai_data.get("type") == "sentence" or not payload.need_image:
        image_base64 = "" 
    else:
        kw = ai_data.get('image_keyword', text)
        image_base64 = get_image_base64(kw)
    
    return {
        "status": "success",
        "data": {
            "type": ai_data.get('type', 'word'),
            "word": ai_data.get('word', text),
            "pinyin": ai_data.get('pinyin', ''),
            "meaning": ai_data.get('meaning', ''),
            "etymology": ai_data.get('etymology', ''),
            "example": ai_data.get('example', ''),
            "image_base64": image_base64
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)
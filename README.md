# A Translator

这是一个 Chrome 浏览器扩展，利用 Deepseek 进行多种语言词语/句子 的翻译，英语翻译提供音标、词源解释、例句和相关图片
<img width="960" height="470" alt="image" src="https://github.com/user-attachments/assets/6bcb1bdf-5164-4ad1-b774-dc3af1e72d6f" />
<img width="300" height="400" alt="image" src="https://github.com/user-attachments/assets/e2abadb6-fe00-4b3c-98a9-1e9d3bd78d0b" />
<img width="150" height="285" alt="example5" src="https://github.com/user-attachments/assets/5b145bee-0d97-412a-951e-71f2f91cdd6f" />
<img width="300" height="300" alt="image" src="https://github.com/user-attachments/assets/475968af-e1eb-4589-bdd3-26510203b7ac" />

##  主要功能

* AI 深度解析：自动区分单词与句子。
    * **单词模式**：显示音标、中文释义、词源故事、例句、以及 AI 推荐的关联图片。
    * **句子模式**：提供流畅的整句翻译。
* 自动配图：通过 Python 后端自动抓取 Bing 图片，辅助视觉记忆。
* 极简 UI：磨砂玻璃质感卡片，支持随意拖拽、更改窗口，支持黑夜模式（随浏览器主题变化）。

默认使用Deepseek API Key，留白则是使用主包的key（只充了十块），支持多种服务商API，支持自定义
现支持使用Chrome 内置 API
<img width="340" height="299" alt="image" src="https://github.com/user-attachments/assets/5996882b-43f2-4673-b05d-8a5ccbb150ba" />
<img width="514" height="184" alt="image" src="https://github.com/user-attachments/assets/8386b76f-3450-41be-9927-d74f556a6222" />

##  安装指南

1.  **下载/解压**：将插件文件夹解压到本地任意位置。
2.  **打开扩展管理**：在 Chrome 浏览器地址栏输入 `chrome://extensions/` 并回车。
3.  **开启开发者模式**：点击右上角的 **“开发者模式” (Developer mode)** 开关。
4.  **加载插件**：点击左上角的 **“加载已解压的扩展程序” (Load unpacked)**，选择刚才解压的文件夹里的extension子文件夹。
5.  **添加API Key**： 点击Chrome的插件图标，点击本插件，选择模型并填入你的API Key，或者直接选择Chrome 内置AI

##  使用方法

### 快捷键 
1.  用鼠标选中网页上的任意单词或句子。
2.  按下组合键：**`Shift` + `Alt` + `T`**。
3.  等待卡片弹出即可。

### 右键菜单
1.  选中文字。
2.  点击鼠标右键。
3.  选择 **“A Translate: [选中的文字]”**。

本插件依赖一个 Python 后端来处理 AI 请求和图片搜索。目前部署在 **Hugging Face Spaces**。

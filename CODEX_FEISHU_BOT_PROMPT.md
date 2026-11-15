# 🤖 给 Codex 的完整接盘与飞书机器人开发任务 Prompt

> **使用说明**：你可以直接把下方整段 Prompt 复制给 Codex，或者直接让 Codex 读取本项目根目录下的本文件：  
> `CODEX_FEISHU_BOT_PROMPT.md`

---

```markdown
# 任务目标：为「队长专属减脂追踪器 (Fit-Tracker)」对接飞书机器人 (Feishu/Lark Bot)

你好，Codex！你需要基于当前工作区现有的减脂打卡系统，为用户「队长」开发一个无缝集成的**飞书机器人（Feishu Bot）**，实现通过飞书手机端/电脑端发消息打卡（如发送「今早89.25 两个包子一个牛奶」、「喝了一杯水」、「中午金枪鱼三明治」或餐食照片），机器人自动解析营养数据、同步写入本地数据库并推送美观的飞书卡片回复。

---

## 一、 项目背景与用户画像（核心准则）

1. **唯一尊称**：**「队长」**（Captain）。⚠️ **严禁称呼「吉队」**！交流风格干练、专业、有温度、懂运动生理学。
2. **用户背景**：
   * 24岁，上海交大溥渊未来技术学院研究生（导师秦通副教授，大论文盲审冲刺中）；
   * 本科北京理工大学 2024 届无人驾驶方程式车队队长；
   * 国家一级羽毛球运动员（爆发力强，肌肉量大）。
3. **减脂当前战果（Day 1 – Day 13）**：
   * 初始基线：`91.25 kg`（Day 3）
   * **当前最新（Day 13，2026-11-15 周日）**：**`89.25 kg`**（破纪录新低，净减整整 4 斤纯肉！正向 88kg 叩关冲刺）。
   * 目标体重：`82–84 kg`。

---

## 二、 本地项目结构与现有核心文件路径

工作区绝对路径：`/home/jiziheng/Documents/antigravity/fearless-einstein/`

* **`data.json`**：系统全量结构化数据库。包含 13 天的所有记录（`rows` 数组与 `records` 数组），记录了 `day`, `date`, `amWeight`, `pmWeight`, `breakfast`, `lunch`, `dinner`, `calories`, `protein`, `carbs`, `fat`, `water`, `activity`, `supplements`, `notes` 等字段。
* **`index.html`**：纯前端单文件响应式看板（支持手机 PWA 与 PC 宽屏，内含 Chart.js 趋势图、宏量统计与本地缓存逻辑）。
* **`SESSION_FULL_CHAT_LOG.md`**：本会话全部 707 轮完整纯净对白日志。
* **`SESSION_RESUME_PROMPT.md`**：完整的记忆注入与上下文继承文件。
* **`CAPTAIN_FITNESS_SESSION_LOG.md`**：Day 1 – Day 13 逐日全景数据大表与生理学复盘日志。
* **`git 远程仓库`**：`https://github.com/kelo020304/fit-tracker.git`（通过 GitHub Pages 部署在 `https://kelo020304.github.io/fit-tracker/`）。
* **`ntfy.sh 同步通道`**：`https://ntfy.sh/captain_fit_state_db300ca2`（用于实时广播更新给已打开的网页/手机看板）。

---

## 三、 飞书机器人核心需求与技术选型

### 推荐架构：基于飞书长连接（WebSocket `lark-oapi`）
飞书开放平台支持**长连接模式（WebSocket）**，**无需公网 IP、无需域名、无需配置反向代理或 ngrok/Cloudflare Tunnel**，机器人只需在本地运行 Python 脚本主动建连，即可实时接收飞书事件推送！

### 核心功能需求：
1. **私聊 / 群聊交互**：
   * 队长在飞书给机器人发送消息：例如：
     * `今早89.25 两个包子一个牛奶`
     * `喝了一杯水` / `喝了一杯`
     * `中午金枪鱼三明治 没酱没芝士`
     * `今晚三小时羽毛球`
     * `晚上89.8 吃了点牛肉`
   * 机器人接收到消息后，自动识别出：
     * 涉及的指标类型：早晨体重 / 晚上体重 / 饮水 / 早餐 / 午餐 / 晚餐 / 运动 / 补剂；
     * 自动估算或提取热量（kcal）、蛋白质（g）、碳水（g）、脂肪（g）；
     * 自动更新当天的 `data.json`（若当天不存在则自动追加新一天）；
     * 同步更新 `index.html` 的 `DEFAULT_DATA` 并广播到 `ntfy.sh`；
     * 自动提交并 push 到 GitHub（保持 GitHub Pages 实时同步）。
2. **飞书交互式富文本卡片回复**：
   * 收到打卡后，回复一张漂亮的飞书消息卡片（Interactive Card），展示：
     * 🏅 **称呼**：「收到，队长！」
     * 📊 **今日战况**：当前早/晚体重、今日累计卡路里、蛋白质达标进度（对比每日 110-150g 目标）、今日饮水量；
     * 💡 **生理学小点评**：根据队长的运动或饮食给出科学鼓励；
     * 🔗 **一键查看**：附带看板链接 `https://kelo020304.github.io/fit-tracker/`。
3. **支持图片消息（可选/进阶）**：
   * 队长发送餐食照片时，下载图片并通过视觉模型（如 OpenAI GPT-4o / Claude / Gemini API）识别菜品与宏量，自动录入午餐/晚餐。

---

## 四、 具体落地指引（请 Codex 按此步骤执行）

1. **创建飞书机器人代码文件**（推荐放置在项目根目录下，如 `feishu_bot.py` 或 `feishu_service/`）；
2. **依赖包与环境**：
   * `lark-oapi`（飞书官方 SDK，自带 WebSocket 支持）
   * `requests`
3. **配置文件规范**：
   * 创建 `config.json` 或 `.env`（并将其加入 `.gitignore`），用于存放：
     * `FEISHU_APP_ID` (cli_xxx)
     * `FEISHU_APP_SECRET`
     * `OPENAI_API_KEY`（用于自然语言解析三餐热量与意图提取）
4. **飞书开放平台配置文档**（生成一份简明的 `FEISHU_SETUP_GUIDE.md` 告诉队长如何在飞书后台开通）：
   * 如何创建企业自建应用；
   * 需要勾选哪些权限：`im:message`（获取与发送单聊消息）、`im:message.p2p_msg:readonly`、`im:resource` 等；
   * 如何开启「长连接模式」；
   * 如何发布版本并添加机器人能力。
5. **保证数据完整性**：
   * 必须保护现有的 13 天历史数据，所有操作都基于 `/home/jiziheng/Documents/antigravity/fearless-einstein/data.json` 进行读写；
   * 修改后自动保持时区（北京时间 UTC+8）与日期对齐。

请 Codex 立即开始编写代码与配置指南！
```

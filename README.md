# Skin Studio · 独立美化工作台（APK）

脱离 Roche 插件的独立应用：纯 HTML/JS 前端 + Android WebView 壳，用 GitHub Actions 打出**可覆盖安装**的 APK。

## 它解决什么

| 插件版的问题 | 这个版本 |
|---|---|
| 宿主没有写文件接口，导出点了没反应 | WebView 原生桥写 `Download/SkinStudio/`，另支持系统分享 |
| 提示词开关关不掉，token 爆炸 | 五层分段 + 逐段开关，关掉即从拼装结果消失 |
| 只能有一套美化 | 多方案工作区，代码/对话/导出完全隔离 |
| 预览靠手写 DOM | 真实页面样式（构建期从 roche.html 抽出）+ 四档场景 |

## 目录

```
web/                      纯前端（构建成单文件 app.js）
  src/core/               从插件搬来的：35 分支树 / 协议解析 / 体检 / 合并导出 / Markdown
  src/prompt/             五层分段引擎 + 条目化预设 + 组装（composePrompt 是唯一入口）
  src/ai/                 多渠道、流式、usage 记账、图床（imgbb/catbox/自定义）
  src/data/               IndexedDB、旧插件数据迁移、备份
  src/bridge/             原生能力探测与浏览器降级
  src/ui/                 界面、左滑抽屉、二级页、预览
  assets/scenes/          预览用样式基线（roche.css，构建期生成）
android/                  Kotlin WebView 壳
tools/                    快照抽取、样式抽取、e2e
tests/                    单测（node --test）
.github/workflows/        APK 构建
```

## 本地开发

```bash
cd web && node build.mjs          # 产出 web/dist（index.html + app.js + assets）
node --test                       # 单测
node tools/e2e.mjs                # 无头 Edge 冒烟（真实点按 + 命中测试）
```

浏览器直接打开 `web/dist/index.html` 即可（`file://` 下 AI 请求会被 CORS 拦，会提示；APK 内走原生桥不受影响）。

## 打 APK（可覆盖安装的关键）

推送 `main` 触发 Actions，产物在 **Artifacts → skin-studio-apk**。

覆盖安装必须三者固定：

1. 包名 `com.chubingyu.skinstudio`（已固定）
2. 签名 keystore 固定
3. `versionCode` 单调递增（用 `GITHUB_RUN_NUMBER`，已实现）

**首次构建**会自动生成 keystore，并额外上传一个 `keystore-first-build` artifact。请把它下载后配置成 3 个 Secret：

| Secret | 内容 |
|---|---|
| `KEYSTORE_BASE64` | `base64 -w 0 keystore.jks` 的结果 |
| `KEYSTORE_PASSWORD` | 默认 `skinstudio`（首次生成时） |
| `KEY_ALIAS` | 默认 `skinstudio` |

不配置的话，第二次构建会换一把新 key，装上去会提示「签名不一致 / 无法覆盖安装」。

## 预览说明（重要）

真实 Roche 页面是 SPA，**离线不会渲染**（需要后端与登录），所以 `tools/snapshot-roche.mjs` 抓不到 DOM。当前做法是：

- 从 `roche.html` 抽出**真实样式**（`tools/extract-css.mjs` → `web/assets/scenes/roche.css`，裁剪后约 710KB），作为预览样式基线；
- 页面结构用手写场景（四档：聊天 / 卡片墙 / 界面 / 线下），类名与宿主一致，因此真实样式能生效；
- 预览面板会标注「预览来源：场景 + 真实样式」。

等以后宿主有可离线的静态页面，把 `chat.html / inbox.html / feed.html / offline.html` 放进 `web/assets/scenes/` 就会自动优先使用快照（代码已按此实现）。

## 提示词结构

五层：`全局风格 / 风格规划 / 作用域规则 / 分支规则 / 本次任务`。

- 每一段都是数据（标题 / 正文 / 开关 / 顺序 / 作用域 / 绑定分支），`composePrompt` 只做过滤 + 排序 + 拼装 + 占位符替换，**没有任何写死段落**；
- 关掉一段，拼装结果里立刻消失，顶部体积与 token 估算同步变化；
- 预设 = 一组「预设条目」，内置四套按 CSS 部位拆条（气泡 / 顶栏 / 输入栏 / 卡片 / 档案卡 / 导航），每条可单独取舍；
- 改完可「另存为预设」，也可把当前启用段固化成条目。

## 数据

IndexedDB：`projects` / `chats` / `exports` / `usage` / `kv`（设置、渠道、预设段）。
浏览器隐私模式下自动降级为内存 + localStorage。

## 已知边界

- 图床（imgbb / catbox / 自定义）在浏览器里受 CORS 限制，APK 内使用同一路径；失败会给出 HTTP 状态与返回体片段。
- 流式输出只在浏览器 fetch 路径生效；APK 原生桥走非流式（一次返回，usage 完整）。
- 深色主题只影响工具界面，不影响预览里的皮肤。

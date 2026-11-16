# MBCC Console Wallpaper

> 给 [DeepSeek Harness](https://github.com/deepseek-harness) 用的 MBCC 控制台主题扩展：开场视频 + 本地壁纸库。

在原 `dsh-theme-mbcc-console` 配色主题的基础上，加了两件事：**开场动画**（先播一段视频，再走 MBCC 自检日志）和**本地壁纸库**（上传自己的图当聊天背景，支持幻灯片、透明度、明暗/强调色）。

A theme extension for DeepSeek Harness: a skippable opening video plus a local wallpaper library for the conversation background.

---

## 功能

### 开场动画

1. 整屏播放 `assets/opening.mp4`（静音自动播放，HUD 上有「声音」「跳过」，点画面任意处跳下一幕）。
2. 视频结束 / 跳过 / 取不到视频时，落到原来的 MBCC 启动日志画面（3s），再淡出进入工作区。
3. 视频地址按顺序尝试：本包客户端 bundle 目录下的 `assets/opening.mp4` → `/plugins/<包名>/assets/opening.mp4` → 宿主半部注册的 `/mbcc-console-wall/assets/opening.mp4`；全拿不到才跳过视频。
4. 控制台执行 `__mbccReplayBoot()` 可重播；壁纸库面板里也有「重播开屏」。

### 本地壁纸库

入口在**左侧栏最底部**（设置按钮旁，槽位 `sidebar.footer.action`），图标是一张画框。

- **主题库**
  - 主题 1「原主题」：不铺图，保留原主题自带的底纹与徽标。
  - 主题 2「狄斯夜色」：内置 CG 背景（默认启用）。
  - 上传本地图片：支持 png / jpg / webp / avif，存在浏览器 IndexedDB 里，可命名、可删除；同名/重传不会堆积。
- **播放**
  - 幻灯片：只在你勾选的主题之间轮播，间隔 5–120s 可调。
  - 图片填充方式：`cover` / `contain`。
  - 透明度：10%–100%，滑杆实时预览，松手落盘。
- **页面主题**
  - 强调色（红 / 青 / 蓝 / 橙 / 白）、明暗外观、界面底纹、圆体字、故障特效，都直接复用原主题的设置项。
  - 视频开屏可单独关掉（设置写进 `localStorage`，刷新仍生效）。

所有设置存 `localStorage['mbcc-wall-settings']`；图片存 IndexedDB 库 `mbcc-wall-images`。

## 安装

```powershell
dsh plugin add C:\path\to\dsh-theme-mbcc-console-ext-0.2.0.tgz
```

或在插件市场里选「从压缩包/链接安装」，或在源码目录下 `dsh plugin add .`。

装完刷新页面即可。只有改 `index.js`（宿主半部）需要重启 DSH，改 `client.js` 刷新即可。

### 下载

从 [Releases](https://github.com/sonruozimu/mbcc-console-wallpaper/releases) 取 `dsh-theme-mbcc-console-ext-<version>.tgz`。

> ⚠️ 不要和原主题 `dsh-theme-mbcc-console` 同时启用：两边都会注入开屏和样式表，会出现双开屏、样式互相覆盖。

## 调试

| 命令 | 作用 |
| --- | --- |
| `__mbccReplayBoot()` | 重播开场动画（含视频） |
| `__mbccBootDebug()` | 看开屏卡在哪一步：`build` / `stage` / `src` / `err` / `videoFailed` / `settingsBoot` / `wallVideo` |
| `__mbccWallSettings` | 当前壁纸设置对象（只读参考） |

开屏视频播不出来时，先看 `__mbccBootDebug()` 的 `stage`：`video:...` 说明在试某个地址，`log` 说明已回退到日志开屏，`err` 里会写 `media error <code>`。

## 目录结构

```
mbcc-console-wallpaper/
├─ package.json         # dsh.bundle.patch + dsh.client 声明
├─ cordis.patch.yml     # 把插件插进 profile 的 patch
├─ index.js             # 宿主半部：/mbcc-console-wall/assets/* 静态路由（支持 Range，视频可拖动）
├─ client.js            # 浏览器端：主题 token、开屏、壁纸库面板（单文件 bundle）
├─ assets/
│  ├─ opening.mp4       # 开场视频（1280x720, H.264, 5.06s）
│  └─ theme2.webp       # 主题 2 内置背景
├─ build.ps1            # 打包脚本 → dist/*.tgz + *.zip + SHA256SUMS.txt
├─ PUBLISH.md           # 分发与上架插件社区的流程
└─ README.md
```

客户端是一个 `window.__ModuleLoader__.load({ id, factory })` 单文件模块，不依赖构建步骤：直接改 `client.js` 刷新就生效。

## 本地开发

```powershell
# 以 link 方式装进当前 profile（改完刷新即可，不需要重装）
dsh plugin add <本目录>

# 打包
powershell -ExecutionPolicy Bypass -File .\build.ps1
```

`build.ps1` 只按 `package.json` 的 `files` 白名单复制，产物落在 `dist/`。

## 兼容性

- 需要 DSH 0.2.x（窗口端 `dsh.client` 平台 `web`）。
- 主题 token 走 `theme.overrideTokens()`，壁纸只覆盖 `[data-phase="active"|"hero"]` 的背景层，不改布局。
- 壁纸图片全部留在本地（IndexedDB），不上传任何服务器。

## License

[MIT](./LICENSE)

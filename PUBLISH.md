# 分发与上架说明

包名：`dsh-theme-mbcc-console-ext`　版本：`0.2.0`

功能：MBCC 控制台主题 + 开屏视频（opening.mp4 → MBCC 自检日志）+ 左侧栏底部「本地壁纸库」（上传本地图片、幻灯片、透明度、页面主题）。主题 1 = 原主题，主题 2 = 内置 CG。

---

## 一、本地保存

构建产物（都在 `dist/`）：

| 文件 | 用途 |
| --- | --- |
| `dsh-theme-mbcc-console-ext-0.2.0.tgz` | 标准插件包，可直接安装 / 上传 Release / 发 npm |
| `dsh-theme-mbcc-console-ext-0.2.0.zip` | 同内容压缩包，方便存档、发给别人解压查看 |

源码目录 `mbcc-console-wallpaper/` 本身就是可安装的 bundle（`package.json` 里的 `dsh.bundle.patch` + `dsh.client` 已就位）。

重新打包（改了代码之后）：

```powershell
cd C:\Users\Administrator\Documents\deepseek-harness\default-workspace\mbcc-console-wallpaper
powershell -File .\build.ps1
```

`build.ps1` 会清空 `dist\stage`、按 `files` 白名单复制、生成 tgz + zip、打印 sha256。

## 二、给别人安装（三种方式）

1. **命令行**（推荐给会用终端的）：

   ```powershell
   dsh plugin add C:\path\to\dsh-theme-mbcc-console-ext-0.2.0.tgz
   ```

2. **插件市场 → 从压缩包/链接安装**：把 tgz 拖进去，或填它的 URL（例如 GitHub Release 的下载地址）。

3. **拿到源码目录**（本仓库 / 解压 zip）：`dsh plugin add <该目录>`。

装完刷新页面即可；**改 `index.js`（宿主半部）需要重启 DSH**，改 `client.js` 刷新即可。

> 注意：不要和原主题 `dsh-theme-mbcc-console` 同时启用，会双开屏、双样式表互相覆盖。

## 三、上架插件社区

插件社区的目录只有一份：**awesome-dsh-plugin** 列表。市场（dshmarket）和目录站都实时读它，所以上架 = 往那个列表提一条 PR。

- 列表仓库：https://github.com/awesome-dsh-plugin/awesome-dsh-plugin
- 目录站：https://awesome-dsh-plugin.com
- 市场站：https://dshmarket.com

步骤：

1. 把本包推到一个公开 GitHub 仓库（例如 `https://github.com/<你>/dsh-theme-mbcc-console-ext`），根目录就是本包内容。
2. 打一个 tag 并发布 Release，把 `dist\dsh-theme-mbcc-console-ext-0.2.0.tgz` 作为 Release 附件传上去。
   - Release 直链形如：`https://github.com/<你>/dsh-theme-mbcc-console-ext/releases/download/v0.2.0/dsh-theme-mbcc-console-ext-0.2.0.tgz`
   - 市场优先用 npm 包，其次用 Release 预构建 tarball，最后才回退整仓源码下载 —— 所以附上 tgz 安装最快。
3. 到 https://github.com/awesome-dsh-plugin/awesome-dsh-plugin 提 PR，在插件清单里加一条（名字、仓库地址、一句话中英文描述、分类），指向你的仓库或 Release。
   - **不要**往 `dsh-market/dsh-market` 仓库提插件条目，那个仓库是市场应用本身，PR 会被拒。
4. 合并后市场与目录站会在一天内自动收录。

可选：发布到 npm，市场就能按包名装（`npm publish`，`files` 已限定只发 7 个文件）。

## 四、给市场的描述文案（可直接复制）

- 中文简介：MBCC 控制台视觉主题，带开场视频与本地壁纸库。视频开屏后可跳过；壁纸库支持上传本地图片、幻灯片轮播、透明度调节、强调色与明暗切换。
- English: An MBCC console theme for DeepSeek Harness with a skippable opening video and a local wallpaper library (upload, slideshow, opacity, accent/theme controls).
- 关键词：theme, wallpaper, mbcc, boot-animation, deepseek-harness

## 五、校验

每次打包都会在 `dist\SHA256SUMS.txt` 写下本次产物的 sha256（发版时把这份贴进 Release 说明即可；把哈希写进包内文件会造成「改包→哈希变」的循环）。

包内共 8 个文件：

```
package/package.json  package/index.js  package/client.js
package/cordis.patch.yml  package/README.md  package/PUBLISH.md
package/assets/opening.mp4  package/assets/theme2.webp
```

收到 tgz 后可先自查：

```powershell
tar -tzf .\dsh-theme-mbcc-console-ext-0.2.0.tgz
Get-FileHash .\dsh-theme-mbcc-console-ext-0.2.0.tgz -Algorithm SHA256
```

安装后自检：

- 刷新页面 → 先播 `opening.mp4`（HUD 上有「声音 / 跳过」），再走 MBCC 自检日志；
- 左侧栏底部、设置按钮旁出现画框图标「本地壁纸库」；
- 控制台执行 `__mbccBootDebug()` 可看开屏卡在哪一步（`stage` / `err` / `videoFailed`）；
- `__mbccReplayBoot()` 随时重播开屏。

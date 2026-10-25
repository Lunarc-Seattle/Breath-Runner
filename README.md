# 🌲 Lunarc Pacer — 地图1：森林·荧光秘境 (Full-Stack Interactive Demo)

> **👉 [点击这里直接在线试玩互动网页 (Live Interactive Demo)](https://lunarc-seattle.github.io/Test-repo/)**  
> *(支持免硬件设备直接试玩「地图1 - 森林·荧光秘境」，点击画面或按 `Space` 键即可控制女孩跳跃收集 `$` 金币并测试前后端 API 同步)*

---

## ✨ 项目亮点与前后端架构展示

1. **高精度矢量插画与多层级 Canvas 骨骼动画 (`src/animation/forestEngine.js`)**：
   - 基于 Adobe Illustrator (`.ai`) 源文件色板与图层结构，100% 还原**同心圆金月光晕 (`gold`)**、**双层视差远山 (`山 1 / 山 2`)**、**乳白分叉圆冠古树 (`图层 1`)** 与**荧光孢子粒子 (`图层 3`)**。
   - 实现**奔跑女孩多关节骨骼动画**（随风摆臂、步伐交替、抛物线跳跃）、**3D 折面金色引导箭头**与**3D 旋转 `$` 金币碰撞收集特效**。
2. **免设备试玩与蓝牙硬件双模状态机 (`src/core/forestMapState.js`)**：
   - 醒目提示**“你还没有连接设备，但可以试玩【地图1 - 森林·荧光秘境】”**，支持零门槛直接互动，也可一键切换至模拟蓝牙呼吸设备接入模式。
3. **清晰可读的前后端分层架构 (`src/services/forestTelemetryClient.js` + `server/`)**：
   - **前端**：ES6 模块化组织（`animation/` 渲染层、`core/` 物理与状态层、`services/` 网络通信层）。
   - **后端**：Node.js + Express RESTful API（`GET/POST /api/sessions`、`GET /api/health`），并内置静态页面离线降级存储，确保在 GitHub Pages 纯静态环境下也能完整交互。

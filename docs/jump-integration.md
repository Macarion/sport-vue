# Jump 前端接入说明

本分支 `codex/jump-multiprocess` 基于 2026-11-09 fetch 的 `origin/multiprocess`：`9f07e42f4ec19c12df71178406469c689f380c48`。代码在独立开发 worktree，原 wcx 工作区保留；改动尚未提交或推送。

后端对应 `sport-backend` 的同名分支，基线 `463f4c7fef31e35f0896e2ec3db8ada914e1cb94`。完整模型/资源来源和后端验收见后端 `docs/jump-integration.md`、`docs/jump-source-manifest.json`。

## 运行

```powershell
npm ci
$env:VITE_API_BASE_URL = 'http://127.0.0.1:8090/'
npm run dev
```

Node 18.20.5 已验证。业务接口 baseURL 可由此环境变量覆盖；Jump 信令使用同一主机和端口的 `/ws/webrtc/<uid>/`，HTTPS 对应 WSS。生产构建时也需要设置环境地址。原启停接口保持 `/api/standjump/start/` 和 `/api/standjump/stop/`。

Jump 页面保留摄像头选择、语音、状态、成绩图和本地录像下载。接收对象形式的 `msg.data`，独立处理 answer/loaded/data/error/end；30 秒连接超时、120 秒模型加载超时。本地预览在模型、远端轨道、第一份结果数据均到达后切换。统一回收 RTC、WS、摄像头和录制器，禁止重复启动，旧会话回调失效；人脸未通过不播报可以起跳，未注册显示放行提示；最终成绩每会话只写一次图表。

`tests/jump-browser.html` 是独立本地验收入口，直接挂载实际 Jump 组件，避开登录/鉴权页面；不进入生产构建，不替代日常登录入口。

## 检查

```powershell
node --test tests/jumpConnection.test.mjs
npx eslint src/utils/jumpConnection.js src/utils/request.js src/views/student/StudentTestingStandjump.vue
npm run build
```

5 项连接测试、组件修改文件 lint 和生产构建通过（仍有基线已有的大 bundle 提示）。

浏览器脚本使用 jumppy12 中已有的 Playwright Python 包及已安装的 Chrome。后端以 `FACE_GATE_ENABLED=0`、`DAPHNE_PORT=18090` 启动；前端以 `VITE_API_BASE_URL=http://127.0.0.1:18090/` 和 `npm run dev -- --host 127.0.0.1 --port 15173 --strictPort` 启动。然后在前端根目录运行：

```powershell
conda activate jumppy12
python tests/jump_browser.py --browser 'C:/Program Files/Google/Chrome/Application/chrome.exe' --video D:/Python_Project/wcx_jump/inputs/test5.mp4 --output C:/Users/Rational/.codex/worktrees/jump-multiprocess-backend/backend/outputs/validation/browser
python tests/jump_page.py --browser 'C:/Program Files/Google/Chrome/Application/chrome.exe' --output C:/Users/Rational/.codex/worktrees/jump-multiprocess-backend/backend/outputs/validation/page
```

第一条用录制视频构造 720p/15fps 摄像头流，在 ARMED 后播放，连接真实后端 WebRTC、YOLO、共享内存及测距。连续两轮出分、停止释放流、session 隔离通过。第二条模拟 HTTP/信令/人脸应答，检查加载预览、重复启动、门禁提示与语音、成绩去重、空值和迟到回复。

实际人脸 SDK/模型/注册数据及实体摄像头验收尚待现场完成；以上浏览器测试不包含真人识别。


## SDK 部署后的正常启动（2026-11-09）

后端 `vendor/face_sdk/`、配套 3 份模型和 `data/faces.db` 已部署，jumppy12 已安装 onnxruntime 1.31.1。现在可以开启 `FACE_GATE_ENABLED=1` 启动后端 8090，再用 `VITE_API_BASE_URL=http://127.0.0.1:8090/` 启动本前端 5173。

录制视频的浏览器验收可加 `--expect-face`，要求收到真实人脸服务返回的未注册测试账号放行结果；该脚本中的 browser_jump 不是包内已注册学号。已注册样例的匹配/失败验证由后端 `scripts/check_face_runtime.py` 单独完成，生产注册库保持不变。

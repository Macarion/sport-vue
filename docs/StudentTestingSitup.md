# StudentTestingSitup.vue 工作逻辑说明

> 学生端「仰卧起坐」体测页：本地摄像头采集 → WebRTC 上传后端 → 接收回传的带标注视频与逐帧检测数据 → 实时展示分数/状态/曲线，语音播报、本地录像保存。
> 路由 `/student/testingsitup`（`src/router/index.js`），页面结构为「主组件编排 + 4 个 composable」。

## 1. 文件结构

```
src/views/student/
├── StudentTestingSitup.vue          467 行（模板 + 脚本 + 样式）
└── composables/
    ├── useTestingWebRTC.js          225 行  ws/pc 握手、摄像头、本地录像/下载/自动保存
    ├── createTestChart.js           135 行  通用曲线图工厂（canvas + 基本信息 → 图表实例）
    ├── useTestCountdown.js          114 行  准备读秒 + 60s 正式倒计时
    └── useVoice.js                   48 行  语音播报 + 重复提醒节流
```

职责边界：**状态与编排留在主组件**（会话生命周期、帧数据处理、违规判定），composable 只持有自己那块状态，通过回调与主组件接线。

## 2. 页面布局

- **上方**：左 60% 视频画面；右侧自上而下——第一行「分数 | 倒计时」并列，第二行「状态」提示（`faceHint` 优先于 `hints`）。
- **中部控制条**：开启摄像头 / 关闭摄像头 / 摄像头选择 / 返回；右侧依次为「自动保存视频」复选框（默认关）、「绘图开关」复选框、「保存原视频」按钮（摄像头开启中或无录像时禁用）。
- **下方两张图表**：起伏角度（左，2/3 宽）+ 仰卧起坐个数（右，1/3 宽）。

## 3. 模块接口

| 模块 | 返回 | 说明 |
|---|---|---|
| `useTestingWebRTC({ videoRef, onData, onLoaded, onError, onEnd })` | `cameraList` `selectedDeviceId` `hasRecordedVideo` `autoSave` `loadCameraList` `connect(uid)` `stopMedia()` `sendConfig(payload)` `downloadOriginVideo()` `resetRecording()` | `connect` 建 `ws://127.0.0.1:8090/ws/webrtc/<uid>/`、开摄像头、MediaRecorder 录制、SDP offer/answer；`ws.onmessage` 按类型分发：`data`→`onData`、`loaded`→`onLoaded`、`error`→`onError`、`end`→`onEnd`。`stopMedia` 停录制+本地流。**ws 由服务端负责关闭**（客户端不主动关，否则收不到 `end`、成绩不播报），`socket.onclose` 时释放 pc（带身份校验，避免旧连接迟到的 close 误关新会话）。`autoSave` 为「自动保存视频」开关，勾选后停录制时（收尾数据块就绪的 `onstop` 回调里）自动下载 mp4 |
| `useTestCountdown({ speak, onStartTest, onTimeout })` | `leftCountdownMs` `isCountingDown` `countdownDisplay` `formatCountdown` `prepareCountdown()` `cancel()` `reset()` `dispose()` | 读秒 6 拍：前 3 拍显示"准备"、后 3 拍 3/2/1（与语音同步），归零显示"开始"→ `onStartTest` → 1s 后自动启动 60s 正式倒计时 → 归零 `onTimeout`。`cancel`=停表（保留剩余时间显示，stop 用）；`reset`=停表+回满值（start 用）；`dispose`=卸载清定时器 |
| `createTestChart(canvas, options)` | `{ init() reset() destroy() pushPoint(elapsedMs, value) }` | **通用曲线图工厂**，可被任意页面调用多次创建多图：`canvas` 传模板 ref 或元素；`options` 含 `label / color / fill / yTitle / beginAtZero / suggestedMax / valueSuffix / xTitle / maxPoints`。**x 轴为线性时间轴（毫秒）、从 0 开始**，tick/tooltip 格式化 `mm:ss`；数据点 `{x: 相对开始的毫秒, y: 数值}`；源数组保留全程，仅展示层截取最近 `maxPoints` 点（默认 `15*60*3 = 2700`，3 分钟上限）。`init()` 需在 `onMounted` 后调用（幂等）；Situp 创建了两个实例：个数图（`yTitle:'个数'`）与角度图（`beginAtZero + suggestedMax:60 + '°'` 后缀） |
| `useVoice()` | `speak(text, interrupt=true)` `remind(text)` `reset()` | `remind` 为持续提示（请平躺/手臂借力）：同文本 4 秒节流、不打断其它播报、文本变化立即重试；`reset` 清节流（新会话用） |

## 4. 主组件编排

### 4.1 `handleWsMessage` 拆分

```
handleWsMessage(result)
 ├─ applyFrameData(result)   分数、状态提示（空则["正常"]）、startTime≠0 时图表入库
 ├─ applyFaceState(result.face)  人脸状态机（checking/passed/failed/timeout）
 ├─ applyReady(result)       ready 上升沿 → detectStarted=true + prepareCountdown()
 └─ applyViolations(result)  违规表驱动（见 4.2）
```

### 4.2 违规表 `VIOLATIONS` 与 `finishTest`

```js
const VIOLATIONS = [
  { flag: 'is_waiting_for_flat', fatal: false, message: () => '请平躺，双腿保持不动' },
  { flag: 'is_arm_force_cheat',  fatal: false, message: () => '检测到手臂借力' },
  { flag: 'is_out_of_bounds',    fatal: true,  message: (s) => `…您的成绩为${s}个` },
  { flag: 'is_knee_move',        fatal: true,  message: (s) => `…您的成绩为${s}个` },
  { flag: 'is_assist_cheat',     fatal: true,  message: (s) => `…您的成绩为${s}个` },
]
```

- 非致命：`voice.remind()` 4 秒节流重复播报（表内优先级取第一个命中，避免两条提示逐帧互踢）。
- 致命：`finishTest(text)`。

**`finishTest(message, { speak })` 是测试结束的唯一入口**，幂等（`if (finished) return`），取代原 `hasStopSpoken` 的四处嵌套判断：

| 触发方 | 消息 | 播报 |
|---|---|---|
| 三个 fatal 违规 | 对应违规文案 | 是 |
| 超时（`onTimeout`） | `倒计时结束，您的成绩为：N个` | 是 |
| 后端 `end` 消息 | `倒计时结束…`（超时过）/ `测试已结束…` | 是 |
| 后端 `error` 消息 | 无（界面显示`错误：…`） | 否（`speak:false`，抑制成绩语音） |

`finishTest` → `stop()` 关会话；`start()` 复位 `finished/timedOut/startTime` 等全部会话状态。

### 4.3 会话流程

**`start()`**：防重入 → 复位全部状态（分数/提示/人脸/finished/timedOut/startTime、`voice.reset`、`countdown.reset`、`charts.reset`、`resetRecording`）→ `GET /api/situp/start/?uid=` → 200 则 `connect(uid)`、`cameraActive=true`。

**`stop()`**：防重入 → `cameraActive=false`、`countdown.cancel()` → `stopMedia()`（停录制+本地流；勾选自动保存则随后自动下载）→ `GET /api/situp/stop/?uid=`。**不在此关 ws**——服务端收到 stop 后会关，客户端抢先关闭会收不到 `end`、成绩不播报（实测结论）；ws 关闭时由 `onclose` 释放 pc。

**读秒→计分**：`ready` 上升沿 → `prepareCountdown()`（6 拍，语音「检测完成，准备开始」→ 3/2/1 → 「开始」）→ `onStartTest`：`startTime=Date.now()` + `sendConfig({type:'config', start:true})` → 1s 后 60s 正式倒计时 → 归零 `onTimeout`。

### 4.4 WebRTC 与视频画面

- 本地流先挂 `<video>` 预览；后端回传流**只存不挂**（`remoteStream`），`loaded:true` 与 `ontrack` 双条件齐了才经 `attachRemoteIfNeeded()` 切换（幂等，修模型加载期黑屏）。
- ICE 候选、offer/answer 走 WS；STUN：Google + 小米。
- 绘图开关 → `sendConfig({type:'config', drawing})`（带 readyState 检查）。

### 4.5 人脸提示（`faceHint`）

- `checking` → 「正在进行人脸识别，请注视摄像头」（持续）
- `passed` → 「未注册学生，直接放行」/「人脸识别完成」，2s 自清（文本比对防误清）
- `failed`/`timeout` 且 `fail_count >= 3` → 「人脸识别未通过，请重试」（持续）

## 5. 时序

```mermaid
sequenceDiagram
    participant U as 学生
    participant P as 主组件
    participant M as composables
    participant B as 后端(REST+WS)

    U->>P: 开启摄像头
    P->>M: voice/charts/countdown/webrtc reset
    P->>B: GET /api/situp/start/?uid=
    P->>M: webrtc.connect(uid)
    M->>B: WS + offer/ice → answer
    B-->>M: loaded(true) + ontrack → 切换标注画面
    loop 每帧 data
        B-->>P: handleWsMessage
        P->>M: countChart/angleChart.pushPoint / voice.remind
    end
    Note over P: ready 上升沿 → countdown.prepareCountdown(3-2-1)<br/>onStartTest → config start → 60s 倒计时
    alt fatal 违规 / 超时 / 后端 end
        P->>P: finishTest(成绩文案) 幂等
        P->>M: voice.speak(成绩)
        P->>M: stop() → stopMedia(可自动保存) + GET stop
        B-->>M: 服务端关闭 ws → onclose 释放 pc
    end
```

## 6. 与重构前的差异（行为变更）

1. **ws/pc 生命周期（实测修订）**：原实现客户端从不关 ws/pc；曾改为 `stop()` 后客户端关闭，实测会导致收不到 `end`、成绩不播报，已按实测调整为——**客户端不关 ws（服务端关），pc 在 `socket.onclose` 释放**（新会话 `onopen` 另有兜底：先关残留 pc）。
2. **修复**：图表 tooltip 索引错误 → 直接取解析后的 `x/y` 并格式化。
3. **修复**：`hasRecordedVideo` 在 `start()` 复位；仅真实录过（recorder 非 inactive）才置 true。
4. **修复（重构中新发现）**：`start()` 现在复位 `startTime=0`——原实现残留上一会话的 startTime，导致重启后读秒完成前就往图表灌数据且时间轴错乱。
5. **读秒显示**：原「前 4 拍都显示 3」→ 前 3 拍"准备"、后 3 拍 3/2/1，与语音同步（总时长 6 拍不变）。
6. **重复提醒**：原逐帧重播 → 同文本 4 秒节流、不打断其它播报。
7. **超时播报时机**：原等后端 `end` 才播 → 超时当拍即播。
8. **布局**：倒计时从底部移到上方与分数并列；底部只剩两图（角度左 2/3、个数右 1/3）。
9. **图表**：x 轴改为线性时间轴从 0 起；展示上限由 900/150 点改为两图统一 2700 点（3 分钟）。
10. **新增「自动保存视频」**：默认关；勾选后测试结束停录制时自动下载（所有结束路径：fatal/超时/end/手动关闭摄像头）；按钮「下载原视频」改名「保存原视频」。
11. **删除**：死代码 `count`、`isRegister`、`cleanup()`、`camIndex++`、死样式（`.video-preview` `.count-info` `.record-details*` `.info-card h3` `.info-content`）。
12. **重命名**：`num`→`score`、`is_timeout`→`timedOut`、`login`→`goBack`、`handleWsClose`→`handleTestEnd`、`startRecord/stopRecord`→`connect/stopMedia`、`countdownTimer/Interval`→`prepareTimer/testTimer`、`mediaParams`→`MEDIA_CONSTRAINTS`。
13. **顺带修复**：`eslint.config.js` 中 `globals` 被误当作 flat config 项（ESLint 全仓崩溃 exit 2），改为正确的 `languageOptions.globals` 写法。

未变更：WS/SDP 协议、REST 端点、数据载荷、60s 测试时长、全程数据保留、人脸状态机语义。

## 7. 验证状态与注意点

- `prettier` + `eslint --fix` 对改动文件通过；`vite build` 通过。
- 完整冒烟（开摄像头→识别→读秒→计分→结束→自动保存）需后端环境，由人工执行。
- WS 地址 `ws://127.0.0.1:8090/...` 仍硬编码在 `useTestingWebRTC.js`。
- 自动保存依赖 `MediaRecorder.onstop` 回调（收尾数据块先于 stop 事件到达，不丢帧）；浏览器可能要求用户手势才允许多次自动下载。
- 图表源数组全程增长是**有意为之**（要记全程），展示层已截断。

<template>
  <div class="container">
    <!-- 摄像头和图表区域 -->
    <div class="camera-chart-container">
      <div class="camera-box">
        <video
          ref="resultVideo"
          autoplay
          muted
          playsinline
          style="height: 100%; width: 100%; object-fit: contain"
        />
      </div>
      <div class="chart-box">
        <div style="flex: 1; display: flex">
          <div style="flex: 1">
            <h3 style="margin: 0">分数</h3>
            <div style="text-align: center">
              <div class="count-display">{{ score }}</div>
            </div>
          </div>
          <div style="flex: 1">
            <h3 style="margin: 0">倒计时</h3>
            <div style="text-align: center">
              <span class="count-display" v-if="isCountingDown">{{ countdownDisplay }}</span>
              <span class="count-display" v-else>{{ formatCountdown(leftCountdownMs) }}</span>
            </div>
          </div>
        </div>
        <div style="flex: 1">
          <h3 style="margin: 0">状态</h3>
          <div style="text-align: center">
            <div class="hints-area">
              <div v-if="faceHint" class="hint-text">{{ faceHint }}</div>
              <template v-else>
                <div v-for="(hint, idx) in hints" :key="idx" class="hint-text">{{ hint }}</div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 控制按钮区域 -->
    <div class="control-buttons">
      <el-button type="primary" @click="start()" :disabled="cameraActive">开启摄像头</el-button>
      <el-button type="danger" @click="stop()" :disabled="!cameraActive">关闭摄像头</el-button>
      <el-select
        v-model="selectedDeviceId"
        placeholder="选择摄像头"
        style="width: 15rem; margin: 0 10px"
        :disabled="cameraActive"
      >
        <el-option
          v-for="(cam, idx) in cameraList"
          :key="cam.deviceId"
          :label="cam.label || `摄像头${idx + 1}`"
          :value="cam.deviceId"
        />
      </el-select>
      <el-button @click="goBack">返回</el-button>
      <div style="float: right; display: flex; gap: 10px">
        <el-checkbox v-model="autoSave">自动保存视频</el-checkbox>
        <el-checkbox v-model="drawingEnabled" @change="onDrawingToggle">绘图开关</el-checkbox>
        <el-button
          type="success"
          @click="downloadOriginVideo"
          :disabled="cameraActive || !hasRecordedVideo"
          >保存原视频</el-button
        >
      </div>
    </div>

    <!-- 图表展示区域：起伏角度(2/3 宽) + 仰卧起坐个数(1/3 宽) -->
    <div class="info-container">
      <el-row :gutter="20" class="info-row">
        <el-col :span="16">
          <div class="info-card">
            <div class="chart-section">
              <canvas ref="angleChartElement"></canvas>
            </div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="info-card">
            <div class="chart-section">
              <canvas ref="countChartElement"></canvas>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { start_monitor_situp, stop_monitor_situp } from '@/api/user.js'
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useVoice } from './composables/useVoice.js'
import { useTestCountdown } from './composables/useTestCountdown.js'
import { createTestChart } from './composables/createTestChart.js'
import { useTestingWebRTC } from './composables/useTestingWebRTC.js'

const router = useRouter()
const username = localStorage.getItem('username')
console.log('获取到的username:', username)

// 模板 refs
const resultVideo = ref(null)
const countChartElement = ref(null)
const angleChartElement = ref(null)

// 会话状态
const cameraActive = ref(false)
const score = ref(0)
const hints = ref(['请点击开始按钮'])
const faceHint = ref('')
const drawingEnabled = ref(true)
const detectStarted = ref(false)

// 结束状态：finishTest 的单一事实源（取代原 hasStopSpoken）
let finished = false
let timedOut = false
let startTime = 0 // 正式开始时刻，0 表示尚未开始（图表入库门槛）
let lastReadyState = false
let lastFaceState = null

const voice = useVoice()
const countChart = createTestChart(countChartElement, {
  label: '仰卧起坐个数',
  color: '#2d7acd',
  fill: 'rgba(45, 122, 205, 0.2)',
  yTitle: '个数',
  beginAtZero: true,
  maxPoints: 15 * 60 * 3,
})
const angleChart = createTestChart(angleChartElement, {
  label: '起伏角度',
  color: '#67c23a',
  fill: 'rgba(103, 194, 58, 0.2)',
  beginAtZero: true,
  suggestedMax: 60,
  valueSuffix: '°',
  maxPoints: 15 * 60 * 3,
})

const {
  leftCountdownMs,
  isCountingDown,
  countdownDisplay,
  formatCountdown,
  prepareCountdown,
  cancel: cancelCountdown,
  reset: resetCountdown,
  dispose: disposeCountdown,
} = useTestCountdown({
  speak: voice.speak,
  onStartTest: () => {
    startTime = Date.now()
    sendConfig({ type: 'config', start: true })
  },
  onTimeout: () => {
    timedOut = true
    // finishTest(`倒计时结束，您的成绩为：${score.value}个`)
    stop()
  },
})

// 违规/提示声明式表格：fatal 结束测试，非致命走重复提醒
const VIOLATIONS = [
  { flag: 'is_waiting_for_flat', fatal: false, message: () => '请平躺，双腿保持不动' },
  { flag: 'is_arm_force_cheat', fatal: false, message: () => '检测到手臂借力' },
  {
    flag: 'is_out_of_bounds',
    fatal: true,
    message: (s) => `检测到身体移出画面，本次测试结束，您的成绩为${s}个`,
  },
  {
    flag: 'is_knee_move',
    fatal: true,
    message: (s) => `检测到大幅移动，请避免其他人干扰画面，本次测试结束，您的成绩为${s}个`,
  },
  {
    flag: 'is_assist_cheat',
    fatal: true,
    message: (s) => `检测到可能有人助力，请避免其他人干扰画面，本次测试结束，您的成绩为${s}个`,
  },
]

// ---- 帧数据处理（原 handleWsMessage 拆分） ----

const applyFrameData = (result) => {
  score.value = result.score
  hints.value = result.hints && result.hints.length ? result.hints : ['正常']
  if (startTime !== 0) {
    const elapsed = Number(result.timestamp) - startTime
    countChart.pushPoint(elapsed, result.score)
    angleChart.pushPoint(elapsed, result.angle)
  }
}

const clearFaceHintLater = () => {
  const text = faceHint.value
  setTimeout(() => {
    if (faceHint.value === text) faceHint.value = ''
  }, 2000)
}

const applyFaceState = (face) => {
  if (!face) return
  if (face.state !== lastFaceState) {
    lastFaceState = face.state
    if (face.state === 'checking') {
      faceHint.value = '正在进行人脸识别，请注视摄像头'
    } else if (face.state === 'passed') {
      if (face.registered === false) {
        faceHint.value = '未注册学生，直接放行'
        clearFaceHintLater()
      } else {
        faceHint.value = '人脸识别完成'
        clearFaceHintLater()
      }
    }
  }
  // 失败/超时：前两次静默重试，第3次起才提示（fail_count 由后端累计）
  if ((face.state === 'failed' || face.state === 'timeout') && (face.fail_count || 0) >= 3) {
    faceHint.value = '人脸识别未通过，请重试'
  }
}

const applyReady = (result) => {
  const currentReady = result.ready === true || result.ready === 1
  if (currentReady && !lastReadyState && !detectStarted.value) {
    // ready 上升沿：开始准备读秒
    detectStarted.value = true
    prepareCountdown()
  }
  lastReadyState = currentReady
}

const applyViolations = (result) => {
  if (finished) return
  const fatal = VIOLATIONS.find((v) => v.fatal && result[v.flag])
  if (fatal) {
    finishTest(fatal.message(score.value))
    return
  }
  const warning = VIOLATIONS.find((v) => !v.fatal && result[v.flag])
  if (warning) voice.remind(warning.message(score.value))
}

const handleWsMessage = (result) => {
  applyFrameData(result)
  applyFaceState(result.face)
  applyReady(result)
  applyViolations(result)
}

// ---- WebRTC 消息回调 ----

const handleLoaded = () => {
  if (!detectStarted.value) hints.value = ['准备就绪']
}

const handleError = (message) => {
  faceHint.value = '' // 错误提示不被人脸提示遮挡
  hints.value = ['错误：' + (message || '后端处理失败')]
  finishTest(null, { speak: false }) // 抑制"测试已结束"成绩语音
}

const handleTestEnd = () => {
  finishTest(
    timedOut
      ? `倒计时结束，您的成绩为：${score.value}个`
      : `测试已结束，您的成绩为：${score.value}个`,
  )
}

const {
  cameraList,
  selectedDeviceId,
  hasRecordedVideo,
  autoSave,
  loadCameraList,
  connect,
  stopMedia,
  sendConfig,
  downloadOriginVideo,
  resetRecording,
} = useTestingWebRTC({
  videoRef: resultVideo,
  onData: handleWsMessage,
  onLoaded: handleLoaded,
  onError: handleError,
  onEnd: handleTestEnd,
})

// ---- 会话生命周期 ----

// 测试结束的唯一入口：幂等，播报成绩并关闭会话
const finishTest = (message, { speak = true } = {}) => {
  if (finished) return
  finished = true
  if (speak && message) voice.speak(message, true)
  stop()
}

const stop = async () => {
  if (!cameraActive.value) return // 防止重复关闭
  cameraActive.value = false
  cancelCountdown()

  // 不在这里关 ws：服务端收到 stop 后会关，客户端抢先关闭会收不到 end，成绩不播报
  try {
    stopMedia()
    const res = await stop_monitor_situp(username)
    console.log('关闭摄像头返回:', res)
  } catch (err) {
    console.error('关闭摄像头失败:', err)
  }
}

const start = async () => {
  if (cameraActive.value) return // 防止重复开启

  score.value = 0
  hints.value = ['连接中...']
  faceHint.value = ''
  detectStarted.value = false
  lastReadyState = false
  lastFaceState = null
  finished = false
  timedOut = false
  startTime = 0
  voice.reset()
  resetCountdown()
  countChart.reset()
  angleChart.reset()
  resetRecording()

  try {
    const res = await start_monitor_situp(username)
    console.log('启动摄像头返回:', res)
    if (res.status === 200) {
      await connect(username)
      cameraActive.value = true
    }
  } catch (err) {
    console.error('启动摄像头失败:', err)
    cameraActive.value = false
  }
}

const onDrawingToggle = (val) => {
  sendConfig({ type: 'config', drawing: val })
}

const goBack = () => {
  router.push('/student/test')
}

onMounted(() => {
  countChart.init()
  angleChart.init()
  loadCameraList()
})

onUnmounted(() => {
  disposeCountdown()
  countChart.destroy()
  angleChart.destroy()
  if (cameraActive.value) {
    stop()
  }
})
</script>

<style scoped>
.container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  overflow: hidden;
}

.camera-chart-container {
  flex: 1;
  display: flex;
  min-height: 0;
}

.camera-box {
  flex: 0 0 auto;
  width: 60%;
  aspect-ratio: 16 / 9;
  background: #000000;
  position: relative;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #ffffff;
}

.chart-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.chart-section {
  flex: 1;
  height: 100%;
  width: 100%;
  position: relative;
}

.chart-section canvas {
  position: absolute;
  left: 0;
  top: 0;
  width: 100% !important;
  height: 100% !important;
}

.control-buttons {
  flex: none;
  padding: 12px 20px;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  height: auto;
}

.el-checkbox {
  margin-right: 10px;
}

.info-container {
  flex: none;
  height: 35vh;
}

.info-row {
  height: 90%;
}

.info-card {
  height: 100%;
  padding: 20px;
}

.count-display {
  font-size: 48px;
  font-weight: bold;
  color: #67c23a;
  vertical-align: middle;
}

.hints-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
}

.hint-text {
  font-size: 32px;
  font-weight: bold;
  color: #e6a23c;
}

@media (max-width: 768px) {
  .camera-chart-container {
    height: 50vh;
  }

  .camera-box {
    width: 50%;
    aspect-ratio: 16 / 9;
  }
}
</style>

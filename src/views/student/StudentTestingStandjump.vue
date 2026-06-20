<template>
  <div class="container">
    <div class="camera-chart-container">
      <div class="camera-box">
        <img v-if="frameSrc" :src="frameSrc" alt="实时图像" class="video-preview" />
        <video
          v-show="cameraActive && !frameSrc"
          ref="videoElement"
          class="video-preview"
          autoplay
          muted
          playsinline
        ></video>
        <div v-if="!cameraActive && !frameSrc" class="loading">点击开启摄像头</div>
      </div>

      <div class="chart-box status-card">
        <h3>跳远状态</h3>
        <div class="status-content">
          <div class="status-heading">
            <span class="status-dot" :class="stateClass"></span>
            <span>{{ stateLabel }}</span>
          </div>
          <div class="status-message">{{ statusMessage }}</div>

          <div class="status-list">
            <div class="status-row">
              <span>ArUco</span>
              <strong>{{ arucoStatus }}</strong>
            </div>
            <div class="status-row">
              <span>当前帧</span>
              <strong>{{ frameLabel }}</strong>
            </div>
            <div class="status-row">
              <span>视频通道</span>
              <strong>{{ wsStatus.video }}</strong>
            </div>
            <div class="status-row">
              <span>数据通道</span>
              <strong>{{ wsStatus.data }}</strong>
            </div>
            <div class="status-row">
              <span>流状态</span>
              <strong>{{ streamStatus }}</strong>
            </div>
            <div class="status-row">
              <span>成绩</span>
              <strong>{{ scoreDisplay }}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="control-buttons">
      <el-button type="primary" @click="start" :disabled="cameraActive">开启摄像头</el-button>
      <el-button type="danger" @click="stop" :disabled="!cameraActive">关闭摄像头</el-button>
      <el-button @click="login">返回</el-button>
    </div>

    <div class="info-container">
      <el-row :gutter="20" class="info-row">
        <el-col :span="8">
          <div class="info-card">
            <h3>跳远距离</h3>
            <div class="info-content">
              <div class="count-display">{{ scoreDisplay }}</div>
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
        <el-col :span="8">
          <div class="info-card">
            <div class="chart-section">
              <canvas ref="angleChartElement"></canvas>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import Chart from 'chart.js/auto'
import { useRouter } from 'vue-router'
import { start_monitor_standjump, stop_monitor_standjump } from '@/api/user.js'

const STATE_LABELS = {
  IDLE: '未开始',
  STARTING: '启动中',
  CALIBRATING: '场景检测',
  WAITING_READY: '起跳准备',
  ARMED: '可以起跳',
  IN_JUMP: '跳跃中',
  PROCESSING: '成绩计算',
  RESULT: '完成',
  FAILED: '失败',
  STOPPED: '已停止',
}

const speakMessage = (text) => {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  window.speechSynthesis.speak(utterance)
}

const router = useRouter()
const username = localStorage.getItem('username')

const videoElement = ref(null)
const countChartElement = ref(null)
const angleChartElement = ref(null)
const cameraActive = ref(false)
const frameSrc = ref('')
const jumpState = ref('IDLE')
const statusMessage = ref('点击开启摄像头')
const frameId = ref(null)
const scoreValue = ref(null)
const streamStatus = ref('-')
const wsStatus = ref({ video: '未连接', data: '未连接' })

let countChartInstance = null
let angleChartInstance = null
let timestamps = []
let scores = []
let angles = []
let mediaStream = null
let mediaRecorder = null
let wsBundle = null
let video_ws = null
let data_ws = null

const SLICE_TIME = 33

const stateLabel = computed(() => STATE_LABELS[jumpState.value] || jumpState.value || '-')
const stateClass = computed(() => `state-${String(jumpState.value || 'IDLE').toLowerCase().replaceAll('_', '-')}`)
const frameLabel = computed(() => (frameId.value === null || frameId.value === undefined ? '-' : frameId.value))
const scoreDisplay = computed(() => (Number.isFinite(scoreValue.value) ? `${scoreValue.value.toFixed(2)} cm` : '-'))
const arucoStatus = computed(() => {
  if (jumpState.value === 'CALIBRATING') return '识别中'
  if (['WAITING_READY', 'ARMED', 'IN_JUMP', 'PROCESSING', 'RESULT'].includes(jumpState.value)) {
    return '标定已通过'
  }
  if (jumpState.value === 'FAILED') return '请重新检查标记'
  if (jumpState.value === 'STOPPED') return '已停止'
  return '-'
})

const setWsStatus = (type, value) => {
  wsStatus.value = { ...wsStatus.value, [type]: value }
}

const resetRunState = () => {
  cleanupFrame()
  timestamps = []
  scores = []
  angles = []
  frameId.value = null
  scoreValue.value = null
  streamStatus.value = '-'
  jumpState.value = 'STARTING'
  statusMessage.value = '正在启动跳远检测服务'
  wsStatus.value = { video: '未连接', data: '未连接' }
  initCountChart()
  initAngleChart()
}

const start = async () => {
  if (cameraActive.value) return
  resetRunState()

  try {
    const res = await start_monitor_standjump(username)
    if (res?.data) handleBackendData(res.data)

    cameraActive.value = true
    statusMessage.value = '正在打开摄像头'
    wsBundle = await startRecord(username, 'jump')
    statusMessage.value = '摄像头已开启，请保持 ArUco 标记可见'
  } catch (err) {
    console.error('启动跳远检测失败:', err)
    statusMessage.value = err?.message || '启动跳远检测失败'
    jumpState.value = 'FAILED'
    cameraActive.value = false
    stopRecord(wsBundle)
    wsBundle = null
    stop_monitor_standjump(username).catch(() => {})
  }
}

const stop = async () => {
  speakMessage('测试已结束')
  cameraActive.value = false
  jumpState.value = 'STOPPED'
  statusMessage.value = '正在关闭摄像头和检测服务'

  stopRecord(wsBundle)
  wsBundle = null
  cleanupFrame()

  try {
    await stop_monitor_standjump(username)
    statusMessage.value = '测试已停止'
  } catch (err) {
    console.error('停止跳远检测失败:', err)
    statusMessage.value = err?.message || '停止跳远检测失败'
  }
}

const openCamera = async () => {
  if (mediaStream) return
  mediaStream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: 640,
      height: 480,
    },
    audio: false,
  })

  await nextTick()
  if (videoElement.value) {
    videoElement.value.srcObject = mediaStream
    await videoElement.value.play().catch((err) => {
      console.warn('本地摄像头预览播放失败:', err)
    })
  }
}

const connectWS = (uid, sport, type) => {
  return new Promise((resolve, reject) => {
    const encode = (val) => encodeURIComponent(String(val))
    const params = `${encode(sport)}_${encode(type)}_${encode(uid)}`
    const ws = new WebSocket(`ws://127.0.0.1:8090/ws/${params}/`)
    let settled = false

    ws.binaryType = 'arraybuffer'
    setWsStatus(type, '连接中')

    ws.onopen = () => {
      settled = true
      setWsStatus(type, '已连接')
      resolve(ws)
    }

    ws.onerror = () => {
      setWsStatus(type, '错误')
      if (!settled) reject(new Error(`${type} WebSocket 连接失败`))
    }

    ws.onclose = () => {
      setWsStatus(type, '已关闭')
    }

    if (type === 'data') {
      ws.onmessage = (event) => {
        try {
          handleWsMessage(JSON.parse(event.data))
        } catch (error) {
          console.error('跳远数据解析失败:', error)
        }
      }
    }
  })
}

const startRecord = async (uid, sport) => {
  await openCamera()

  video_ws = await connectWS(uid, sport, 'video')
  data_ws = await connectWS(uid, sport, 'data')

  const mimeType = 'video/webm;codecs=vp8'
  const options = MediaRecorder.isTypeSupported(mimeType) ? { mimeType } : undefined
  mediaRecorder = new MediaRecorder(mediaStream, options)

  mediaRecorder.ondataavailable = async (event) => {
    if (!event.data?.size || video_ws?.readyState !== WebSocket.OPEN) return
    const buf = await event.data.arrayBuffer()
    video_ws.send(buf)
  }

  mediaRecorder.start(SLICE_TIME)
  return { video_ws, data_ws }
}

const stopRecord = (bundle) => {
  const currentVideoWs = bundle?.video_ws || video_ws
  const currentDataWs = bundle?.data_ws || data_ws

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
  mediaRecorder = null

  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop())
    mediaStream = null
  }
  if (videoElement.value) {
    videoElement.value.srcObject = null
  }

  const closeWS = (ws) => {
    if (ws && [WebSocket.OPEN, WebSocket.CONNECTING].includes(ws.readyState)) {
      ws.close()
    }
  }
  closeWS(currentVideoWs)
  closeWS(currentDataWs)

  video_ws = null
  data_ws = null
  setWsStatus('video', '已关闭')
  setWsStatus('data', '已关闭')
}

const handleWsMessage = (msg) => {
  if (msg?.painting) {
    cleanupFrame()
    frameSrc.value = msg.painting
  }
  handleBackendData(msg?.result || msg || {})
}

const handleBackendData = (data) => {
  if (!data || typeof data !== 'object') return

  const previousState = jumpState.value
  if (data.state) jumpState.value = data.state
  if (data.message) statusMessage.value = data.message
  if (data.frame_id !== undefined && data.frame_id !== null) frameId.value = data.frame_id

  updateStreamStatus(data.stream_stats)

  const score = Number(data.score_cm ?? data.result?.score_cm)
  if (Number.isFinite(score)) {
    scoreValue.value = score
    pushScore(score)
  }

  if (jumpState.value !== previousState) {
    if (jumpState.value === 'ARMED') speakMessage('可以开始起跳')
    if (jumpState.value === 'RESULT') speakMessage('成绩计算完成')
  }
}

const updateStreamStatus = (stats) => {
  if (!stats) return
  const received = Number(stats.received_fps)
  const analysis = Number(stats.analysis_fps)
  const frames = `${stats.analyzed_frames ?? 0}/${stats.received_frames ?? 0}`
  if (Number.isFinite(received) || Number.isFinite(analysis)) {
    streamStatus.value = `收 ${Number.isFinite(received) ? received.toFixed(1) : '-'}fps / 析 ${
      Number.isFinite(analysis) ? analysis.toFixed(1) : '-'
    }fps (${frames})`
  } else {
    streamStatus.value = frames
  }
}

const pushScore = (score) => {
  timestamps.push(Date.now())
  scores.push(score)
  angles.push(0)
  updateCharts()
}

const login = () => {
  router.push('/student/test')
}

const initCountChart = () => {
  if (!countChartElement.value) return
  if (countChartInstance) countChartInstance.destroy()
  countChartInstance = new Chart(countChartElement.value.getContext('2d'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: '立定跳远距离',
          data: [],
          borderColor: '#2d7acd',
          backgroundColor: 'rgba(45, 122, 205, 0.2)',
          fill: true,
          tension: 0,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: '时间' }, ticks: { autoSkip: true, maxRotation: 0 } },
        y: { title: { display: true, text: '距离 (cm)' } },
      },
    },
  })
}

const initAngleChart = () => {
  if (!angleChartElement.value) return
  if (angleChartInstance) angleChartInstance.destroy()
  angleChartInstance = new Chart(angleChartElement.value.getContext('2d'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: '暂无指标',
          data: [],
          borderColor: '#67c23a',
          backgroundColor: 'rgba(103, 194, 58, 0.2)',
          fill: true,
          tension: 0,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: '时间' }, ticks: { autoSkip: true, maxRotation: 0 } },
        y: {},
      },
    },
  })
}

const updateCharts = () => {
  const maxPoints = 100
  const visibleTimestamps = timestamps.slice(-maxPoints)
  const labels = visibleTimestamps.map((ts) => formatElapsed(ts - timestamps[0]))

  if (countChartInstance) {
    countChartInstance.data.labels = labels
    countChartInstance.data.datasets[0].data = scores.slice(-maxPoints)
    countChartInstance.update()
  }

  if (angleChartInstance) {
    angleChartInstance.data.labels = labels
    angleChartInstance.data.datasets[0].data = angles.slice(-maxPoints)
    angleChartInstance.update()
  }
}

const formatElapsed = (elapsedMs) => {
  if (!Number.isFinite(elapsedMs)) return ''
  return `${Math.max(0, elapsedMs / 1000).toFixed(1)}s`
}

const cleanupFrame = () => {
  if (frameSrc.value?.startsWith('blob:')) {
    URL.revokeObjectURL(frameSrc.value)
  }
  frameSrc.value = ''
}

onMounted(() => {
  initCountChart()
  initAngleChart()
})

onUnmounted(() => {
  if (countChartInstance) {
    countChartInstance.destroy()
    countChartInstance = null
  }
  if (angleChartInstance) {
    angleChartInstance.destroy()
    angleChartInstance = null
  }
  stopRecord(wsBundle)
  wsBundle = null
  cleanupFrame()
  if (cameraActive.value) {
    stop_monitor_standjump(username).catch((err) => console.error('停止跳远检测失败:', err))
  }
})
</script>

<style scoped>
.container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
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

.status-card h3 {
  margin: 0 0 16px 0;
  color: #409eff;
}

.status-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.status-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
  font-weight: 700;
  color: #303133;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #909399;
  flex: 0 0 auto;
}

.state-calibrating,
.state-waiting-ready,
.state-starting {
  background: #e6a23c;
}

.state-armed,
.state-in-jump {
  background: #67c23a;
}

.state-processing {
  background: #409eff;
}

.state-result {
  background: #67c23a;
}

.state-failed {
  background: #f56c6c;
}

.status-message {
  margin: 14px 0 18px;
  min-height: 44px;
  line-height: 1.5;
  color: #606266;
  font-size: 15px;
}

.status-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #ebeef5;
  color: #909399;
  font-size: 14px;
}

.status-row strong {
  color: #303133;
  font-weight: 600;
  text-align: right;
  overflow-wrap: anywhere;
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

.video-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.loading {
  color: #ffffff;
  font-size: 18px;
}

.control-buttons {
  flex: none;
  padding: 12px 20px;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  height: auto;
}

.info-container {
  flex: none;
  padding: 12px 20px;
  height: 35vh;
}

.info-row {
  height: 90%;
}

.info-card {
  height: 90%;
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.info-card h3 {
  margin: 0 0 15px 0;
  color: #409eff;
}

.info-content {
  height: calc(100% - 40px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.count-display {
  font-size: 42px;
  font-weight: bold;
  color: #67c23a;
  margin-bottom: 10px;
  text-align: center;
  overflow-wrap: anywhere;
}

@media (max-width: 768px) {
  .camera-chart-container {
    height: 50vh;
  }

  .camera-box {
    width: 50%;
    aspect-ratio: 16 / 9;
  }

  .status-heading {
    font-size: 20px;
  }

  .count-display {
    font-size: 32px;
  }
}
</style>

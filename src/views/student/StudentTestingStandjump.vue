<template>
  <div class="container">
    <div class="camera-chart-container">
      <div class="camera-box">
        <video
          v-show="cameraActive"
          ref="videoElement"
          class="video-preview"
          autoplay
          muted
          playsinline
        ></video>
        <div v-if="!cameraActive" class="loading">点击开启摄像头</div>
      </div>

      <div class="chart-box status-card">
        <h3>跳远状态</h3>
        <div class="status-content status-content--center">
          <div class="status-heading status-heading--large">
            <span class="status-dot status-dot--large" :class="stateClass"></span>
            <span>{{ stateLabel }}</span>
          </div>
          <div class="status-score">
            <span>成绩</span>
            <strong>{{ scoreDisplay }}</strong>
          </div>
        </div>
      </div>
    </div>

    <div class="control-buttons">
      <el-button type="primary" @click="start" :disabled="cameraActive">开启摄像头</el-button>
      <el-button type="danger" @click="stop" :disabled="!cameraActive">关闭摄像头</el-button>
      <el-select v-model="selectedDeviceId" placeholder="选择摄像头" style="width: 15rem; margin:0 10px;" :disabled="cameraActive">
        <el-option v-for="cam in cameraList" :key="cam.deviceId" :label="cam.label || `摄像头${camIndex++}`" :value="cam.deviceId"/>
      </el-select>
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
          <div class="info-card prompt-card">
            <h3>跳远提示</h3>
            <div class="prompt-content">
              <div class="prompt-message">{{ statusMessage }}</div>
              <div class="prompt-list">
                <div class="prompt-row">
                  <span>ArUco</span>
                  <strong>{{ arucoStatus }}</strong>
                </div>
                <div class="prompt-row">
                  <span>当前帧</span>
                  <strong>{{ frameLabel }}</strong>
                </div>
                <div class="prompt-row">
                  <span>视频通道</span>
                  <strong>{{ wsStatus.video }}</strong>
                </div>
                <div class="prompt-row">
                  <span>数据通道</span>
                  <strong>{{ wsStatus.data }}</strong>
                </div>
                <div class="prompt-row">
                  <span>流状态</span>
                  <strong>{{ streamStatus }}</strong>
                </div>
              </div>
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
  CALIBRATING: '场景检测中',
  WAITING_READY: '起跳准备中',
  ARMED: '可以开始起跳',
  IN_JUMP: '跳跃中',
  PROCESSING: '成绩计算中',
  RESULT: '测试完成',
  FAILED: '检测失败',
  STOPPED: '已停止',
}

const VOICE_BY_STATE = {
  CALIBRATING: '开始进行场景检测',
  ARMED: '可以开始起跳',
  RESULT: '成绩计算完成',
  FAILED: '检测失败，请重新开始',
}

const VOICE_REPEAT_GAP_MS = 1500

let spokenStates = new Set()
let lastSpokenText = ''
let lastSpokenAt = 0

const cancelSpeech = () => {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}

const speakMessage = (text, { force = false } = {}) => {
  if (!text || !('speechSynthesis' in window)) return
  const now = Date.now()
  if (!force && text === lastSpokenText && now - lastSpokenAt < VOICE_REPEAT_GAP_MS) return
  lastSpokenText = text
  lastSpokenAt = now
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  window.speechSynthesis.speak(utterance)
}

const resetVoiceState = () => {
  spokenStates = new Set()
  lastSpokenText = ''
  lastSpokenAt = 0
  cancelSpeech()
}

const speakForJumpState = (state) => {
  const text = VOICE_BY_STATE[state]
  if (!text || spokenStates.has(state)) return
  spokenStates.add(state)
  speakMessage(text)
}

const router = useRouter()
const username = localStorage.getItem('username')

// 摄像头列表与选中设备
const cameraList = ref([])
const selectedDeviceId = ref('')
let camIndex = 1

const videoElement = ref(null)
const countChartElement = ref(null)
const cameraActive = ref(false)
const jumpState = ref('IDLE')
const statusMessage = ref('点击开启摄像头')
const frameId = ref(null)
const scoreValue = ref(null)
const streamStatus = ref('-')
const wsStatus = ref({ video: '未连接', data: '未连接' })

let webrtc
let countChartInstance = null
let timestamps = []
let scores = []
let mediaStream = null

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

const setWsStatus = (value) => {
  wsStatus.value = { video: value, data: value }
}

const resetRunState = () => {
  cleanupFrame()
  resetVoiceState()
  timestamps = []
  scores = []
  frameId.value = null
  scoreValue.value = null
  streamStatus.value = '-'
  jumpState.value = 'STARTING'
  statusMessage.value = '正在启动跳远检测服务'
  wsStatus.value = { video: '未连接', data: '未连接' }
  initCountChart()
}

const start = async () => {
  if (cameraActive.value) return
  resetRunState()

  try {
    const res = await start_monitor_standjump(username)
    if (res?.data) handleBackendData(res.data)

    cameraActive.value = true
    statusMessage.value = '正在打开摄像头'
    await startRecord(username)
    statusMessage.value = '摄像头已开启，请保持 ArUco 标记可见'
  } catch (err) {
    console.error('启动跳远检测失败:', err)
    statusMessage.value = err?.message || '启动跳远检测失败'
    jumpState.value = 'FAILED'
    speakForJumpState('FAILED')
    cameraActive.value = false
    stopRecord()
    stop_monitor_standjump(username).catch(() => {})
  }
}

const stop = async () => {
  speakMessage('测试已结束', { force: true })
  cameraActive.value = false
  jumpState.value = 'STOPPED'
  statusMessage.value = '正在关闭摄像头和检测服务'

  stopRecord()
  cleanupFrame()

  try {
    await stop_monitor_standjump(username)
    statusMessage.value = '测试已停止'
  } catch (err) {
    console.error('停止跳远检测失败:', err)
    statusMessage.value = err?.message || '停止跳远检测失败'
  }
}

// 加载所有摄像头设备列表
const loadCameraList = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    cameraList.value = devices.filter(d=>d.kind === 'videoinput')
    if(cameraList.value.length) selectedDeviceId.value = cameraList.value[0].deviceId
  } catch (err) {
    console.error('获取摄像头列表失败', err)
  }
}

const openCamera = async () => {
  if (mediaStream) return
  const constraints = {
      video: {
        width: 1280,
        height: 720,
        frameRate: { ideal: 15, max: 20 },
      },
      audio: false
  };

  // 如果选中了摄像头deviceId则指定设备
  if (selectedDeviceId.value) {
    constraints.video.deviceId = { exact: selectedDeviceId.value }
  }
  mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

  await nextTick()
  if (videoElement.value) {
    videoElement.value.srcObject = mediaStream
    await videoElement.value.play().catch((err) => {
      console.warn('本地摄像头预览播放失败:', err)
    })
  }
}

// 建立 WebRTC 与 WebSocket 连接
const createWebRTC = async (uid) => {

  let pc;
  let settled = false

  const ws = new WebSocket(
    `ws://127.0.0.1:8090/ws/webrtc/${uid}/`
  )
  setWsStatus('连接中')

  ws.onopen = async () => {

    await openCamera()

    // 创建 WebRTC RTCPeerConnection 对象
    pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19301' },
        { urls: 'stun:stun.miwifi.com:3477' },
      ]
    })

    // 添加本地视频流
    mediaStream.getTracks().forEach(track => {
      pc.addTrack(track, mediaStream)
      if (track.kind === 'video') {
        track.contentHint = 'detail'
      }
    })

    // 接收后端回传的视频流
    pc.ontrack = (evt) => {
      console.log("收到后端回传视频流", evt);
      videoElement.value.srcObject = evt.streams[0];
    };

    // 接收后端回传的ICE候选
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        ws.send(JSON.stringify({
          type: "ice",
          candidate: e.candidate
        }))
      }
    }

    // 发送 WebRTC offer
    const offer = await pc.createOffer()

    await pc.setLocalDescription(offer)

    ws.send(JSON.stringify({
      type: "offer",
      sdp: offer.sdp
    }))
    settled = true
    setWsStatus('已连接')
  }

  // WebSocket 接收消息
  ws.onmessage = async (event) => {

    const msg = JSON.parse(event.data)

    if (msg.type === "answer") {

      // WebRTC 回传的应答消息
      await pc.setRemoteDescription({
        type: "answer",
        sdp: msg.sdp
      })
    }
    else if (msg.type === "data") {

      // 接收数据并展示
      try {
        handleWsMessage(JSON.parse(msg.data))
      } catch (error) {
        console.error('跳远数据解析失败:', error)
      }
    }
  }

  ws.onclose = () => {
    setWsStatus('已关闭')
  }
  ws.onerror = err => {
    setWsStatus('错误')
    if (!settled) reject(new Error(`${type} WebSocket 连接失败`))
  }

  return { pc, ws }
}

const startRecord = async (uid) => {

  webrtc = await createWebRTC(uid)

}

const stopRecord = () => {
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop())
    mediaStream = null
  }

  setWsStatus('已关闭')
}

const handleWsMessage = (msg) => {
  handleBackendData(msg)
}

const handleBackendData = (data) => {
  if (!data || typeof data !== 'object') return

  if (data.state) jumpState.value = data.state
  if (data.message) statusMessage.value = data.message
  if (data.frame_id !== undefined && data.frame_id !== null) frameId.value = data.frame_id

  updateStreamStatus(data.stream_stats)

  const score = Number(data.score_cm ?? data.result?.score_cm)
  if (Number.isFinite(score)) {
    scoreValue.value = score
    pushScore(score)
  }

  if (data.state) speakForJumpState(data.state)
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

const updateCharts = () => {
  const maxPoints = 100
  const visibleTimestamps = timestamps.slice(-maxPoints)
  const labels = visibleTimestamps.map((ts) => formatElapsed(ts - timestamps[0]))

  if (countChartInstance) {
    countChartInstance.data.labels = labels
    countChartInstance.data.datasets[0].data = scores.slice(-maxPoints)
    countChartInstance.update()
  }
}

const formatElapsed = (elapsedMs) => {
  if (!Number.isFinite(elapsedMs)) return ''
  return `${Math.max(0, elapsedMs / 1000).toFixed(1)}s`
}

const cleanupFrame = () => {
  if (videoElement.value && videoElement.value.src) {
    URL.revokeObjectURL(videoElement.value.src)
    videoElement.value.src = null
  }
}

onMounted(() => {
  initCountChart()
  loadCameraList()
})

onUnmounted(() => {
  cancelSpeech()
  if (countChartInstance) {
    countChartInstance.destroy()
    countChartInstance = null
  }
  stopRecord()
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

.status-content--center {
  align-items: center;
  justify-content: center;
  gap: 28px;
  text-align: center;
}

.status-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
  font-weight: 700;
  color: #303133;
}

.status-heading--large {
  gap: 14px;
  font-size: 34px;
  line-height: 1.2;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #909399;
  flex: 0 0 auto;
}

.status-dot--large {
  width: 16px;
  height: 16px;
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

.status-score {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #909399;
  font-size: 15px;
}

.status-score strong {
  color: #67c23a;
  font-size: 30px;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.prompt-card {
  display: flex;
  flex-direction: column;
}

.prompt-content {
  height: calc(100% - 40px);
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.prompt-message {
  min-height: 48px;
  line-height: 1.5;
  color: #303133;
  font-size: 15px;
  padding: 2px 0 12px;
  overflow-wrap: anywhere;
}

.prompt-list {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
}

.prompt-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 0;
  border-bottom: 1px solid #ebeef5;
  color: #909399;
  font-size: 14px;
}

.prompt-row strong {
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
  object-fit: contain;
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

  .status-heading--large {
    font-size: 26px;
  }

  .status-score strong {
    font-size: 24px;
  }

  .count-display {
    font-size: 32px;
  }
}
</style>

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
      <el-button type="primary" @click="start" :disabled="cameraActive || isStarting || isStopping">开启摄像头</el-button>
      <el-button type="danger" @click="stop" :disabled="(!cameraActive && !isStarting) || isStopping">关闭摄像头</el-button>
      <el-select v-model="selectedDeviceId" placeholder="选择摄像头" style="width: 15rem; margin:0 10px;" :disabled="cameraActive || isStarting || isStopping">
        <el-option v-for="(cam, index) in cameraList" :key="cam.deviceId" :label="cam.label || `摄像头${index + 1}`" :value="cam.deviceId"/>
      </el-select>
      <el-button @click="login">返回</el-button>
      <el-button type="success" @click="downloadOriginVideo" :disabled="cameraActive || !hasRecordedVideo" style="float: right;">下载原视频</el-button>
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
              <div class="prompt-message">{{ faceHint || statusMessage }}</div>
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
import { createJumpConnection } from '@/utils/jumpConnection.js'
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
const cameraList = ref([])
const selectedDeviceId = ref('')
const videoElement = ref(null)
const countChartElement = ref(null)
const cameraActive = ref(false)
const isStarting = ref(false)
const isStopping = ref(false)
const jumpState = ref('IDLE')
const statusMessage = ref('点击开启摄像头')
const faceHint = ref('')
const frameId = ref(null)
const scoreValue = ref(null)
const streamStatus = ref('-')
const wsStatus = ref({ video: '未连接', data: '未连接' })
const hasRecordedVideo = ref(false)
let generation = 0
let connection = null
let mediaStream = null
let mediaRecorder = null
let recordedChunks = []
let recordingType = ''
let pendingStart = null
let finishPromise = null
let remoteStream = null
let modelReady = false
let receivedData = false
let scoredSessions = new Set()
let faceHintTimer = null
let faceKey = ''
let countChartInstance = null
let timestamps = []
let scores = []

const stateLabel = computed(() => STATE_LABELS[jumpState.value] || jumpState.value)
const stateClass = computed(() => `state-${jumpState.value.toLowerCase().replaceAll('_', '-')}`)
const frameLabel = computed(() => frameId.value ?? '-')
const scoreDisplay = computed(() => Number.isFinite(scoreValue.value) ? `${scoreValue.value.toFixed(2)} cm` : '-')
const arucoStatus = computed(() => jumpState.value === 'CALIBRATING' ? '识别中' :
  ['WAITING_READY', 'ARMED', 'IN_JUMP', 'PROCESSING', 'RESULT'].includes(jumpState.value) ? '标定已通过' : '-')
const setWsStatus = value => { wsStatus.value = { video: value, data: value } }
const attachRemote = () => {
  if (modelReady && receivedData && remoteStream && videoElement.value) {
    if (videoElement.value.srcObject === remoteStream) return
    videoElement.value.srcObject = remoteStream
    videoElement.value.play().catch(() => {})
  }
}
const loadCameraList = async () => {
  try {
    cameraList.value = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput')
    if (!selectedDeviceId.value) selectedDeviceId.value = cameraList.value[0]?.deviceId || ''
  } catch (error) { console.warn('摄像头列表读取失败', error) }
}
const startLocalRecording = () => {
  recordedChunks = []
  hasRecordedVideo.value = false
  if (!globalThis.MediaRecorder) return
  recordingType = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    .find(type => MediaRecorder.isTypeSupported(type)) || ''
  try {
    mediaRecorder = new MediaRecorder(mediaStream, recordingType ? { mimeType: recordingType } : {})
    recordingType = mediaRecorder.mimeType
    mediaRecorder.ondataavailable = event => { if (event.data.size > 0) recordedChunks.push(event.data) }
    mediaRecorder.start(1000)
  } catch (error) { mediaRecorder = null; console.warn('本地录像不可用', error) }
}
const stopLocalRecording = () => new Promise(resolve => {
  const recorder = mediaRecorder
  mediaRecorder = null
  if (!recorder || recorder.state === 'inactive') { resolve(); return }
  recorder.onstop = () => { hasRecordedVideo.value = recordedChunks.length > 0; resolve() }
  recorder.onerror = () => resolve()
  recorder.stop()
})
const finish = ({ failed = false, message = '测试已停止', remoteEnded = false } = {}) => {
  if (finishPromise) return finishPromise
  ++generation
  isStopping.value = true
  isStarting.value = false
  cameraActive.value = false
  jumpState.value = failed ? 'FAILED' : 'STOPPED'
  statusMessage.value = message
  faceHint.value = ''
  clearTimeout(faceHintTimer)
  faceKey = ''
  if (failed) speakForJumpState('FAILED')
  const startRequest = pendingStart
  pendingStart = null
  connection?.close()
  connection = null
  remoteStream = null
  modelReady = false
  receivedData = false
  const recordingStopped = stopLocalRecording()
  mediaStream?.getTracks().forEach(track => track.stop())
  mediaStream = null
  if (videoElement.value) videoElement.value.srcObject = null
  setWsStatus('已关闭')
  finishPromise = (async () => {
    await recordingStopped
    // A stop during the HTTP start must stop the session after that request settles.
    if (startRequest) await startRequest.catch(() => {})
    if (!remoteEnded && startRequest) await stop_monitor_standjump(username).catch(error => console.warn('停止后端失败', error))
  })().finally(() => { isStopping.value = false; finishPromise = null })
  return finishPromise
}
const start = async () => {
  if (cameraActive.value || isStarting.value || isStopping.value) return
  const token = ++generation
  isStarting.value = true
  jumpState.value = 'STARTING'
  statusMessage.value = '正在打开摄像头'
  faceHint.value = ''
  scoreValue.value = null
  frameId.value = null
  streamStatus.value = '-'
  scoredSessions = new Set()
  timestamps = []; scores = []
  resetVoiceState()
  initCountChart()
  try {
    if (!username) throw new Error('请先登录后再开始测试')
    const stream = await navigator.mediaDevices.getUserMedia({ video: {
      width: { ideal: 1280, max: 1280 }, height: { ideal: 720, max: 720 },
      frameRate: { ideal: 15, max: 20 },
      ...(selectedDeviceId.value ? { deviceId: { exact: selectedDeviceId.value } } : {}),
    }, audio: false })
    if (token !== generation) { stream.getTracks().forEach(track => track.stop()); return }
    mediaStream = stream
    cameraActive.value = true
    await nextTick()
    if (token !== generation) return
    videoElement.value.srcObject = stream
    await videoElement.value.play()
    if (token !== generation) return
    loadCameraList()
    statusMessage.value = '正在加载跳远模型'
    pendingStart = start_monitor_standjump(username)
    const response = await pendingStart
    if (token !== generation) return
    if (!response?.data?.success) throw new Error(response?.data?.message || '后端启动失败')
    startLocalRecording()
    const socketUrl = new URL(`/ws/webrtc/${encodeURIComponent(username)}/`, import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8090/')
    socketUrl.protocol = socketUrl.protocol === 'https:' ? 'wss:' : 'ws:'
    connection = createJumpConnection({ uid: username, stream, url: socketUrl.href,
      onLoaded: () => { if (token === generation) { modelReady = true; statusMessage.value = '模型已就绪，请保持 ArUco 标记可见'; attachRemote() } },
      onRemoteStream: value => { if (token === generation) { remoteStream = value; attachRemote() } },
      onData: data => { if (token === generation) { receivedData = true; handleBackendData(data); attachRemote() } },
      onStatus: value => { if (token === generation) setWsStatus(value) },
      onError: error => { if (token === generation) finish({ failed: true, message: error.message }) },
      onEnd: () => { if (token === generation) finish({ message: '后端已结束测试', remoteEnded: true }) },
    })
    await connection.ready
    if (token === generation) isStarting.value = false
  } catch (error) {
    if (token === generation) await finish({ failed: true, message: error.message || '启动跳远检测失败' })
  }
}
const stop = () => {
  speakMessage('测试已结束', { force: true })
  return finish()
}
const handleBackendData = data => {
  if (data.state) jumpState.value = data.state
  if (data.message) statusMessage.value = data.message
  if (data.frame_id != null) frameId.value = data.frame_id
  const face = data.face
  if (!face) faceHint.value = ''
  else if (face.state === 'checking') faceHint.value = '正在进行人脸识别，请注视摄像头'
  else if (face.state === 'passed' && faceKey !== 'passed') {
    faceHint.value = face.registered === false ? '未注册学生，已按当前规则放行' : '人脸识别完成'
    clearTimeout(faceHintTimer)
    faceHintTimer = setTimeout(() => { faceHint.value = '' }, 2000)
  }
  else if (['failed', 'timeout'].includes(face.state) && (face.fail_count || 0) >= 3) faceHint.value = '人脸识别未通过，请面向摄像头重试'
  faceKey = face?.state || ''
  const stats = data.stream_stats
  if (stats) streamStatus.value = `收 ${Number(stats.received_fps || 0).toFixed(1)}fps / 析 ${Number(stats.analysis_fps || 0).toFixed(1)}fps (${stats.analyzed_frames ?? 0}/${stats.received_frames ?? 0})`
  const rawScore = data.score_cm ?? data.result?.score_cm
  const score = rawScore == null || rawScore === '' ? NaN : Number(rawScore)
  if (data.state === 'RESULT' && Number.isFinite(score)) {
    scoreValue.value = score
    const key = data.session_id || 'current'
    if (!scoredSessions.has(key)) {
      scoredSessions.add(key); timestamps.push(Date.now()); scores.push(score); updateCharts()
    }
  }
  if (data.state && (data.state !== 'ARMED' || !face || face.ok === true)) speakForJumpState(data.state)
}
const downloadOriginVideo = () => {
  if (!recordedChunks.length) return
  const blob = new Blob(recordedChunks, { type: recordingType || 'video/webm' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `standjump_${Date.now()}.${recordingType.includes('mp4') ? 'mp4' : 'webm'}`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
const login = () => router.push('/student/test')
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
          pointRadius: 4,
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


onMounted(() => { initCountChart(); loadCameraList() })
onUnmounted(() => { cancelSpeech(); countChartInstance?.destroy(); finish() })
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

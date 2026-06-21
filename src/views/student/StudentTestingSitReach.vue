<template>
  <div class="container">
    <div class="camera-chart-container">
      <div class="camera-box">
        <img :src="frameSrc" style="height: 100%;" alt="实时图像" v-if="frameSrc && cameraActive" class="video-img" />

        <div v-else-if="isRegister && cameraActive">
          坐位体前屈检测初始化中...
        </div>

        <div v-else class="camera-tip">
          请点击开始测试
        </div>
      </div>

      <div class="chart-box">
        <h3>实时成绩</h3>
        <div class="info-content">
          <div class="score-display">{{ score }} cm</div>
          <div class="sub-text">当前最大成绩：{{ maxScore }} cm</div>
          <div class="sub-text" :class="cheat ? 'danger' : 'safe'">
            {{ cheat ? '检测到违规：请保持双腿伸直' : '动作状态正常' }}
          </div>
        </div>
      </div>
    </div>

    <div class="control-buttons">
      <el-button type="primary" @click="openCamera" :disabled="cameraActive">开始测试</el-button>
      <el-button type="danger" @click="closeCamera" :disabled="!cameraActive">结束测试</el-button>
      <el-button @click="login">返回</el-button>
    </div>

    <div class="info-container">
      <el-row :gutter="20" class="info-row">
        <el-col :span="8">
          <div class="info-card">
            <h3>成绩记录</h3>
            <div class="info-content">
              <div class="score-display">{{ maxScore }}</div>
              <div class="unit">cm</div>
            </div>
          </div>
        </el-col>

        <el-col :span="8">
          <div class="info-card">
            <h3>成绩变化曲线</h3>
            <div class="chart-section">
              <canvas ref="scoreChartElement"></canvas>
            </div>
          </div>
        </el-col>

        <el-col :span="8">
          <div class="info-card">
            <h3>姿态/违规状态</h3>
            <div class="chart-section">
              <canvas ref="cheatChartElement"></canvas>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import {
  sitreach_start,
  sitreach_stop,
  sitreach_latest_data,
  sitreach_get_img
} from '@/api/user.js'

import { ref, onMounted, onBeforeUnmount } from 'vue'
import Chart from 'chart.js/auto'
import { useRouter } from 'vue-router'

let timer1 = null
let timer2 = null

const scoreChartElement = ref(null)
const cheatChartElement = ref(null)

const cameraActive = ref(false)
const isRegister = ref(false)
const frameSrc = ref(null)

const score = ref(0)
const maxScore = ref(0)
const cheat = ref(false)
const stage = ref('未开始')

const timestamps = ref([])
const scores = ref([])
const maxScores = ref([])
const cheats = ref([])

let scoreChartInstance = null
let cheatChartInstance = null

const router = useRouter()
const username = localStorage.getItem('username')

const openCamera = async () => {
  isRegister.value = true
  cameraActive.value = false

  score.value = 0
  maxScore.value = 0
  cheat.value = false
  stage.value = '初始化中'

  timestamps.value = []
  scores.value = []
  maxScores.value = []
  cheats.value = []

  clearInterval(timer1)
  clearInterval(timer2)

  cleanup()

  if (scoreChartInstance) {
    scoreChartInstance.destroy()
    scoreChartInstance = null
  }

  if (cheatChartInstance) {
    cheatChartInstance.destroy()
    cheatChartInstance = null
  }

  initScoreChart()
  initCheatChart()

  try {
    const res = await sitreach_start({ username })
    console.log('坐位体前屈启动返回：', res)

    cameraActive.value = true
    stage.value = '测试中'

    timer1 = setInterval(fetchFrame, 66)
    timer2 = setInterval(fetchLatestData, 500)
  } catch (err) {
    console.error('坐位体前屈启动失败:', err)
    cameraActive.value = false
    isRegister.value = false
    stage.value = '启动失败'
  }
}

const closeCamera = async () => {
  try {
    const res = await sitreach_stop({ username })
    console.log('坐位体前屈停止返回：', res)
  } catch (err) {
    console.error('坐位体前屈关闭失败:', err)
  }

  clearInterval(timer1)
  clearInterval(timer2)
  timer1 = null
  timer2 = null

  cleanup()

  cameraActive.value = false
  isRegister.value = false
  stage.value = '已结束'
}

const login = async () => {
  router.push('/student/test')
}

const initScoreChart = () => {
  const ctx = scoreChartElement.value.getContext('2d')

  scoreChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: '实时成绩(cm)',
          data: [],
          borderColor: '#2d7acd',
          backgroundColor: 'rgba(45, 122, 205, 0.2)',
          fill: true,
          tension: 0,
          pointRadius: 0
        },
        {
          label: '最大成绩(cm)',
          data: [],
          borderColor: '#67c23a',
          backgroundColor: 'rgba(103, 194, 58, 0.2)',
          fill: false,
          tension: 0,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: '时间'
          }
        },
        y: {
          title: {
            display: true,
            text: '成绩(cm)'
          }
        }
      }
    }
  })
}

const initCheatChart = () => {
  const ctx = cheatChartElement.value.getContext('2d')

  cheatChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: '违规状态',
        data: [],
        borderColor: '#f56c6c',
        backgroundColor: 'rgba(245, 108, 108, 0.2)',
        fill: true,
        tension: 0,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: '时间'
          }
        },
        y: {
          min: 0,
          max: 1,
          ticks: {
            stepSize: 1,
            callback: value => value === 1 ? '违规' : '正常'
          }
        }
      }
    }
  })
}

const updateCharts = () => {
  const startTime = timestamps.value[0]
  const labels = timestamps.value.map(ts => formatTimestamp(ts - startTime))
  const maxPoints = 100

  const showLabels = labels.slice(-maxPoints)
  const showScores = scores.value.slice(-maxPoints)
  const showMaxScores = maxScores.value.slice(-maxPoints)
  const showCheats = cheats.value.slice(-maxPoints)

  if (scoreChartInstance) {
    scoreChartInstance.data.labels = showLabels
    scoreChartInstance.data.datasets[0].data = showScores
    scoreChartInstance.data.datasets[1].data = showMaxScores
    scoreChartInstance.update()
  }

  if (cheatChartInstance) {
    cheatChartInstance.data.labels = showLabels
    cheatChartInstance.data.datasets[0].data = showCheats
    cheatChartInstance.update()
  }
}

const formatTimestamp = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  return [
    // date.getHours().toString().padStart(2, '0'),
    date.getMinutes().toString().padStart(2, '0'),
    date.getSeconds().toString().padStart(2, '0')
  ].join(':')
}

const fetchLatestData = async () => {
  try {
    const res = await sitreach_latest_data({ username })
    console.log('坐位体前屈最新数据：', res.data)

    score.value = res.data.score ?? 0
    maxScore.value = res.data.max_score ?? 0
    cheat.value = res.data.cheat ?? false
    stage.value = res.data.stage ?? stage.value

    scores.value = res.data.scores ?? []
    maxScores.value = res.data.max_scores ?? []
    timestamps.value = res.data.timestamps ?? []
    cheats.value = (res.data.cheats ?? []).map(v => v ? 1 : 0)

    updateCharts()
  } catch (err) {
    console.error('获取坐位体前屈数据失败:', err)
  }
}

const cleanup = () => {
  if (frameSrc.value) {
    URL.revokeObjectURL(frameSrc.value)
    frameSrc.value = null
  }
}

const fetchFrame = async () => {
  try {
    const res = await sitreach_get_img({ username })
    if (frameSrc.value) {
      URL.revokeObjectURL(frameSrc.value)
    }
    frameSrc.value = URL.createObjectURL(res.data)
  } catch (err) {
    console.error('图像流获取失败:', err)
  }
}

onMounted(() => {
  initScoreChart()
  initCheatChart()
})

onBeforeUnmount(() => {
  clearInterval(timer1)
  clearInterval(timer2)
  cleanup()
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
  background: #000;
  position: relative;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #fff;
}

.video-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.camera-tip {
  color: #ffffff;
  font-size: 18px;
}

.chart-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.chart-box h3 {
  margin: 0 0 20px 0;
  color: #409eff;
}

.info-content {
  height: calc(100% - 40px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.score-display {
  font-size: 52px;
  font-weight: bold;
  color: #67c23a;
  margin-bottom: 10px;
}

.unit {
  font-size: 22px;
  color: #606266;
}

.sub-text {
  font-size: 20px;
  margin-top: 12px;
  color: #606266;
}

.safe {
  color: #67c23a;
}

.danger {
  color: #f56c6c;
}

.control-buttons {
  flex: none;
  padding: 12px 20px;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
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

.chart-section {
  flex: 1;
  height: calc(100% - 40px);
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
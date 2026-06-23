<template>
  <div class="container">
    <div class="main-panel">
      <div class="camera-box">
        <img
          :src="frameSrc"
          alt="实时图像"
          v-if="frameSrc && cameraActive"
          class="video-img"
        />

        <div v-else-if="isRegister && cameraActive" class="camera-tip">
          坐位体前屈检测初始化中...
        </div>

        <div v-else class="camera-tip">
          请点击开始测试
        </div>
      </div>

      <div class="score-panel">
        <div class="score-card current-score">
          <div class="score-title">当前成绩</div>
          <div class="score-value">{{ score }}</div>
          <div class="score-unit">cm</div>
        </div>

        <div class="score-card best-score">
          <div class="score-title">最佳成绩</div>
          <div class="score-value">{{ maxScore }}</div>
          <div class="score-unit">cm</div>
        </div>

        <div class="status-card" :class="cheat ? 'danger-card' : 'safe-card'">
          {{ cheat ? '检测到违规：请保持双腿伸直' : '动作状态正常' }}
        </div>

        <div class="stage-card">
          当前阶段：{{ stageText }}
        </div>
      </div>
    </div>

    <div class="control-buttons">
      <el-button type="primary" @click="openCamera" :disabled="cameraActive">
        开始测试
      </el-button>
      <el-button type="danger" @click="closeCamera" :disabled="!cameraActive">
        结束测试
      </el-button>
      <el-button @click="login">
        返回
      </el-button>
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

import { ref, computed, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

let timer1 = null
let timer2 = null

const cameraActive = ref(false)
const isRegister = ref(false)
const frameSrc = ref(null)

const score = ref(0)
const maxScore = ref(0)
const cheat = ref(false)
const stage = ref('未开始')

const router = useRouter()
const username = localStorage.getItem('username') || 'test'

const stageText = computed(() => {
  if (stage.value === 'PREPARING') return '准备阶段'
  if (stage.value === 'MEASURING') return '测量中'
  if (stage.value === 'FINISHED') return '已完成'
  if (stage.value === 'STOPPED') return '已停止'
  if (stage.value === 'NOT_STARTED') return '未开始'
  return stage.value || '未开始'
})

const openCamera = async () => {
  isRegister.value = true
  cameraActive.value = false

  score.value = 0
  maxScore.value = 0
  cheat.value = false
  stage.value = '初始化中'

  clearInterval(timer1)
  clearInterval(timer2)
  cleanup()

  try {
    const res = await sitreach_start({ username })
    console.log('坐位体前屈启动返回：', res)

    cameraActive.value = true
    stage.value = 'PREPARING'

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

const fetchLatestData = async () => {
  try {
    const res = await sitreach_latest_data({ username })
    console.log('坐位体前屈最新数据：', res.data)

    score.value = res.data.score ?? 0
    maxScore.value = res.data.max_score ?? 0
    cheat.value = res.data.cheat ?? false
    stage.value = res.data.stage ?? stage.value
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

.main-panel {
  flex: 1;
  display: flex;
  gap: 20px;
  padding: 20px;
  min-height: 0;
}

.camera-box {
  flex: 1;
  background: #000;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.18);
}

.video-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.camera-tip {
  color: #ffffff;
  font-size: 22px;
}

.score-panel {
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.score-card {
  flex: 1;
  min-height: 150px;
  background: #ffffff;
  border-radius: 14px;
  padding: 24px 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.score-title {
  font-size: 24px;
  font-weight: 600;
  color: #409eff;
  margin-bottom: 16px;
}

.score-value {
  font-size: 64px;
  line-height: 1;
  font-weight: bold;
  color: #67c23a;
}

.score-unit {
  margin-top: 8px;
  font-size: 24px;
  color: #606266;
}

.current-score .score-value {
  color: #409eff;
}

.best-score .score-value {
  color: #67c23a;
}

.status-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 18px;
  font-size: 20px;
  text-align: center;
  font-weight: 600;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.10);
}

.safe-card {
  color: #67c23a;
}

.danger-card {
  color: #f56c6c;
}

.stage-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px;
  font-size: 18px;
  text-align: center;
  color: #606266;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.10);
}

.control-buttons {
  flex: none;
  padding: 14px 24px;
  background: #ffffff;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  gap: 12px;
}

@media (max-width: 900px) {
  .main-panel {
    flex-direction: column;
  }

  .score-panel {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .score-card {
    flex: 1;
    min-width: 220px;
  }
}
</style>
<template>
  <div class="container">
    <!-- 摄像头和图表区域 -->
    <div class="camera-chart-container">
      <div class="camera-box">
        <!-- <video ref="videoElement" class="video-preview" autoplay playsinline></video> -->
        <div v-if="isRegister">摄像头及深度神经网络初始化中...</div>
      </div>
      <div class="chart-box">
        <h3>个数记录</h3>
        <div class="info-content">
          <div class="count-display">{{ count }}</div>

          <div class="record-details">
            <img :src="frameSrc" alt="实时图像" v-if="frameSrc" />
            <!-- 加载状态提示 -->
            <div v-else class="loading">加载中...</div>
            <!-- <p>动作是否计数：--</p>
                <p>肘关节是否打开：--</p>
                <p>是否在画框内：--</p>
                <p>肩背是否着地：--</p>
                <p>动作是否符合要求：--</p> -->
          </div>
        </div>
      </div>
    </div>

    <!-- 控制按钮区域 -->
    <div class="control-buttons">
      <el-button type="primary" @click="openCamera" :disabled="!cameraActive">开启摄像头</el-button>
      <el-button type="danger" @click="closeCamera" :disabled="!cameraActive">关闭摄像头</el-button>
      <el-button @click="login">返回</el-button>
    </div>

    <!-- 信息展示区域 -->
    <div class="info-container">
      <el-row :gutter="20" class="info-row">
        <!-- 学生信息 -->
        <el-col :span="8">
          <div class="info-card">
            <h3>个数记录</h3>
            <div class="info-content">
              <div class="count-display">{{ num }}</div>
              <hr width="30%" color="green" size="3px" align="center" />
              <div class="count-display">{{ num_all }}</div>
            </div>
          </div>
        </el-col>

        <!-- 合格判定 -->
        <el-col :span="8">
          <div class="info-card">
            <div class="chart-section">
              <canvas ref="countChartElement"></canvas>
            </div>
          </div>
        </el-col>

        <!-- 个数记录 -->
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
import {
  start_monitor_situp,
  stop_monitor_situp,
  latest_data_situp,
  get_img,
  userUpdateTestingInfo,
  userUpdateTestingImg,
} from '@/api/user.js'
import { ref, onMounted } from 'vue'
import Chart from 'chart.js/auto'
import { useRouter } from 'vue-router'

let timer1
let timer2

const videoElement = ref(null)
const countChartElement = ref(null)
const angleChartElement = ref(null)
const cameraActive = ref(false)

let num = ref(0)
let num_all = ref(0)
let mediaStream = null
let countChartInstance = null
let angleChartInstance = null
const router = useRouter()

const timestamps = ref([]) // 存储时间戳数组
const angles = ref([]) // 存储角度数组
const nums = ref([]) // 存储个数数组
const frameSrc = ref(null)
const isRegister = ref(false)

const username = localStorage.getItem('username')
// 修改后的 openCamera 函数
const openCamera = async () => {
  // 新增：重置所有数据
  isRegister.value = true
  num.value = 0
  num_all.value = 0
  nums.value = []
  angles.value = []
  timestamps.value = []

  // 清除图表数据
  if (countChartInstance) {
    countChartInstance.destroy()
    countChartInstance = null
  }
  if (angleChartInstance) {
    angleChartInstance.destroy()
    angleChartInstance = null
  }

  // 清除定时器
  clearInterval(timer1)
  clearInterval(timer2)
  timer1 = null
  timer2 = null

  // 清除摄像头画面
  if (videoElement.value && videoElement.value.srcObject) {
    videoElement.value.srcObject.getTracks().forEach((track) => track.stop())
    videoElement.value.srcObject = null
  }

  // 清除图像预览
  cleanup()
  try {
    // 先重置旧数据
    if (countChartInstance) countChartInstance.destroy()
    if (angleChartInstance) angleChartInstance.destroy()

    // 初始化新图表
    initCountChart()
    initAngleChart()

    // 请求摄像头权限
    // const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    // videoElement.value.srcObject = stream

    const res = await start_monitor_situp(username)
    console.log('返回', res)
    cameraActive.value = true

    // 启动定时器
    timer1 = setInterval(fetchFrame, 1000)
    timer2 = setInterval(sendRequest, 1000)
  } catch (err) {
    console.error('启动失败:', err)
    cameraActive.value = false
  }
}

// const closeCamera = async () => {
//   try {
//     const res = await stop_monitor()
//     console.log('返回', res)
//   } catch (err) {
//     // 捕获网络异常或后端返回 >300 的状态码
//     console.error('启动失败:', err)
//   }
// }

const closeCamera = async () => {
  isRegister.value = false
  try {
    const res = await stop_monitor_situp()
    console.log('返回', res)

    // // 新增：重置所有数据
    // num.value = 0
    // num_all.value = 0
    // nums.value = []
    // angles.value = []
    // timestamps.value = []

    // // 清除图表数据
    // if (countChartInstance) {
    //   countChartInstance.destroy()
    //   countChartInstance = null
    // }
    // if (angleChartInstance) {
    //   angleChartInstance.destroy()
    //   angleChartInstance = null
    // }

    // 清除定时器
    clearInterval(timer1)
    clearInterval(timer2)
    timer1 = null
    timer2 = null

    // // 清除摄像头画面
    // if (videoElement.value && videoElement.value.srcObject) {
    //   videoElement.value.srcObject.getTracks().forEach(track => track.stop())
    //   videoElement.value.srcObject = null
    // }

    // // 清除图像预览
    // cleanup()

    cameraActive.value = false
    console.log('所有数据已重置')
  } catch (err) {
    console.error('关闭失败:', err)
  }
}

// 跳转
const login = async () => {
  router.push('/student/test')
}

// 初始化计数图表
const initCountChart = () => {
  const ctx = countChartElement.value.getContext('2d')
  if (countChartInstance) {
    countChartInstance.destroy()
  }
  countChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: timestamps.value.map((ts) => formatTimestamp(ts)),
      datasets: [
        {
          label: '仰卧起坐个数', // 修改数据集标签
          data: nums.value || [], // 改用nums数组作为数据源
          borderColor: '#2d7acd',
          backgroundColor: 'rgba(45, 122, 205, 0.2)',
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: '时间 (HH:mm:ss.SSS)',
          },
          ticks: {
            autoSkip: true,
            maxRotation: 0,
          },
        },
        y: {
          title: {
            display: true,
            text: '个数', // 修改Y轴标题
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              // 去掉角度单位，仅显示数值
              return `${formatTimestamp(timestamps.value[context.dataIndex])}: ${context.raw}`
            },
          },
        },
      },
    },
  })
}

// 初始化角度图表
const initAngleChart = () => {
  const ctx = angleChartElement.value.getContext('2d')
  if (angleChartInstance) {
    angleChartInstance.destroy()
  }

  angleChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: timestamps.value.map((ts) => formatTimestamp(ts)), // 使用格式化后的时间戳
      datasets: [
        {
          label: '起伏角度',
          data: angles.value || [],
          borderColor: '#67c23a',
          backgroundColor: 'rgba(103, 194, 58, 0.2)',
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: '时间 (HH:mm:ss.SSS)', // 修改横轴标题
          },
          ticks: {
            // 自动处理时间间隔
            autoSkip: true,
            maxRotation: 0,
          },
        },
        y: {
          /* y轴配置保持不变 */
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              // 显示完整时间戳和角度
              return `${formatTimestamp(timestamps.value[context.dataIndex])}: ${context.raw}°`
            },
          },
        },
      },
    },
  })
}

const updateCharts = () => {
  if (countChartInstance) {
    // 更新数据集
    countChartInstance.data.labels = timestamps.value.map((ts) => formatTimestamp(ts))
    countChartInstance.data.datasets[0].data = nums.value // 改用nums数组

    const maxPoints = 5 // 控制显示的最大数据点数
    if (countChartInstance.data.labels.length > maxPoints) {
      countChartInstance.data.labels = countChartInstance.data.labels.slice(-maxPoints)
      countChartInstance.data.datasets[0].data =
        countChartInstance.data.datasets[0].data.slice(-maxPoints)
    }
    // 更新图表
    countChartInstance.update()

    if (angleChartInstance) {
      // 更新数据集
      angleChartInstance.data.labels = timestamps.value.map((ts) => formatTimestamp(ts)) // 横轴显示索引
      angleChartInstance.data.datasets[0].data = angles.value

      const maxPoints = 5
      if (angleChartInstance.data.labels.length > maxPoints) {
        angleChartInstance.data.labels = angleChartInstance.data.labels.slice(-maxPoints)
        angleChartInstance.data.datasets[0].data =
          angleChartInstance.data.datasets[0].data.slice(-maxPoints)
      }

      // 更新图表
      angleChartInstance.update()
    }
  }
}

// 时间格式化函数（ISO → HH:mm:ss.SSS）
const formatTimestamp = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  return [
    date.getHours().toString().padStart(2, '0'),
    date.getMinutes().toString().padStart(2, '0'),
    date.getSeconds().toString().padStart(2, '0'),
    date.getMilliseconds().toString().padStart(3, '0'),
  ].join(':')
}

const sendRequest = async () => {
  // 发送请求
  const res = await latest_data_situp({ username })
  console.log('最新数据', res.data)
  num.value = res.data.num
  num_all.value = res.data.num_all
  nums.value = res.data.nums // 存储个数数据
  timestamps.value = res.data.timestamps // 存储时间戳lue)
  angles.value = res.data.angles // 存储角度数据
  console.log('nums:', res.data.num)
  updateCharts() // 触发图表更新
  // 2. 同步到服务器
  await userUpdateTestingInfo({
    username: localStorage.getItem('username'), // 包含用户名
    imageData: res.data, // 将图像数据放在一个明确的键值下
  })
}

// 清理 Blob URL 防止内存泄漏
const cleanup = () => {
  if (frameSrc.value) {
    URL.revokeObjectURL(frameSrc.value)
    frameSrc.value = null
  }
}

// 获取图像
const fetchFrame = async () => {
  try {
    const res = await get_img()
    // 2. 同步到服务器
    // await userUpdateTestingImg({
    //   username: localStorage.getItem('username'), // 包含用户名
    //   imageData: res.data // 将图像数据放在一个明确的键值下
    // })
    if (frameSrc.value) {
      URL.revokeObjectURL(frameSrc.value)
    }
    // 生成新的 Blob URL
    frameSrc.value = URL.createObjectURL(res.data)
  } catch (err) {
    console.error('图像流获取失败:', err)
  }
}

// 模拟计数更新
onMounted(() => {
  initCountChart() // 初始化计数图表
  initAngleChart() // 初始化角度图表
  openCamera()
  // timer1 = setInterval(fetchFrame, 1000) // 根据实际需求调整频率
  // fetchFrame()
  // // timerId = setInterval(fetchFrame, 1000)
  // timer2 = setInterval(() => {
  //   sendRequest();
  // }, 10000);
})
</script>

<style scoped>
.container {
  height: 100%;
  /* height: 10%; */
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  overflow: hidden;
}

.camera-chart-container {
  flex: 1;
  display: flex;
  /* 基础高度，允许随页面调整 */
  min-height: 0;
  /* height: 10%;  */
}

.camera-box {
  flex: 0 0 auto; /* 不再使用flex比例，改为自动大小 */
  width: 60%; /* 设置一个基础宽度，防止过小 */
  aspect-ratio: 16 / 9; /* 强制16:9长宽比 */
  background: #000000;
  position: relative;
  overflow: hidden; /* 防止视频溢出 */
  display: flex; /* ① 启用 Flex 容器 */
  justify-content: center; /* ② 水平居中 */
  align-items: center; /* ③ 垂直居中 */
  color: #ffffff; /* ④ 字体改为白色 */
}

.chart-box {
  flex: 1; /* 图表区域占据剩余空间 */
  display: flex;
  flex-direction: column;
  background: #fff;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.chart-section {
  flex: 1;
  height: 100%; /* 覆盖父容器高度 */
  width: 100%;
  position: relative; /* 为 Canvas 绝对定位做准备 */
}

/* 确保 Canvas 元素填满父容器 */
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
  object-fit: cover; /* 保持视频填充并裁剪以适应容器 */
  display: block;
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
  /* min-height: 200px; */
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
  font-size: 48px;
  font-weight: bold;
  color: #67c23a;
  margin-bottom: 10px;
}

.record-details {
  text-align: left;
  width: 100%;
  height: 100%; /* 确保父容器有高度 */
  display: flex;
  justify-content: center; /* 水平居中 */
  align-items: center; /* 垂直居中 */
}

.record-details img {
  max-width: 300%; /* 防止图片溢出 */
  max-height: 200px; /* 根据实际需求调整 */
  object-fit: contain; /* 保持图片比例 */
}

.record-details p {
  margin: 5px 0;
  color: #606266;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .camera-chart-container {
    height: 50vh; /* 在小屏幕上减小高度 */
  }

  .camera-box {
    width: 50%; /* 在小屏幕上减小摄像头区域宽度 */
    aspect-ratio: 16 / 9; /* 保持16:9长宽比 */
  }
}
</style>

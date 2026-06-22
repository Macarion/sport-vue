<template>
  <div class="container">
    <!-- 摄像头和图表区域 -->
    <div class="camera-chart-container">
      <div class="camera-box">
        <!-- <video ref="videoElement" class="video-preview" autoplay playsinline></video> -->
        <!-- <div v-if="isRegister">摄像头及深度神经网络初始化中...</div> -->
            <img :src="frameSrc" style="height: 100%;" alt="实时图像" v-if="frameSrc" />
            <div v-else class="loading">加载中...</div>
      </div>
      <div class="chart-box">
        <h3>分数</h3>
        <div class="info-content">
          <div class="count-display">{{ num }}</div>
          <div class="record-details">
          </div>
        </div>
      </div>
    </div>

    <!-- 控制按钮区域 -->
    <div class="control-buttons">
      <el-button type="primary" @click="start" :disabled="cameraActive">开启摄像头</el-button>
      <el-button type="danger" @click="stop" :disabled="!cameraActive">关闭摄像头</el-button>
      <el-button @click="login">返回</el-button>
    </div>

    <!-- 信息展示区域 -->
    <div class="info-container">
      <el-row :gutter="20" class="info-row">
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
import {
  start_monitor_pullup,
  stop_monitor_pullup,
  latest_data_pullup,
  get_img,
  userUpdateTestingInfo,
  userUpdateTestingImg,
} from '@/api/user.js'
import { ref, onMounted, onUnmounted } from 'vue'
import Chart from 'chart.js/auto'
import { useRouter } from 'vue-router'

const speakMessage = (text) => {
  if (!('speechSynthesis' in window)) {
    console.warn('当前浏览器不支持语音播报')
    return
  }
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  window.speechSynthesis.speak(utterance)
}

let timer1 = null
let timer2 = null

const videoElement = ref(null)
const countChartElement = ref(null)
const angleChartElement = ref(null)
const cameraActive = ref(false)
let num = ref(0)
let num_all = ref(0)
let count = ref(0) // 用于显示个数
let countChartInstance = null
let angleChartInstance = null
const router = useRouter()

let timestamps = []
let angles = []
let nums = []
const frameSrc = ref(null)
const isRegister = ref(false)
const detectStarted = ref(false)
const cameraStarted = ref(false)

let video_ws
let data_ws
let mediaStream = null;
let mediaRecorder = null;
const SLICE_TIME = 33;

const username = localStorage.getItem('username')
console.log('获取到的username:', username)

const start = async () => {
  
  if (cameraActive.value) return // 防止重复开启
  isRegister.value = true
  num.value = 0
  num_all.value = 0
  count.value = 0
  nums = []
  angles = []
  timestamps = []
  detectStarted.value = false
  cameraStarted.value = false

  // 清除已有定时器
  if (timer1) clearInterval(timer1)
  if (timer2) clearInterval(timer2)
  timer1 = null
  timer2 = null

  // 清除图表数据
  if (countChartInstance) {
    countChartInstance.destroy()
    countChartInstance = null
  }
  if (angleChartInstance) {
    angleChartInstance.destroy()
    angleChartInstance = null
  }

  // 清除图像预览
  cleanup()

  try {
    // 初始化新图表
    initCountChart()
    initAngleChart()

    const res = await start_monitor_pullup(username)
    console.log('启动摄像头返回:', res)

    if (res.status === 200) {
      video_ws, data_ws = startRecord(username, 'pullup')

      cameraActive.value = true
    }

    // // 仅在摄像头开启时启动定时器
    // if (cameraActive.value) {
    //   timer1 = setInterval(() => {
    //     if (cameraActive.value) fetchFrame() // 检查摄像头状态
    //   }, 1000)
    //   timer2 = setInterval(() => {
    //     if (cameraActive.value) sendRequest() // 检查摄像头状态
    //   }, 1000)
    // }
  } catch (err) {
    console.error('启动摄像头失败:', err)
    cameraActive.value = false
    isRegister.value = false
  }
}

const stop = async (shouldStopBackend = true) => {
  speakMessage('测试已结束')
  isRegister.value = false
  cameraActive.value = false // 立即设置摄像头状态为关闭
  detectStarted.value = false
  cameraStarted.value= false
  try {
    if (shouldStopBackend) {
      stopRecord(video_ws)

      const res = await stop_monitor_pullup(username)
      console.log('关闭摄像头返回:', res)
    } else {
      console.log('检测到测试自然结束，跳过主动停止后端进程，等待其完成上传')
    }

    // // 清除定时器
    // if (timer1) clearInterval(timer1)
    // if (timer2) clearInterval(timer2)
    // timer1 = null
    // timer2 = null

    // // 清除图表数据
    // if (countChartInstance) {
    //   countChartInstance.destroy()
    //   countChartInstance = null
    // }
    // if (angleChartInstance) {
    //   angleChartInstance.destroy()
    //   angleChartInstance = null
    // }

    // // 清除图像预览
    // cleanup()

    console.log('所有数据已重置')
  } catch (err) {
    console.error('关闭摄像头失败:', err)
  }
}

// 打开摄像头
const openCamera = async () => {
    mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15, max: 30 }
        },
        audio: false
    });
    // videoElement.value.srcObject = mediaStream;
}
// 建立 WebSocket 连接（修复核心：resolve带出ws实例、变量声明、编码、onclose）
const connectWS = (uid, sport, type) => {
  return new Promise((resolve, reject) => {
    // 参数编码，防止特殊字符破坏ws地址
    const encode = (val) => encodeURIComponent(String(val));
    const params = `${encode(sport)}_${encode(type)}_${encode(uid)}`;
    const WS_URL = `ws://127.0.0.1:8090/ws/${params}/`;

    // 局部声明ws，不污染全局
    const ws = new WebSocket(WS_URL);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      // 关键：把ws实例传给resolve，await后能拿到操作对象
      resolve(ws);
    };

    ws.onerror = (err) => {
      reject(new Error(`WS连接错误: ${err.message}`));
    };

    // 监听关闭，断连抛出异常
    ws.onclose = (event) => {
      console.log(`WS连接关闭: ${event.code} ${event.reason}`);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        const result = msg.result
        console.log(result);

        frameSrc.value = msg.painting;
        num.value = result.score;
        num_all.value = result.num_all;

        timestamps.push(Number(result.timestamp));
        nums.push(Number(result.score));
        angles.push(Number(result.angle));
        updateCharts();

      } catch (error) {
        console.log(`WS消息解析错误: ${error.message}`);
      }
    }
  });
};
// 开启录制，返回video、data两个ws实例
const startRecord = async (uid, sport) => {
  try {
    // 先打开摄像头
    await openCamera();

    // await 现在可以拿到真实WebSocket实例
    video_ws = await connectWS(uid, sport, 'video');
    data_ws = await connectWS(uid, sport, 'data');
    console.log('video_ws实例：', video_ws);

    // 初始化录制器
    mediaRecorder = new MediaRecorder(mediaStream, {
      mimeType: 'video/webm;codecs=vp8'
    });

    // 分片回调发送二进制数据
    mediaRecorder.ondataavailable = async (e) => {
      // 双重判断：有数据 + ws已打开
      if (e.data.size > 0 && video_ws.readyState === WebSocket.OPEN) {
        const buf = await e.data.arrayBuffer();
        video_ws.send(buf);
      }
    };

    // 定时分片录制
    mediaRecorder.start(SLICE_TIME);

    // 返回包含两个ws的对象，解决逗号表达式只返回最后一个的bug
    return { video_ws, data_ws };
  } catch (err) {
    console.error('录制启动失败：', err);
    // 出错自动释放摄像头资源兜底
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
    mediaRecorder = null;
    throw err; // 抛出错误让外部捕获
  }
};

// 停止录制，支持同时关闭video/data ws
const stopRecord = (wsObj) => {
  // 兼容传入 {video_ws, data_ws} 对象
  const { video_ws, data_ws } = wsObj || {};

  // 停止录制
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  mediaRecorder = null;

  // 关闭摄像头轨道
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }

  // 安全关闭所有websocket
  const closeWS = (ws) => {
    if (ws && [WebSocket.OPEN, WebSocket.CONNECTING].includes(ws.readyState)) {
      ws.close();
    }
  };
  closeWS(video_ws);
  console.log('close video_ws', video_ws);
};

const login = async () => {
  router.push('/student/test')
}

const initCountChart = () => {
  const ctx = countChartElement.value.getContext('2d')
  if (countChartInstance) {
    countChartInstance.destroy()
  }
  countChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: timestamps.map((ts) => formatTimestamp(ts)),
      datasets: [
        {
          label: '引体向上个数',
          data: [],
          borderColor: '#2d7acd',
          backgroundColor: 'rgba(45, 122, 205, 0.2)',
          fill: true,
          tension: 0,
          pointRadius: 0
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
            text: '时间',
          },
          ticks: {
            autoSkip: true,
            maxRotation: 0,
          },
        },
        y: {
          title: {
            display: true,
            text: '个数',
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${formatTimestamp(timestamps[context.dataIndex])}: ${context.raw}`
            },
          },
        },
      },
    },
  })
}

const initAngleChart = () => {
  const ctx = angleChartElement.value.getContext('2d')
  if (angleChartInstance) {
    angleChartInstance.destroy()
  }
  angleChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: timestamps.map((ts) => formatTimestamp(ts)),
      datasets: [
        {
          label: '肘关节打开角度',
          data: [],
          borderColor: '#67c23a',
          backgroundColor: 'rgba(103, 194, 58, 0.2)',
          fill: true,
          tension: 0,
          pointRadius: 0
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
            text: '时间',
          },
          ticks: {
            autoSkip: true,
            maxRotation: 0,
          },
        },
        y: {},
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${formatTimestamp(timestamps[context.dataIndex])}: ${context.raw}°`
            },
          },
        },
      },
    },
  })
}

const updateCharts = () => {
  if (countChartInstance) {
    countChartInstance.data.labels = timestamps.map((ts) => formatTimestamp(ts - timestamps[0]))
    countChartInstance.data.datasets[0].data = nums
    const maxPoints = 100
    if (countChartInstance.data.labels.length > maxPoints) {
      countChartInstance.data.labels = countChartInstance.data.labels.slice(-maxPoints)
      countChartInstance.data.datasets[0].data =
        countChartInstance.data.datasets[0].data.slice(-maxPoints)
    }
    countChartInstance.update()
  }
  if (angleChartInstance) {
    angleChartInstance.data.labels = timestamps.map((ts) => formatTimestamp(ts - timestamps[0]))
    angleChartInstance.data.datasets[0].data = angles
    const maxPoints = 100
    if (angleChartInstance.data.labels.length > maxPoints) {
      angleChartInstance.data.labels = angleChartInstance.data.labels.slice(-maxPoints)
      angleChartInstance.data.datasets[0].data =
        angleChartInstance.data.datasets[0].data.slice(-maxPoints)
    }
    angleChartInstance.update()
  }
}

const formatTimestamp = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return [
    // date.getHours().toString().padStart(2, '0'),
    date.getMinutes().toString().padStart(2, '0'),
    date.getSeconds().toString().padStart(2, '0'),
    // date.getMilliseconds().toString().padStart(3, '0'),
  ].join(':')
}

const sendRequest = async () => {
  if (!cameraActive.value) return // 仅在摄像头开启时发送请求
  try {
    const res = await latest_data_pullup({ username })
    const data = res.data || {} 
    console.log('最新数据', res.data)
    if (data.finished && cameraStarted.value && detectStarted.value) {
      await closeCamera(false)
      return
    }
    if(data.readytohang &&!cameraStarted.value){
      speakMessage('请上杠悬挂')
      cameraStarted.value = true
    }
    if (data.detectsuccess && !detectStarted.value) {
      speakMessage('测试开始')
      detectStarted.value = true
    }
    num.value = res.data.num
    num_all.value = res.data.num_all
    count.value = res.data.num
    nums.value = res.data.nums
    timestamps.value = res.data.timestamps
    angles.value = res.data.angles
    updateCharts()
  } catch (err) {
    console.error('获取最新数据失败:', err)
  }
}

const cleanup = () => {
  if (frameSrc.value) {
    URL.revokeObjectURL(frameSrc.value)
    frameSrc.value = null
  }
}

const fetchFrame = async () => {
  if (!cameraActive.value) return // 仅在摄像头开启时获取图像
  try {
    const res = await get_img()
    if (frameSrc.value) {
      URL.revokeObjectURL(frameSrc.value)
    }
    frameSrc.value = URL.createObjectURL(res.data)
  } catch (err) {
    console.error('图像流获取失败:', err)
  }
}

onUnmounted(() => {
  if (timer1) clearInterval(timer1)
  if (timer2) clearInterval(timer2)
  timer1 = null
  timer2 = null
  if (countChartInstance) {
    countChartInstance.destroy()
    countChartInstance = null
  }
  if (angleChartInstance) {
    angleChartInstance.destroy()
    angleChartInstance = null
  }
  cleanup()
  if (cameraActive.value) {
    cameraActive.value = false
    stop_monitor_pullup(username).catch((err) => console.error('停止监控失败:', err))
  }
})

onMounted(() => {
  initCountChart()
  initAngleChart()
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
  font-size: 48px;
  font-weight: bold;
  color: #67c23a;
  margin-bottom: 10px;
}

.record-details {
  text-align: left;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.record-details img {
  max-width: 300%;
  max-height: 200px;
  object-fit: contain;
}

.record-details p {
  margin: 5px 0;
  color: #606266;
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

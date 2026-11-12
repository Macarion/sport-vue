import { ref } from 'vue'

// 视频采集参数
const MEDIA_CONSTRAINTS = {
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 15, max: 30 },
  },
  audio: false,
}

const WS_URL = 'ws://127.0.0.1:8090/ws/webrtc'
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19301' },
  { urls: 'stun:stun.miwifi.com:3477' },
]

// WebRTC 连接 + 本地摄像头 + 本地录像/下载
// - connect(uid): 建 WS、开摄像头、录制、SDP offer/answer、接收后端回传流
// - 消息按类型分发给回调：onData / onLoaded / onError / onEnd
// - stopMedia: 停录制与本地流（stop 前半段）
// - ws 由服务端负责关闭（客户端不主动关，否则收不到 end、成绩不播报）；
//   onclose 不关 pc——远端 track 保持 live，测试结束后画面冻结在最后一帧（作弊分析用）。
//   pc 在下次 connect 的 onopen 或 dispose()（组件卸载）时释放
export function useTestingWebRTC({ videoRef, onData, onLoaded, onError, onEnd }) {
  const cameraList = ref([])
  const selectedDeviceId = ref('')
  const hasRecordedVideo = ref(false)
  // 自动保存视频（默认关）：测试结束停录制时自动下载
  const autoSave = ref(false)

  let ws = null
  let pc = null
  let mediaStream = null
  let mediaRecorder = null
  let recordedChunks = []
  // 后端回传流：ontrack 只存不挂；loaded:true 与轨道双条件齐了才切（修模型加载期黑屏）
  let remoteStream = null
  let remoteReady = false

  const attachRemoteIfNeeded = () => {
    if (!remoteReady || !remoteStream || !videoRef.value) return
    if (videoRef.value.srcObject === remoteStream) return // 幂等：同一流不重复挂
    videoRef.value.srcObject = remoteStream
    console.log('画面已切换为后端处理流')
  }

  // 加载所有摄像头设备列表
  const loadCameraList = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      cameraList.value = devices.filter((d) => d.kind === 'videoinput')
      if (cameraList.value.length) selectedDeviceId.value = cameraList.value[0].deviceId
    } catch (err) {
      console.error('获取摄像头列表失败', err)
    }
  }

  // 打开摄像头
  const openCamera = async () => {
    if (selectedDeviceId.value) {
      MEDIA_CONSTRAINTS.video.deviceId = { exact: selectedDeviceId.value }
    }
    mediaStream = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS)
    videoRef.value.srcObject = mediaStream
  }

  const startLocalRecording = () => {
    recordedChunks = []
    mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'video/mp4' })
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > -1) recordedChunks.push(e.data)
    }
    mediaRecorder.start()
  }

  const stopLocalRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      const recorder = mediaRecorder
      // stop 后先触发 dataavailable（收尾数据块）再触发 stop，此处再下载不丢帧
      recorder.onstop = () => {
        if (autoSave.value && recordedChunks.length) downloadOriginVideo()
      }
      recorder.stop()
      hasRecordedVideo.value = true // 仅真实录过才可下载
    }
  }

  // 下载原视频
  const downloadOriginVideo = () => {
    if (!recordedChunks.length) return
    const now = new Date()
    const p2 = (n) => String(n).padStart(2, '0')
    const fileName = `situp_${now.getFullYear()}${p2(now.getMonth() + 1)}${p2(now.getDate())}_${p2(
      now.getHours(),
    )}${p2(now.getMinutes())}${p2(now.getSeconds())}`

    const blob = new Blob(recordedChunks, { type: 'video/mp4' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileName}.mp4`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 新会话复位：上一会话的录像不可再下载
  const resetRecording = () => {
    hasRecordedVideo.value = false
    recordedChunks = []
  }

  const sendConfig = (payload) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload))
    }
  }

  // 建立 WebRTC 与 WebSocket 连接
  const connect = async (uid) => {
    const socket = new WebSocket(`${WS_URL}/${uid}/`)
    ws = socket

    socket.onopen = async () => {
      // 每次连接重置远端流状态：本次 ready 前始终显示本地采集画面
      remoteStream = null
      remoteReady = false

      await openCamera()
      // 上一会话残留的 pc 在此释放：画面已切到本地预览，关旧 pc 不产生黑屏间隙
      if (pc) pc.close()
      startLocalRecording()

      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

      // 添加本地视频流
      mediaStream.getTracks().forEach((track) => {
        pc.addTrack(track, mediaStream)
        if (track.kind === 'video') {
          track.contentHint = 'detail'
        }
      })

      // 接收后端回传的视频流：只存不挂，双条件齐了才切（本地预览保留到 ready）
      pc.ontrack = (evt) => {
        console.log('收到后端回传视频流', evt)
        remoteStream = evt.streams[0] || new MediaStream([evt.track])
        attachRemoteIfNeeded()
      }

      // 接收后端回传的ICE候选
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.send(JSON.stringify({ type: 'ice', candidate: e.candidate }))
        }
      }

      // 发送 WebRTC offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      socket.send(JSON.stringify({ type: 'offer', sdp: offer.sdp }))
    }

    // WebSocket 接收消息
    socket.onmessage = async (event) => {
      const msg = JSON.parse(event.data)

      if (msg.type === 'answer') {
        await pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp })
      } else if (msg.type === 'data') {
        onData(msg.data)
      } else if (msg.type === 'loaded') {
        // 模型加载完成通知；人脸状态随帧数据（result.face）承载
        if (msg.value === true) {
          onLoaded()
          remoteReady = true
          attachRemoteIfNeeded() // 轨道先到则此刻切；未到则等 ontrack 再查
        }
      } else if (msg.type === 'error') {
        // 后端用户进程报错（随后会有 end 消息收尾）
        console.error('后端处理错误:', msg.message)
        onError(msg.message)
      } else if (msg.type === 'end') {
        console.log('测试结束')
        onEnd()
      }
    }

    socket.onclose = () => {
      console.log('RTC WS连接关闭')
      // 不在这里关 pc：远端 track 保持 live，测试结束后画面冻结在最后一帧（作弊分析用）。
      // pc 由下次 connect 的 onopen 或 dispose() 释放；ws 由服务端关闭
      if (socket === ws) ws = null
    }
    socket.onerror = (err) => console.error('WebSocket错误', err)
  }

  // 停止录制与本地采集
  const stopMedia = () => {
    stopLocalRecording()
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop())
      mediaStream = null
    }
  }

  // 组件卸载时释放 pc（此时组件销毁，无需再冻结画面）；ws 由服务端关闭
  const dispose = () => {
    if (pc) {
      pc.close()
      pc = null
    }
  }

  return {
    cameraList,
    selectedDeviceId,
    hasRecordedVideo,
    autoSave,
    loadCameraList,
    connect,
    stopMedia,
    dispose,
    sendConfig,
    downloadOriginVideo,
    resetRecording,
  }
}

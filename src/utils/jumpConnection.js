// Own one WebRTC session. No page globals: closing invalidates every async callback.
export function createJumpConnection({
  uid, stream, onData = () => {}, onLoaded = () => {}, onRemoteStream = () => {},
  onError = () => {}, onEnd = () => {}, onStatus = () => {},
  url = `ws://127.0.0.1:8090/ws/webrtc/${encodeURIComponent(uid)}/`,
  WebSocketClass = globalThis.WebSocket, PeerClass = globalThis.RTCPeerConnection,
  connectionTimeout = 30_000, modelTimeout = 120_000,
}) {
  const pc = new PeerClass({ iceServers: [{ urls: 'stun:stun.l.google.com:19301' }] })
  let ws
  try { ws = new WebSocketClass(url) } catch (error) { pc.close(); throw error }
  let closed = false
  let settled = false
  let modelTimer
  let resolveReady, rejectReady
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject })
  // The caller may still be finishing its synchronous setup when an error arrives.
  ready.catch(() => {})
  const connectionTimer = setTimeout(() => fail(new Error('视频连接超时，请重新开始')), connectionTimeout)
  function close() {
    if (closed) return
    closed = true
    clearTimeout(connectionTimer)
    clearTimeout(modelTimer)
    if (!settled) { settled = true; rejectReady(new Error('视频连接已取消')) }
    ws.close()
    pc.close()
  }
  function fail(error) {
    if (closed) return
    if (!settled) { settled = true; rejectReady(error) }
    close()
    onError(error)
  }
  pc.onconnectionstatechange = () => {
    if (closed) return
    if (pc.connectionState === 'connected') {
      clearTimeout(connectionTimer)
      if (!settled) { settled = true; resolveReady() }
      onStatus('已连接')
    } else if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
      fail(new Error('视频连接已中断，请重新开始'))
    }
  }
  pc.ontrack = (event) => {
    if (!closed) onRemoteStream(event.streams[0] || new MediaStream([event.track]))
  }
  pc.onicecandidate = (event) => {
    if (!closed && event.candidate && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'ice', candidate: event.candidate }))
    }
  }
  ws.onopen = async () => {
    if (closed) return
    onStatus('连接中')
    modelTimer = setTimeout(() => fail(new Error('模型加载超时，请检查后端日志')), modelTimeout)
    try {
      stream.getTracks().forEach(track => { pc.addTrack(track, stream); track.contentHint = 'detail' })
      const offer = await pc.createOffer()
      if (closed) return
      await pc.setLocalDescription(offer)
      if (!closed) ws.send(JSON.stringify({ type: 'offer', sdp: pc.localDescription.sdp }))
    } catch (error) { fail(error) }
  }
  ws.onmessage = async event => {
    if (closed) return
    try {
      const message = JSON.parse(event.data)
      if (message.type === 'answer') {
        await pc.setRemoteDescription({ type: 'answer', sdp: message.sdp })
      } else if (message.type === 'loaded') {
        if (message.value !== true) throw new Error('跳远模型加载失败，请检查后端资源')
        clearTimeout(modelTimer)
        onLoaded()
      } else if (message.type === 'data') {
        if (!message.data || typeof message.data !== 'object') throw new Error('跳远结果格式错误')
        onData(message.data)
      } else if (message.type === 'error') {
        throw new Error(message.message || '后端处理失败')
      } else if (message.type === 'end') {
        close()
        onEnd()
      }
    } catch (error) { fail(error) }
  }
  ws.onerror = () => fail(new Error('WebSocket 连接失败'))
  ws.onclose = () => fail(new Error('后端连接已关闭'))
  return { ready, close, pc, ws }
}

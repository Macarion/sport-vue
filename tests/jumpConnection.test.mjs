import test from 'node:test'
import assert from 'node:assert/strict'
import { createJumpConnection } from '../src/utils/jumpConnection.js'

class Socket {
  constructor() { this.readyState = 1; this.sent = [] }
  send(value) { this.sent.push(JSON.parse(value)) }
  close() { this.closed = true; this.onclose?.() }
  message(value) { return this.onmessage({ data: JSON.stringify(value) }) }
}
class Peer {
  addTrack() {}
  async createOffer() { return { type: 'offer', sdp: 'offer' } }
  async setLocalDescription(value) { this.localDescription = value }
  async setRemoteDescription(value) { this.remoteDescription = value }
  close() { this.closed = true; this.connectionState = 'closed'; this.onconnectionstatechange?.() }
  connected() { this.connectionState = 'connected'; this.onconnectionstatechange() }
}
function connect(options = {}) {
  return createJumpConnection({ uid: 'a', stream: { getTracks: () => [{ kind: 'video' }] },
    WebSocketClass: Socket, PeerClass: Peer, ...options })
}
test('object results, readiness and track callbacks use the actual peer', async () => {
  let loaded = false, data, remote
  const connection = connect({ onLoaded: () => { loaded = true }, onData: value => { data = value }, onRemoteStream: value => { remote = value } })
  try {
    await connection.ws.onopen()
    assert.equal(connection.ws.sent[0].type, 'offer')
    await connection.ws.message({ type: 'answer', sdp: 'answer' })
    connection.pc.connected(); await connection.ready
    await connection.ws.message({ type: 'loaded', value: true })
    await connection.ws.message({ type: 'data', data: { state: 'RESULT', score_cm: 123 } })
    connection.pc.ontrack({ streams: ['remote'] })
    assert.equal(loaded, true); assert.equal(data.score_cm, 123); assert.equal(remote, 'remote')
  } finally { connection.close() }
})
test('close rejects pending readiness and suppresses stale messages', async () => {
  let calls = 0
  const connection = connect({ onData: () => calls++, onError: () => calls++ })
  connection.close(); connection.close()
  await assert.rejects(connection.ready, /取消/)
  await connection.ws.message({ type: 'data', data: {} })
  assert.equal(calls, 0); assert.equal(connection.pc.closed, true)
})
test('backend errors close both transports exactly once', async () => {
  let calls = 0
  const connection = connect({ onError: () => calls++ })
  await connection.ws.message({ type: 'error', message: 'failed' })
  await assert.rejects(connection.ready, /failed/)
  assert.equal(calls, 1); assert.equal(connection.ws.closed, true); assert.equal(connection.pc.closed, true)
})
test('connection and model timeouts are independent', async () => {
  const first = connect({ connectionTimeout: 5 })
  await assert.rejects(first.ready, /视频连接超时/)
  let error
  const second = connect({ modelTimeout: 5, onError: value => { error = value } })
  await second.ws.onopen(); second.pc.connected(); await second.ready
  await new Promise(resolve => setTimeout(resolve, 20))
  assert.match(error.message, /模型加载超时/); assert.equal(second.pc.closed, true)
})
test('end releases resources and does not report a transport error', async () => {
  let ended = 0, errors = 0
  const connection = connect({ onEnd: () => ended++, onError: () => errors++ })
  connection.pc.connected(); await connection.ready
  await connection.ws.message({ type: 'end' })
  assert.equal(ended, 1); assert.equal(errors, 0); assert.equal(connection.pc.closed, true)
})

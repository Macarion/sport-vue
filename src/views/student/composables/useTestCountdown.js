import { ref } from 'vue'

// 两段倒计时：
// 1. 准备读秒（prepareCountdown）：共 6 拍，前 3 拍显示“准备”，后 3 拍 3/2/1 与语音同步，
//    归零时显示“开始”、回调 onStartTest（由组件记录 startTime 并通知后端开始计分），
//    1 秒后进入正式倒计时。
// 2. 正式测试倒计时（startTestCountdown）：COUNTDOWN_TOTAL_MS 递减，归零回调 onTimeout。
const COUNTDOWN_TOTAL_MS = 60_000
const PREPARE_TOTAL_BEATS = 6
const ENTER_TEST_DELAY_MS = 1000

export function useTestCountdown({ speak, onStartTest, onTimeout }) {
  const leftCountdownMs = ref(COUNTDOWN_TOTAL_MS)
  const isCountingDown = ref(false)
  const countdownDisplay = ref('')

  let prepareTimer = null // 读秒 interval
  let enterTestTimer = null // “开始”到正式倒计时之间的延迟 timeout
  let testTimer = null // 正式倒计时 interval
  let prepared = false // 防止重复读秒

  const clearTimers = () => {
    clearInterval(prepareTimer)
    prepareTimer = null
    clearTimeout(enterTestTimer)
    enterTestTimer = null
    clearInterval(testTimer)
    testTimer = null
  }

  const displayForBeat = (beat) => (beat > 3 ? '准备' : String(beat))

  const startTestCountdown = () => {
    clearInterval(testTimer)
    leftCountdownMs.value = COUNTDOWN_TOTAL_MS
    testTimer = setInterval(() => {
      leftCountdownMs.value -= 1000
      if (leftCountdownMs.value <= 0) {
        clearInterval(testTimer)
        testTimer = null
        leftCountdownMs.value = 0
        onTimeout()
      }
    }, 1000)
  }

  const prepareCountdown = () => {
    if (prepared) return
    prepared = true
    isCountingDown.value = true

    speak('检测完成，准备开始')

    let beat = PREPARE_TOTAL_BEATS
    countdownDisplay.value = displayForBeat(beat)

    prepareTimer = setInterval(() => {
      beat--
      if (beat > 0) {
        countdownDisplay.value = displayForBeat(beat)
        if (beat <= 3) speak(String(beat))
      } else {
        clearInterval(prepareTimer)
        prepareTimer = null
        countdownDisplay.value = '开始'
        speak('开始')
        onStartTest()
        enterTestTimer = setTimeout(() => {
          enterTestTimer = null
          isCountingDown.value = false
          countdownDisplay.value = ''
          startTestCountdown()
        }, ENTER_TEST_DELAY_MS)
      }
    }, 1000)
  }

  // 停止测试（保留剩余时间显示，与原 stop() 行为一致）
  const cancel = () => {
    clearTimers()
    prepared = false
    isCountingDown.value = false
    countdownDisplay.value = ''
  }

  // 新会话复位：清定时器 + 剩余时间回到满值
  const reset = () => {
    cancel()
    leftCountdownMs.value = COUNTDOWN_TOTAL_MS
  }

  // 组件卸载：仅清定时器
  const dispose = () => {
    clearTimers()
  }

  const formatCountdown = (ms) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000))
    const min = String(Math.floor(totalSec / 60)).padStart(2, '0')
    const sec = String(totalSec % 60).padStart(2, '0')
    return `${min}:${sec}`
  }

  return {
    leftCountdownMs,
    isCountingDown,
    countdownDisplay,
    formatCountdown,
    prepareCountdown,
    cancel,
    reset,
    dispose,
  }
}

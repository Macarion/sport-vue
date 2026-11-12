// 语音播报与重复提醒
// - speak: 立即播报，interrupt=true 时先取消当前播报
// - remind: 持续提醒（如“请平躺”），同文本按 REPEAT_INTERVAL_MS 节流，
//   不打断其它播报（与原 speakMessage(text, false) 语义一致），文本变化则立即重试
// - reset: 新测试会话时清空提醒节流状态
const REPEAT_INTERVAL_MS = 4000

export function useVoice() {
  const supported = () => 'speechSynthesis' in window

  const speak = (text, interrupt = true) => {
    if (!supported()) {
      console.warn('当前浏览器不支持语音播报')
      return false
    }
    if (interrupt) {
      window.speechSynthesis.cancel()
    } else if (window.speechSynthesis.speaking) {
      return false
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    window.speechSynthesis.speak(utterance)
    return true
  }

  let lastRemindText = ''
  let lastRemindAt = 0

  const remind = (text) => {
    if (text !== lastRemindText) {
      lastRemindText = text
      lastRemindAt = 0 // 新文本：下一次机会立即尝试
    }
    if (Date.now() - lastRemindAt >= REPEAT_INTERVAL_MS) {
      if (speak(text, false)) {
        lastRemindAt = Date.now()
      }
    }
  }

  const reset = () => {
    lastRemindText = ''
    lastRemindAt = 0
  }

  return { speak, remind, reset }
}

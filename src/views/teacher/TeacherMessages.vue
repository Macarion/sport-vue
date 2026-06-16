<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import {
  fetchTeacherMessageThreads,
  fetchTeacherMessages,
  sendTeacherMessage,
} from '@/api/user.js'

const loadingThreads = ref(false)
const loadingMessages = ref(false)
const sending = ref(false)

const threads = ref([])
const currentStudentId = ref('')
const currentStudentName = ref('')
const currentClassName = ref('')
const messages = ref([])
const inputContent = ref('')

const scrollContainerRef = ref(null)

const loadThreads = async () => {
  loadingThreads.value = true
  try {
    const res = await fetchTeacherMessageThreads()
    const data = res.data || {}
    threads.value = Array.isArray(data.threads) ? data.threads : []
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('加载学生会话列表失败:', e)
    ElMessage.error('加载学生会话列表失败，请稍后重试')
  } finally {
    loadingThreads.value = false
  }
}

const selectThread = async (thread) => {
  if (!thread) return
  if (loadingMessages.value) return
  currentStudentId.value = thread.studentId
  currentStudentName.value = thread.studentName
  currentClassName.value = thread.className
  await loadMessages()
}

const loadMessages = async () => {
  const sid = currentStudentId.value
  if (!sid) return
  loadingMessages.value = true
  try {
    const res = await fetchTeacherMessages(sid)
    const data = res.data || {}
    messages.value = Array.isArray(data.messages) ? data.messages : []
    await nextTick()
    if (scrollContainerRef.value) {
      scrollContainerRef.value.scrollTop = scrollContainerRef.value.scrollHeight
    }
    // 同步更新 thread 的未读数
    threads.value = threads.value.map((t) =>
      t.studentId === sid ? { ...t, unreadCount: 0 } : t,
    )
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('加载消息失败:', e)
    ElMessage.error('加载消息失败，请稍后重试')
  } finally {
    loadingMessages.value = false
  }
}

const handleSend = async () => {
  const sid = currentStudentId.value
  const content = (inputContent.value || '').trim()
  if (!sid) {
    ElMessage.warning('请先选择一名学生')
    return
  }
  if (!content) {
    ElMessage.warning('请输入要发送的内容')
    return
  }
  if (sending.value) return

  sending.value = true
  try {
    const res = await sendTeacherMessage({ studentId: sid, content })
    const data = res.data || {}
    const msg = data.message
    if (msg) {
      messages.value.push(msg)
      inputContent.value = ''
      await nextTick()
      if (scrollContainerRef.value) {
        scrollContainerRef.value.scrollTop = scrollContainerRef.value.scrollHeight
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('发送消息失败:', e)
    const message = e?.response?.data?.error || '发送消息失败，请稍后重试'
    ElMessage.error(message)
  } finally {
    sending.value = false
  }
}

onMounted(async () => {
  await loadThreads()
  if (threads.value.length > 0) {
    await selectThread(threads.value[0])
  }
})
</script>

<template>
  <div class="page">
    <el-card class="header-card" shadow="never">
      <div class="header-main">
        <div>
          <div class="title">学生留言</div>
          <div class="sub-title">
            左侧是当前负责班级中已有消息往来的学生列表，右侧是与选中学生的详细对话。
          </div>
        </div>
      </div>
    </el-card>

    <el-card class="content-card" shadow="never">
      <div class="layout">
        <div class="thread-list" v-loading="loadingThreads">
          <div class="thread-title">学生会话</div>
          <div v-if="!threads.length && !loadingThreads" class="empty-tip">
            暂无学生留言，当学生给您发送第一条消息后会出现在这里。
          </div>
          <el-scrollbar v-else height="360px">
            <div
              v-for="t in threads"
              :key="t.studentId"
              class="thread-item"
              :class="{ active: t.studentId === currentStudentId }"
              @click="selectThread(t)"
            >
              <div class="thread-main">
                <div class="thread-name">
                  {{ t.studentName || t.studentId }}
                </div>
                <div class="thread-class">
                  {{ t.className || '未知班级' }}
                </div>
              </div>
              <div class="thread-extra">
                <el-badge
                  v-if="t.unreadCount > 0"
                  :value="t.unreadCount"
                  class="badge"
                />
                <div class="thread-preview" v-if="t.lastMessage">
                  {{ t.lastMessage.content }}
                </div>
              </div>
            </div>
          </el-scrollbar>
        </div>

        <div class="chat-panel">
          <div class="chat-header">
            <div v-if="currentStudentId">
              <div class="chat-title">
                学生：{{ currentStudentName || currentStudentId }}
              </div>
              <div class="chat-sub">
                班级：{{ currentClassName || '未知班级' }}
              </div>
            </div>
            <div v-else class="chat-empty-header">
              请选择左侧的一名学生查看消息
            </div>
          </div>

          <div
            ref="scrollContainerRef"
            class="messages"
            v-loading="loadingMessages"
          >
            <div v-if="!messages.length && !loadingMessages" class="empty-tip">
              暂无消息记录，可以在下方输入框中给该学生发送第一条回复。
            </div>
            <template v-else>
              <div
                v-for="msg in messages"
                :key="msg.id"
                class="message-row"
                :class="msg.sender === 'teacher' ? 'from-teacher' : 'from-student'"
              >
                <div class="avatar">
                  <span v-if="msg.sender === 'teacher'">师</span>
                  <span v-else>生</span>
                </div>
                <div class="bubble">
                  <div class="content">
                    {{ msg.content }}
                  </div>
                  <div class="meta">
                    <span>{{ msg.sender === 'teacher' ? '老师' : '学生' }}</span>
                    <span v-if="msg.created_at"> · {{ msg.created_at }}</span>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <div class="input-area">
            <el-input
              v-model="inputContent"
              :rows="3"
              type="textarea"
              placeholder="请输入要发送给该学生的回复"
            />
            <div class="input-actions">
              <el-button
                type="primary"
                :loading="sending"
                @click="handleSend"
              >
                发送
              </el-button>
              <el-button
                text
                type="info"
                @click="loadMessages"
                :disabled="!currentStudentId || loadingMessages || sending"
              >
                刷新
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.header-card {
  border-radius: 10px;
}

.title {
  font-size: 18px;
  font-weight: 600;
}

.sub-title {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.content-card {
  min-height: 420px;
}

.layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 16px;
}

.thread-list {
  border-right: 1px solid #ebeef5;
  padding-right: 12px;
}

.thread-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.thread-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.thread-item:hover {
  background-color: #f5f7fa;
}

.thread-item.active {
  background-color: #ecf5ff;
}

.thread-main {
  flex: 1;
  min-width: 0;
}

.thread-name {
  font-size: 14px;
  font-weight: 500;
}

.thread-class {
  font-size: 12px;
  color: #909399;
}

.thread-extra {
  text-align: right;
  max-width: 140px;
}

.badge {
  margin-bottom: 4px;
}

.thread-preview {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-panel {
  display: flex;
  flex-direction: column;
}

.chat-header {
  margin-bottom: 6px;
}

.chat-title {
  font-size: 15px;
  font-weight: 600;
}

.chat-sub {
  font-size: 12px;
  color: #909399;
}

.chat-empty-header {
  font-size: 13px;
  color: #909399;
}

.messages {
  flex: 1;
  max-height: 360px;
  overflow-y: auto;
  padding-right: 4px;
  padding-bottom: 8px;
}

.empty-tip {
  text-align: center;
  color: #c0c4cc;
  margin-top: 40px;
}

.message-row {
  display: flex;
  margin-bottom: 10px;
}

.message-row.from-teacher {
  justify-content: flex-start;
}

.message-row.from-student {
  justify-content: flex-end;
}

.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: #409eff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  margin: 0 6px;
}

.message-row.from-student .avatar {
  background-color: #67c23a;
}

.bubble {
  max-width: 70%;
  background-color: #f5f7fa;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
}

.message-row.from-teacher .bubble {
  background-color: #ecf5ff;
}

.content {
  white-space: pre-wrap;
  word-break: break-word;
}

.meta {
  margin-top: 2px;
  font-size: 11px;
  color: #909399;
}

.input-area {
  border-top: 1px solid #ebeef5;
  padding-top: 8px;
  margin-top: 8px;
}

.input-actions {
  margin-top: 6px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>


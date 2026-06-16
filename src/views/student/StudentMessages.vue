<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchStudentMessages, sendStudentMessage } from '@/api/user.js'

const loading = ref(false)
const sending = ref(false)
const messages = ref([])
const teacherId = ref('')
const className = ref('')
const warning = ref('')
const inputContent = ref('')

const scrollContainerRef = ref(null)

const loadMessages = async () => {
  loading.value = true
  warning.value = ''
  try {
    const res = await fetchStudentMessages()
    const data = res.data || {}
    teacherId.value = data.teacher || ''
    className.value = data.class || ''
    warning.value = data.warning || ''
    messages.value = Array.isArray(data.messages) ? data.messages : []

    await nextTick()
    if (scrollContainerRef.value) {
      scrollContainerRef.value.scrollTop = scrollContainerRef.value.scrollHeight
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('加载消息失败:', e)
    ElMessage.error('加载消息失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const handleSend = async () => {
  const content = (inputContent.value || '').trim()
  if (!content) {
    ElMessage.warning('请输入要发送的内容')
    return
  }
  if (!teacherId.value) {
    ElMessage.warning('当前尚未绑定班主任，无法发送消息')
    return
  }
  if (sending.value) return

  sending.value = true
  try {
    const res = await sendStudentMessage(content)
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
    ElMessage.error('发送消息失败，请稍后重试')
  } finally {
    sending.value = false
  }
}

onMounted(() => {
  loadMessages()
})
</script>

<template>
  <div class="page">
    <el-card class="header-card" shadow="never">
      <div class="header-main">
        <div>
          <div class="title">师生留言</div>
          <div class="sub-title">
            可以向班主任提问体测相关问题、训练建议或其他学习生活情况，老师回复后会在这里显示。
          </div>
        </div>
        <div class="meta">
          <div>当前班级：{{ className || '未绑定' }}</div>
          <div>当前教师：{{ teacherId || '未绑定' }}</div>
        </div>
      </div>
      <el-alert
        v-if="warning"
        :closable="false"
        show-icon
        type="warning"
        style="margin-top: 8px"
      >
        {{ warning }}
      </el-alert>
    </el-card>

    <el-card class="chat-card" shadow="never">
      <div ref="scrollContainerRef" class="messages" v-loading="loading">
        <div v-if="!messages.length && !loading" class="empty-tip">
          暂无消息，可以在下方输入框中给老师发送第一条留言。
        </div>
        <template v-else>
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="message-row"
            :class="msg.sender === 'student' ? 'from-student' : 'from-teacher'"
          >
            <div class="avatar">
              <span v-if="msg.sender === 'student'">我</span>
              <span v-else>师</span>
            </div>
            <div class="bubble">
              <div class="content">
                {{ msg.content }}
              </div>
              <div class="meta">
                <span>{{ msg.sender === 'student' ? '我' : '老师' }}</span>
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
          placeholder="请输入要发送给老师的内容（体测成绩疑问、训练计划咨询等）"
        />
        <div class="input-actions">
          <el-button type="primary" :loading="sending" @click="handleSend">
            发送
          </el-button>
          <el-button text type="info" @click="loadMessages" :disabled="loading || sending">
            刷新
          </el-button>
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

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
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

.meta {
  font-size: 13px;
  color: #606266;
  text-align: right;
}

.chat-card {
  display: flex;
  flex-direction: column;
  min-height: 420px;
}

.messages {
  flex: 1;
  max-height: 380px;
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

.message-row.from-student {
  justify-content: flex-end;
}

.message-row.from-teacher {
  justify-content: flex-start;
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

.message-row.from-student .bubble {
  background-color: #ecf9f1;
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


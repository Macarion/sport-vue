<template>
  <el-container class="pdf-viewer">
    <el-header class="header-controls">
      <div class="control-group">
        <!-- 报告类型选择 -->
        <div class="select-wrapper">
          <span class="label">报告类型：</span>
          <el-select 
            v-model="reportType" 
            placeholder="请选择报告类型"
            style="width: 200px"
          >
            <el-option label="全部项目" value="all" />
            <el-option label="仰卧起坐" value="situp" />
            <el-option label="引体向上" value="pullup" />
          </el-select>
        </div>

        <!-- 操作按钮 -->
        <div class="button-group">
          <el-button type="primary" @click="generateReport">生成报告</el-button>
          <el-button type="success" @click="downloadReport" :disabled="isDownloading">
            {{ isDownloading ? '下载中...' : '下载报告' }}
          </el-button>
        </div>
      </div>
    </el-header>

    <el-main>
      <div v-if="!pdfUrl" class="empty-state">
        <el-empty description="请选择报告类型并点击生成报告">
          <template #image>
            <el-icon :size="100" color="#909399">
              <Document />
            </el-icon>
          </template>
        </el-empty>
      </div>
      <iframe
        v-else
        :src="pdfUrl"
        width="100%"
        height="100%"
        style="border: none;"
      ></iframe>
    </el-main>
  </el-container>
</template>

<script setup>
import { ref } from 'vue'
import { generaet_latest_report, generate_situp_report, generate_pullup_report } from '@/api/user.js'
import { Document } from '@element-plus/icons-vue'

// 报告类型选择
const reportType = ref('all')
const pdfUrl = ref(null)

const generateReport = async() => {
  try {
    // 检查是否选择了报告类型
    if (!reportType.value) {
      ElMessage.warning('请先选择报告类型')
      return
    }

    const username = localStorage.getItem('username')
    console.log('生成报告 - 类型:', reportType.value, '用户:', username)
    
    let pdf
    // 根据报告类型调用不同的接口
    if (reportType.value === 'all') {
      pdf = await generaet_latest_report({ username })
    } else if (reportType.value === 'situp') {
      pdf = await generate_situp_report({ username })
    } else if (reportType.value === 'pullup') {
      pdf = await generate_pullup_report({ username })
    }
    
    console.log('pdf', pdf)
    pdfUrl.value = URL.createObjectURL(pdf.data)
    
    ElMessage.success('报告生成成功')
  }
  catch (error) {
    console.error('生成报告失败:', error)
    ElMessage.error('报告生成失败，请重试')
  }
}

const isDownloading = ref(false)
const downloadReport = async () => {
  if (isDownloading.value) return
  
  // 检查是否选择了报告类型
  if (!reportType.value) {
    ElMessage.warning('请先选择报告类型')
    return
  }

  // 检查是否已生成报告
  if (!pdfUrl.value) {
    ElMessage.warning('请先生成报告')
    return
  }
  
  try {
    isDownloading.value = true
    
    const username = localStorage.getItem('username')
    console.log('下载报告 - 类型:', reportType.value, '用户:', username)
    
    // 根据报告类型调用不同的接口
    let response
    if (reportType.value === 'all') {
      response = await generaet_latest_report({ username })
    } else if (reportType.value === 'situp') {
      response = await generate_situp_report({ username })
    } else if (reportType.value === 'pullup') {
      response = await generate_pullup_report({ username })
    }

    // 创建下载链接
    const blob = new Blob([response.data], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    
    // 根据报告类型生成文件名
    const reportTypeMap = {
      'all': '全部项目',
      'situp': '仰卧起坐',
      'pullup': '引体向上'
    }
    const typeName = reportTypeMap[reportType.value] || '报告'
    
    // 自动下载
    const link = document.createElement('a')
    link.href = url
    link.download = `${typeName}_${new Date().toISOString().slice(0,10)}.pdf`
    document.body.appendChild(link)
    link.click()
    
    // 清理
    URL.revokeObjectURL(url)
    document.body.removeChild(link)
    
    ElMessage.success('报告下载成功')
  } catch (error) {
    console.error('下载失败:', error)
    ElMessage.error('报告下载失败，请重试')
  } finally {
    isDownloading.value = false
  }
}
</script>

<style scoped>
.pdf-viewer {
  height: 100vh;
}

.header-controls {
  background: white;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  height: auto !important;
}

.control-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.select-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
  white-space: nowrap;
}

.button-group {
  display: flex;
  gap: 10px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #f5f7fa;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .control-group {
    flex-direction: column;
    align-items: stretch;
  }
  
  .select-wrapper {
    width: 100%;
  }
  
  .button-group {
    width: 100%;
    justify-content: center;
  }
}
</style>

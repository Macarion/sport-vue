<script setup>
// 2026-01-06 教师展示页：原有折线图 Demo 逻辑仅用于占位，已整体注释，下面实现一个仅前端的“学生成绩汇总”表格展示
/*
import { ref, onMounted, watch, computed } from 'vue'
import * as echarts from 'echarts'
import { fetchClassNotice } from '@/api/user.js' // 导入 fetchClassNotice

// 班级选项
const selectedClass = ref('')
const classOptions = ref([
  { value: '2023级1班', label: '2023级1班' },
  { value: '2023级2班', label: '2023级2班' },
])

// 班级公告数据
const classNotice = ref({})

// 按钮与项目名
const buttonLabels = ref([
  '仰卧起坐',
  '引体向上',
  '身高',
  '体重',
  '肺活量',
  '50米跑',
  '800/1000米跑',
  '立定跳远',
])
const currentChartIndex = ref(0)

// 折线图 & 表格共享的数据
const chart = ref(null)
let myChart = null

// 折叠状态变量
const showTable = ref(true)

// 表格折叠计算
const hasEnoughData = computed(() => {
  return tableData.value[currentChartIndex.value].length >= 5
})

// 每个项目的数据格式：{ date, value }
const tableData = ref([
  [
    { date: '2024-01-01', value: 35 },
    { date: '2024-02-01', value: 37 },
    { date: '2024-03-01', value: 35 },
    { date: '2024-04-01', value: 42 },
    { date: '2024-05-01', value: 45 },
    { date: '2024-06-01', value: 47 },
    { date: '2024-07-01', value: 49 },
    { date: '2024-08-01', value: 48 },
    { date: '2024-09-01', value: 46 },
    { date: '2024-10-01', value: 44 },
    { date: '2024-11-01', value: 42 },
    { date: '2024-12-01', value: 40 },
    { date: '2025-01-01', value: 38 },
    { date: '2025-02-01', value: 39 },
    { date: '2025-03-01', value: 41 },
    { date: '2025-04-01', value: 43 },
    { date: '2025-05-01', value: 45 },
    { date: '2025-06-01', value: 47 },
    { date: '2025-07-01', value: 49 },
    { date: '2025-08-01', value: 50 },
  ], // 仰卧起坐
  [
    { date: '2024-01-01', value: 16 },
    { date: '2024-02-01', value: 13 },
    { date: '2024-03-01', value: 14 },
    { date: '2024-04-01', value: 15 },
    { date: '2024-05-01', value: 16 },
    { date: '2024-06-01', value: 14 },
    { date: '2024-07-01', value: 15 },
    { date: '2024-08-01', value: 16 },
    { date: '2024-09-01', value: 14 },
    { date: '2024-10-01', value: 13 },
    { date: '2024-11-01', value: 14 },
    { date: '2024-12-01', value: 15 },
    { date: '2025-01-01', value: 16 },
    { date: '2025-02-01', value: 14 },
    { date: '2025-03-01', value: 15 },
    { date: '2025-04-01', value: 16 },
    { date: '2025-05-01', value: 14 },
    { date: '2025-06-01', value: 13 },
    { date: '2025-07-01', value: 14 },
    { date: '2025-08-01', value: 15 },
  ], // 引体向上
])

// 监听班级选择变化，获取对应公告
watch(selectedClass, async (newClass) => {
  if (newClass) {
    classNotice.value[newClass] = await fetchClassNotice(newClass)
  }
})

// 更新图表函数
const updateChart = () => {
  const data = tableData.value[currentChartIndex.value]
  myChart.setOption({
    title: { text: buttonLabels.value[currentChartIndex.value] + ' 成绩趋势' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: data.map((item) => item.date) },
    yAxis: { type: 'value' },
    series: [
      {
        data: data.map((item) => item.value),
        type: 'line',
        smooth: true,
      },
    ],
  })
}

onMounted(() => {
  myChart = echarts.init(chart.value)
  updateChart()
})

watch(currentChartIndex, () => {
  updateChart()
})
*/

// 2026-01-06 教师展示页：接入后端接口，基于 student_bulk + score-history 展示真实学生成绩汇总
// 2026-01-08 视频下载：新增调用 downloadStudentBestVideo 接口，实现真实 mp4 下载
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  fetchBulkStudentList,
  getStudentScoreHistory,
  generaet_latest_report,
  downloadStudentBestVideo,
} from '@/api/user.js'

// 2026-01-06 教师展示页：学生列表（从 student_bulk + 成绩接口汇总而来）
const students = ref([])

// 加载状态
const loadingStudents = ref(false)
const loadingScores = ref(false)

// 2026-01-06 教师展示页：从 student_bulk 获取学生基础信息
const loadStudents = async () => {
  loadingStudents.value = true
  try {
    const res = await fetchBulkStudentList()
    const list = res.data || []
    students.value = list
      .map((s) => ({
        studentId: s.studentId || s.username || '',
        name: s.name || '',
        situpScore: null,
        pullupScore: null,
        // 2026-01-27 评级列：根据两项成绩计算出的综合得分区间等级
        rating: '',
        // 若后续需要展示数值总分，可使用此字段
        totalScore: null,
        situpVideoUrl: '',
        pullupVideoUrl: '',
      }))
      .filter((s) => s.studentId)
  } catch (e) {
    console.error('获取学生列表失败:', e)
    ElMessage.error('获取学生列表失败')
  } finally {
    loadingStudents.value = false
  }
}

// 2026-01-06 教师展示页：为每个学生加载成绩与视频（基于 /api/student/score-history/）
const loadScoresForAllStudents = async () => {
  if (!students.value.length) return
  loadingScores.value = true
  try {
    await Promise.all(
      students.value.map(async (stu) => {
        if (!stu.studentId) return
        try {
          const res = await getStudentScoreHistory(stu.studentId)
          const items = (res.data && res.data.items) || {}

          const sitRecords = items['仰卧起坐'] || []
          const pullRecords = items['引体向上'] || []

          const sitLast = sitRecords[sitRecords.length - 1]
          const pullLast = pullRecords[pullRecords.length - 1]

          stu.situpScore = sitLast && typeof sitLast.score0 === 'number' ? sitLast.score0 : null
          stu.pullupScore = pullLast && typeof pullLast.score0 === 'number' ? pullLast.score0 : null

          stu.situpVideoUrl = sitLast && sitLast.videourl ? sitLast.videourl : ''
          stu.pullupVideoUrl = pullLast && pullLast.videourl ? pullLast.videourl : ''

          // 2026-01-27 教师展示页：用当前两项成绩计算综合得分，并按区间映射到评级
          const sit = typeof stu.situpScore === 'number' ? stu.situpScore : null
          const pull = typeof stu.pullupScore === 'number' ? stu.pullupScore : null

          let total = null
          if (sit != null && pull != null) {
            // 简单规则：两项成绩求平均，保留 1 位小数
            total = Number(((sit + pull) / 2).toFixed(1))
          } else if (sit != null) {
            total = Number(sit.toFixed(1))
          } else if (pull != null) {
            total = Number(pull.toFixed(1))
          }

          stu.totalScore = total

          // 区间规则：
          // 0-60 不合格；60-80 合格；80-90 良好；90-100 优秀
          if (total == null) {
            stu.rating = ''
          } else if (total < 60) {
            stu.rating = '不合格'
          } else if (total < 80) {
            stu.rating = '合格'
          } else if (total < 90) {
            stu.rating = '良好'
          } else {
            stu.rating = '优秀'
          }
        } catch (e) {
          console.error('获取学生成绩失败:', stu.studentId, e)
        }
      }),
    )
  } finally {
    loadingScores.value = false
  }
}

// 2026-01-06 教师展示页：搜索与分页（复用假数据版本的前端逻辑）
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

const filteredStudents = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return students.value
  return students.value.filter(
    (s) => s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q),
  )
})

const pagedStudents = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredStudents.value.slice(start, start + pageSize.value)
})

// 2026-01-06 教师展示页：真实报告下载逻辑（调用 gen_pdf 接口）
const downloadReport = async (row) => {
  if (!row || !row.studentId) return
  try {
    const res = await generaet_latest_report({ username: row.studentId })
    const blob = res.data
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${row.studentId}_体测报告.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch (e) {
    console.error('报告下载失败:', e)
    ElMessage.error('报告下载失败')
  }
}

// 2026-01-08 教师展示页：真实视频下载逻辑（通过后端代理调用媒体服务器 best 接口）
const downloadVideo = async (row) => {
  if (!row || !row.studentId) return

  try {
    // 当前页面没有项目切换按钮，这里约定默认下载仰卧起坐（itemid=0）的最佳视频
    const itemid = 0
    const res = await downloadStudentBestVideo({ username: row.studentId, itemid })

    const blob = new Blob([res.data], { type: 'video/mp4' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${row.studentId}_item${itemid}.mp4`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch (e) {
    console.error('视频下载失败:', e)
    ElMessage.error('视频下载失败')
  }
}

onMounted(async () => {
  await loadStudents()
  await loadScoresForAllStudents()
})
</script>

<template>
  <div class="page-container">
    <!-- 2026-01-06 教师展示页：原有“学生成绩分析”折线图已注释，改为基于假数据的学生成绩汇总表 -->

    <!-- 搜索栏（仅前端过滤） -->
    <div class="toolbar">
      <el-input
        v-model="searchQuery"
        placeholder="搜索姓名或学号"
        clearable
        style="width: 260px"
      />
    </div>

    <!-- 学生成绩表 -->
    <el-card class="table-card">
      <h2>学生成绩汇总（前端演示数据）</h2>
      <el-table :data="pagedStudents" border style="width: 100%; margin-top: 12px">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="studentId" label="学号" />
        <el-table-column prop="name" label="姓名" />
        <el-table-column prop="situpScore" label="仰卧起坐成绩" />
        <el-table-column prop="pullupScore" label="引体向上成绩" />
        <el-table-column prop="rating" label="评级" />
        <el-table-column label="操作">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" size="small" @click="downloadReport(row)">
                报告下载
              </el-button>
              <el-button type="success" size="small" @click="downloadVideo(row)">
                视频下载
        </el-button>
      </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 简单分页（仅前端） -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="filteredStudents.length"
          layout="prev, pager, next"
        />
    </div>
    </el-card>
  </div>
</template>

<style scoped>
.page-container {
  padding: 20px;
  background-color: #f5f7fa;
}

.toolbar {
  margin-bottom: 16px;
}

.table-card {
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-buttons .el-button {
  min-width: 90px;
}
</style>

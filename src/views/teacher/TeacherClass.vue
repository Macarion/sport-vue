<script setup>
// 2026-01-27 教师端“班级管理”：按班级查看学生名单 + 班级成绩总结（平均成绩 / 优秀人数 / 成绩分布）
import { onMounted, ref, watch, computed } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { fetchTeacherClasses, fetchTeacherClassStudentsScores } from '@/api/user.js'

// -----------------------
// 基础状态：班级 & 学生列表
// -----------------------

// 班级下拉
const classOptions = ref([]) // [{ id, name }]
const selectedClassId = ref(null)
const selectedClassName = ref('')

// 当前班级学生列表（后端已合并成绩）
const students = ref([]) // [{ studentId, name, situpScore, pullupScore, class }]

const loadingClasses = ref(false)
const loadingStudents = ref(false)

// 当前支持的项目（只开放仰卧起坐、引体向上）
const projectLabels = ['仰卧起坐', '引体向上']
const currentProjectIndex = ref(0)

// 从后端返回的 students 结构中提取两项成绩，并计算综合得分 + 评级
const normalizeStudents = (rawStudents) => {
  if (!Array.isArray(rawStudents)) return []
  return rawStudents.map((s) => {
    const scores = s.scores || {}
    const sit = scores['仰卧起坐'] || {}
    const pull = scores['引体向上'] || {}
    const sitScore = typeof sit.score0 === 'number' ? sit.score0 : null
    const pullScore = typeof pull.score0 === 'number' ? pull.score0 : null

    // 计算综合得分：两项都有取平均，只有一项则取该项分数
    let total = null
    if (sitScore != null && pullScore != null) {
      total = Number(((sitScore + pullScore) / 2).toFixed(1))
    } else if (sitScore != null) {
      total = Number(sitScore.toFixed(1))
    } else if (pullScore != null) {
      total = Number(pullScore.toFixed(1))
    }

    // 区间评级：0-60 不合格；60-80 合格；80-90 良好；90-100 优秀
    let rating = ''
    if (total == null) {
      rating = ''
    } else if (total < 60) {
      rating = '不合格'
    } else if (total < 80) {
      rating = '合格'
    } else if (total < 90) {
      rating = '良好'
    } else {
      rating = '优秀'
    }

    return {
      studentId: s.studentId || s.userid || '',
      name: s.name || '',
      class: s.class || s.class_name || selectedClassName.value,
      situpScore: sitScore,
      pullupScore: pullScore,
      totalScore: total,
      rating,
    }
  })
}

// -----------------------
// 图表实例引用
// -----------------------

const avgScoreChartRef = ref(null)
const excellentCountChartRef = ref(null)
const scoreDistributionChartRef = ref(null)

let avgChart = null
let excellentChart = null
let pieChart = null

// -----------------------
// 班级 / 学生加载
// -----------------------

const loadTeacherClasses = async () => {
  loadingClasses.value = true
  try {
    const res = await fetchTeacherClasses()
    const data = res.data || {}
    const cls = Array.isArray(data.classes) ? data.classes : []
    classOptions.value = cls
    if (cls.length && !selectedClassId.value) {
      selectedClassId.value = cls[0].id
      selectedClassName.value = cls[0].name
      await loadClassStudents()
    }
  } catch (e) {
    console.error('获取教师班级列表失败:', e)
    ElMessage.error('获取班级列表失败')
  } finally {
    loadingClasses.value = false
  }
}

const loadClassStudents = async () => {
  if (!selectedClassId.value && !selectedClassName.value) return
  loadingStudents.value = true
  try {
    const params = {
      class_id: selectedClassId.value,
      class_name: selectedClassName.value || undefined,
    }
    const res = await fetchTeacherClassStudentsScores(params)
    const payload = res.data || {}
    const cls = payload.class || {}
    if (cls.name) {
      selectedClassName.value = cls.name
    }
    const rawStudents = payload.students || []
    students.value = normalizeStudents(rawStudents)
    updateCharts()
  } catch (e) {
    console.error('获取班级学生及成绩失败:', e)
    ElMessage.error('获取班级学生及成绩失败')
  } finally {
    loadingStudents.value = false
  }
}

const handleClassChange = async (val) => {
  const found = classOptions.value.find((c) => c.id === val)
  selectedClassName.value = found ? found.name : ''
  await loadClassStudents()
}

// -----------------------
// 统计逻辑：平均分 / 优秀人数 / 成绩分布
// -----------------------

const stats = computed(() => {
  const avgScores = []
  const excellentCounts = []
  const pieDataPerProject = []

  projectLabels.forEach((label) => {
    const key = label === '仰卧起坐' ? 'situpScore' : 'pullupScore'
    const scores = students.value
      .map((s) => s[key])
      .filter((v) => typeof v === 'number')

    if (!scores.length) {
      avgScores.push(0)
      excellentCounts.push(0)
      pieDataPerProject.push([
        { value: 0, name: '优秀' },
        { value: 0, name: '良好' },
        { value: 0, name: '及格' },
        { value: 0, name: '不及格' },
      ])
      return
    }

    let sum = 0
    let exc = 0
    let good = 0
    let pass = 0
    let fail = 0

    // 2026-01-27 班级管理：与展示页保持一致，统一使用分段：
    // 0-60 不合格；60-80 合格；80-90 良好；90-100 优秀
    scores.forEach((score) => {
      sum += score
      if (score < 60) {
        fail++
      } else if (score < 80) {
        pass++
      } else if (score < 90) {
        good++
      } else {
        exc++
      }
    })

    avgScores.push(Number((sum / scores.length).toFixed(1)))
    excellentCounts.push(exc)
    pieDataPerProject.push([
      { value: exc, name: '优秀' },
      { value: good, name: '良好' },
      { value: pass, name: '及格' },
      { value: fail, name: '不及格' },
    ])
  })

  return { avgScores, excellentCounts, pieDataPerProject }
})

// -----------------------
// 图表渲染
// -----------------------

const updateCharts = () => {
  if (!avgChart || !excellentChart || !pieChart) return

  const { avgScores, excellentCounts, pieDataPerProject } = stats.value

  // 班级平均成绩柱状图
  avgChart.setOption({
    title: { text: '班级平均成绩', left: 'center' },
    tooltip: {
      trigger: 'axis',
    },
    xAxis: { type: 'category', data: projectLabels },
    yAxis: { type: 'value', name: '分数' },
    series: [
      {
        type: 'bar',
        data: avgScores,
        itemStyle: { color: '#409EFF' },
        barWidth: '40%',
      },
    ],
  })

  // 班级优秀人数柱状图
  const maxExcellent = excellentCounts.length ? Math.max(...excellentCounts) : 0
  const yMax = Math.max(maxExcellent, 1) // 至少显示到 1，按人数整数刻度

  excellentChart.setOption({
    title: { text: '班级优秀人数', left: 'center' },
    tooltip: {
      trigger: 'axis',
    },
    xAxis: { type: 'category', data: projectLabels },
    yAxis: {
      type: 'value',
      name: '人数',
      min: 0,
      max: yMax,
      interval: 1, // 按人数整数计数：0,1,2,...
    },
    series: [
      {
        type: 'bar',
        data: excellentCounts,
        itemStyle: { color: '#67C23A' },
        barWidth: '40%',
      },
    ],
  })

  // 当前项目的成绩分布饼图
  const idx = currentProjectIndex.value
  const currentLabel = projectLabels[idx]
  const rawPieData = pieDataPerProject[idx] || []

  // 2026-01-27 班级管理：值为 0 的类别不在图上显示文字标签（避免“优秀 0”之类），但下方图例仍保留
  const pieData = rawPieData.map((item) => ({
    ...item,
    label: {
      show: item.value > 0,
    },
    labelLine: {
      show: item.value > 0,
    },
  }))

  pieChart.setOption({
    title: { text: `${currentLabel} 成绩分布比例`, left: 'center' },
    tooltip: { trigger: 'item' },
    legend: { bottom: 10, left: 'center' },
    series: [
      {
        type: 'pie',
        radius: '50%',
        data: pieData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  })
}

// 监听：学生数据 / 当前项目变化时刷新图表
watch(
  students,
  () => {
    updateCharts()
  },
  { deep: true },
)

watch(currentProjectIndex, () => {
  updateCharts()
})

onMounted(async () => {
  // 初始化图表实例
  avgChart = echarts.init(avgScoreChartRef.value)
  excellentChart = echarts.init(excellentCountChartRef.value)
  pieChart = echarts.init(scoreDistributionChartRef.value)

  // 首次加载教师班级 & 当前班级学生
  await loadTeacherClasses()
})
</script>

<template>
  <div class="class-dashboard">
    <div class="header">
      <div class="title">
        <h2>班级管理 · 班级成绩分析</h2>
        <span v-if="selectedClassName" class="subtitle">当前班级：{{ selectedClassName }}</span>
      </div>
      <div class="actions">
        <el-form inline>
          <el-form-item label="选择班级">
            <el-select
              v-model="selectedClassId"
              placeholder="请选择班级"
              style="width: 220px"
              :loading="loadingClasses"
              @change="handleClassChange"
            >
              <el-option
                v-for="item in classOptions"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 学生名单 + 成绩表格 -->
    <el-card class="table-card" shadow="never">
      <div class="table-header">
        <h3>班级学生名单及成绩</h3>
        <span class="table-summary">
          共 {{ students.length }} 人，仅展示仰卧起坐 / 引体向上两项最新成绩
        </span>
      </div>
      <el-table :data="students" :loading="loadingStudents" border style="width: 100%; margin-top: 12px">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="studentId" label="学号" />
        <el-table-column prop="name" label="姓名" />
        <el-table-column prop="situpScore" label="仰卧起坐成绩" />
        <el-table-column prop="pullupScore" label="引体向上成绩" />
        <el-table-column prop="rating" label="评级" />
      </el-table>
    </el-card>

    <!-- 班级成绩总结图 -->
    <el-card class="chart-card" shadow="never">
      <div class="chart-header">
        <div class="chart-title">
          <h3>班级成绩总结</h3>
          <span class="chart-tip">根据当前班级学生最近一次成绩统计</span>
        </div>
        <div class="project-switch">
          <span>当前项目：</span>
          <el-button
            v-for="(label, idx) in projectLabels"
            :key="label"
            size="small"
            :type="currentProjectIndex === idx ? 'primary' : 'default'"
            @click="currentProjectIndex = idx"
          >
            {{ label }}
          </el-button>
        </div>
      </div>

      <div class="row">
        <div class="chart-box" ref="avgScoreChartRef"></div>
        <div class="chart-box" ref="excellentCountChartRef"></div>
      </div>

      <div class="chart-box full-width" ref="scoreDistributionChartRef"></div>
    </el-card>
  </div>
</template>

<style scoped>
.class-dashboard {
  padding: 20px;
  background: #f5f7fa;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.title h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.subtitle {
  margin-left: 12px;
  color: #909399;
  font-size: 13px;
}

.table-card,
.chart-card {
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
}

.table-header,
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-header h3,
.chart-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.table-summary,
.chart-tip {
  font-size: 12px;
  color: #909399;
}

.project-switch {
  display: flex;
  align-items: center;
  gap: 8px;
}

.project-switch span {
  font-size: 13px;
  color: #606266;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.chart-box {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  width: 48%;
  height: 360px;
}

.chart-box.full-width {
  width: 100%;
  margin-top: 20px;
}
</style>

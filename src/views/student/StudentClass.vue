<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import * as echarts from 'echarts'
import { fetchClassNotice, getStudentScoreHistory } from '@/api/user.js' // 2025-12-20 成绩分析：导入成绩历史查询接口

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

// 2025-12-20 成绩分析：每个项目的数据格式为 { date, value }，初始按按钮数量生成空数组，等待后端数据填充
const tableData = ref(buttonLabels.value.map(() => []))

// 2025-12-20 成绩分析：控制“查看更多数据”的折叠状态
const expandMoreRows = ref([])

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
    tooltip: {
      trigger: 'axis',
      // 2025-12-20 成绩分析：自定义提示信息，显示具体测试日期与分数
      formatter: (params) => {
        const p = Array.isArray(params) ? params[0] : params
        const idx = p.dataIndex ?? 0
        const record = tableData.value[currentChartIndex.value][idx] || {}
        const date = record.date || ''
        const score = record.value ?? ''
        return `测试时间：${date}<br/>分数：${score}`
      },
    },
    // 2025-12-20 成绩分析：横轴改为测试次数（1, 2, 3, ...），仍按时间顺序排序
    xAxis: { type: 'category', data: data.map((_, index) => index + 1) },
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

// 2025-12-20 成绩分析：从后端获取当前登录学生的成绩历史，并填充到 tableData 中
const loadScoreHistory = async () => {
  const username = localStorage.getItem('username')
  if (!username) {
    console.warn('未找到本地存储的 username，无法加载成绩数据') // 2025-12-20 成绩分析：缺少用户名时仅给出控制台警告
    return
  }

  try {
    const res = await getStudentScoreHistory(username)
    const items = (res.data && res.data.items) || {}

    // 2025-12-20 成绩分析：按照 buttonLabels 的顺序，将后端返回的各项目成绩映射成 { date, value } 数组
    const newTableData = buttonLabels.value.map((label) => {
      const records = items[label] || []
      return records.map((r) => ({
        date: r.testtime ? r.testtime.split('T')[0] : '',
        // 2025-12-20 成绩分析：使用后端返回的 score0 字段作为成绩值
        value: r.score0 ?? null,
      }))
    })

    tableData.value = newTableData
  } catch (error) {
    console.error('加载学生成绩历史失败：', error) // 2025-12-20 成绩分析：错误日志便于排查
  }
}

onMounted(async () => {
  myChart = echarts.init(chart.value)
  await loadScoreHistory() // 2025-12-20 成绩分析：挂载时先从后端拉取成绩，再更新图表
  updateChart()
})

watch(currentChartIndex, () => {
  updateChart()
})
</script>

<template>
  <div class="page-container">
    <!-- 公告栏 -->
    <!-- <div class="notification-section">
      <h2>班级公告栏</h2>
      <el-select
        v-model="selectedClass"
        placeholder="请选择班级"
        style="width: 300px; margin-bottom: 20px"
      >
        <el-option
          v-for="item in classOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <el-card v-if="selectedClass" class="notice-box">
        {{ classNotice[selectedClass] || '暂无公告' }}
      </el-card>
    </div> -->

    <!-- 成绩分析 -->
    <div class="chart-section">
      <h2>学生成绩分析</h2>

      <!-- 项目切换按钮 -->
      <!-- @click="currentChartIndex = index" -->
      <div class="button-row">
        <el-button
          v-for="(label, index) in buttonLabels"
          :key="index"
          :type="currentChartIndex === index ? 'primary' : 'default'"
          :disabled="index >= 2"
          @click="
            () => {
              if (index < 2) currentChartIndex = index
            }
          "
        >
          {{ label }}
        </el-button>
      </div>

      <!-- 折线图展示 -->
      <div class="chart-container">
        <div ref="chart" style="width: 100%; height: 400px"></div>
      </div>

      <!-- 表格展示 -->
      <!-- 如果数据够5条，就用可折叠表格 -->
      <el-table
        :data="tableData[currentChartIndex].slice(0, 5)"
        style="margin-top: 20px; width: 100%"
      >
        <el-table-column prop="date" label="测试日期" />
        <el-table-column prop="value" :label="buttonLabels[currentChartIndex]" />
      </el-table>

      <!-- 超出5条的部分：可折叠显示 -->
      <el-collapse v-if="tableData[currentChartIndex].length > 5" v-model="expandMoreRows">
        <el-collapse-item title="查看更多数据" name="1">
          <el-table
            :data="tableData[currentChartIndex].slice(5)"
            style="width: 100%; margin-top: 10px"
          >
            <el-table-column prop="date" />
            <el-table-column prop="value" />
          </el-table>
        </el-collapse-item>
      </el-collapse>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  padding: 20px;
  background-color: #f5f7fa;
}

.notification-section,
.chart-section {
  background: white;
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.notice-box {
  padding: 20px;
  font-size: 16px;
  color: #333;
}

.button-row {
  margin: 20px 0;
}

.chart-container {
  width: 100%;
  height: 400px;
}
</style>

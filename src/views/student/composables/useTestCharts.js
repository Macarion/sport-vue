import Chart from 'chart.js/auto'

// 两张折线图（个数 / 起伏角度）的创建、数据入库与复位。
// 数据源数组保留全程（要记全程），仅展示层截取最近 N 点。
const MAX_COUNT_POINTS = 15 * 60
const MAX_ANGLE_POINTS = 15 * 10

const pad2 = (n) => String(n).padStart(2, '0')

// 毫秒差 → mm:ss（与原 formatTimestamp 一致：按 epoch 取分秒）
const formatElapsed = (ms) => {
  if (!ms) return ''
  const date = new Date(ms)
  return [pad2(date.getMinutes()), pad2(date.getSeconds())].join(':')
}

const createLineChart = (canvas, { label, color, fill, y, valueSuffix = '' }) =>
  new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label,
          data: [],
          borderColor: color,
          backgroundColor: fill,
          fill: true,
          tension: 0,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: {
          title: { display: true, text: '时间' },
          ticks: { autoSkip: true, maxRotation: 0, maxTicksLimit: 8 },
        },
        y,
      },
      plugins: {
        tooltip: {
          callbacks: {
            // 直接取轴标签，与展示口径一致
            label: (context) => `${context.label}: ${context.raw}${valueSuffix}`,
          },
        },
      },
    },
  })

export function useTestCharts(countCanvas, angleCanvas) {
  let countChart = null
  let angleChart = null

  // 全程数据（elapsedMs 为相对正式开始的毫秒差）
  let timestamps = []
  let nums = []
  let angles = []

  const destroy = () => {
    if (countChart) {
      countChart.destroy()
      countChart = null
    }
    if (angleChart) {
      angleChart.destroy()
      angleChart = null
    }
  }

  const create = () => {
    countChart = createLineChart(countCanvas.value, {
      label: '仰卧起坐个数',
      color: '#2d7acd',
      fill: 'rgba(45, 122, 205, 0.2)',
      y: { title: { display: true, text: '个数' } },
    })
    angleChart = createLineChart(angleCanvas.value, {
      label: '起伏角度',
      color: '#67c23a',
      fill: 'rgba(103, 194, 58, 0.2)',
      y: { beginAtZero: true, suggestedMax: 60 },
      valueSuffix: '°',
    })
  }

  const render = (chart, values, maxPoints) => {
    if (!chart) return
    chart.data.labels = timestamps.slice(-maxPoints).map(formatElapsed)
    chart.data.datasets[0].data = values.slice(-maxPoints)
    chart.update()
  }

  const updateCharts = () => {
    render(countChart, nums, MAX_COUNT_POINTS)
    render(angleChart, angles, MAX_ANGLE_POINTS)
  }

  // 挂载时初始化
  const init = () => {
    create()
  }

  // 新会话：清数据并重建
  const reset = () => {
    destroy()
    timestamps = []
    nums = []
    angles = []
    create()
  }

  const pushPoint = (elapsedMs, score, angle) => {
    timestamps.push(elapsedMs)
    nums.push(Number(score))
    angles.push(Number(angle))
    updateCharts()
  }

  return { init, reset, destroy, pushPoint }
}

import Chart from 'chart.js/auto'

// 两张折线图（个数 / 起伏角度）的创建、数据入库与复位。
// - x 轴为线性时间轴（毫秒），从 0 开始
// - 数据源数组保留全程（要记全程），仅展示层截取最近 MAX 点
const MAX_COUNT_POINTS = 15 * 60 * 3
const MAX_ANGLE_POINTS = 15 * 60 * 3

const pad2 = (n) => String(n).padStart(2, '0')

// 毫秒 → mm:ss（相对正式开始的经过时间）
const formatElapsed = (ms) => {
  if (!Number.isFinite(ms)) return ''
  const date = new Date(ms)
  return [pad2(date.getMinutes()), pad2(date.getSeconds())].join(':')
}

const createLineChart = (canvas, { label, color, fill, y, valueSuffix = '' }) =>
  new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
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
          type: 'linear',
          min: 0,
          title: { display: true, text: '时间' },
          ticks: {
            autoSkip: true,
            maxRotation: 0,
            maxTicksLimit: 8,
            callback: (value) => formatElapsed(value),
          },
        },
        y,
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (context) =>
              `${formatElapsed(context.parsed.x)}: ${context.parsed.y}${valueSuffix}`,
          },
        },
      },
    },
  })

export function useTestCharts(countCanvas, angleCanvas) {
  let countChart = null
  let angleChart = null

  // 全程数据：{ x: 相对开始的毫秒, y: 数值 }
  let countSeries = []
  let angleSeries = []

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

  const render = (chart, series, maxPoints) => {
    if (!chart) return
    chart.data.datasets[0].data = series.slice(-maxPoints)
    chart.update()
  }

  const updateCharts = () => {
    render(countChart, countSeries, MAX_COUNT_POINTS)
    render(angleChart, angleSeries, MAX_ANGLE_POINTS)
  }

  // 挂载时初始化
  const init = () => {
    create()
  }

  // 新会话：清数据并重建
  const reset = () => {
    destroy()
    countSeries = []
    angleSeries = []
    create()
  }

  const pushPoint = (elapsedMs, score, angle) => {
    countSeries.push({ x: elapsedMs, y: Number(score) })
    angleSeries.push({ x: elapsedMs, y: Number(angle) })
    updateCharts()
  }

  return { init, reset, destroy, pushPoint }
}

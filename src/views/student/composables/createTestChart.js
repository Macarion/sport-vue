import { isRef } from 'vue'
import Chart from 'chart.js/auto'

// 通用测试曲线图工厂：传入 canvas（模板 ref 或元素）与基本信息，返回图表实例。
// 实例方法：init() 挂载后创建 / reset() 清数据重建 / destroy() 销毁 / pushPoint(t, v) 入库。
// 约定：x 轴为线性时间轴（毫秒）、从 0 开始，tick/tooltip 格式化为 mm:ss；
// 数据源保留全程，仅展示层截取最近 maxPoints 点。

const pad2 = (n) => String(n).padStart(2, '0')

// 毫秒 → mm:ss（相对正式开始的经过时间）
const formatElapsed = (ms) => {
  if (!Number.isFinite(ms)) return ''
  const date = new Date(ms)
  return [pad2(date.getMinutes()), pad2(date.getSeconds())].join(':')
}

/**
 * @param {object} canvas 模板 ref 或 canvas 元素
 * @param {object} options
 * @param {string} [options.label] 图例名
 * @param {string} [options.color] 线色
 * @param {string} [options.fill] 填充色
 * @param {string} [options.yTitle] y 轴标题
 * @param {boolean} [options.beginAtZero] y 轴从 0 起
 * @param {number} [options.suggestedMax] y 轴建议最大值
 * @param {string} [options.valueSuffix] tooltip 数值后缀（如 '°'）
 * @param {string} [options.xTitle] x 轴标题
 * @param {number} [options.maxPoints] 展示层最大点数
 */
export function createTestChart(
  canvas,
  {
    label = '',
    color = '#2d7acd',
    fill = 'rgba(45, 122, 205, 0.2)',
    yTitle = '',
    beginAtZero = false,
    suggestedMax,
    valueSuffix = '',
    xTitle = '时间',
    maxPoints = 1000,
  } = {},
) {
  let chart = null
  // 全程数据：{ x: 相对开始的毫秒, y: 数值 }
  let series = []

  const resolveCanvas = () => {
    const el = isRef(canvas) ? canvas.value : canvas
    if (!el) throw new Error('createTestChart: canvas 未挂载，init() 需在 onMounted 之后调用')
    return el
  }

  const build = () => {
    const y = {}
    if (yTitle) y.title = { display: true, text: yTitle }
    if (beginAtZero) y.beginAtZero = true
    if (suggestedMax !== undefined) y.suggestedMax = suggestedMax

    chart = new Chart(resolveCanvas().getContext('2d'), {
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
            title: { display: true, text: xTitle },
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
  }

  // 挂载后创建（幂等）
  const init = () => {
    if (!chart) build()
  }

  // 清数据并重建
  const reset = () => {
    destroy()
    series = []
    build()
  }

  const destroy = () => {
    if (chart) {
      chart.destroy()
      chart = null
    }
  }

  // 入库一条：elapsedMs 为相对正式开始的毫秒，value 为数值
  const pushPoint = (elapsedMs, value) => {
    series.push({ x: elapsedMs, y: Number(value) })
    if (!chart) return
    chart.data.datasets[0].data = series.slice(-maxPoints)
    chart.update()
  }

  return { init, reset, destroy, pushPoint }
}

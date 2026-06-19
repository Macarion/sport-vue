<template>
  <div class="race-page">
    <div class="race-shell">
      <header class="topbar scoreboard-topbar">
        <div class="race-title-block">
          <span class="event-kicker">STUDENT PHYSICAL TEST</span>
          <div class="compact-title">800/1000米跑实时比赛大屏</div>
          <small>UWB LIVE TRACKING · RACE BROADCAST</small>
        </div>
        <nav class="mode-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            :class="['mode-tab', { active: activeTab === tab.key }]"
            @click="activeTab = tab.key"
          >
            <span>{{ tab.name }}</span>
          </button>
        </nav>
        <div class="topbar-actions">
          <el-tag :type="serialConnected || httpConnected ? 'success' : 'info'">{{ serialConnected || httpConnected ? '直播中' : '待连接' }}</el-tag>
          <el-button :icon="Refresh" @click="resetRuntimeData">清空数据</el-button>
          <el-button @click="goBack">返回</el-button>
        </div>
      </header>

      <div class="race-status-ribbon" aria-label="比赛运行状态">
        <div class="ribbon-item wide">
          <span>数据链路</span>
          <strong>{{ connectionStatus }}</strong>
        </div>
        <div class="ribbon-item">
          <span>在线标签</span>
          <strong>{{ tagRows.length }}</strong>
        </div>
        <div class="ribbon-item">
          <span>最新选手</span>
          <strong>{{ activeRunner?.username || activeRunner?.name || '--' }}</strong>
        </div>
        <div class="ribbon-item">
          <span>数据帧</span>
          <strong>{{ rawLines.length }} / {{ parsedJsonRows.length }}</strong>
        </div>
      </div>

      <section v-if="activeTab === 'settings'" class="tab-page settings-page">
        <div class="settings-grid">
          <div class="surface source-panel">
            <div class="panel-head">
              <div>
                <h3>数据源设置</h3>
                <p>可由浏览器直接读取串口，也可从后端数据库获取已解析的 UWB 数据。</p>
              </div>
              <el-tag :type="serialConnected || httpConnected ? 'success' : 'info'">
                {{ serialConnected || httpConnected ? '在线' : '离线' }}
              </el-tag>
            </div>

            <el-radio-group v-model="sourceType" class="source-mode">
              <el-radio-button label="serial">UART 串口</el-radio-button>
              <el-radio-button label="http">后端数据库</el-radio-button>
            </el-radio-group>

            <div class="imu-option">
              <div>
                <strong>IMU 轨迹滤波</strong>
                <span>使用 MOT 运动状态抑制静止跳点，运动时保留响应。</span>
              </div>
              <el-switch v-model="imuFilterEnabled" active-text="启用" inactive-text="关闭" />
            </div>

            <div v-if="sourceType === 'serial'" class="form-grid">
              <label>
                <span>波特率</span>
                <el-select v-model="baudRate" placeholder="波特率">
                  <el-option v-for="rate in baudRateOptions" :key="rate" :label="rate" :value="rate" />
                </el-select>
              </label>
              <div class="button-line">
                <el-button :icon="Connection" @click="selectSerialPort">选择串口</el-button>
                <el-button type="primary" :disabled="serialConnected" @click="connectSerial">连接</el-button>
                <el-button :disabled="!serialConnected" @click="disconnectSerial">断开</el-button>
              </div>
            </div>

            <div v-else class="form-grid">
              <label class="wide-field">
                <span>后端接口</span>
                <el-input v-model="httpUrl" disabled />
              </label>
              <label>
                <span>模式</span>
                <el-input value="轮询数据库" disabled />
              </label>
              <label>
                <span>轮询间隔 ms</span>
                <el-input-number v-model="pollIntervalMs" :min="100" :step="100" :max="5000" />
              </label>
              <div class="button-line">
                <el-button type="primary" :disabled="httpConnected" @click="connectHttp">连接</el-button>
                <el-button :disabled="!httpConnected" @click="disconnectHttp">断开</el-button>
              </div>
            </div>
          </div>

          <div class="surface anchor-panel">
            <div class="panel-head">
              <div>
                <h3>基站坐标设置</h3>
                <p>坐标单位为 m，A0-A3 固定 4 个基站。</p>
              </div>
            </div>
            <div class="anchor-table">
              <div class="anchor-header">
                <span>基站</span>
                <span>X</span>
                <span>Y</span>
                <span>Z</span>
              </div>
              <div v-for="anchor in anchorDrafts" :key="anchor.id" class="anchor-row">
                <strong>{{ anchor.id }}</strong>
                <el-input-number v-model="anchor.x" :step="0.1" controls-position="right" />
                <el-input-number v-model="anchor.y" :step="0.1" controls-position="right" />
                <el-input-number v-model="anchor.z" :step="0.1" controls-position="right" />
              </div>
            </div>
            <div class="anchor-actions">
              <span>坐标修改后需点击确定才会生效。</span>
              <div>
                <el-button size="small" @click="cancelAnchorDrafts">取消</el-button>
                <el-button size="small" type="primary" @click="applyAnchorDrafts">确定</el-button>
              </div>
            </div>
          </div>

          <div class="surface race-line-panel">
            <div class="panel-head">
              <div>
                <h3>起终点线设置</h3>
                <p>坐标单位为 m。选手轨迹穿过起点线后开始累计距离，累计距离作为默认成绩。</p>
              </div>
            </div>
            <div class="race-line-editor">
              <div class="race-line-row" v-for="line in raceLineDraftRows" :key="line.key">
                <strong>{{ line.label }}</strong>
                <label><span>x1</span><el-input-number v-model="line.x1" :step="0.1" controls-position="right" /></label>
                <label><span>y1</span><el-input-number v-model="line.y1" :step="0.1" controls-position="right" /></label>
                <label><span>x2</span><el-input-number v-model="line.x2" :step="0.1" controls-position="right" /></label>
                <label><span>y2</span><el-input-number v-model="line.y2" :step="0.1" controls-position="right" /></label>
              </div>
            </div>
            <div class="anchor-actions">
              <span>修改起终点线会重置当前累计距离和速度。</span>
              <div>
                <el-button size="small" @click="cancelRaceLineDrafts">取消</el-button>
                <el-button size="small" type="primary" @click="applyRaceLineDrafts">确定</el-button>
              </div>
            </div>
          </div>

          <div class="surface runner-binding-panel">
            <div class="panel-head">
              <div>
                <h3>标签与选手绑定</h3>
                <p>串口数据通常只有 TagID，这里把 TagID 绑定到具体选手，后续排行、当前选手、选手数据都会显示绑定信息。</p>
              </div>
              <el-tag type="info">{{ runnerBindings.length }} 组</el-tag>
            </div>

            <div class="binding-toolbar">
              <el-button size="small" type="primary" @click="addRunnerBinding">新增绑定</el-button>
              <el-button size="small" @click="seedBindingsFromTags">从当前标签生成</el-button>
              <el-button size="small" type="success" :disabled="runnerBindings.length === 0" @click="saveRunnerBindingsToBackend">保存绑定</el-button>
              <el-button size="small" :disabled="runnerBindings.length === 0" @click="clearRunnerBindings">清空绑定</el-button>
            </div>

            <div class="runner-binding-table">
              <div class="binding-header">
                <span>TagID</span>
                <span>学号 / UID</span>
                <span>选手姓名</span>
                <span>班级 / 备注</span>
                <span>操作</span>
              </div>
              <div v-for="(binding, index) in runnerBindings" :key="`binding-${index}`" class="binding-row">
                <el-input-number v-model="binding.tagId" :min="0" :step="1" :precision="0" controls-position="right" />
                <el-input v-model="binding.uid" placeholder="如 20123456" clearable />
                <el-input v-model="binding.username" placeholder="如 张三" clearable />
                <el-input v-model="binding.group" placeholder="如 23级1班 / 第1组" clearable />
                <el-button size="small" type="danger" plain @click="removeRunnerBinding(index)">删除</el-button>
              </div>
              <div v-if="runnerBindings.length === 0" class="empty-state binding-empty">
                暂无绑定。可点击“新增绑定”，或先连接数据后点击“从当前标签生成”。
              </div>
            </div>
          </div>
        </div>

        <div class="console-grid settings-console-grid">
          <div class="surface raw-panel console-panel">
          <div class="panel-head">
            <div>
              <h3>原始实时数据</h3>
              <p>保留最近 {{ MAX_RAW_LINES }} 行，用于核对串口或 HTTP 转发内容。</p>
            </div>
            <el-tag type="info">{{ rawLines.length }} 行</el-tag>
          </div>
          <div class="raw-list">
            <div v-for="line in rawLines" :key="line.id" class="raw-line">{{ line.text }}</div>
            <div v-if="rawLines.length === 0" class="empty-state">等待 RNG / MOT 数据...</div>
          </div>
          </div>

          <div class="surface parsed-panel console-panel">
          <div class="panel-head">
            <div>
              <h3>解析后的 JSON 数据</h3>
              <p>串口 RNG/MOT 与 HTTP 返回值都会先统一成该结构，再驱动地图、表格和回放显示。</p>
            </div>
            <el-tag type="info">{{ parsedJsonRows.length }} 条</el-tag>
          </div>
          <div class="json-list">
            <pre v-for="item in parsedJsonRows" :key="item.id" class="json-line">{{ item.pretty }}</pre>
            <div v-if="parsedJsonRows.length === 0" class="empty-state">等待解析后的 JSON 数据...</div>
          </div>
          </div>

          <div class="surface settings-events-panel console-panel">
            <div class="panel-head">
              <div>
                <h3>解析事件</h3>
                <p>展示串口 / HTTP 数据解析后的事件摘要，移到系统设置页，避免遮挡比赛画布。</p>
              </div>
              <el-tag type="info">{{ eventRows.length }} 条</el-tag>
            </div>
            <div class="event-console-body">
              <el-table v-if="eventRows.length > 0" :data="eventRows" height="100%" class="event-table settings-event-table" size="small">
                <el-table-column prop="time" label="时间" width="76" />
                <el-table-column prop="tag" label="标签" width="60" />
                <el-table-column prop="type" label="类型" width="60" />
                <el-table-column prop="summary" label="摘要" min-width="120" show-overflow-tooltip />
              </el-table>
              <div v-else class="empty-state console-empty">等待解析事件...</div>
            </div>
          </div>
        </div>
      </section>

      <section v-if="activeTab === 'tracking'" class="tab-page tracking-page race-dashboard broadcast-dashboard">
        <div class="surface map-panel stadium-map-panel broadcast-field">
          <div class="panel-head stadium-head">
            <div>
              <h3>赛道实时位置</h3>
              <p>比赛主画面，支持滚轮缩放；开启“拖动画布”后可左键拖动，双击复位。起点线后开始累计距离。</p>
            </div>
            <div class="race-map-actions">
              <div class="race-live-dot"><i></i>{{ serialConnected || httpConnected ? 'LIVE' : 'STANDBY' }}</div>
              <el-checkbox v-model="showTracks">轨迹</el-checkbox>
              <el-switch v-model="mapPanEnabled" active-text="拖动画布" inactive-text="锁定画布" />
              <div class="track-limit-control">
                <span>轨迹点</span>
                <el-slider v-model="trackPointLimit" :min="5" :max="300" :step="5" class="track-slider" />
              </div>
              <el-popover placement="bottom-end" trigger="click" width="320" popper-class="display-settings-popper">
                <template #reference>
                  <el-button size="small">背景设置</el-button>
                </template>
                <div class="map-settings-dropdown compact-background-dropdown">
                  <section>
                    <h4>画布背景</h4>
                    <div class="background-control">
                      <el-select v-model="mapBackgroundMode" size="small">
                        <el-option label="科技网格" value="grid" />
                        <el-option label="标准校园跑道" value="track" />
                        <el-option label="操场草地" value="field" />
                        <el-option label="自定义图片" value="image" />
                      </el-select>
                      <el-input v-if="mapBackgroundMode === 'image'" v-model="customMapBackgroundUrl" size="small" placeholder="图片 URL，也可上传本地图片" />
                      <input type="file" accept="image/*" class="file-picker" @change="handleMapBackgroundFile" />
                    </div>
                  </section>
                </div>
              </el-popover>
            </div>
          </div>
          <TrackMap
            :anchors="drawableAnchors"
            :tags="drawableTags"
            :grid-x="gridX"
            :grid-y="gridY"
            :map-bounds="mapBounds"
            :show-tracks="showTracks"
            :race-lines="drawableRaceLines"
            :map-background="mapBackgroundMode"
            :custom-background-url="activeMapBackgroundUrl"
            :pan-enabled="mapPanEnabled"
          />
        </div>

        <aside :class="['floating-dock', 'left-dock', { collapsed: leftDockCollapsed }]">
          <button type="button" class="dock-toggle" @click="leftDockCollapsed = !leftDockCollapsed">
            {{ leftDockCollapsed ? '实时排行' : '收起' }}
          </button>
          <div v-show="!leftDockCollapsed" class="dock-content">
            <div class="surface leaderboard-panel">
              <div class="panel-head compact scoreboard-panel-head">
                <div>
                  <h3>实时排行</h3>
                  <p>默认按已跑距离排序，也可切换速度、分数或更新时间。</p>
                </div>
                <el-tag>{{ leaderboardRows.length }} 人</el-tag>
              </div>
              <div class="leader-sort-bar">
                <span>排序</span>
                <el-select v-model="leaderboardSortKey" size="small">
                  <el-option label="已跑距离" value="distance" />
                  <el-option label="当前速度" value="speed" />
                  <el-option label="分数" value="score" />
                  <el-option label="更新时间" value="updated" />
                </el-select>
              </div>
              <div class="leader-list">
                <div
                  v-for="(row, index) in leaderboardRows"
                  :key="`leader-${row.name}`"
                  class="leader-row"
                  :class="{ champion: index === 0, selected: row.name === selectedTagName }"
                  @click="selectRunner(row.name)"
                >
                  <div class="leader-rank">{{ String(index + 1).padStart(2, '0') }}</div>
                  <div class="leader-info">
                    <strong>{{ row.username || row.uid || row.name }}</strong>
                    <span>{{ row.name }} · {{ row.raceStatusText }}</span>
                  </div>
                  <div class="leader-score">
                    <strong>{{ formatRankValue(row) }}</strong>
                    <span>{{ rankUnitLabel }}</span>
                  </div>
                </div>
                <div v-if="leaderboardRows.length === 0" class="empty-state small">等待参赛标签进入赛道...</div>
              </div>
            </div>
          </div>
        </aside>

        <div class="right-floating-stack">
          <aside :class="['floating-dock', 'right-dock', { collapsed: rightDockCollapsed }]">
            <button type="button" class="dock-toggle" @click="rightDockCollapsed = !rightDockCollapsed">
              {{ rightDockCollapsed ? '选手数据' : '收起' }}
            </button>
            <div v-show="!rightDockCollapsed" class="dock-content right-content">
              <div class="surface runner-card">
                <div class="runner-card-top">
                  <span>当前选手</span>
                  <strong>{{ activeRunner?.username || activeRunner?.uid || activeRunner?.name || '--' }}</strong>
                  <em>{{ activeRunner?.runnerGroup || activeRunner?.name || '点击排行或表格选择选手' }}</em>
                </div>
                <div class="runner-metrics">
                  <div>
                    <span>已跑距离</span>
                    <strong>{{ formatDistance(activeRunner?.raceDistance) }}</strong>
                  </div>
                  <div>
                    <span>速度</span>
                    <strong>{{ formatSpeed(activeRunner?.speed) }}</strong>
                  </div>
                  <div>
                    <span>状态</span>
                    <strong>{{ activeRunner?.raceStatusText || '--' }}</strong>
                  </div>
                  <div>
                    <span>用时</span>
                    <strong>{{ formatElapsed(activeRunner?.elapsedMs) }}</strong>
                  </div>
                  <div>
                    <span>X</span>
                    <strong>{{ formatCoord(activeRunner?.position?.x) }}</strong>
                  </div>
                  <div>
                    <span>Y</span>
                    <strong>{{ formatCoord(activeRunner?.position?.y) }}</strong>
                  </div>
                </div>
                <div class="range-strip">
                  <div v-for="(distance, index) in activeRunner?.distances || [null, null, null, null]" :key="`active-range-${index}`">
                    <span>A{{ index }}</span>
                    <strong>{{ formatDistance(distance) }}</strong>
                  </div>
                </div>
              </div>

              <div class="surface table-panel race-table-panel">
                <div class="panel-head compact">
                  <h3>选手数据</h3>
                  <el-tag>{{ tagRows.length }}/30</el-tag>
                </div>
                <el-table
                  :data="tagRows"
                  height="100%"
                  class="data-table race-data-table"
                  size="small"
                  stripe
                  highlight-current-row
                  :row-class-name="tagRowClassName"
                  @row-click="handleTagRowClick"
                >
                  <el-table-column prop="name" label="标签" width="72" />
                  <el-table-column label="选手" min-width="86">
                    <template #default="{ row }">{{ row.username || row.uid || '--' }}</template>
                  </el-table-column>
                  <el-table-column label="分组" min-width="86">
                    <template #default="{ row }">{{ row.runnerGroup || '--' }}</template>
                  </el-table-column>
                  <el-table-column label="距离" width="72" sortable>
                    <template #default="{ row }">{{ formatDistance(row.raceDistance) }}</template>
                  </el-table-column>
                  <el-table-column label="速度" width="72" sortable>
                    <template #default="{ row }">{{ formatSpeed(row.speed) }}</template>
                  </el-table-column>
                  <el-table-column label="x" width="62">
                    <template #default="{ row }">{{ formatCoord(row.position?.x) }}</template>
                  </el-table-column>
                  <el-table-column label="y" width="62">
                    <template #default="{ row }">{{ formatCoord(row.position?.y) }}</template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </aside>

          <aside :class="['floating-dock', 'style-dock', { collapsed: styleDockCollapsed }]">
            <button type="button" class="dock-toggle" @click="styleDockCollapsed = !styleDockCollapsed">
              {{ styleDockCollapsed ? '显示设置' : '收起' }}
            </button>
            <div v-show="!styleDockCollapsed" class="dock-content style-content">
              <div class="surface race-style-panel independent-style-panel">
                <div class="panel-head compact">
                  <div>
                    <h3>显示设置</h3>
                    <p>独立调整标签与基站显示样式。</p>
                  </div>
                </div>
                <div class="style-section-title">标签样式</div>
                <div v-for="(tag, index) in tagRows" :key="`float-style-${tag.name}`" class="style-row dense float-style-row">
                  <el-checkbox v-model="ensureTagStyle(tag.name, index).visible">{{ tag.name }}</el-checkbox>
                  <el-color-picker v-model="ensureTagStyle(tag.name, index).color" size="small" />
                  <el-input-number v-model="ensureTagStyle(tag.name, index).fontSize" :min="10" :max="36" size="small" controls-position="right" />
                  <el-input-number v-model="ensureTagStyle(tag.name, index).shapeSize" :min="8" :max="48" size="small" controls-position="right" />
                </div>
                <div v-if="tagRows.length === 0" class="empty-state small">暂无标签</div>

                <div class="style-section-title anchor-title">基站样式</div>
                <div v-for="anchor in anchors" :key="`float-anchor-style-${anchor.id}`" class="style-row dense float-style-row">
                  <el-checkbox v-model="anchorStyles[anchor.id].visible">{{ anchor.id }}</el-checkbox>
                  <el-color-picker v-model="anchorStyles[anchor.id].color" size="small" />
                  <el-input-number v-model="anchorStyles[anchor.id].fontSize" :min="10" :max="36" size="small" controls-position="right" />
                  <el-input-number v-model="anchorStyles[anchor.id].shapeSize" :min="8" :max="48" size="small" controls-position="right" />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section v-if="activeTab === 'replay'" class="tab-page replay-page">
        <div class="surface map-panel">
          <div class="panel-head">
            <div>
              <h3>轨迹回放地图</h3>
              <p>从后端数据库读取本场 UWB 记录，可选择单个或多个标签同时回放。</p>
            </div>
            <div class="replay-controls">
              <el-select v-model="replaySessionId" placeholder="选择场次" class="replay-session-select" clearable @visible-change="handleReplaySessionDropdown">
                <el-option v-for="session in replaySessionOptions" :key="session.session_id" :label="sessionLabel(session)" :value="session.session_id" />
              </el-select>
              <el-select v-model="selectedReplayTags" placeholder="选择标签" class="replay-select" multiple collapse-tags collapse-tags-tooltip clearable>
                <el-option v-for="tag in replayTagOptions" :key="tag.value" :label="tag.label" :value="tag.value" />
              </el-select>
              <el-checkbox v-model="replayAllTags">全部</el-checkbox>
              <el-button size="small" :loading="replayLoading" @click="fetchReplayTracks">载入</el-button>
              <el-button :icon="VideoPlay" circle :disabled="selectedReplayTags.length === 0 || replayMaxIndex === 0" @click="toggleReplay" />
            </div>
          </div>

          <TrackMap
            :anchors="drawableAnchors"
            :tags="[]"
            :grid-x="gridX"
            :grid-y="gridY"
            :map-bounds="mapBounds"
            :show-tracks="false"
            :race-lines="drawableRaceLines"
            :map-background="mapBackgroundMode"
            :custom-background-url="activeMapBackgroundUrl"
            :pan-enabled="mapPanEnabled"
            :replay-series="drawableReplaySeries"
          />

          <div class="replay-slider">
            <el-slider v-model="replayIndex" :min="0" :max="replayMaxIndex" :step="1" :disabled="selectedReplayTags.length === 0" />
            <div class="replay-stats">
              <span>点位 {{ replayTotalPoints ? Math.min(replayIndex + 1, replayMaxIndex + 1) : 0 }}/{{ replayMaxIndex + 1 }}</span>
              <span>{{ replayPointText }}</span>
            </div>
          </div>
        </div>

        <div class="surface event-panel">
          <div class="panel-head compact">
            <h3>解析事件</h3>
            <el-tag type="info">{{ eventRows.length }}</el-tag>
          </div>
          <el-table :data="eventRows" height="100%" class="event-table" size="small">
            <el-table-column prop="time" label="时间" width="96" />
            <el-table-column prop="tag" label="标签" width="76" />
            <el-table-column prop="type" label="类型" width="70" />
            <el-table-column prop="summary" label="摘要" />
          </el-table>
        </div>
      </section>
    </div>

    <div v-if="anchorAppliedDialogVisible" class="uwb-modal-mask" role="dialog" aria-modal="true">
      <div class="uwb-modal">
        <div class="uwb-modal-icon">✓</div>
        <h3>基站坐标已生效</h3>
        <p>新的基站坐标已应用，历史轨迹已清空，后续定位将按新坐标计算。</p>
        <el-button type="primary" @click="anchorAppliedDialogVisible = false">确定</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Connection, Refresh, VideoPlay } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request, { baseURL } from '@/utils/request'

const router = useRouter()

const MAX_TAGS = 30
const MAX_RAW_LINES = 80
const MAX_PARSED_RECORDS = 80
const MAX_EVENTS = 80
const MAX_TRACK_POINTS = 300
const UI_FLUSH_INTERVAL_MS = 16
const OFFLINE_TAG_TIMEOUT_MS = 2500
const HTTP_FALLBACK_POLL_INTERVAL_MS = 300
const RUNNER_BINDINGS_STORAGE_KEY = 'studentRaceUwb.runnerBindings'
const palette = [
  '#00d6a3',
  '#ff4d6d',
  '#48a8ff',
  '#f7c948',
  '#9b7bff',
  '#ff8a3d',
  '#2ee6ff',
  '#6ee56c',
  '#f066ff',
  '#f97316',
]

const tabs = [
  { key: 'settings', name: '系统设置', desc: '数据源 / 基站 / 原始数据' },
  { key: 'tracking', name: '轨迹显示', desc: '实时地图 / 距离坐标 / 样式' },
  { key: 'replay', name: '轨迹回放', desc: '数据库轨迹复盘' },
]

const activeTab = ref('tracking')
const anchorAppliedDialogVisible = ref(false)
const sourceType = ref('serial')
const baudRate = ref(921600)
const baudRateOptions = [115200, 230400, 460800, 921600, 1000000, 1500000]
const serialPort = ref(null)
const serialConnected = ref(false)
const serialReader = ref(null)
const serialReadableClosed = ref(null)
const serialBuffer = ref('')

const httpUrl = ref(`${baseURL}api/uwb/fetch_inc_data/`)
const pollIntervalMs = ref(180)
const httpConnected = ref(false)
const httpStreamConnecting = ref(false)
const httpStreamConnected = ref(false)
const uwbLastId = ref(0)
const httpSessionId = ref('')
const liveRecordCount = ref(0)
const onlineNow = ref(Date.now())
let httpTimer = null
let uwbEventSource = null
let offlineTimer = null
let httpFetchPending = false
let httpFetchFailCount = 0

const anchors = ref([
  { id: 'A0', x: 0, y: 0, z: 0 },
  { id: 'A1', x: 20, y: 0, z: 0 },
  { id: 'A2', x: 20, y: 10, z: 0 },
  { id: 'A3', x: 0, y: 10, z: 0 },
])
const anchorDrafts = ref(cloneAnchorList(anchors.value))
const raceLines = ref({
  start: { key: 'start', label: '起点线', x1: 0, y1: -1.5, x2: 0, y2: 11.5 },
  finish: { key: 'finish', label: '终点线', x1: 20, y1: -1.5, x2: 20, y2: 11.5 },
})
const raceLineDraftRows = ref(cloneRaceLineRows(raceLines.value))
const runnerBindings = ref(loadRunnerBindings())

const anchorStyles = ref({
  A0: { visible: true, color: '#00d6a3', fontSize: 20, shapeSize: 24 },
  A1: { visible: true, color: '#48a8ff', fontSize: 20, shapeSize: 24 },
  A2: { visible: true, color: '#f7c948', fontSize: 20, shapeSize: 24 },
  A3: { visible: true, color: '#ff4d6d', fontSize: 20, shapeSize: 24 },
})
const tagStyles = ref({})
const tags = ref([])
const rawLines = ref([])
const parsedJsonRows = ref([])
const eventRows = ref([])
const showTracks = ref(true)
const trackPointLimit = ref(80)
const imuFilterEnabled = ref(false)
const selectedTagName = ref('')
const leaderboardSortKey = ref('distance')
const leftDockCollapsed = ref(false)
const rightDockCollapsed = ref(false)
const styleDockCollapsed = ref(true)
const mapBackgroundMode = ref('track')
const mapPanEnabled = ref(false)
const customMapBackgroundUrl = ref('')
const uploadedMapBackgroundUrl = ref('')
const selectedReplayTags = ref([])
const replayAllTags = ref(false)
const replaySessionId = ref('')
const replaySessionOptions = ref([])
const replaySeries = ref([])
const replayLoading = ref(false)
const replayLoadingMore = ref(false)
const replayCursorId = ref(0)
const replayHasMore = ref(false)
const REPLAY_WINDOW_LIMIT = 1200
const replayIndex = ref(0)
const replayPlaying = ref(false)
let replayTimer = null
const tagStore = new Map()
const imuByTag = new Map()
const raceStateByTag = new Map()
let pendingRawLines = []
let pendingParsedRecords = []
let pendingEvents = []
let tagsDirty = false
let uiFlushTimer = null
let uiFlushUsesRaf = false

const gridX = [40, 224, 408, 592, 776, 960]
const gridY = [40, 148, 256, 364, 472, 580]

const TrackMap = defineComponent({
  name: 'TrackMap',
  props: {
    anchors: { type: Array, required: true },
    tags: { type: Array, required: true },
    gridX: { type: Array, required: true },
    gridY: { type: Array, required: true },
    mapBounds: { type: Object, required: true },
    showTracks: { type: Boolean, default: true },
    replayPoint: { type: Object, default: null },
    replayPolyline: { type: String, default: '' },
    replayLabel: { type: String, default: '' },
    replaySeries: { type: Array, default: () => [] },
    raceLines: { type: Array, default: () => [] },
    mapBackground: { type: String, default: 'grid' },
    customBackgroundUrl: { type: String, default: '' },
    panEnabled: { type: Boolean, default: false },
  },
  setup(props) {
    const svgRef = ref(null)
    const zoom = ref(1)
    const pan = ref({ x: 0, y: 0 })
    const pointer = ref(null)
    const isPanning = ref(false)
    const lastDragPoint = ref(null)

    const getSvgPoint = (event) => {
      const rect = svgRef.value?.getBoundingClientRect()
      if (!rect) return null
      return {
        x: ((event.clientX - rect.left) / rect.width) * 1000,
        y: ((event.clientY - rect.top) / rect.height) * 620,
      }
    }

    const getContentPoint = (svgPoint) => ({
      x: (svgPoint.x - pan.value.x) / zoom.value,
      y: (svgPoint.y - pan.value.y) / zoom.value,
    })

    const getWorldPoint = (contentPoint) => {
      if (contentPoint.x < 40 || contentPoint.x > 960 || contentPoint.y < 40 || contentPoint.y > 580) {
        return null
      }
      const width = props.mapBounds.maxX - props.mapBounds.minX || 1
      const height = props.mapBounds.maxY - props.mapBounds.minY || 1
      return {
        x: props.mapBounds.minX + ((contentPoint.x - 40) / 920) * width,
        y: props.mapBounds.minY + ((580 - contentPoint.y) / 540) * height,
      }
    }

    const updatePointer = (event) => {
      const svgPoint = getSvgPoint(event)
      if (!svgPoint) return
      const contentPoint = getContentPoint(svgPoint)
      const worldPoint = getWorldPoint(contentPoint)
      pointer.value = worldPoint
        ? {
            sx: svgPoint.x,
            sy: svgPoint.y,
            contentX: contentPoint.x,
            contentY: contentPoint.y,
            x: worldPoint.x,
            y: worldPoint.y,
          }
        : null
    }

    const handleWheel = (event) => {
      event.preventDefault()
      const svgPoint = getSvgPoint(event)
      if (!svgPoint) return
      const contentPoint = getContentPoint(svgPoint)
      const scale = event.deltaY < 0 ? 1.12 : 0.88
      const nextZoom = Math.min(6, Math.max(0.5, zoom.value * scale))
      pan.value = {
        x: svgPoint.x - contentPoint.x * nextZoom,
        y: svgPoint.y - contentPoint.y * nextZoom,
      }
      zoom.value = nextZoom
      updatePointer(event)
    }

    const handleMouseDown = (event) => {
      if (!props.panEnabled || event.button !== 0) return
      event.preventDefault()
      isPanning.value = true
      lastDragPoint.value = getSvgPoint(event)
    }

    const handleMouseMove = (event) => {
      const svgPoint = getSvgPoint(event)
      if (!svgPoint) return
      if (isPanning.value && lastDragPoint.value) {
        event.preventDefault()
        pan.value = {
          x: pan.value.x + svgPoint.x - lastDragPoint.value.x,
          y: pan.value.y + svgPoint.y - lastDragPoint.value.y,
        }
        lastDragPoint.value = svgPoint
      }
      updatePointer(event)
    }

    const stopPanning = () => {
      isPanning.value = false
      lastDragPoint.value = null
    }

    const resetView = () => {
      zoom.value = 1
      pan.value = { x: 0, y: 0 }
    }

    const renderMapBackground = () => {
      const common = [
        h('rect', {
          x: 0,
          y: 0,
          width: 1000,
          height: 620,
          rx: 8,
          fill: '#07111f',
          stroke: 'rgba(64, 238, 255, 0.24)',
          'stroke-width': 2,
          class: 'map-bg',
        }),
      ]

      if (props.mapBackground === 'image' && props.customBackgroundUrl) {
        common.push(
          h('image', {
            href: props.customBackgroundUrl,
            x: 40,
            y: 40,
            width: 920,
            height: 540,
            preserveAspectRatio: 'xMidYMid slice',
            opacity: 0.86,
            class: 'map-background-image',
          }),
          h('rect', { x: 40, y: 40, width: 920, height: 540, fill: 'rgba(2, 6, 23, 0.20)' }),
        )
      } else if (props.mapBackground === 'track') {
        common.push(
          h('rect', { x: 40, y: 40, width: 920, height: 540, rx: 26, fill: '#153f2f', opacity: 0.98 }),
          h('path', {
            d: 'M240 128 H760 A190 190 0 0 1 760 492 H240 A190 190 0 0 1 240 128 Z M260 192 H740 A126 126 0 0 1 740 428 H260 A126 126 0 0 1 260 192 Z',
            fill: '#a94b30',
            stroke: 'rgba(255, 218, 145, 0.72)',
            'stroke-width': 2,
            'fill-rule': 'evenodd',
            class: 'campus-track-bg',
          }),
          ...[0, 1, 2, 3].map((lane) =>
            h('path', {
              key: `lane-${lane}`,
              d: `M${250 + lane * 10} ${144 + lane * 12} H${750 - lane * 10} A${174 - lane * 12} ${174 - lane * 12} 0 0 1 ${750 - lane * 10} ${476 - lane * 12} H${250 + lane * 10} A${174 - lane * 12} ${174 - lane * 12} 0 0 1 ${250 + lane * 10} ${144 + lane * 12} Z`,
              fill: 'none',
              stroke: 'rgba(255, 255, 255, 0.26)',
              'stroke-width': 1.3,
            }),
          ),
          h('rect', { x: 332, y: 236, width: 336, height: 148, rx: 22, fill: '#1f7a49', opacity: 0.92 }),
          h('text', { x: 500, y: 314, fill: 'rgba(232, 255, 240, 0.46)', 'text-anchor': 'middle', class: 'track-watermark' }, 'CAMPUS TRACK'),
        )
      } else if (props.mapBackground === 'field') {
        common.push(
          h('rect', { x: 40, y: 40, width: 920, height: 540, rx: 26, fill: '#0f3d2e' }),
          ...Array.from({ length: 12 }, (_, index) =>
            h('rect', {
              key: `grass-${index}`,
              x: 40 + index * 78,
              y: 40,
              width: 39,
              height: 540,
              fill: index % 2 ? 'rgba(46, 230, 132, 0.10)' : 'rgba(255, 255, 255, 0.03)',
            }),
          ),
        )
      } else {
        common.push(h('rect', { x: 40, y: 40, width: 920, height: 540, rx: 18, fill: 'rgba(246, 251, 255, 0.94)' }))
      }

      common.push(
        h('g', { class: 'xy-axis-indicator' }, [
          h('line', { x1: 74, y1: 548, x2: 138, y2: 548, stroke: '#ffb84d', 'stroke-width': 3 }),
          h('polygon', { points: '138,548 128,543 128,553', fill: '#ffb84d' }),
          h('text', { x: 146, y: 553, fill: '#ffda91' }, 'X'),
          h('line', { x1: 74, y1: 548, x2: 74, y2: 484, stroke: '#ffb84d', 'stroke-width': 3 }),
          h('polygon', { points: '74,484 69,494 79,494', fill: '#ffb84d' }),
          h('text', { x: 66, y: 476, fill: '#ffda91' }, 'Y'),
          h('circle', { cx: 74, cy: 548, r: 4, fill: '#ffb84d' }),
        ]),
      )

      return common
    }

    return () => {
      const transform = `translate(${pan.value.x} ${pan.value.y}) scale(${zoom.value})`
      return h(
        'svg',
        {
          ref: svgRef,
          class: ['track-map', { dragging: isPanning.value, 'pan-enabled': props.panEnabled }],
          viewBox: '0 0 1000 620',
          preserveAspectRatio: 'xMidYMid meet',
          onWheel: handleWheel,
          onMousedown: handleMouseDown,
          onMousemove: handleMouseMove,
          onMouseup: stopPanning,
          onMouseleave: () => {
            stopPanning()
            pointer.value = null
          },
          onContextmenu: (event) => event.preventDefault(),
          onDblclick: resetView,
        },
        [
          ...renderMapBackground(),
          h('g', { transform }, [
            h(
              'g',
              { class: 'grid-lines' },
              [
                ...props.gridX.map((x) =>
                  h('line', {
                    key: `x-${x}`,
                    x1: x,
                    y1: 40,
                    x2: x,
                    y2: 580,
                    stroke: 'rgba(71, 85, 105, 0.18)',
                    'stroke-width': 1,
                  }),
                ),
                ...props.gridY.map((y) =>
                  h('line', {
                    key: `y-${y}`,
                    x1: 40,
                    y1: y,
                    x2: 960,
                    y2: y,
                    stroke: 'rgba(71, 85, 105, 0.18)',
                    'stroke-width': 1,
                  }),
                ),
              ],
            ),
            ...props.raceLines.map((line) =>
              h('g', { key: `race-line-${line.key}`, class: ['race-line-layer', line.key] }, [
                h('line', {
                  x1: line.start.sx,
                  y1: line.start.sy,
                  x2: line.end.sx,
                  y2: line.end.sy,
                  stroke: line.color,
                  'stroke-width': 5,
                  'stroke-linecap': 'round',
                  'stroke-dasharray': line.key === 'start' ? '14 8' : 'none',
                  class: 'race-mark-line',
                }),
                h('text', {
                  x: (line.start.sx + line.end.sx) / 2 + 8,
                  y: (line.start.sy + line.end.sy) / 2 - 8,
                  fill: line.color,
                  class: 'race-mark-label',
                }, line.label),
              ]),
            ),
            props.replayPolyline
              ? h('polyline', {
                  points: props.replayPolyline,
                  fill: 'none',
                  stroke: '#d97706',
                  'stroke-width': 5,
                  'stroke-dasharray': '12 8',
                  class: 'replay-line',
                })
              : null,
            ...props.replaySeries.map((series) =>
              series.polyline
                ? h('polyline', {
                    key: `replay-line-${series.tagId}`,
                    points: series.polyline,
                    fill: 'none',
                    stroke: series.color,
                    'stroke-width': 4,
                    'stroke-dasharray': '12 8',
                    class: 'replay-line',
                  })
                : null,
            ),
            ...props.tags.map((tag) =>
              props.showTracks && tag.path
                ? h('polyline', {
                    key: `track-${tag.id}`,
                  points: tag.path,
                  stroke: tag.color,
                  fill: 'none',
                  'stroke-width': 3,
                  class: 'tag-line',
                })
                : null,
            ),
            ...props.anchors.map((anchor) =>
              h('g', { key: anchor.id }, [
                h('rect', {
                  x: anchor.sx - anchor.shapeSize / 2,
                  y: anchor.sy - anchor.shapeSize / 2,
                  width: anchor.shapeSize,
                  height: anchor.shapeSize,
                  rx: 4,
                  fill: anchor.color,
                  stroke: 'rgba(15, 23, 42, 0.82)',
                  'stroke-width': 3,
                  class: 'anchor-dot',
                }),
                h(
                  'text',
                  {
                    x: anchor.sx + 16,
                    y: anchor.sy + 5,
                    style: { fill: anchor.color, fontSize: `${anchor.fontSize}px` },
                    class: 'anchor-label',
                  },
                  anchor.id,
                ),
              ]),
            ),
            ...props.tags.map((tag) =>
              h('g', { key: `tag-${tag.id}` }, [
                h('circle', {
                  cx: tag.sx,
                  cy: tag.sy,
                  r: tag.shapeSize / 2,
                  fill: tag.color,
                  stroke: 'rgba(15, 23, 42, 0.82)',
                  'stroke-width': 3,
                  class: 'tag-dot',
                }),
                h(
                  'text',
                  {
                    x: tag.sx + 15,
                    y: tag.sy + 5,
                    style: { fill: tag.color, fontSize: `${tag.fontSize}px` },
                    class: 'tag-label',
                  },
                  tag.name,
                ),
              ]),
            ),
            props.replayPoint
              ? h('g', [
                  h('circle', {
                    cx: props.replayPoint.sx,
                    cy: props.replayPoint.sy,
                    r: props.replayPoint.shapeSize / 2,
                    fill: '#d97706',
                    stroke: '#111827',
                    'stroke-width': 4,
                    class: 'replay-dot',
                  }),
                  h(
                    'text',
                    { x: props.replayPoint.sx + 18, y: props.replayPoint.sy - 12, class: 'replay-label' },
                    props.replayLabel,
                  ),
                ])
              : null,
            ...props.replaySeries.map((series) =>
              series.point
                ? h('g', { key: `replay-dot-${series.tagId}` }, [
                    h('circle', {
                      cx: series.point.sx,
                      cy: series.point.sy,
                      r: (series.shapeSize ?? 28) / 2,
                      fill: series.color,
                      stroke: '#111827',
                      'stroke-width': 4,
                      class: 'replay-dot',
                    }),
                    h(
                      'text',
                      { x: series.point.sx + 18, y: series.point.sy - 12, class: 'replay-label', style: { fill: series.color } },
                      series.label,
                    ),
                  ])
                : null,
            ),
          ]),
          pointer.value
            ? h('g', { class: 'coord-pointer' }, [
                h('line', {
                  x1: pointer.value.sx,
                  y1: 40,
                  x2: pointer.value.sx,
                  y2: 580,
                  stroke: 'rgba(14, 116, 144, 0.72)',
                  'stroke-width': 1.4,
                  'stroke-dasharray': '8 7',
                }),
                h('line', {
                  x1: 40,
                  y1: pointer.value.sy,
                  x2: 960,
                  y2: pointer.value.sy,
                  stroke: 'rgba(14, 116, 144, 0.72)',
                  'stroke-width': 1.4,
                  'stroke-dasharray': '8 7',
                }),
                h('circle', { cx: pointer.value.sx, cy: pointer.value.sy, r: 5, fill: '#0e7490', stroke: '#ffffff' }),
                h('rect', {
                  x: pointer.value.sx - 42,
                  y: 586,
                  width: 84,
                  height: 24,
                  rx: 6,
                  fill: 'rgba(255, 255, 255, 0.94)',
                  stroke: 'rgba(14, 116, 144, 0.72)',
                }),
                h('text', { x: pointer.value.sx, y: 603, fill: '#0f3f4b', 'text-anchor': 'middle' }, `X ${pointer.value.x.toFixed(2)}`),
                h('rect', {
                  x: 44,
                  y: pointer.value.sy - 13,
                  width: 84,
                  height: 24,
                  rx: 6,
                  fill: 'rgba(255, 255, 255, 0.94)',
                  stroke: 'rgba(14, 116, 144, 0.72)',
                }),
                h('text', { x: 86, y: pointer.value.sy + 4, fill: '#0f3f4b', 'text-anchor': 'middle' }, `Y ${pointer.value.y.toFixed(2)}`),
                h('rect', {
                  x: pointer.value.sx + 12,
                  y: pointer.value.sy - 34,
                  width: 150,
                  height: 28,
                  rx: 6,
                  fill: 'rgba(255, 255, 255, 0.94)',
                  stroke: 'rgba(14, 116, 144, 0.72)',
                }),
                h(
                  'text',
                  { x: pointer.value.sx + 22, y: pointer.value.sy - 15, fill: '#0f3f4b' },
                  `x:${pointer.value.x.toFixed(2)} y:${pointer.value.y.toFixed(2)}`,
                ),
              ])
            : null,
        ],
      )
    }
  },
})

const connectionStatus = computed(() => {
  if (serialConnected.value) return `串口已连接，波特率 ${baudRate.value}`
  if (httpConnected.value) {
    const mode = httpStreamConnected.value ? 'SSE' : httpStreamConnecting.value ? 'SSE连接中' : 'polling'
    return `后端数据库已连接（${mode}），本次接收 ${liveRecordCount.value} 条，数据库游标 ${uwbLastId.value || 0}`
  }
  return '未连接'
})

const onlineTags = computed(() =>
  tags.value.filter((tag) => !tag.updatedAt || onlineNow.value - tag.updatedAt <= OFFLINE_TAG_TIMEOUT_MS),
)

const tagRows = computed(() =>
  onlineTags.value
    .slice()
    .sort((a, b) => a.id - b.id)
    .map((tag) => {
      const binding = getRunnerBinding(tag.id)
      const boundTag = {
        ...tag,
        uid: binding ? binding.uid || tag.sourceUid || tag.uid : tag.sourceUid ?? tag.uid,
        username: binding ? binding.username || tag.sourceUsername || tag.username : tag.sourceUsername ?? tag.username,
        runnerGroup: binding ? binding.group || tag.sourceRunnerGroup || tag.runnerGroup : tag.sourceRunnerGroup ?? tag.runnerGroup,
      }
      return {
        ...boundTag,
        raceDistance: Number(boundTag.raceDistance ?? 0),
        speed: Number(boundTag.speed ?? 0),
        elapsedMs: Number(boundTag.elapsedMs ?? 0),
        raceStatusText: getRaceStatusText(boundTag),
        updatedAtText: boundTag.updatedAt ? new Date(boundTag.updatedAt).toLocaleTimeString() : '--',
      }
    }),
)

const rankUnitLabel = computed(() => {
  if (leaderboardSortKey.value === 'speed') return 'M/S'
  if (leaderboardSortKey.value === 'score') return 'SCORE'
  if (leaderboardSortKey.value === 'updated') return 'TIME'
  return 'M'
})

const leaderboardRows = computed(() =>
  tagRows.value
    .slice()
    .sort((a, b) => getRankSortValue(b) - getRankSortValue(a))
    .slice(0, 12),
)

const activeRunner = computed(() => {
  const selected = tagRows.value.find((item) => item.name === selectedTagName.value)
  if (selected) return selected
  return leaderboardRows.value[0] ?? tagRows.value.slice().sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0] ?? null
})

const activeMapBackgroundUrl = computed(() => uploadedMapBackgroundUrl.value || customMapBackgroundUrl.value)

const replayTagOptions = computed(() => {
  const byTagId = new Map()
  tagRows.value.forEach((tag) => {
    byTagId.set(tag.id, {
      value: tag.id,
      label: `${tag.name}${tag.username || tag.uid ? ` · ${tag.username || tag.uid}` : ''}`,
    })
  })
  runnerBindings.value.forEach((binding) => {
    const tagId = normalizeTagId(binding.tagId)
    if (tagId == null || byTagId.has(tagId)) return
    byTagId.set(tagId, {
      value: tagId,
      label: `Tag${tagId}${binding.username || binding.uid ? ` · ${binding.username || binding.uid}` : ''}`,
    })
  })
  replaySeries.value.forEach((series) => {
    const tagId = normalizeTagId(series.tagId)
    if (tagId == null || byTagId.has(tagId)) return
    byTagId.set(tagId, {
      value: tagId,
      label: series.label || `Tag${tagId}`,
    })
  })
  return Array.from(byTagId.values()).sort((a, b) => a.value - b.value)
})

const replayTotalPoints = computed(() => replaySeries.value.reduce((sum, series) => sum + (series.points?.length ?? 0), 0))

const replayMaxIndex = computed(() =>
  Math.max(0, ...replaySeries.value.map((series) => Math.max(0, (series.points?.length ?? 0) - 1))),
)

const replayPointText = computed(() => {
  if (replaySeries.value.length === 0) return '--'
  const activeCount = replaySeries.value.filter((series) => series.points?.length).length
  return `${activeCount} 个标签 / ${replayTotalPoints.value} 个历史点`
})

const mapBounds = computed(() => {
  const points = anchors.value.filter((anchor) => isAnchorVisible(anchor.id)).map(({ x, y }) => ({ x, y }))
  Object.values(raceLines.value).forEach((line) => {
    points.push({ x: line.x1, y: line.y1 }, { x: line.x2, y: line.y2 })
  })
  onlineTags.value.forEach((tag) => {
    if (!isTagVisible(tag.name)) return
    if (tag.position) points.push(tag.position)
    tag.track.slice(-trackPointLimit.value).forEach((point) => points.push(point))
  })
  replaySeries.value.forEach((series) => {
    series.points?.forEach((point) => points.push(point))
  })

  const xs = points.map((point) => Number(point.x)).filter(Number.isFinite)
  const ys = points.map((point) => Number(point.y)).filter(Number.isFinite)
  const minX = Math.min(...xs, 0)
  const maxX = Math.max(...xs, 1)
  const minY = Math.min(...ys, 0)
  const maxY = Math.max(...ys, 1)
  const padX = Math.max((maxX - minX) * 0.12, 1)
  const padY = Math.max((maxY - minY) * 0.12, 1)

  return {
    minX: minX - padX,
    maxX: maxX + padX,
    minY: minY - padY,
    maxY: maxY + padY,
  }
})

const drawableAnchors = computed(() =>
  anchors.value
    .filter((anchor) => isAnchorVisible(anchor.id))
    .map((anchor) => ({
      ...anchor,
      ...toScreenPoint(anchor),
      color: anchorStyles.value[anchor.id]?.color ?? '#00d6a3',
      fontSize: anchorStyles.value[anchor.id]?.fontSize ?? 20,
      shapeSize: anchorStyles.value[anchor.id]?.shapeSize ?? 24,
    })),
)

const drawableRaceLines = computed(() =>
  ['start', 'finish'].map((key) => {
    const line = raceLines.value[key]
    return {
      ...line,
      key,
      label: line.label ?? (key === 'start' ? '起点线' : '终点线'),
      color: key === 'start' ? '#5fffe0' : '#ffb84d',
      start: toScreenPoint({ x: line.x1, y: line.y1 }),
      end: toScreenPoint({ x: line.x2, y: line.y2 }),
    }
  }),
)

const drawableTags = computed(() =>
  onlineTags.value
    .filter((tag) => tag.position)
    .map((tag, index) => {
      const screen = toScreenPoint(tag.position)
      const recent = tag.track.slice(-trackPointLimit.value).map(toScreenPoint)
      const style = ensureTagStyle(tag.name, index)
      if (style.visible === false) return null
      return {
        ...tag,
        ...screen,
        color: style.color,
        fontSize: style.fontSize,
        shapeSize: style.shapeSize,
        path: recent.map((point) => `${point.sx},${point.sy}`).join(' '),
      }
    })
    .filter(Boolean),
)

const drawableReplaySeries = computed(() =>
  replaySeries.value.map((series, index) => {
    const style = ensureTagStyle(series.label || `Tag${series.tagId}`, index)
    const visiblePoints = (series.points || []).slice(0, Math.min(replayIndex.value + 1, series.points?.length ?? 0))
    const screenPoints = visiblePoints.map(toScreenPoint)
    return {
      ...series,
      color: style.color,
      shapeSize: style.shapeSize ?? 28,
      polyline: screenPoints.map((point) => `${point.sx},${point.sy}`).join(' '),
      point: screenPoints[screenPoints.length - 1] ?? null,
    }
  }),
)

watch(selectedReplayTags, () => {
  stopReplay()
  replayIndex.value = 0
  replayAllTags.value =
    replayTagOptions.value.length > 0 &&
    selectedReplayTags.value.length === replayTagOptions.value.length
  fetchReplayTracks()
})

watch(replayAllTags, (checked) => {
  if (!checked) return
  selectedReplayTags.value = replayTagOptions.value.map((item) => item.value)
})

watch(replayMaxIndex, (max) => {
  if (replayIndex.value > max) replayIndex.value = max
})

watch(replayIndex, () => {
  maybeLoadMoreReplay()
})

watch(replaySessionId, () => {
  stopReplay()
  replaySeries.value = []
  replayCursorId.value = 0
  replayHasMore.value = false
  replayIndex.value = 0
  if (selectedReplayTags.value.length > 0) fetchReplayTracks()
})

watch(
  runnerBindings,
  () => {
    normalizeRunnerBindingsInPlace()
    persistRunnerBindings()
  },
  { deep: true },
)


function loadRunnerBindings() {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(RUNNER_BINDINGS_STORAGE_KEY)
  if (!raw) return []
  const parsed = safeJsonParse(raw)
  if (!Array.isArray(parsed)) return []
  return parsed.map(normalizeRunnerBinding).filter(Boolean)
}

function persistRunnerBindings() {
  if (typeof window === 'undefined') return
  const normalized = runnerBindings.value.map(normalizeRunnerBinding).filter(Boolean)
  window.localStorage.setItem(RUNNER_BINDINGS_STORAGE_KEY, JSON.stringify(normalized))
}

async function loadBackendRunnerBindings() {
  try {
    const { data } = await request.get('api/uwb/bindings/')
    if (!Array.isArray(data?.bindings)) return
    runnerBindings.value = data.bindings.map(normalizeRunnerBinding).filter(Boolean)
    persistRunnerBindings()
  } catch {
    // 未登录或后端暂不可用时，继续使用本地绑定。
  }
}

async function saveRunnerBindingsToBackend() {
  const normalized = runnerBindings.value.map(normalizeRunnerBinding).filter(Boolean)
  if (normalized.length === 0) {
    ElMessage.warning('请先添加至少一组标签绑定')
    return
  }
  try {
    const { data } = await request.post('api/uwb/bindings/', { bindings: normalized, session_id: httpSessionId.value || undefined })
    runnerBindings.value = Array.isArray(data?.bindings) ? data.bindings.map(normalizeRunnerBinding).filter(Boolean) : normalized
    persistRunnerBindings()
    refreshStoredTagBindings()
    ElMessage.success(`绑定已保存，已回填 ${data?.backfilled_count ?? 0} 条历史数据`)
  } catch (error) {
    const detail = error.response?.data?.errors?.join('；') || error.response?.data?.error || error.response?.data?.detail || error.message
    ElMessage.error(`保存绑定失败：${detail}`)
  }
}

function refreshStoredTagBindings() {
  tagStore.forEach((tag, tagId) => {
    const binding = getRunnerBinding(tagId)
    if (!binding) return
    tagStore.set(tagId, {
      ...tag,
      uid: binding.uid || tag.uid,
      username: binding.username || tag.username,
      runnerGroup: binding.group || tag.runnerGroup,
    })
  })
  tagsDirty = true
  scheduleUiFlush()
}

function normalizeRunnerBinding(binding) {
  if (!binding || typeof binding !== 'object') return null
  const tagId = normalizeTagId(binding.tagId ?? binding.tag_id ?? binding.tag ?? binding.id)
  if (tagId == null) return null
  return {
    tagId,
    uid: normalizeUid(binding.uid ?? binding.userId ?? binding.user_id ?? binding.studentId ?? binding.student_id ?? binding.account ?? ''),
    username: String(binding.username ?? binding.name ?? binding.studentName ?? binding.student_name ?? '').trim(),
    group: String(binding.group ?? binding.className ?? binding.class_name ?? binding.remark ?? '').trim(),
  }
}

function normalizeRunnerBindingsInPlace() {
  runnerBindings.value.forEach((binding) => {
    const normalized = normalizeRunnerBinding(binding)
    if (!normalized) return
    binding.tagId = normalized.tagId
    binding.uid = normalized.uid
    binding.username = normalized.username
    binding.group = normalized.group
  })
}

function getRunnerBinding(tagId) {
  const normalizedTagId = normalizeTagId(tagId)
  if (normalizedTagId == null) return null
  return runnerBindings.value.find((binding) => normalizeTagId(binding.tagId) === normalizedTagId) ?? null
}

function addRunnerBinding() {
  const used = new Set(runnerBindings.value.map((item) => normalizeTagId(item.tagId)).filter((value) => value != null))
  const detected = tags.value.map((tag) => normalizeTagId(tag.id)).filter((value) => value != null)
  let nextTagId = detected.find((tagId) => !used.has(tagId))
  if (nextTagId == null) {
    nextTagId = 0
    while (used.has(nextTagId)) nextTagId += 1
  }
  runnerBindings.value.push({ tagId: nextTagId, uid: '', username: '', group: '' })
}

function seedBindingsFromTags() {
  const used = new Set(runnerBindings.value.map((item) => normalizeTagId(item.tagId)).filter((value) => value != null))
  let count = 0
  tags.value.forEach((tag) => {
    const tagId = normalizeTagId(tag.id)
    if (tagId == null || used.has(tagId)) return
    runnerBindings.value.push({
      tagId,
      uid: normalizeUid(tag.uid ?? ''),
      username: String(tag.username ?? '').trim(),
      group: String(tag.runnerGroup ?? '').trim(),
    })
    used.add(tagId)
    count += 1
  })
  if (count === 0) {
    ElMessage.info('当前没有新的标签可生成绑定')
  } else {
    ElMessage.success(`已生成 ${count} 组标签绑定`)
  }
}

function removeRunnerBinding(index) {
  runnerBindings.value.splice(index, 1)
}

function clearRunnerBindings() {
  runnerBindings.value = []
  persistRunnerBindings()
  request.post('api/uwb/bindings/', { bindings: [] }).catch(() => {})
}

function ensureTagStyle(name, index = 0) {
  if (!tagStyles.value[name]) {
    tagStyles.value[name] = {
      visible: true,
      color: palette[index % palette.length],
      fontSize: 20,
      shapeSize: 22,
    }
  }
  if (tagStyles.value[name].visible === undefined) tagStyles.value[name].visible = true
  return tagStyles.value[name]
}

function isAnchorVisible(anchorId) {
  return anchorStyles.value[anchorId]?.visible !== false
}

function isTagVisible(tagName) {
  return tagStyles.value[tagName]?.visible !== false
}

function cloneRaceLineRows(lines) {
  return ['start', 'finish'].map((key) => ({
    key,
    label: lines[key]?.label ?? (key === 'start' ? '起点线' : '终点线'),
    x1: Number(lines[key]?.x1 ?? 0),
    y1: Number(lines[key]?.y1 ?? 0),
    x2: Number(lines[key]?.x2 ?? 0),
    y2: Number(lines[key]?.y2 ?? 0),
  }))
}

function applyRaceLineDrafts() {
  if (raceLineDraftRows.value.some((line) => ![line.x1, line.y1, line.x2, line.y2].every((value) => Number.isFinite(Number(value))))) {
    ElMessage.warning('起终点线坐标必须是有效数字')
    return
  }
  const next = {}
  raceLineDraftRows.value.forEach((line) => {
    next[line.key] = {
      key: line.key,
      label: line.label,
      x1: Number(line.x1),
      y1: Number(line.y1),
      x2: Number(line.x2),
      y2: Number(line.y2),
    }
  })
  raceLines.value = next
  resetRaceProgress()
  ElMessage.success('起终点线已生效，累计距离已重置')
}

function cancelRaceLineDrafts() {
  raceLineDraftRows.value = cloneRaceLineRows(raceLines.value)
}

function resetRaceProgress() {
  raceStateByTag.clear()
  tagStore.forEach((tag, tagId) => {
    tagStore.set(tagId, {
      ...tag,
      raceDistance: 0,
      speed: 0,
      elapsedMs: 0,
      raceStarted: false,
      raceFinished: false,
      raceStatus: 'waiting',
    })
  })
  tagsDirty = true
  scheduleUiFlush()
}

function cloneAnchorList(list) {
  return list.map((anchor) => ({
    id: anchor.id,
    x: Number(anchor.x),
    y: Number(anchor.y),
    z: Number(anchor.z),
  }))
}

function applyAnchorDrafts() {
  if (
    anchorDrafts.value.some(
      (anchor) => !Number.isFinite(Number(anchor.x)) || !Number.isFinite(Number(anchor.y)) || !Number.isFinite(Number(anchor.z)),
    )
  ) {
    ElMessage.warning('基站坐标必须是有效数字')
    return
  }

  anchors.value = cloneAnchorList(anchorDrafts.value)
  resetTracksAfterAnchorChange()
  anchorAppliedDialogVisible.value = true
}

function cancelAnchorDrafts() {
  anchorDrafts.value = cloneAnchorList(anchors.value)
}

function resetTracksAfterAnchorChange() {
  tagStore.forEach((tag, tagId) => {
    tagStore.set(tagId, {
      ...tag,
      position: null,
      track: [],
    })
  })
  tagsDirty = true
  replayIndex.value = 0
  scheduleUiFlush()
}

function goBack() {
  router.push('/student/test')
}

async function selectSerialPort() {
  if (!('serial' in navigator)) {
    ElMessage.error('当前浏览器不支持 Web Serial，请使用 Chrome 或 Edge')
    return
  }
  try {
    serialPort.value = await navigator.serial.requestPort()
    ElMessage.success('串口已选择')
  } catch (error) {
    if (error.name !== 'NotFoundError') ElMessage.error(`选择串口失败：${error.message}`)
  }
}

async function connectSerial() {
  if (!serialPort.value) await selectSerialPort()
  if (!serialPort.value) return

  try {
    await serialPort.value.open({ baudRate: Number(baudRate.value) })
    serialConnected.value = true
    readSerialLoop()
  } catch (error) {
    serialConnected.value = false
    ElMessage.error(`串口连接失败：${error.message}`)
  }
}

async function readSerialLoop() {
  const textDecoder = new TextDecoderStream()
  serialReadableClosed.value = serialPort.value.readable.pipeTo(textDecoder.writable)
  serialReader.value = textDecoder.readable.getReader()

  try {
    while (serialConnected.value) {
      const { value, done } = await serialReader.value.read()
      if (done) break
      if (value) appendIncomingText(value)
    }
  } catch (error) {
    if (serialConnected.value) ElMessage.error(`串口读取失败：${error.message}`)
  }
}

async function disconnectSerial() {
  serialConnected.value = false
  try {
    if (serialReader.value) {
      await serialReader.value.cancel()
      serialReader.value.releaseLock()
    }
    if (serialReadableClosed.value) await serialReadableClosed.value.catch(() => {})
    if (serialPort.value) await serialPort.value.close()
  } catch (error) {
    ElMessage.warning(`串口关闭异常：${error.message}`)
  } finally {
    serialReader.value = null
    serialReadableClosed.value = null
  }
}

async function connectHttp() {
  await disconnectHttp()
  try {
    clearLiveDisplayData()
    const { data } = await request.get('api/uwb/latest/')
    httpSessionId.value = data?.record?.session_id || ''
    uwbLastId.value = Number(data?.last_id || 0)
    httpFetchFailCount = 0
    httpConnected.value = true
    connectUwbStream()
  } catch (error) {
    httpConnected.value = false
    closeUwbStream()
    ElMessage.error(`连接后端数据库失败：${error.response?.data?.detail || error.message}`)
  }
}

async function disconnectHttp() {
  const wasConnected = httpConnected.value
  httpConnected.value = false
  httpFetchPending = false
  httpFetchFailCount = 0
  closeUwbStream()
  if (httpTimer) window.clearInterval(httpTimer)
  httpTimer = null
  if (!wasConnected) return
  httpSessionId.value = ''
}

function connectUwbStream() {
  closeUwbStream()
  if (typeof EventSource === 'undefined') {
    httpStreamConnecting.value = false
    startHttpFallbackPolling()
    return
  }
  const streamUrl = `${baseURL}api/uwb/stream/?after_id=${encodeURIComponent(String(uwbLastId.value || 0))}`
  httpStreamConnecting.value = true
  uwbEventSource = new EventSource(streamUrl)
  uwbEventSource.onopen = () => {
    httpStreamConnecting.value = false
    httpStreamConnected.value = true
    stopHttpFallbackPolling()
  }
  uwbEventSource.addEventListener('uwb', (event) => {
    if (!httpConnected.value) return
    try {
      const payload = JSON.parse(event.data)
      const nextLastId = Number(payload?.last_id)
      if (Number.isFinite(nextLastId) && nextLastId > (uwbLastId.value || 0)) {
        uwbLastId.value = nextLastId
      }
      updateHttpSessionFromPayload(payload)
      liveRecordCount.value += Array.isArray(payload?.records) ? payload.records.length : 0
      httpFetchFailCount = 0
      consumeHttpPayload(payload)
    } catch (error) {
      console.warn('UWB stream parse failed', error)
    }
  })
  uwbEventSource.onerror = () => {
    if (!httpConnected.value) return
    httpStreamConnected.value = false
    if (uwbEventSource?.readyState === EventSource.CLOSED) {
      closeUwbStream()
      startHttpFallbackPolling()
      return
    }
    httpStreamConnecting.value = true
  }
}

function closeUwbStream() {
  if (uwbEventSource) {
    uwbEventSource.close()
    uwbEventSource = null
  }
  httpStreamConnecting.value = false
  httpStreamConnected.value = false
}

function startHttpFallbackPolling() {
  if (httpTimer || !httpConnected.value) return
  fetchHttpPayload()
  const interval = Math.max(100, Number(pollIntervalMs.value) || HTTP_FALLBACK_POLL_INTERVAL_MS)
  httpTimer = window.setInterval(fetchHttpPayload, interval)
}

function stopHttpFallbackPolling() {
  if (!httpTimer) return
  window.clearInterval(httpTimer)
  httpTimer = null
}

function clearLiveDisplayData() {
  tagStore.clear()
  imuByTag.clear()
  raceStateByTag.clear()
  pendingRawLines = []
  pendingParsedRecords = []
  pendingEvents = []
  tagsDirty = false
  cancelUiFlush()
  tags.value = []
  rawLines.value = []
  parsedJsonRows.value = []
  eventRows.value = []
  serialBuffer.value = ''
  selectedTagName.value = ''
  liveRecordCount.value = 0
  onlineNow.value = Date.now()
}

function updateHttpSessionFromPayload(payload) {
  const records = Array.isArray(payload?.records) ? payload.records : []
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const sessionId = records[index]?.session_id
    if (sessionId) {
      httpSessionId.value = sessionId
      return
    }
  }
}

async function fetchHttpPayload() {
  if (!httpConnected.value || httpFetchPending) return
  httpFetchPending = true
  try {
    const { data } = await request.get('api/uwb/fetch_inc_data/', {
      params: {
        after_id: uwbLastId.value || 0,
        limit: 200,
      },
    })
    if (Number.isFinite(Number(data?.last_id))) uwbLastId.value = Number(data.last_id)
    updateHttpSessionFromPayload(data)
    liveRecordCount.value += Array.isArray(data?.records) ? data.records.length : 0
    httpFetchFailCount = 0
    consumeHttpPayload(data)
  } catch (error) {
    httpFetchFailCount += 1
    if (httpFetchFailCount >= 3) {
      ElMessage.error(`后端数据库获取失败：${error.response?.data?.detail || error.message}`)
      disconnectHttp()
    }
  } finally {
    httpFetchPending = false
  }
}

async function fetchReplayTracks() {
  const tagIds = selectedReplayTags.value.map(normalizeTagId).filter((value) => value != null)
  if (tagIds.length === 0) {
    replaySeries.value = []
    replayIndex.value = 0
    replayCursorId.value = 0
    replayHasMore.value = false
    return
  }
  replayLoading.value = true
  try {
    replaySeries.value = []
    replayIndex.value = 0
    replayCursorId.value = 0
    replayHasMore.value = false
    await loadReplayWindow()
    if (replaySeries.value.length === 0 || replayTotalPoints.value === 0) {
      ElMessage.info('没有查询到可回放的轨迹点')
    }
  } catch (error) {
    ElMessage.error(`载入轨迹回放失败：${error.response?.data?.detail || error.response?.data?.error || error.message}`)
  } finally {
    replayLoading.value = false
  }
}

async function loadReplayWindow() {
  const tagIds = selectedReplayTags.value.map(normalizeTagId).filter((value) => value != null)
  if (tagIds.length === 0 || replayLoadingMore.value) return
  replayLoadingMore.value = true
  try {
    const { data } = await request.post('api/uwb/replay/window/', {
      tag_ids: tagIds,
      anchors: anchors.value,
      session_id: replaySessionId.value || undefined,
      cursor_id: replayCursorId.value || 0,
      limit: REPLAY_WINDOW_LIMIT,
    })
    mergeReplayWindow(data)
    replayCursorId.value = Number(data?.next_cursor_id ?? replayCursorId.value ?? 0)
    replayHasMore.value = Boolean(data?.has_more)
  } finally {
    replayLoadingMore.value = false
  }
}

function mergeReplayWindow(data) {
  const incoming = Array.isArray(data?.series) ? data.series : []
  const byTagId = new Map(replaySeries.value.map((series) => [normalizeTagId(series.tagId), series]))
  incoming.forEach((series) => {
    const tagId = normalizeTagId(series.tagId)
    if (tagId == null) return
    const binding = getRunnerBinding(tagId)
    const label = binding?.username || binding?.uid || series.username || series.uid || series.tagName || `Tag${tagId}`
    const points = Array.isArray(series.points) ? series.points.map(normalizeReplayPoint).filter(Boolean) : []
    if (!byTagId.has(tagId)) {
      const next = { ...series, tagId, label, points: [] }
      replaySeries.value.push(next)
      byTagId.set(tagId, next)
    }
    const target = byTagId.get(tagId)
    const usedIds = new Set(target.points.map((point) => point.recordId).filter(Boolean))
    points.forEach((point) => {
      if (point.recordId && usedIds.has(point.recordId)) return
      target.points.push(point)
      if (point.recordId) usedIds.add(point.recordId)
    })
  })
}

async function maybeLoadMoreReplay() {
  if (!replayHasMore.value || replayLoadingMore.value || replayLoading.value) return
  if (replayMaxIndex.value - replayIndex.value > Math.floor(REPLAY_WINDOW_LIMIT * 0.35)) return
  try {
    await loadReplayWindow()
  } catch (error) {
    ElMessage.error(`继续载入轨迹失败：${error.response?.data?.detail || error.response?.data?.error || error.message}`)
  }
}

async function loadReplaySessions() {
  try {
    const { data } = await request.get('api/uwb/sessions/')
    replaySessionOptions.value = Array.isArray(data?.sessions) ? data.sessions : []
  } catch {
    replaySessionOptions.value = []
  }
}

function handleReplaySessionDropdown(opened) {
  if (opened) loadReplaySessions()
}

function sessionLabel(session) {
  const count = Number(session.record_count ?? 0)
  const status = session.status ? ` · ${session.status}` : ''
  return `${session.name || session.session_id}${count ? ` · ${count}条` : ''}${status}`
}

function normalizeReplayPoint(point) {
  const position = normalizePosition(point)
  if (!position) return null
  return {
    ...position,
    at: Number(point.at ?? point.timestamp ?? 0),
    recordId: point.recordId,
    frame: point.frame,
    distances: normalizeDistanceList(point.distances),
  }
}

function consumeHttpPayload(payload) {
  if (payload == null) return

  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload)
      consumeHttpPayload(parsed)
    } catch {
      appendIncomingText(payload)
    }
    return
  }

  if (Array.isArray(payload)) {
    payload.forEach(consumeHttpPayload)
    return
  }

  if (Array.isArray(payload.lines)) {
    payload.lines.forEach((line) => appendCompleteLine(String(line)))
    return
  }

  if (Array.isArray(payload.records)) {
    consumeHttpRecordBatch(payload.records)
    return
  }

  if (typeof payload.raw_line === 'string' || typeof payload.raw === 'string') {
    appendRawLineOnly(payload.raw_line || payload.raw)
  }

  if (typeof payload.line === 'string') {
    appendCompleteLine(payload.line)
    return
  }

  if (typeof payload.data === 'string') {
    appendIncomingText(payload.data)
    return
  }

  const unified = parseUnifiedJsonRecord(payload, 'http')
  if (unified) {
    applyUnifiedDisplayRecord(unified, JSON.stringify(payload))
    return
  }

  const parsed = parseStructuredRecord(payload)
  if (parsed) applyParsedRecord(parsed, JSON.stringify(payload), 'http')
}

function consumeHttpRecordBatch(records) {
  if (!Array.isArray(records) || records.length === 0) return

  const latestByTagAndType = new Map()
  const fallbackRecords = []

  records.forEach((record) => {
    const rawLine = record?.raw_line || record?.raw
    if (typeof rawLine === 'string' && rawLine.trim()) {
      pendingRawLines.push({ id: `${Date.now()}-${Math.random()}`, text: rawLine.trim() })
    }

    const unified = parseUnifiedJsonRecord(record, 'http')
    if (!unified) {
      fallbackRecords.push(record)
      return
    }

    const tagId = normalizeTagId(unified.uwb?.tagId ?? unified.skeletal_point?.tagId ?? unified.uid)
    if (tagId == null) {
      fallbackRecords.push(record)
      return
    }
    const type = String(unified.uwb?.type ?? unified.type ?? 'JSON').toUpperCase()
    const key = `${tagId}:${type === 'MOT' ? 'MOT' : 'RNG'}`
    latestByTagAndType.set(key, {
      id: Number(record?.id ?? 0),
      unified,
      sourceText: rawLine || JSON.stringify(record),
    })
  })

  Array.from(latestByTagAndType.values())
    .sort((a, b) => a.id - b.id)
    .forEach((item) => applyUnifiedDisplayRecord(item.unified, item.sourceText))

  fallbackRecords.slice(-4).forEach((record) => {
    if (typeof record?.line === 'string' || typeof record?.data === 'string') {
      consumeHttpPayload(record)
      return
    }
    const parsed = parseStructuredRecord(record)
    if (parsed) applyParsedRecord(parsed, JSON.stringify(record), 'http')
  })

  scheduleUiFlush()
}

function appendRawLineOnly(line) {
  const text = String(line || '').trim()
  if (!text) return
  pendingRawLines.push({ id: `${Date.now()}-${Math.random()}`, text })
  scheduleUiFlush()
}

function appendIncomingText(text) {
  serialBuffer.value += text
  const pieces = serialBuffer.value.split(/\r?\n/)
  serialBuffer.value = pieces.pop() ?? ''
  pieces.forEach(appendCompleteLine)
}

function appendCompleteLine(line) {
  const text = line.trim()
  if (!text) return

  pendingRawLines.push({ id: `${Date.now()}-${Math.random()}`, text })

  const parsed = parseSerialLine(text)
  if (parsed) applyParsedRecord(parsed, text, 'serial')

  scheduleUiFlush()
}

function parseSerialLine(line) {
  const rng = line.match(/^RNG,Tag(\d+),(\d+),(\d+),(.+)$/i)
  if (rng) {
    const distances = rng[4]
      .split(',')
      .slice(0, 4)
      .map((value) => {
        const trimmed = value.trim()
        if (/^NA$/i.test(trimmed)) return null
        const mm = Number(trimmed)
        return Number.isFinite(mm) ? mm / 1000 : null
      })
    while (distances.length < 4) distances.push(null)
    return {
      type: 'RNG',
      tagId: Number(rng[1]),
      cycle: Number(rng[2]),
      timestampUs: Number(rng[3]),
      distances,
    }
  }

  const motion = line.match(/^MOT,Tag(\d+),(\d+),(\d+),(.+)$/i)
  if (motion) {
    return {
      type: 'MOT',
      tagId: Number(motion[1]),
      cycle: Number(motion[2]),
      timestampUs: Number(motion[3]),
      motionPayload: motion[4],
      motionData: parseMotionPayload(motion[4]),
    }
  }

  return null
}

function parseStructuredRecord(record) {
  const tagValue = record.tagId ?? record.tag_id ?? record.tag ?? record.id
  const tagId = normalizeTagId(tagValue)
  if (tagId == null) return null

  const rawDistances = record.distances ?? record.distance ?? record.ranges ?? record.rng
  if (!rawDistances) return null

  const distances = Array.isArray(rawDistances)
    ? rawDistances
    : [rawDistances.A0, rawDistances.A1, rawDistances.A2, rawDistances.A3]
  const normalized = distances.slice(0, 4).map(normalizeDistance)
  while (normalized.length < 4) normalized.push(null)

  return {
    type: 'RNG',
    tagId,
    cycle: Number(record.cycle ?? record.seq ?? 0),
    timestampUs: Number(record.timestampUs ?? record.time_us ?? record.ts ?? 0),
    distances: normalized,
  }
}

function normalizeTagId(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const matched = value.match(/\d+/)
  return matched ? Number(matched[0]) : null
}

function normalizeDistance(value) {
  if (value == null || /^NA$/i.test(String(value))) return null
  const distance = Number(value)
  if (!Number.isFinite(distance)) return null
  return distance > 100 ? distance / 1000 : distance
}

function applyParsedRecord(record, sourceText, source = 'serial') {
  const unified = buildUnifiedRecordFromParsed(record, sourceText, source)
  applyUnifiedDisplayRecord(unified, sourceText)
}

function buildUnifiedRecordFromParsed(record, sourceText, source = 'serial') {
  const loginUser = getLoginUser()
  const tagName = record.tagId != null ? `Tag${record.tagId}` : ''
  const binding = getRunnerBinding(record.tagId)
  const uid = normalizeUid(binding?.uid ?? record.uid ?? loginUser.uid ?? record.tagId ?? tagName)
  const username = binding?.username ?? record.username ?? record.name ?? loginUser.username ?? ''
  const timestamp = normalizeTimestampMs(record.timestamp ?? record.timestampMs) ?? normalizeTimestampMs(record.timestampUs, 'us') ?? Date.now()
  const distances = Array.isArray(record.distances) ? record.distances.slice(0, 4) : null
  const skeletalPoint = {
    type: record.type === 'RNG' ? 'uwb_tag' : 'imu_motion',
    tagId: record.tagId,
    name: tagName,
    position: normalizePosition(record.position),
    distances: distancesToObject(distances),
    imu: record.motionData ?? null,
  }

  return {
    uid,
    username,
    runnerGroup: binding?.group ?? '',
    frame: Number(record.frame ?? record.cycle ?? 0),
    score: normalizeNullableNumber(record.score),
    timestamp,
    painting: buildPaintingPayload(record, skeletalPoint.position),
    angle: extractAngle(record),
    skeletal_point: skeletalPoint,
    uwb: {
      type: record.type,
      tagId: record.tagId,
      tagName,
      cycle: Number(record.cycle ?? record.frame ?? 0),
      timestampUs: Number(record.timestampUs ?? 0),
      distances,
      position: skeletalPoint.position,
    },
    source,
    raw: sourceText,
  }
}

function parseUnifiedJsonRecord(record, source = 'http') {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null

  const hasUnifiedShape =
    Object.prototype.hasOwnProperty.call(record, 'uid') ||
    Object.prototype.hasOwnProperty.call(record, 'frame') ||
    Object.prototype.hasOwnProperty.call(record, 'score') ||
    Object.prototype.hasOwnProperty.call(record, 'painting') ||
    Object.prototype.hasOwnProperty.call(record, 'angle') ||
    Object.prototype.hasOwnProperty.call(record, 'skeletal_point') ||
    Object.prototype.hasOwnProperty.call(record, 'uwb')

  if (!hasUnifiedShape) return null

  const loginUser = getLoginUser()
  const skeletal = record.skeletal_point ?? record.skeletalPoint ?? {}
  const uwb = record.uwb ?? {}
  const tagValue = record.tagId ?? record.tag_id ?? uwb.tagId ?? uwb.tag_id ?? skeletal.tagId ?? skeletal.tag_id ?? skeletal.tag
  const tagId = normalizeTagId(tagValue ?? record.uid)
  const tagName = skeletal.name ?? uwb.tagName ?? uwb.tag_name ?? (tagId != null ? `Tag${tagId}` : '')
  const binding = getRunnerBinding(tagId)
  const rawDistances = record.distances ?? uwb.distances ?? skeletal.distances ?? record.ranges ?? uwb.ranges
  const distances = normalizeDistanceList(rawDistances)
  const position = normalizePosition(record.position ?? uwb.position ?? skeletal.position ?? skeletal.point ?? skeletal)
  const imu = record.imu ?? uwb.imu ?? skeletal.imu ?? null
  const timestamp =
    normalizeTimestampMs(record.timestamp ?? record.timestampMs) ??
    normalizeTimestampMs(record.timestamp_us, 'us') ??
    normalizeTimestampMs(uwb.timestampUs, 'us') ??
    Date.now()

  return {
    uid: normalizeUid(binding?.uid ?? record.uid ?? loginUser.uid ?? tagId ?? ''),
    username: binding?.username ?? record.username ?? record.name ?? loginUser.username ?? '',
    runnerGroup: binding?.group ?? record.runnerGroup ?? record.group ?? '',
    frame: Number(record.frame ?? record.cycle ?? uwb.cycle ?? 0),
    score: normalizeNullableNumber(record.score),
    timestamp,
    painting: Array.isArray(record.painting) ? record.painting : buildPaintingPayload({ distances }, position),
    angle: normalizeNullableNumber(record.angle),
    skeletal_point: {
      ...skeletal,
      type: skeletal.type ?? 'uwb_tag',
      tagId,
      name: tagName,
      position,
      distances: distancesToObject(distances),
      imu,
    },
    uwb: {
      ...uwb,
      type: uwb.type ?? record.type ?? (distances ? 'RNG' : 'JSON'),
      tagId,
      tagName,
      cycle: Number(uwb.cycle ?? record.cycle ?? record.frame ?? 0),
      timestampUs: Number(uwb.timestampUs ?? record.timestampUs ?? record.timestamp_us ?? 0),
      distances,
      position,
    },
    source,
    raw: record.raw ?? '',
  }
}

function applyUnifiedDisplayRecord(record, sourceText = '') {
  if (!record) return

  const now = Date.now()
  const uwb = record.uwb ?? {}
  const tagId = normalizeTagId(uwb.tagId ?? record.skeletal_point?.tagId ?? record.uid)
  const type = String(uwb.type ?? record.type ?? 'JSON').toUpperCase()
  const distances = normalizeDistanceList(uwb.distances ?? record.skeletal_point?.distances ?? record.distances)
  const providedPosition = normalizePosition(uwb.position ?? record.skeletal_point?.position ?? record.position)

  if (type === 'MOT' && tagId != null) {
    imuByTag.set(tagId, {
      ...(record.skeletal_point?.imu ?? record.imu ?? {}),
      cycle: Number(uwb.cycle ?? record.frame ?? 0),
      timestampUs: Number(uwb.timestampUs ?? 0),
      receivedAt: now,
    })
    appendParsedJsonRecord(record)
    pushUnifiedEvent(record, sourceText, now)
    return
  }

  let measuredPosition = providedPosition
  if (!measuredPosition && distances) measuredPosition = locatePosition(distances)

  const currentTag = tagId != null ? tagStore.get(tagId) : null
  const position = filterPositionWithImu(tagId, measuredPosition, currentTag, now)
  record.uwb = {
    ...uwb,
    type,
    tagId,
    distances,
    position,
  }
  record.skeletal_point = {
    ...(record.skeletal_point ?? {}),
    tagId,
    position,
    distances: distancesToObject(distances),
  }
  record.painting = buildPaintingPayload({ distances }, position)

  appendParsedJsonRecord(record)
  pushUnifiedEvent(record, sourceText, now)

  if (tagId == null || (!distances && !position)) return

  const binding = getRunnerBinding(tagId)
  const tagName = record.skeletal_point?.name || uwb.tagName || (tagId != null ? `Tag${tagId}` : record.username)
  const raceProgress = updateRaceProgress(tagId, position, now)

  const nextTag = {
    id: tagId,
    name: tagName,
    cycle: Number(record.frame ?? uwb.cycle ?? 0),
    timestampUs: Number(uwb.timestampUs ?? 0),
    timestamp: record.timestamp,
    uid: binding?.uid ?? record.uid,
    username: binding?.username ?? record.username,
    runnerGroup: binding?.group ?? record.runnerGroup ?? record.group ?? '',
    sourceUid: record.uid,
    sourceUsername: record.username,
    sourceRunnerGroup: record.runnerGroup ?? record.group ?? '',
    score: record.score,
    angle: record.angle,
    distances: distances ?? [null, null, null, null],
    position,
    raceDistance: raceProgress.distance,
    speed: raceProgress.speed,
    elapsedMs: raceProgress.elapsedMs,
    raceStarted: raceProgress.started,
    raceFinished: raceProgress.finished,
    raceStatus: raceProgress.status,
    updatedAt: now,
    track: [],
  }

  ensureTagStyle(nextTag.name, tagStore.size)

  if (currentTag) {
    nextTag.track = currentTag.track
    if (position) nextTag.track.push({ ...position, at: now })
    if (nextTag.track.length > MAX_TRACK_POINTS) {
      nextTag.track.splice(0, nextTag.track.length - MAX_TRACK_POINTS)
    }
    tagStore.set(tagId, nextTag)
    tagsDirty = true
    scheduleUiFlush()
    return
  }

  if (tagStore.size >= MAX_TAGS) {
    ElMessage.warning('标签数量已达到 30 个')
    return
  }

  if (position) nextTag.track.push({ ...position, at: now })
  tagStore.set(tagId, nextTag)
  tagsDirty = true
  scheduleUiFlush()
}

function appendParsedJsonRecord(record) {
  const { raw, ...displayRecord } = record
  pendingParsedRecords.push({
    id: `${Date.now()}-${Math.random()}`,
    pretty: JSON.stringify(displayRecord, null, 2),
    data: displayRecord,
  })
  scheduleUiFlush()
}

function pushUnifiedEvent(record, sourceText, now) {
  const uwb = record.uwb ?? {}
  const tagId = normalizeTagId(uwb.tagId ?? record.skeletal_point?.tagId ?? record.uid)
  const type = String(uwb.type ?? record.type ?? 'JSON').toUpperCase()
  const distances = normalizeDistanceList(uwb.distances ?? record.skeletal_point?.distances ?? record.distances)
  pendingEvents.push({
    time: new Date(now).toLocaleTimeString(),
    tag: tagId != null ? record.skeletal_point?.name || uwb.tagName || `Tag${tagId}` : record.username || '--',
    type,
    summary:
      type === 'RNG' && distances
        ? distances.map((distance) => formatDistance(distance)).join(' / ')
        : sourceText.slice(0, 80) || `frame=${record.frame ?? '--'} score=${record.score ?? '--'}`,
  })
  scheduleUiFlush()
}

function getLoginUser() {
  if (typeof window === 'undefined') return { uid: '', username: '' }
  const keys = ['userInfo', 'user', 'student', 'loginUser', 'profile']
  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (const key of keys) {
      const raw = storage.getItem(key)
      if (!raw) continue
      const parsed = safeJsonParse(raw)
      const value = parsed && typeof parsed === 'object' ? parsed : { uid: raw }
      const uid = value.uid ?? value.userId ?? value.user_id ?? value.id ?? value.username ?? value.account
      const username = value.username ?? value.name ?? value.nickname ?? value.account ?? ''
      if (uid != null || username) return { uid: normalizeUid(uid ?? username), username: String(username) }
    }
  }
  return { uid: '', username: '' }
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function normalizeUid(value) {
  if (value == null) return ''
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const text = String(value).trim()
  return text === '' ? '' : text
}

function normalizeNullableNumber(value) {
  if (value == null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function normalizeTimestampMs(value, unit = 'auto') {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return null
  if (unit === 'us') return Math.round(number / 1000)
  if (unit === 's') return Math.round(number * 1000)

  // 自动判断：epoch us -> ms，epoch ms 保持不变，普通串口 us -> ms。
  if (number > 1e14) return Math.round(number / 1000)
  if (number > 1e12) return Math.round(number)
  if (number > 1e9) return Math.round(number * 1000)
  return Math.round(number / 1000)
}

function normalizeDistanceList(rawDistances) {
  if (!rawDistances) return null
  let list = null
  if (Array.isArray(rawDistances)) {
    list = rawDistances
  } else if (typeof rawDistances === 'object') {
    list = [rawDistances.A0 ?? rawDistances.a0, rawDistances.A1 ?? rawDistances.a1, rawDistances.A2 ?? rawDistances.a2, rawDistances.A3 ?? rawDistances.a3]
  }
  if (!list) return null
  const normalized = list.slice(0, 4).map(normalizeDistance)
  while (normalized.length < 4) normalized.push(null)
  return normalized
}

function distancesToObject(distances) {
  if (!Array.isArray(distances)) return null
  return {
    A0: distances[0] ?? null,
    A1: distances[1] ?? null,
    A2: distances[2] ?? null,
    A3: distances[3] ?? null,
  }
}

function normalizePosition(value) {
  if (!value || typeof value !== 'object') return null
  const x = Number(value.x ?? value[0])
  const y = Number(value.y ?? value[1])
  const z = Number(value.z ?? value[2] ?? 0)
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null
  return { x, y, z }
}

function buildPaintingPayload(record, position = null) {
  const ranges = Array.isArray(record.distances)
    ? record.distances.map((distance, index) => ({ type: 'range', anchor: `A${index}`, distance }))
    : []
  const points = position ? [{ type: 'point', role: 'tag', x: position.x, y: position.y, z: position.z }] : []
  return [
    ...anchors.value.map((anchor) => ({ type: 'anchor', id: anchor.id, x: anchor.x, y: anchor.y, z: anchor.z })),
    ...ranges,
    ...points,
  ]
}

function extractAngle(record) {
  if (record.angle != null) return normalizeNullableNumber(record.angle)
  if (record.motionData?.gz != null) return normalizeNullableNumber(record.motionData.gz)
  if (record.motionData?.yaw != null) return normalizeNullableNumber(record.motionData.yaw)
  return null
}

function parseMotionPayload(payload) {
  const parts = String(payload).split(',')
  const flagsText = parts[2] ?? '0'
  const values = parts.map((part, index) => {
    if (index === 2) return Number.parseInt(part, 16)
    return Number(part)
  })

  return {
    dtMs: values[0],
    sampleCount: values[1],
    flags: Number.isFinite(values[2]) ? values[2] : Number.parseInt(flagsText, 16),
    ax: values[3],
    ay: values[4],
    az: values[5],
    gx: values[6],
    gy: values[7],
    gz: values[8],
    dvx: values[9],
    dvy: values[10],
    dvz: values[11],
    dax: values[12],
    day: values[13],
    daz: values[14],
    motion: values[15],
  }
}

function updateRaceProgress(tagId, position, now) {
  const previous = raceStateByTag.get(tagId) ?? {
    started: false,
    finished: false,
    distance: 0,
    speed: 0,
    lastPosition: null,
    lastAt: null,
    startTime: null,
    finishTime: null,
    status: 'waiting',
  }
  const state = { ...previous }

  if (!position) return summarizeRaceState(state, now)

  const prevPosition = state.lastPosition
  const prevAt = state.lastAt

  if (prevPosition) {
    if (!state.started && hasCrossedLine(prevPosition, position, raceLines.value.start)) {
      state.started = true
      state.finished = false
      state.distance = 0
      state.speed = 0
      state.startTime = now
      state.finishTime = null
      state.status = 'running'
    }

    if (state.started && !state.finished) {
      const step = distance2D(prevPosition, position)
      const dt = prevAt ? Math.max((now - prevAt) / 1000, 0.001) : 0
      if (Number.isFinite(step) && step > 0 && step < 20) {
        state.distance += step
        const instantSpeed = dt > 0 ? step / dt : 0
        state.speed = state.speed ? state.speed * 0.65 + instantSpeed * 0.35 : instantSpeed
      }
      state.status = 'running'

      if (hasCrossedLine(prevPosition, position, raceLines.value.finish)) {
        state.finished = true
        state.finishTime = now
        state.speed = 0
        state.status = 'finished'
      }
    }
  }

  state.lastPosition = { ...position }
  state.lastAt = now
  raceStateByTag.set(tagId, state)
  return summarizeRaceState(state, now)
}

function summarizeRaceState(state, now) {
  const elapsedMs = state.started ? (state.finished ? state.finishTime ?? now : now) - (state.startTime ?? now) : 0
  return {
    distance: Number(state.distance ?? 0),
    speed: Number(state.speed ?? 0),
    elapsedMs: Math.max(0, elapsedMs),
    started: Boolean(state.started),
    finished: Boolean(state.finished),
    status: state.finished ? 'finished' : state.started ? 'running' : 'waiting',
  }
}

function hasCrossedLine(previous, current, line) {
  if (!previous || !current || !line) return false
  const a = { x: Number(line.x1), y: Number(line.y1) }
  const b = { x: Number(line.x2), y: Number(line.y2) }
  if (![a.x, a.y, b.x, b.y].every(Number.isFinite)) return false
  return segmentsIntersect(previous, current, a, b)
}

function segmentsIntersect(p1, p2, q1, q2) {
  const d1 = cross2D(p1, p2, q1)
  const d2 = cross2D(p1, p2, q2)
  const d3 = cross2D(q1, q2, p1)
  const d4 = cross2D(q1, q2, p2)
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true
  return Math.abs(d1) < 1e-8 && onSegment(p1, p2, q1) ||
    Math.abs(d2) < 1e-8 && onSegment(p1, p2, q2) ||
    Math.abs(d3) < 1e-8 && onSegment(q1, q2, p1) ||
    Math.abs(d4) < 1e-8 && onSegment(q1, q2, p2)
}

function cross2D(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}

function onSegment(a, b, p) {
  return p.x >= Math.min(a.x, b.x) - 1e-8 &&
    p.x <= Math.max(a.x, b.x) + 1e-8 &&
    p.y >= Math.min(a.y, b.y) - 1e-8 &&
    p.y <= Math.max(a.y, b.y) + 1e-8
}

function distance2D(a, b) {
  return Math.hypot((b.x ?? 0) - (a.x ?? 0), (b.y ?? 0) - (a.y ?? 0))
}

function getRaceStatusText(tag) {
  if (tag?.raceFinished) return '已冲线'
  if (tag?.raceStarted) return '比赛中'
  return '待起跑'
}

function getRankSortValue(row) {
  if (leaderboardSortKey.value === 'speed') return Number(row.speed ?? 0)
  if (leaderboardSortKey.value === 'score') return Number(row.score ?? 0)
  if (leaderboardSortKey.value === 'updated') return Number(row.updatedAt ?? 0)
  return Number(row.raceDistance ?? 0)
}

function formatRankValue(row) {
  if (leaderboardSortKey.value === 'speed') return formatSpeed(row.speed).replace(' m/s', '')
  if (leaderboardSortKey.value === 'score') return formatNumber(row.score, 0)
  if (leaderboardSortKey.value === 'updated') return row.updatedAtText ?? '--'
  return formatDistance(row.raceDistance).replace('NA', '--')
}

function selectRunner(name) {
  selectedTagName.value = name
}

function handleTagRowClick(row) {
  if (row?.name) selectRunner(row.name)
}

function tagRowClassName({ row }) {
  return row?.name === selectedTagName.value ? 'selected-tag-row' : ''
}

function handleMapBackgroundFile(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (uploadedMapBackgroundUrl.value) URL.revokeObjectURL(uploadedMapBackgroundUrl.value)
  uploadedMapBackgroundUrl.value = URL.createObjectURL(file)
  mapBackgroundMode.value = 'image'
}

function filterPositionWithImu(tagId, measuredPosition, currentTag, now) {
  if (!measuredPosition || !imuFilterEnabled.value || !currentTag?.position) return measuredPosition

  const imu = imuByTag.get(tagId)
  const imuFresh = imu && now - imu.receivedAt < 1200
  if (!imuFresh) return blendPosition(currentTag.position, measuredPosition, 0.6)

  const isStatic = Number(imu.motion) === 0
  const alpha = isStatic ? 0.12 : 0.55
  const maxStep = isStatic ? 0.35 : 2.2
  const distance = distanceBetween(currentTag.position, measuredPosition)

  if (distance > maxStep) {
    const limited = clampStep(currentTag.position, measuredPosition, maxStep)
    return blendPosition(currentTag.position, limited, alpha)
  }

  return blendPosition(currentTag.position, measuredPosition, alpha)
}

function blendPosition(previous, next, alpha) {
  return {
    x: previous.x + (next.x - previous.x) * alpha,
    y: previous.y + (next.y - previous.y) * alpha,
    z: previous.z + (next.z - previous.z) * alpha,
  }
}

function clampStep(previous, next, maxStep) {
  const distance = distanceBetween(previous, next)
  if (!distance || distance <= maxStep) return next
  const ratio = maxStep / distance
  return {
    x: previous.x + (next.x - previous.x) * ratio,
    y: previous.y + (next.y - previous.y) * ratio,
    z: previous.z + (next.z - previous.z) * ratio,
  }
}

function distanceBetween(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
}

function pushEvent(record, sourceText, now) {
  pendingEvents.push({
    time: new Date(now).toLocaleTimeString(),
    tag: `Tag${record.tagId}`,
    type: record.type,
    summary:
      record.type === 'RNG'
        ? record.distances.map((distance) => formatDistance(distance)).join(' / ')
        : sourceText.slice(0, 80),
  })
  scheduleUiFlush()
}

function scheduleUiFlush() {
  if (uiFlushTimer) return
  if (typeof window.requestAnimationFrame === 'function') {
    uiFlushUsesRaf = true
    uiFlushTimer = window.requestAnimationFrame(flushUiState)
    return
  }
  uiFlushUsesRaf = false
  uiFlushTimer = window.setTimeout(flushUiState, UI_FLUSH_INTERVAL_MS)
}

function cancelUiFlush() {
  if (!uiFlushTimer) return
  if (uiFlushUsesRaf && typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(uiFlushTimer)
  } else {
    window.clearTimeout(uiFlushTimer)
  }
  uiFlushTimer = null
  uiFlushUsesRaf = false
}

function pruneOfflineTags(now = Date.now()) {
  onlineNow.value = now
  let changed = false
  tagStore.forEach((tag, tagId) => {
    if (tag.updatedAt && now - tag.updatedAt > OFFLINE_TAG_TIMEOUT_MS) {
      tagStore.delete(tagId)
      imuByTag.delete(tagId)
      changed = true
    }
  })
  if (!changed) return
  tags.value = Array.from(tagStore.values())
  if (selectedTagName.value && !tags.value.some((tag) => tag.name === selectedTagName.value)) {
    selectedTagName.value = ''
  }
}

function flushUiState() {
  uiFlushTimer = null
  uiFlushUsesRaf = false
  onlineNow.value = Date.now()

  if (pendingRawLines.length > 0) {
    rawLines.value = pendingRawLines.reverse().concat(rawLines.value).slice(0, MAX_RAW_LINES)
    pendingRawLines = []
  }

  if (pendingParsedRecords.length > 0) {
    parsedJsonRows.value = pendingParsedRecords.reverse().concat(parsedJsonRows.value).slice(0, MAX_PARSED_RECORDS)
    pendingParsedRecords = []
  }

  if (pendingEvents.length > 0) {
    eventRows.value = pendingEvents.reverse().concat(eventRows.value).slice(0, MAX_EVENTS)
    pendingEvents = []
  }

  if (tagsDirty) {
    pruneOfflineTags(onlineNow.value)
    tags.value = Array.from(tagStore.values())
    tagsDirty = false
  }
}

function locatePosition(distances) {
  if (distances.filter((distance) => distance != null).length < 3) return null

  const points = anchors.value.map((anchor) => ({
    x: Number(anchor.x),
    y: Number(anchor.y),
    z: Number(anchor.z),
  }))
  if (points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z))) {
    return null
  }

  const full3d = solveTrilateration(points, distances, ['x', 'y', 'z'])
  if (full3d) return full3d

  const flat2d = solveTrilateration(points, distances, ['x', 'y'])
  if (!flat2d) return null

  const validZ = points.map((point) => point.z).filter(Number.isFinite)
  return {
    x: flat2d.x,
    y: flat2d.y,
    z: validZ.reduce((sum, value) => sum + value, 0) / validZ.length,
  }
}

function solveTrilateration(points, distances, axes) {
  const refIndex = distances.findIndex((distance) => distance != null)
  if (refIndex < 0) return null

  const p0 = points[refIndex]
  const r0 = distances[refIndex]
  const rows = []
  const values = []

  distances.forEach((distance, index) => {
    if (index === refIndex || distance == null) return
    const point = points[index]
    rows.push(axes.map((axis) => 2 * (point[axis] - p0[axis])))
    values.push(r0 * r0 - distance * distance + squaredNorm(point, axes) - squaredNorm(p0, axes))
  })

  if (rows.length < axes.length) return null

  const normalA = axes.map((_, row) =>
    axes.map((__, col) => rows.reduce((sum, item) => sum + item[row] * item[col], 0)),
  )
  const normalB = axes.map((_, row) => rows.reduce((sum, item, index) => sum + item[row] * values[index], 0))
  const solved = solveLinearSystem(normalA, normalB)
  if (!solved) return null

  return axes.reduce(
    (result, axis, index) => {
      result[axis] = solved[index]
      return result
    },
    { x: 0, y: 0, z: 0 },
  )
}

function squaredNorm(point, axes) {
  return axes.reduce((sum, axis) => sum + point[axis] * point[axis], 0)
}

function solveLinearSystem(matrix, vector) {
  const n = vector.length
  const a = matrix.map((row, index) => [...row, vector[index]])

  for (let col = 0; col < n; col += 1) {
    let pivot = col
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row
    }
    if (Math.abs(a[pivot][col]) < 1e-8) return null
    ;[a[col], a[pivot]] = [a[pivot], a[col]]

    const div = a[col][col]
    for (let item = col; item <= n; item += 1) a[col][item] /= div

    for (let row = 0; row < n; row += 1) {
      if (row === col) continue
      const factor = a[row][col]
      for (let item = col; item <= n; item += 1) a[row][item] -= factor * a[col][item]
    }
  }

  return a.map((row) => row[n])
}

function toScreenPoint(point) {
  const bounds = mapBounds.value
  const width = bounds.maxX - bounds.minX || 1
  const height = bounds.maxY - bounds.minY || 1
  return {
    sx: 40 + ((point.x - bounds.minX) / width) * 920,
    sy: 580 - ((point.y - bounds.minY) / height) * 540,
  }
}

function formatDistance(value) {
  return value == null || !Number.isFinite(value) ? 'NA' : value.toFixed(2)
}

function formatCoord(value) {
  return value == null || !Number.isFinite(value) ? '--' : value.toFixed(2)
}

function formatSpeed(value) {
  const number = Number(value)
  return Number.isFinite(number) ? `${number.toFixed(2)} m/s` : '--'
}

function formatElapsed(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return '--'
  const totalSeconds = Math.floor(number / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  const ms = String(Math.floor(number % 1000)).padStart(3, '0')
  return `${minutes}:${seconds}.${ms}`
}

function formatNumber(value, digits = 2) {
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(digits) : '--'
}

function toggleReplay() {
  if (replayPlaying.value) {
    stopReplay()
    return
  }
  if (selectedReplayTags.value.length === 0 || replayTotalPoints.value === 0) return
  replayPlaying.value = true
  replayTimer = window.setInterval(() => {
    replayIndex.value = replayIndex.value >= replayMaxIndex.value ? 0 : replayIndex.value + 1
  }, 300)
}

function stopReplay() {
  replayPlaying.value = false
  if (replayTimer) window.clearInterval(replayTimer)
  replayTimer = null
}

function resetRuntimeData() {
  tagStore.clear()
  imuByTag.clear()
  raceStateByTag.clear()
  pendingRawLines = []
  pendingParsedRecords = []
  pendingEvents = []
  tagsDirty = false
  cancelUiFlush()
  tags.value = []
  rawLines.value = []
  parsedJsonRows.value = []
  eventRows.value = []
  serialBuffer.value = ''
  selectedReplayTags.value = []
  replayAllTags.value = false
  replaySeries.value = []
  selectedTagName.value = ''
  replayIndex.value = 0
  stopReplay()
}

onMounted(() => {
  loadBackendRunnerBindings()
  loadReplaySessions()
  offlineTimer = window.setInterval(() => pruneOfflineTags(), 500)
})

onBeforeUnmount(() => {
  stopReplay()
  cancelUiFlush()
  if (offlineTimer) window.clearInterval(offlineTimer)
  disconnectHttp()
  if (serialConnected.value) disconnectSerial()
  if (uploadedMapBackgroundUrl.value) URL.revokeObjectURL(uploadedMapBackgroundUrl.value)
})
</script>

<style scoped>
.race-shell,
.race-shell * {
  box-sizing: border-box;
}

.race-page {
  height: calc(100vh - 100px);
  min-height: 0;
  overflow: hidden;
  color: #eafcff;
  background: #030712;
}

.uwb-modal-mask {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(1, 6, 18, 0.72);
  backdrop-filter: blur(10px);
}

.uwb-modal {
  width: min(420px, calc(100vw - 48px));
  padding: 26px 28px 24px;
  border: 1px solid rgba(37, 244, 255, 0.34);
  border-radius: 18px;
  background:
    linear-gradient(145deg, rgba(4, 13, 28, 0.98), rgba(6, 31, 40, 0.98)),
    radial-gradient(circle at top, rgba(0, 255, 194, 0.18), transparent 58%);
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.58), 0 0 36px rgba(37, 244, 255, 0.14);
  color: #eafcff;
  text-align: center;
}

.uwb-modal-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  border: 1px solid rgba(97, 255, 217, 0.46);
  border-radius: 999px;
  background: rgba(0, 214, 163, 0.16);
  color: #61ffd9;
  font-size: 26px;
  font-weight: 900;
  box-shadow: 0 0 24px rgba(0, 214, 163, 0.24);
}

.uwb-modal h3 {
  margin: 0;
  color: #f8ffff;
  font-size: 20px;
  letter-spacing: 0.08em;
}

.uwb-modal p {
  margin: 12px 0 22px;
  color: #99b7c1;
  font-size: 14px;
  line-height: 1.7;
}

.race-shell {
  position: relative;
  isolation: isolate;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px 16px;
  border: 1px solid rgba(64, 238, 255, 0.16);
  border-radius: 22px;
  overflow: hidden;
  background:
    radial-gradient(circle at 8% 8%, rgba(0, 255, 194, 0.20), transparent 22%),
    radial-gradient(circle at 84% 18%, rgba(72, 168, 255, 0.18), transparent 26%),
    radial-gradient(circle at 50% 100%, rgba(255, 77, 109, 0.12), transparent 28%),
    linear-gradient(135deg, #040914 0%, #06111d 42%, #05080d 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.10),
    inset 0 0 80px rgba(37, 244, 255, 0.04),
    0 24px 80px rgba(0, 0, 0, 0.32);
}

.race-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -2;
  opacity: 0.24;
  background-image:
    linear-gradient(rgba(74, 222, 255, 0.16) 1px, transparent 1px),
    linear-gradient(90deg, rgba(74, 222, 255, 0.14) 1px, transparent 1px),
    linear-gradient(135deg, rgba(255, 255, 255, 0.06), transparent 48%);
  background-size: 34px 34px, 34px 34px, 100% 100%;
  mask-image: radial-gradient(circle at 50% 38%, #000 0%, rgba(0, 0, 0, 0.82) 45%, transparent 86%);
  pointer-events: none;
}

.race-shell::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(180deg, transparent 0%, rgba(37, 244, 255, 0.04) 50%, transparent 100%);
  background-size: 100% 8px;
  opacity: 0.28;
  pointer-events: none;
}

.topbar,
.panel-head,
.topbar-actions,
.map-controls,
.button-line,
.replay-controls,
.replay-stats {
  display: flex;
  align-items: center;
}

.topbar {
  display: grid;
  grid-template-columns: minmax(190px, max-content) minmax(280px, 1fr) max-content;
  justify-content: stretch;
  gap: 14px;
  flex: none;
  min-height: 54px;
  padding: 8px 10px;
  border: 1px solid rgba(64, 238, 255, 0.16);
  border-radius: 16px;
  background:
    linear-gradient(90deg, rgba(0, 255, 194, 0.11), transparent 26%),
    rgba(4, 12, 24, 0.72);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 12px 30px rgba(0, 0, 0, 0.18);
}

.compact-title {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #5fffe0;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 1.8px;
  white-space: nowrap;
  text-shadow: 0 0 18px rgba(0, 255, 194, 0.45);
}

.compact-title::before {
  content: '';
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #31ffd6;
  box-shadow: 0 0 16px rgba(49, 255, 214, 0.9);
}

.compact-title::after {
  content: 'RACE CONTROL';
  position: absolute;
  left: 22px;
  top: 24px;
  color: rgba(162, 245, 255, 0.58);
  font-family: Consolas, 'Courier New', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.28em;
}

.topbar-actions {
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.mode-tabs {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-self: center;
  flex: none;
  padding: 5px;
  border: 1px solid rgba(64, 238, 255, 0.18);
  border-radius: 999px;
  background: rgba(1, 10, 22, 0.66);
  box-shadow: inset 0 0 20px rgba(37, 244, 255, 0.05);
}

.mode-tab {
  position: relative;
  flex: 0 0 auto;
  min-height: 34px;
  padding: 6px 18px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: #c9e9ef;
  text-align: center;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease, color 0.2s ease;
}

.mode-tab::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(0, 255, 194, 0.18), rgba(72, 168, 255, 0.10));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.mode-tab span {
  position: relative;
  display: block;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.mode-tab:hover,
.mode-tab.active {
  border-color: rgba(64, 238, 255, 0.72);
  color: #ffffff;
  box-shadow: 0 0 18px rgba(37, 244, 255, 0.16);
}

.mode-tab:hover::before,
.mode-tab.active::before {
  opacity: 1;
}

.hud-strip {
  display: grid;
  grid-template-columns: 1.2fr repeat(3, minmax(110px, 0.55fr));
  gap: 10px;
  flex: none;
}

.hud-card {
  position: relative;
  min-width: 0;
  padding: 10px 14px;
  border: 1px solid rgba(64, 238, 255, 0.16);
  border-radius: 14px;
  overflow: hidden;
  background:
    linear-gradient(120deg, rgba(14, 165, 233, 0.10), rgba(0, 255, 194, 0.06)),
    rgba(2, 12, 25, 0.64);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.hud-card::before,
.surface::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 38px;
  height: 2px;
  background: linear-gradient(90deg, #5fffe0, transparent);
  opacity: 0.95;
}

.hud-card::after {
  content: '';
  position: absolute;
  right: 10px;
  top: 10px;
  width: 32px;
  height: 32px;
  border-top: 1px solid rgba(64, 238, 255, 0.38);
  border-right: 1px solid rgba(64, 238, 255, 0.38);
  opacity: 0.75;
}

.hud-card span,
.hud-card em {
  display: block;
  color: #7faebb;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 10px;
  font-style: normal;
  font-weight: 800;
  letter-spacing: 0.18em;
}

.hud-card strong {
  display: block;
  margin: 4px 0;
  color: #f5ffff;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  text-shadow: 0 0 18px rgba(95, 255, 224, 0.25);
}

.hud-card.primary {
  background:
    linear-gradient(120deg, rgba(0, 255, 194, 0.18), rgba(72, 168, 255, 0.08)),
    rgba(2, 12, 25, 0.72);
}

.tab-page {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.settings-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  overflow: auto;
  padding-bottom: 8px;
}

.settings-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr);
  gap: 14px;
  align-items: start;
  width: 100%;
}

.console-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  align-items: stretch;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow: visible;
  padding-bottom: 0;
}

.settings-console-grid {
  grid-auto-rows: clamp(360px, 40vh, 440px);
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.settings-console-grid .console-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.settings-console-grid .console-panel .panel-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  flex: 0 0 76px;
  min-height: 76px;
  margin-bottom: 12px;
}

.source-panel,
.anchor-panel,
.runner-binding-panel,
.raw-panel,
.parsed-panel,
.settings-events-panel {
  grid-area: auto;
}

.anchor-panel {
  overflow: visible;
}

.raw-panel,
.parsed-panel,
.settings-events-panel {
  width: auto;
  max-width: 100%;
  min-width: 0;
}

.tracking-page,
.replay-page {
  display: grid;
  gap: 14px;
  min-height: 0;
}

.surface {
  position: relative;
  min-width: 0;
  min-height: 0;
  border: 1px solid rgba(64, 238, 255, 0.16);
  border-radius: 18px;
  overflow: hidden;
  background:
    linear-gradient(140deg, rgba(8, 27, 42, 0.80), rgba(5, 12, 24, 0.86)),
    radial-gradient(circle at 15% 0%, rgba(0, 255, 194, 0.12), transparent 38%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    inset 0 0 40px rgba(37, 244, 255, 0.03),
    0 20px 50px rgba(0, 0, 0, 0.30);
  backdrop-filter: blur(14px);
}

.surface::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: 0;
  width: 54px;
  height: 54px;
  border-right: 2px solid rgba(64, 238, 255, 0.20);
  border-bottom: 2px solid rgba(64, 238, 255, 0.20);
  border-radius: 0 0 18px 0;
  pointer-events: none;
}

.source-panel,
.anchor-panel,
.runner-binding-panel,
.raw-panel,
.parsed-panel,
.settings-events-panel,
.map-panel,
.table-panel,
.style-panel,
.event-panel {
  padding: 16px;
}

.panel-head {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.panel-head.compact {
  margin-bottom: 10px;
}

.panel-head h3 {
  position: relative;
  margin: 0;
  color: #f3feff;
  font-size: 17px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.panel-head h3::before {
  content: '//';
  margin-right: 8px;
  color: #5fffe0;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 13px;
}

.panel-head p {
  margin: 6px 0 0;
  color: #8fabbb;
  font-size: 13px;
}

.source-mode {
  margin-bottom: 14px;
}

.imu-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
  padding: 12px 14px;
  border: 1px solid rgba(0, 255, 194, 0.20);
  border-radius: 14px;
  background: linear-gradient(90deg, rgba(0, 255, 194, 0.12), rgba(72, 168, 255, 0.06));
  box-shadow: inset 0 0 24px rgba(0, 255, 194, 0.04);
}

.imu-option strong,
.imu-option span {
  display: block;
}

.imu-option strong {
  color: #f2fffd;
  font-size: 14px;
}

.imu-option span {
  margin-top: 4px;
  color: #91abb6;
  font-size: 12px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(180px, 1fr));
  gap: 12px;
}

.form-grid label,
.style-row {
  min-width: 0;
}

.form-grid label span {
  display: block;
  margin-bottom: 6px;
  color: #9fc4cb;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.wide-field {
  grid-column: 1 / -1;
}

.button-line {
  grid-column: 1 / -1;
  gap: 10px;
  flex-wrap: wrap;
}

.anchor-table {
  display: grid;
  gap: 9px;
  width: 100%;
  overflow-x: auto;
  overflow-y: visible;
}

.anchor-header,
.anchor-row {
  display: grid;
  grid-template-columns: 52px repeat(3, minmax(76px, 1fr));
  gap: 9px;
  align-items: center;
}

.anchor-row {
  padding: 7px 8px;
  border: 1px solid rgba(64, 238, 255, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.025);
}

.anchor-row :deep(.el-input-number) {
  width: 100%;
  min-width: 0;
}

.anchor-row :deep(.el-input-number .el-input__wrapper) {
  padding-left: 6px;
  padding-right: 30px;
}

.anchor-header {
  padding: 0 8px;
  color: #67f6dc;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.anchor-row strong {
  color: #5fffe0;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 16px;
  text-shadow: 0 0 14px rgba(95, 255, 224, 0.35);
}

.anchor-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(64, 238, 255, 0.12);
}

.anchor-actions span {
  color: #8fabbb;
  font-size: 12px;
}

.anchor-actions div {
  display: flex;
  gap: 8px;
  flex: none;
}

.raw-list,
.json-list {
  width: 100%;
  height: auto;
  min-height: 230px;
  max-height: 320px;
  overflow: auto;
  padding: 14px;
  border: 1px solid rgba(64, 238, 255, 0.12);
  border-radius: 14px;
  background:
    linear-gradient(rgba(37, 244, 255, 0.035) 1px, transparent 1px),
    #020611;
  background-size: 100% 26px;
  color: #b9ffee;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.55;
  box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.34);
}

.settings-console-grid .raw-list,
.settings-console-grid .json-list,
.settings-console-grid .event-console-body {
  flex: 1 1 auto;
  height: 0;
  min-height: 0;
  max-height: none;
  overflow: auto;
}

.settings-console-grid .event-console-body {
  border: 1px solid rgba(64, 238, 255, 0.12);
  border-radius: 14px;
  background: rgba(2, 6, 17, 0.78);
}

.settings-console-grid .console-empty {
  height: 100%;
  min-height: 0;
  border: 0;
  border-radius: 14px;
}

.settings-console-grid .console-panel .panel-head p {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.settings-console-grid .raw-list > .empty-state,
.settings-console-grid .json-list > .empty-state {
  height: 100%;
  min-height: 0;
  border: 0;
  background: transparent;
}

.json-list {
  max-height: 380px;
}

.raw-line,
.json-line {
  padding: 4px 0;
  border-bottom: 1px solid rgba(183, 255, 232, 0.10);
  word-break: break-all;
}

.json-line {
  margin: 0;
  white-space: pre-wrap;
}

.tracking-page {
  grid-template-columns: minmax(0, 1fr) minmax(430px, 0.52fr);
}

.tracking-side {
  display: grid;
  grid-template-rows: minmax(0, 1fr) 268px;
  gap: 14px;
  min-height: 0;
}

.map-panel {
  display: flex;
  flex-direction: column;
}

.map-controls {
  gap: 10px;
  color: #9fc4cb;
}

.track-slider {
  width: 150px;
}

.track-map {
  width: 100%;
  flex: 1;
  min-height: 270px;
  display: block;
  border-radius: 14px;
  cursor: crosshair;
  user-select: none;
  touch-action: none;
  filter: drop-shadow(0 0 20px rgba(37, 244, 255, 0.08));
}

.track-map.dragging {
  cursor: grabbing;
}

.map-bg {
  fill: #061220;
  stroke: rgba(64, 238, 255, 0.34);
  stroke-width: 2;
}

.map-help {
  fill: rgba(185, 255, 238, 0.62);
  font-family: Consolas, 'Courier New', monospace;
  font-size: 15px;
  font-weight: 800;
  pointer-events: none;
}

.map-reset-button {
  cursor: pointer;
}

.map-reset-button rect {
  fill: rgba(2, 12, 25, 0.90);
  stroke: rgba(64, 238, 255, 0.56);
  stroke-width: 1.5;
}

.map-reset-button text {
  fill: #b9ffee;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.08em;
  pointer-events: none;
}

.map-reset-button:hover rect {
  fill: rgba(0, 255, 194, 0.16);
}

.xy-axis-indicator {
  pointer-events: none;
}

.xy-axis-indicator line {
  stroke: rgba(255, 184, 77, 0.92);
  stroke-width: 3;
  stroke-linecap: round;
}

.xy-axis-indicator polygon,
.xy-axis-indicator circle {
  fill: #ffb84d;
}

.xy-axis-indicator text {
  fill: #ffda91;
  font-size: 16px;
  font-weight: 900;
  paint-order: stroke;
  stroke: rgba(2, 8, 16, 0.95);
  stroke-width: 4px;
}

.grid-lines line {
  stroke: rgba(64, 238, 255, 0.15);
  stroke-width: 1;
}

.anchor-dot,
.tag-dot {
  stroke: rgba(2, 8, 16, 0.92);
  stroke-width: 3;
  filter: drop-shadow(0 0 7px rgba(64, 238, 255, 0.34));
}

.anchor-label,
.tag-label,
.replay-label {
  font-weight: 900;
  paint-order: stroke;
  stroke: rgba(2, 8, 16, 0.95);
  stroke-width: 4px;
  letter-spacing: 0.05em;
}

.tag-line {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.9;
  filter: drop-shadow(0 0 5px rgba(95, 255, 224, 0.22));
}

.replay-line {
  fill: none;
  stroke: #ffb84d;
  stroke-width: 5;
  stroke-dasharray: 12 8;
  opacity: 0.92;
  filter: drop-shadow(0 0 8px rgba(255, 184, 77, 0.32));
}

.replay-dot {
  fill: #ffb84d;
  stroke: #07101b;
  stroke-width: 4;
}

.coord-pointer {
  pointer-events: none;
}

.coord-pointer line {
  stroke: rgba(64, 238, 255, 0.76);
  stroke-width: 1.4;
  stroke-dasharray: 8 7;
}

.coord-pointer circle {
  fill: #25f4ff;
  stroke: #03101b;
  stroke-width: 2;
}

.coord-pointer rect {
  fill: rgba(2, 12, 25, 0.94);
  stroke: rgba(64, 238, 255, 0.72);
}

.coord-pointer text {
  fill: #b9ffee;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.02em;
}

.data-table,
.event-table {
  height: calc(100% - 46px);
}

.style-list {
  display: grid;
  gap: 8px;
  max-height: 206px;
  overflow: auto;
}

.style-row {
  display: grid;
  grid-template-columns: 28px minmax(52px, 0.65fr) 42px minmax(86px, 1fr) minmax(86px, 1fr);
  gap: 8px;
  align-items: center;
  color: #d7f7fb;
}

.style-name {
  min-width: 0;
  overflow: hidden;
  color: #ecffff;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.style-row input[type='color'] {
  width: 38px;
  height: 32px;
  padding: 0;
  border: 1px solid rgba(64, 238, 255, 0.24);
  border-radius: 8px;
  background: transparent;
}

.replay-page {
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.36fr);
}

.replay-controls {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) minmax(180px, 1.2fr) auto auto auto;
  gap: 8px;
  align-items: center;
}

.replay-select {
  width: 100%;
}

.replay-session-select {
  width: 100%;
}

.replay-slider {
  padding-top: 8px;
}

.replay-stats {
  justify-content: space-between;
  gap: 10px;
  color: #9fc4cb;
}

.event-panel {
  display: flex;
  flex-direction: column;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  color: #6e8a95;
  border: 1px dashed rgba(64, 238, 255, 0.22);
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.12);
}

.empty-state.small {
  min-height: 70px;
  font-size: 13px;
}

:deep(.el-button) {
  border-radius: 10px;
  font-weight: 800;
}

:deep(.el-button--primary) {
  --el-button-bg-color: #02c8a7;
  --el-button-border-color: #02c8a7;
  --el-button-hover-bg-color: #00e6c0;
  --el-button-hover-border-color: #00e6c0;
}

:deep(.el-tag) {
  border-radius: 999px;
  font-family: Consolas, 'Courier New', monospace;
  font-weight: 900;
}

:deep(.el-input-number),
:deep(.el-select),
:deep(.el-input) {
  width: 100%;
}

:deep(.el-input__wrapper),
:deep(.el-select__wrapper) {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(64, 238, 255, 0.18);
  border-radius: 10px;
  box-shadow: none;
}

:deep(.el-input__wrapper:hover),
:deep(.el-select__wrapper:hover) {
  border-color: rgba(95, 255, 224, 0.42);
  box-shadow: 0 0 0 1px rgba(95, 255, 224, 0.08);
}

:deep(.el-input__inner),
:deep(.el-select__placeholder),
:deep(.el-input-number .el-input__inner) {
  color: #eafcff;
  font-weight: 700;
}

:deep(.el-radio-button__inner) {
  background: rgba(2, 12, 25, 0.72);
  border-color: rgba(64, 238, 255, 0.18);
  color: #b7d7df;
  font-weight: 900;
}

:deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: linear-gradient(135deg, rgba(0, 255, 194, 0.88), rgba(72, 168, 255, 0.72));
  border-color: rgba(95, 255, 224, 0.68);
  color: #00141b;
  box-shadow: 0 0 18px rgba(37, 244, 255, 0.20);
}

:deep(.el-table) {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: rgba(37, 244, 255, 0.09);
  --el-table-row-hover-bg-color: rgba(0, 255, 194, 0.10);
  --el-table-border-color: rgba(64, 238, 255, 0.13);
  color: #dceff4;
}

:deep(.el-table th.el-table__cell),
:deep(.el-table td.el-table__cell) {
  background: transparent;
}

:deep(.el-table th.el-table__cell) {
  color: #9fffe8;
  font-family: Consolas, 'Courier New', monospace;
  font-weight: 900;
}

@media (max-width: 1240px) {
  .race-page {
    height: auto;
    min-height: calc(100vh - 100px);
    overflow: visible;
  }

  .race-shell {
    overflow: visible;
  }

  .topbar {
    grid-template-columns: max-content 1fr;
  }

  .mode-tabs {
    justify-self: end;
  }

  .topbar-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }

  .hud-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .settings-grid,
  .tracking-page,
  .replay-page {
    grid-template-columns: 1fr;
  }

  .console-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    overflow: visible;
    padding-bottom: 0;
  }

  .tracking-side {
    grid-template-rows: auto auto;
  }

  .table-panel,
  .event-panel {
    min-height: 380px;
  }
}


@media (max-width: 1040px) {
  .settings-console-grid {
    grid-template-columns: 1fr;
    grid-auto-rows: minmax(320px, auto);
  }

  .settings-console-grid .console-panel {
    min-height: 320px;
  }
}

@media (max-width: 760px) {
  .console-grid {
    grid-template-columns: 1fr;
    overflow-x: visible;
  }

  .settings-console-grid .console-panel {
    height: auto;
    min-height: 320px;
  }

  .race-shell {
    padding: 12px;
    border-radius: 16px;
  }

  .topbar {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .compact-title::after {
    position: static;
    margin-left: 0;
  }

  .mode-tabs {
    justify-self: stretch;
    width: 100%;
    overflow-x: auto;
  }

  .mode-tab {
    padding: 6px 14px;
  }

  .topbar-actions {
    grid-column: auto;
    justify-content: flex-start;
  }

  .hud-strip {
    grid-template-columns: 1fr;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .anchor-header,
  .anchor-row {
    grid-template-columns: 46px repeat(3, minmax(68px, 1fr));
  }

  .anchor-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .track-map {
    min-height: 320px;
  }
}

@media (max-width: 520px) {
  .source-panel,
  .anchor-panel,
  .raw-panel,
  .parsed-panel,
  .map-panel,
  .table-panel,
  .style-panel,
  .event-panel {
    padding: 12px;
  }

  .anchor-header {
    display: none;
  }

  .anchor-row {
    grid-template-columns: 1fr;
    gap: 6px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(64, 238, 255, 0.12);
  }
}


/* ===== 比赛大屏版本：弱化传统 HUD，突出赛道、排行、当前选手 ===== */
.scoreboard-topbar {
  grid-template-columns: minmax(260px, 0.9fr) minmax(300px, 1fr) max-content;
  min-height: 72px;
  padding: 10px 14px;
  border-color: rgba(255, 184, 77, 0.24);
  border-radius: 18px;
  background:
    linear-gradient(90deg, rgba(255, 184, 77, 0.14), transparent 26%),
    linear-gradient(120deg, rgba(0, 255, 194, 0.10), rgba(72, 168, 255, 0.06)),
    rgba(3, 10, 22, 0.82);
}

.race-title-block {
  min-width: 0;
}

.event-kicker,
.race-title-block small {
  display: block;
  font-family: Consolas, 'Courier New', monospace;
  font-weight: 900;
  letter-spacing: 0.18em;
}

.event-kicker {
  margin-bottom: 4px;
  color: #ffda91;
  font-size: 10px;
}

.race-title-block small {
  margin-top: 3px;
  color: rgba(178, 224, 232, 0.70);
  font-size: 10px;
}

.scoreboard-topbar .compact-title {
  display: block;
  max-width: 100%;
  overflow: hidden;
  color: #f6ffff;
  font-size: 24px;
  line-height: 1.15;
  text-overflow: ellipsis;
  text-shadow: 0 0 24px rgba(255, 184, 77, 0.28), 0 0 18px rgba(95, 255, 224, 0.22);
}

.scoreboard-topbar .compact-title::before,
.scoreboard-topbar .compact-title::after {
  display: none;
}

.race-status-ribbon {
  display: grid;
  grid-template-columns: minmax(240px, 1.4fr) repeat(3, minmax(120px, 0.6fr));
  gap: 10px;
  flex: none;
}

.ribbon-item {
  position: relative;
  min-width: 0;
  padding: 9px 14px;
  border: 1px solid rgba(64, 238, 255, 0.13);
  border-radius: 14px;
  background: rgba(3, 12, 24, 0.62);
  overflow: hidden;
}

.ribbon-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(180deg, #ffb84d, #5fffe0);
  opacity: 0.86;
}

.ribbon-item span,
.ribbon-item strong {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ribbon-item span {
  color: #86aab4;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.ribbon-item strong {
  margin-top: 3px;
  color: #f6ffff;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 15px;
  font-weight: 900;
}

.race-dashboard {
  display: grid;
  grid-template-columns: minmax(260px, 0.72fr) minmax(0, 1.8fr) minmax(340px, 0.86fr);
  grid-template-rows: minmax(0, 1fr) 174px;
  grid-template-areas:
    'leaders field side'
    'leaders feed side';
  gap: 14px;
  min-height: 0;
  overflow: hidden;
}

.leaderboard-panel {
  grid-area: leaders;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 16px;
  background:
    linear-gradient(180deg, rgba(255, 184, 77, 0.13), transparent 30%),
    linear-gradient(140deg, rgba(8, 27, 42, 0.84), rgba(5, 12, 24, 0.90));
}

.leader-list {
  display: grid;
  gap: 10px;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
}

.leader-row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 62px;
  gap: 10px;
  align-items: center;
  min-height: 64px;
  padding: 10px;
  border: 1px solid rgba(64, 238, 255, 0.10);
  border-radius: 14px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015));
}

.leader-row.champion {
  border-color: rgba(255, 184, 77, 0.42);
  background:
    linear-gradient(90deg, rgba(255, 184, 77, 0.18), rgba(0, 255, 194, 0.08)),
    rgba(255, 255, 255, 0.03);
  box-shadow: 0 0 26px rgba(255, 184, 77, 0.08);
}

.leader-rank {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(255, 184, 77, 0.40);
  border-radius: 12px;
  color: #ffda91;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 16px;
  font-weight: 900;
  background: rgba(255, 184, 77, 0.08);
}

.leader-info,
.leader-score {
  min-width: 0;
}

.leader-info strong,
.leader-info span,
.leader-score strong,
.leader-score span {
  display: block;
}

.leader-info strong {
  overflow: hidden;
  color: #f6ffff;
  font-size: 15px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.leader-info span,
.leader-score span {
  margin-top: 4px;
  color: #7faebb;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 10px;
  font-weight: 800;
}

.leader-score {
  text-align: right;
}

.leader-score strong {
  color: #5fffe0;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 22px;
  font-weight: 900;
}

.stadium-map-panel {
  grid-area: field;
  min-height: 0;
  padding: 16px;
  border-color: rgba(255, 184, 77, 0.22);
  background:
    radial-gradient(circle at 50% 50%, rgba(0, 255, 194, 0.11), transparent 54%),
    linear-gradient(140deg, rgba(8, 27, 42, 0.82), rgba(4, 10, 20, 0.92));
}

.stadium-head {
  margin-bottom: 8px;
}

.race-map-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  color: #a9c8d1;
}

.race-live-dot {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid rgba(95, 255, 224, 0.26);
  border-radius: 999px;
  color: #b9ffee;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 11px;
  font-weight: 900;
  background: rgba(0, 255, 194, 0.08);
}

.race-live-dot i {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #31ffd6;
  box-shadow: 0 0 14px rgba(49, 255, 214, 0.9);
}

.stadium-map-panel .track-map {
  min-height: 420px;
  border: 1px solid rgba(64, 238, 255, 0.12);
  background: rgba(0, 0, 0, 0.12);
}

.right-race-panel {
  grid-area: side;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
}

.runner-card {
  min-height: 0;
  padding: 16px;
  overflow: visible;
  border-color: rgba(255, 184, 77, 0.30);
  background:
    radial-gradient(circle at 88% 12%, rgba(255, 184, 77, 0.22), transparent 36%),
    linear-gradient(145deg, rgba(13, 28, 42, 0.92), rgba(6, 13, 25, 0.94));
}

.runner-card-top span,
.runner-card-top strong,
.runner-card-top em {
  display: block;
}

.runner-card-top span {
  color: #ffda91;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.16em;
}

.runner-card-top strong {
  margin-top: 6px;
  overflow: hidden;
  color: #ffffff;
  font-size: 28px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 0 22px rgba(255, 184, 77, 0.24);
}

.runner-card-top em {
  margin-top: 2px;
  color: #8fb5bf;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 12px;
  font-style: normal;
  font-weight: 800;
}

.runner-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.runner-metrics div,
.range-strip div {
  min-width: 0;
  padding: 10px;
  border: 1px solid rgba(64, 238, 255, 0.11);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.035);
}

.runner-metrics span,
.range-strip span {
  display: block;
  color: #7faebb;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.14em;
}

.runner-metrics strong,
.range-strip strong {
  display: block;
  margin-top: 5px;
  overflow: hidden;
  color: #5fffe0;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 20px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.range-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.range-strip strong {
  font-size: 15px;
}

.race-table-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 16px;
}

.race-table-panel .data-table {
  height: calc(100% - 44px);
}

.live-feed-panel {
  grid-area: feed;
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 12px;
  min-height: 0;
  padding: 14px;
}

.feed-column {
  min-width: 0;
  min-height: 0;
}

.feed-title {
  margin-bottom: 8px;
  color: #ffda91;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.14em;
}

.mini-feed {
  height: 112px;
  overflow: hidden;
  padding: 10px 12px;
  border: 1px solid rgba(64, 238, 255, 0.10);
  border-radius: 12px;
  background: #020611;
  color: #b9ffee;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.55;
}

.mini-feed div {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-feed {
  color: #6e8a95;
}

@media (max-width: 1380px) {
  .race-dashboard {
    grid-template-columns: minmax(230px, 0.65fr) minmax(0, 1.6fr);
    grid-template-rows: minmax(0, 1fr) auto auto;
    grid-template-areas:
      'leaders field'
      'side side'
      'feed feed';
    overflow: auto;
  }

  .right-race-panel {
    grid-template-columns: minmax(280px, 0.7fr) minmax(0, 1fr);
    grid-template-rows: minmax(280px, 1fr);
  }
}

@media (max-width: 980px) {
  .scoreboard-topbar,
  .race-status-ribbon,
  .race-dashboard,
  .right-race-panel,
  .live-feed-panel {
    grid-template-columns: 1fr;
  }

  .race-dashboard {
    grid-template-areas:
      'field'
      'leaders'
      'side'
      'feed';
    grid-template-rows: auto auto auto auto;
    overflow: auto;
  }

  .leaderboard-panel,
  .stadium-map-panel,
  .right-race-panel,
  .live-feed-panel {
    min-height: auto;
  }

  .stadium-map-panel .track-map {
    min-height: 360px;
  }
}


/* ===== 比赛大屏增强版：悬浮排行/数据、深色表格、起终点线、画布背景 ===== */
.race-line-panel {
  grid-column: 1 / -1;
  padding: 16px;
}

.race-line-editor {
  display: grid;
  gap: 12px;
}

.race-line-row {
  display: grid;
  grid-template-columns: 92px repeat(4, minmax(92px, 1fr));
  gap: 10px;
  align-items: end;
  padding: 12px;
  border: 1px solid rgba(64, 238, 255, 0.12);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.035);
}

.race-line-row strong {
  color: #ffda91;
  font-weight: 900;
}

.race-line-row label span {
  display: block;
  margin-bottom: 5px;
  color: #89aeba;
  font-size: 11px;
  font-weight: 900;
}

.runner-binding-panel {
  grid-column: 1 / -1;
  padding: 16px;
}

.binding-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.runner-binding-table {
  display: grid;
  gap: 8px;
}

.binding-header,
.binding-row {
  display: grid;
  grid-template-columns: 130px minmax(140px, 1fr) minmax(140px, 1fr) minmax(160px, 1.1fr) 78px;
  gap: 10px;
  align-items: center;
}

.binding-header {
  padding: 0 8px;
  color: #b9ffee;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.binding-row {
  padding: 10px;
  border: 1px solid rgba(64, 238, 255, 0.12);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.035);
}

.binding-empty {
  min-height: 58px;
}

:deep(.runner-binding-panel .el-input__wrapper),
:deep(.runner-binding-panel .el-input-number),
:deep(.runner-binding-panel .el-input-number .el-input__wrapper) {
  width: 100%;
}

.broadcast-dashboard {
  position: relative;
  display: block;
  min-height: 0;
  overflow: hidden;
}

.broadcast-field {
  position: absolute;
  inset: 0;
  z-index: 1;
  padding: 16px;
}

.broadcast-field .track-map {
  height: calc(100% - 68px);
  min-height: 0;
}

.floating-dock {
  position: absolute;
  top: 88px;
  bottom: 186px;
  z-index: 5;
  display: flex;
  min-height: 280px;
  transition: transform 0.25s ease;
  pointer-events: none;
}

.left-dock {
  left: 18px;
  width: min(360px, 30vw);
}

.right-dock {
  right: 18px;
  width: min(470px, 36vw);
}

.floating-dock.collapsed.left-dock {
  transform: translateX(calc(-100% + 42px));
}

.floating-dock.collapsed.right-dock {
  transform: translateX(calc(100% - 42px));
}

.dock-content {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  pointer-events: auto;
}

.right-content {
  display: grid;
  grid-template-rows: max-content minmax(112px, 1fr);
  gap: 12px;
  align-content: stretch;
  overflow: auto;
}

.dock-toggle {
  flex: 0 0 36px;
  writing-mode: vertical-rl;
  border: 1px solid rgba(255, 184, 77, 0.36);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255, 184, 77, 0.22), rgba(0, 255, 194, 0.12)), rgba(3, 12, 24, 0.92);
  color: #f6ffff;
  font-weight: 900;
  letter-spacing: 0.12em;
  cursor: pointer;
  pointer-events: auto;
  box-shadow: 0 0 24px rgba(255, 184, 77, 0.10);
}

.left-dock .dock-toggle {
  order: 2;
  margin-left: 8px;
}

.right-dock .dock-toggle {
  order: 0;
  margin-right: 8px;
}

.left-dock .dock-content { order: 1; }
.right-dock .dock-content { order: 2; }

.floating-dock .surface {
  width: 100%;
  background:
    linear-gradient(140deg, rgba(8, 27, 42, 0.88), rgba(5, 12, 24, 0.92)),
    radial-gradient(circle at 15% 0%, rgba(0, 255, 194, 0.10), transparent 38%);
  backdrop-filter: blur(18px);
}

.left-dock .leaderboard-panel,
.right-dock .runner-card,
.right-dock .race-table-panel,
.right-dock .race-style-panel {
  pointer-events: auto;
}

.leader-sort-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: -2px 0 12px;
  color: #8fb5bf;
  font-size: 12px;
  font-weight: 900;
}

.leader-row {
  cursor: pointer;
}

.leader-row.selected {
  border-color: rgba(95, 255, 224, 0.62);
  box-shadow: 0 0 22px rgba(95, 255, 224, 0.12);
}

.broadcast-feed {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 0;
  z-index: 4;
  height: 168px;
}

.map-bg-select {
  width: 132px;
}

.race-style-panel {
  padding: 14px;
}

.style-collapse {
  --el-collapse-border-color: rgba(64, 238, 255, 0.12);
  --el-collapse-header-bg-color: transparent;
  --el-collapse-content-bg-color: transparent;
  --el-collapse-header-text-color: #eafcff;
  --el-collapse-content-text-color: #c9e9ef;
}

.style-row.dense {
  display: grid;
  grid-template-columns: minmax(74px, 1fr) 38px 82px 82px;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.background-control {
  display: grid;
  gap: 8px;
}

.file-picker {
  width: 100%;
  color: #c9e9ef;
}

:deep(.race-data-table),
:deep(.event-table),
:deep(.data-table) {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: rgba(3, 18, 32, 0.92);
  --el-table-row-hover-bg-color: rgba(95, 255, 224, 0.12);
  --el-table-border-color: rgba(64, 238, 255, 0.10);
  --el-table-text-color: #eafcff;
  --el-table-header-text-color: #b9ffee;
  background: transparent;
  color: #eafcff;
}

:deep(.race-data-table th.el-table__cell),
:deep(.race-data-table td.el-table__cell),
:deep(.data-table th.el-table__cell),
:deep(.data-table td.el-table__cell) {
  background: transparent !important;
  color: #eafcff;
  border-color: rgba(64, 238, 255, 0.10);
}

:deep(.race-data-table .el-table__row--striped td.el-table__cell),
:deep(.data-table .el-table__row--striped td.el-table__cell) {
  background: rgba(255, 255, 255, 0.055) !important;
  color: #eafcff !important;
}

:deep(.race-data-table .el-table__row:hover td.el-table__cell),
:deep(.race-data-table .current-row td.el-table__cell),
:deep(.race-data-table .selected-tag-row td.el-table__cell),
:deep(.data-table .el-table__row:hover td.el-table__cell) {
  background: rgba(95, 255, 224, 0.16) !important;
  color: #ffffff !important;
}

:deep(.el-table__empty-block) {
  background: transparent;
}

.race-mark-line {
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.32));
}

.race-mark-label {
  font-size: 18px;
  font-weight: 900;
  paint-order: stroke;
  stroke: rgba(2, 6, 23, 0.88);
  stroke-width: 4px;
}

.track-watermark {
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 0.18em;
}

@media (max-width: 1180px) {
  .floating-dock {
    position: relative;
    top: auto;
    bottom: auto;
    left: auto;
    right: auto;
    width: 100%;
    min-height: auto;
    transform: none !important;
    margin-top: 12px;
  }

  .broadcast-dashboard {
    overflow: auto;
  }

  .broadcast-field,
  .broadcast-feed {
    position: relative;
    left: auto;
    right: auto;
    bottom: auto;
    inset: auto;
    height: auto;
    margin-top: 12px;
  }

  .broadcast-field .track-map {
    height: 420px;
  }

  .dock-toggle {
    writing-mode: initial;
    flex-basis: auto;
    min-height: 34px;
    padding: 0 14px;
  }
}

@media (max-width: 720px) {
  .race-line-row,
  .binding-header,
  .binding-row,
  .style-row.dense {
    grid-template-columns: 1fr;
  }

  .binding-header {
    display: none;
  }
}



/* ===== 本版调整：地图拖动防手势冲突、悬浮折叠、画布上方显示设置 ===== */
.track-limit-control {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 190px;
  color: #9fc4cb;
  font-size: 12px;
  font-weight: 900;
}

.track-limit-control span {
  flex: none;
}

.track-map {
  overscroll-behavior: contain;
}

.track-map.pan-enabled {
  cursor: grab;
}

.track-map.pan-enabled.dragging {
  cursor: grabbing;
}

.map-settings-dropdown {
  display: grid;
  gap: 14px;
  max-height: 62vh;
  overflow: auto;
  color: #eafcff;
}

.map-settings-dropdown section {
  display: grid;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(64, 238, 255, 0.14);
}

.map-settings-dropdown section:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.map-settings-dropdown h4 {
  margin: 0;
  color: #ffda91;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.10em;
}

.dropdown-style-row {
  grid-template-columns: minmax(82px, 1fr) 40px 86px 86px;
}

:global(.display-settings-popper) {
  border: 1px solid rgba(64, 238, 255, 0.24) !important;
  background: rgba(3, 12, 24, 0.96) !important;
  box-shadow: 0 22px 70px rgba(0, 0, 0, 0.42), 0 0 28px rgba(64, 238, 255, 0.10) !important;
  backdrop-filter: blur(16px);
}

.right-content {
  grid-template-rows: auto minmax(200px, 1fr);
}

.floating-dock.collapsed {
  width: 42px;
  min-width: 42px;
}

.floating-dock.collapsed.left-dock,
.floating-dock.collapsed.right-dock {
  transform: none;
}

.floating-dock.collapsed .dock-toggle {
  margin-left: 0;
  margin-right: 0;
  height: 172px;
  border-color: rgba(95, 255, 224, 0.46);
  background: linear-gradient(180deg, rgba(0, 255, 194, 0.20), rgba(255, 184, 77, 0.14)), rgba(3, 12, 24, 0.94);
}

.broadcast-field .track-map {
  height: calc(100% - 80px);
}

.settings-events-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.settings-events-panel .settings-event-table {
  width: 100%;
  height: 100% !important;
}

.settings-events-panel :deep(.el-table) {
  background: transparent;
}

.settings-events-panel :deep(.el-table__inner-wrapper),
.settings-events-panel :deep(.el-table__body-wrapper) {
  height: 100% !important;
}

@media (max-width: 1180px) {
  .floating-dock.collapsed {
    width: 100%;
  }

  .floating-dock.collapsed .dock-toggle {
    height: 36px;
  }

  .broadcast-field .track-map {
    height: 460px;
  }
}

@media (max-width: 720px) {
  .dropdown-style-row,
  .track-limit-control {
    grid-template-columns: 1fr;
    min-width: 0;
  }

  .race-map-actions {
    align-items: flex-start;
  }
}



/* ===== V3：标签/基站显示设置独立为右侧悬浮框 ===== */
.right-floating-stack {
  position: absolute;
  top: 88px;
  right: 18px;
  bottom: 18px;
  z-index: 6;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(470px, 36vw);
  min-width: 340px;
  pointer-events: none;
}

.right-floating-stack .floating-dock {
  position: relative;
  top: auto;
  right: auto;
  bottom: auto;
  left: auto;
  width: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  transform: none !important;
  pointer-events: none;
}

.right-floating-stack .right-dock {
  flex: 1 1 68%;
  min-height: 280px;
}

.right-floating-stack .style-dock {
  flex: 0 1 32%;
  min-height: 140px;
}

.right-floating-stack .floating-dock.collapsed {
  align-self: flex-end;
  width: 42px;
  min-width: 42px;
  flex: 0 0 172px;
}

.right-floating-stack .floating-dock.collapsed .dock-toggle {
  height: 172px;
}

.right-floating-stack .dock-content {
  min-width: 0;
  min-height: 0;
}

.style-dock .dock-toggle {
  order: 0;
  margin-right: 8px;
  border-color: rgba(64, 238, 255, 0.42);
  background: linear-gradient(180deg, rgba(64, 238, 255, 0.20), rgba(255, 184, 77, 0.10)), rgba(3, 12, 24, 0.94);
}

.style-dock .dock-content {
  order: 2;
}

.style-content {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  pointer-events: auto;
}

.independent-style-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  max-height: 100%;
  overflow: auto;
}

.independent-style-panel .panel-head {
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(64, 238, 255, 0.12);
}

.style-section-title {
  margin-top: 2px;
  color: #ffda91;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.style-section-title.anchor-title {
  margin-top: 10px;
}

.float-style-row {
  grid-template-columns: minmax(80px, 1fr) 40px 86px 86px;
  padding: 7px 8px;
  margin-bottom: 0;
  border: 1px solid rgba(64, 238, 255, 0.10);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.035);
}

.compact-background-dropdown {
  max-height: none;
  overflow: visible;
}

@media (max-width: 1180px) {
  .right-floating-stack {
    position: relative;
    top: auto;
    right: auto;
    bottom: auto;
    width: 100%;
    min-width: 0;
    margin-top: 12px;
  }

  .right-floating-stack .floating-dock,
  .right-floating-stack .floating-dock.collapsed {
    width: 100%;
    min-width: 0;
    flex: 0 0 auto;
    align-self: stretch;
  }

  .right-floating-stack .floating-dock.collapsed .dock-toggle {
    height: 36px;
  }

  .style-dock .dock-toggle {
    margin-right: 0;
    margin-bottom: 8px;
  }
}

@media (max-width: 720px) {
  .float-style-row {
    grid-template-columns: 1fr;
  }
}

/* ===== V4：右侧两个悬浮框固定分区，避免选手数据与显示设置重叠 ===== */
@media (min-width: 1181px) {
  .right-floating-stack {
    display: block;
    top: 88px;
    right: 18px;
    bottom: 18px;
    width: min(470px, 36vw);
    min-width: 340px;
  }

  .right-floating-stack .floating-dock {
    position: absolute;
    right: 0;
    left: auto;
    width: 100%;
    min-width: 0;
    transform: none !important;
  }

  .right-floating-stack .right-dock {
    top: 0;
    bottom: auto;
    height: calc(70% - 6px);
    min-height: 340px;
    max-height: calc(100% - 152px);
  }

  .right-floating-stack .style-dock {
    top: auto;
    bottom: 0;
    height: calc(30% - 6px);
    min-height: 140px;
    max-height: calc(100% - 352px);
  }

  .right-floating-stack .floating-dock.collapsed {
    width: 42px;
    min-width: 42px;
    height: 172px;
    min-height: 172px;
    max-height: 172px;
    flex: none;
  }

  .right-floating-stack .right-dock.collapsed {
    top: 0;
    bottom: auto;
  }

  .right-floating-stack .style-dock.collapsed {
    top: auto;
    bottom: 0;
  }

  .right-floating-stack .right-dock:not(.collapsed) .right-content,
  .right-floating-stack .style-dock:not(.collapsed) .style-content {
    height: 100%;
  }

  .right-floating-stack .dock-content {
    height: 100%;
    overflow: hidden;
  }

  .right-floating-stack .race-table-panel {
    min-height: 0;
    overflow: hidden;
  }

  .right-floating-stack .independent-style-panel {
    min-height: 0;
    max-height: 100%;
    overflow: auto;
  }

  .right-floating-stack .style-dock .dock-toggle,
  .right-floating-stack .right-dock .dock-toggle {
    height: auto;
    min-height: 100%;
  }

  .right-floating-stack .floating-dock.collapsed .dock-toggle {
    height: 172px;
    min-height: 172px;
  }
}

/* ===== 系统设置页底部三列修复：禁止 padding 撑宽、禁止横向错位 ===== */
.settings-console-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  align-items: stretch;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow: visible;
}

.settings-console-grid > .console-panel {
  width: auto;
  max-width: 100%;
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

.settings-console-grid .raw-list,
.settings-console-grid .json-list,
.settings-console-grid .event-console-body {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.settings-console-grid .event-console-body {
  overflow: auto;
}

.settings-console-grid .settings-event-table {
  min-width: 0;
}

@media (max-width: 1040px) {
  .settings-console-grid {
    grid-template-columns: 1fr;
    grid-auto-rows: minmax(320px, auto);
  }
}



/* ===== v9 系统设置页调试区三列强制修复 =====
   目标：三列必须可见、等宽、等高，不再被父级高度/旧样式影响。
*/
.settings-page {
  height: 100% !important;
  max-height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 14px !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  padding-right: 4px !important;
}

.settings-page > .settings-grid {
  flex: 0 0 auto !important;
}

.settings-page > .settings-console-grid {
  flex: 0 0 auto !important;
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  grid-auto-rows: 1fr !important;
  align-items: stretch !important;
  gap: 14px !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  height: clamp(320px, 36vh, 430px) !important;
  min-height: 320px !important;
  max-height: 430px !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: visible !important;
  visibility: visible !important;
  opacity: 1 !important;
}

.settings-page > .settings-console-grid > .console-panel {
  position: relative !important;
  display: flex !important;
  flex-direction: column !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  height: 100% !important;
  min-height: 0 !important;
  max-height: none !important;
  overflow: hidden !important;
  padding: 16px !important;
  grid-area: auto !important;
  visibility: visible !important;
  opacity: 1 !important;
  transform: none !important;
}

.settings-page > .settings-console-grid > .console-panel > .panel-head {
  flex: 0 0 70px !important;
  min-height: 70px !important;
  height: 70px !important;
  margin: 0 0 10px !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  align-items: start !important;
  gap: 10px !important;
}

.settings-page > .settings-console-grid > .console-panel > .panel-head h3 {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.settings-page > .settings-console-grid > .console-panel > .panel-head p {
  display: -webkit-box !important;
  overflow: hidden !important;
  -webkit-box-orient: vertical !important;
  -webkit-line-clamp: 2 !important;
  line-height: 1.45 !important;
}

.settings-page > .settings-console-grid .raw-list,
.settings-page > .settings-console-grid .json-list,
.settings-page > .settings-console-grid .event-console-body {
  flex: 1 1 auto !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  overflow: auto !important;
  box-sizing: border-box !important;
}

.settings-page > .settings-console-grid .event-console-body {
  padding: 0 !important;
  border: 1px solid rgba(64, 238, 255, 0.12) !important;
  border-radius: 14px !important;
  background: rgba(2, 6, 17, 0.78) !important;
}

.settings-page > .settings-console-grid .settings-event-table,
.settings-page > .settings-console-grid .settings-event-table :deep(.el-table),
.settings-page > .settings-console-grid .settings-event-table :deep(.el-table__inner-wrapper) {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
}

.settings-page > .settings-console-grid .console-empty,
.settings-page > .settings-console-grid .raw-list > .empty-state,
.settings-page > .settings-console-grid .json-list > .empty-state {
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border: 1px dashed rgba(64, 238, 255, 0.20) !important;
  border-radius: 12px !important;
  background: rgba(1, 6, 16, 0.25) !important;
}

@media (max-width: 1180px) {
  .settings-page > .settings-console-grid {
    grid-template-columns: 1fr !important;
    height: auto !important;
    max-height: none !important;
    grid-auto-rows: 320px !important;
  }

  .settings-page > .settings-console-grid > .console-panel {
    height: 320px !important;
  }
}

</style>

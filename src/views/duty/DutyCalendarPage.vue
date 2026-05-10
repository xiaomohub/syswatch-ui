<template>
  <div class="fc-page duty-cal">
    <p v-if="pageError" class="fc-page-error">{{ pageError }}</p>
    <p v-if="calError" class="fc-page-error">{{ calError }}</p>
    <p v-if="pageSuccess" class="fc-page-success">{{ pageSuccess }}</p>

    <div class="fc-page-head fc-list-head fc-head-unified">
      <div class="fc-head-start">
        <button
          type="button"
          class="fc-back-dashboard"
          aria-label="返回值班中心列表"
          title="返回值班中心列表"
          @click="goBack"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div class="fc-head-titles">
          <h2 class="fc-list-title">{{ calendarTitle }}</h2>
          <p v-if="dutyRow" class="duty-sub">负责人：{{ dutyRow.manager?.username || '—' }}</p>
        </div>
      </div>
      <div class="fc-head-end">
        <button type="button" class="btn btn-secondary" :disabled="loadingCal" @click="reloadCalendar">刷新</button>
      </div>
    </div>

    <div v-if="!dutyRow && !pageError" class="fc-hint-card">
      <p class="fc-hint-text">未找到该值班表，请返回列表重试。</p>
    </div>

    <section v-if="dutyRow" class="fc-table-card duty-cal-section">
      <h3 class="section-title">当月排班</h3>
      <div class="cal-nav">
        <button type="button" class="btn btn-secondary btn-sm" :disabled="loadingCal" @click="shiftMonth(-1)">上月</button>
        <label class="field inline month-field">
          <span class="sr-only">月份</span>
          <input v-model="monthInput" type="month" class="fc-input sm" @change="reloadCalendar" />
        </label>
        <button type="button" class="btn btn-secondary btn-sm" :disabled="loadingCal" @click="shiftMonth(1)">下月</button>
      </div>
      <div v-if="loadingCal" class="fc-loading sm"><div class="spinner"></div>加载日程…</div>
      <template v-else>
        <div class="cal-legend">
          <span class="lg-item"><i class="lg-dot published" />已发布</span>
          <span class="lg-item"><i class="lg-dot selected" />将发布</span>
          <span class="lg-item muted">周末为浅色底，与工作日一样展示已发布人员；可点选覆盖</span>
        </div>
        <div class="month-cal" role="grid" :aria-label="`${calendarMonthLabel}排班`">
          <div class="weekday-row" role="row">
            <div v-for="w in weekdayLabels" :key="w" class="weekday-cell" role="columnheader">{{ w }}</div>
          </div>
          <div class="cal-rows">
            <div v-for="(row, ri) in calendarWeekRows" :key="ri" class="cal-row" role="row">
              <button
                v-for="c in row"
                :key="c.key"
                type="button"
                class="cal-cell"
                :class="cellClass(c)"
                :disabled="!c.inMonth"
                role="gridcell"
                :aria-selected="c.inMonth ? !!selectedDays[c.key] : undefined"
                :aria-label="cellAria(c)"
                :title="cellHoverTitle(c)"
                @click="onCellClick(c)"
              >
                <span class="cal-day">{{ c.day }}</span>
                <span
                  v-if="c.inMonth && publishedStaffByDay[c.key]?.length"
                  class="cal-staff"
                  aria-hidden="true"
                >{{ publishedStaffByDay[c.key].join('、') }}</span>
                <span
                  v-else-if="c.inMonth && publishedDayKeys.has(c.key)"
                  class="cal-staff cal-staff--empty"
                  aria-hidden="true"
                >人员未返回</span>
                <span v-if="c.inMonth && (publishedDayKeys.has(c.key) || selectedDays[c.key])" class="cal-dots" aria-hidden="true">
                  <i v-if="publishedDayKeys.has(c.key)" class="cal-dot published" />
                  <i v-if="selectedDays[c.key]" class="cal-dot selected" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </template>
    </section>

    <section v-if="dutyRow" class="fc-table-card duty-cal-section duty-cal-section--form">
      <h3 class="section-title">发布日程</h3>
      <p class="section-desc">
        在月历中点选值班日期，或使用快捷按钮填充。<strong>轮值</strong>按日轮流（每人单独成组）；<strong>同组</strong>表示选中日由同一组人员同时值班。
        时间段用于展示与通知（后端可存为当日班次起止，未实现时可忽略）。
      </p>

      <div class="preset-row" role="group" aria-label="日期快捷">
        <span class="preset-label">快捷</span>
        <button type="button" class="btn btn-secondary btn-sm" @click="presetWorkdays">本月工作日</button>
        <button type="button" class="btn btn-secondary btn-sm" @click="presetAllMonth">全月</button>
        <button type="button" class="btn btn-secondary btn-sm" @click="presetClear">清空</button>
      </div>

      <div class="radio-group" role="radiogroup" aria-label="人员排班方式">
        <label class="radio-item">
          <input v-model="scheduleMode" type="radio" value="together" />
          <span>同组值班</span>
        </label>
        <label class="radio-item">
          <input v-model="scheduleMode" type="radio" value="rotation" />
          <span>按人轮值</span>
        </label>
      </div>

      <div class="time-block">
        <div class="time-block-hd">值班时段（本地）</div>
        <div class="time-wheels" role="group" aria-label="值班开始结束时间">
          <div class="time-group">
            <span class="time-lbl">开始</span>
            <div class="wheel-pair">
              <div
                ref="startHourEl"
                class="wheel-col"
                tabindex="0"
                @scroll.passive="onWheelScroll('start', 'h')"
              >
                <div v-for="n in hourOptions" :key="'sh' + n" class="wheel-item">{{ pad2(n) }}</div>
              </div>
              <span class="wheel-sep">:</span>
              <div
                ref="startMinEl"
                class="wheel-col"
                tabindex="0"
                @scroll.passive="onWheelScroll('start', 'm')"
              >
                <div v-for="n in minuteOptions" :key="'sm' + n" class="wheel-item">{{ pad2(n) }}</div>
              </div>
            </div>
          </div>
          <div class="time-group">
            <span class="time-lbl">结束</span>
            <div class="wheel-pair">
              <div
                ref="endHourEl"
                class="wheel-col"
                tabindex="0"
                @scroll.passive="onWheelScroll('end', 'h')"
              >
                <div v-for="n in hourOptions" :key="'eh' + n" class="wheel-item">{{ pad2(n) }}</div>
              </div>
              <span class="wheel-sep">:</span>
              <div
                ref="endMinEl"
                class="wheel-col"
                tabindex="0"
                @scroll.passive="onWheelScroll('end', 'm')"
              >
                <div v-for="n in minuteOptions" :key="'em' + n" class="wheel-item">{{ pad2(n) }}</div>
              </div>
            </div>
          </div>
        </div>
        <p class="time-summary mono">{{ dutyTimeSummary }}</p>
      </div>

      <div class="staff-block">
        <div class="staff-head">
          <span class="staff-label">值班人员 <span class="req">*</span></span>
          <span class="muted">已选 {{ staffKeys.length }} 人</span>
        </div>
        <div ref="staffMsRoot" class="staff-ms">
          <div class="staff-ms-field" :class="{ open: staffPanelOpen }" @click="focusStaffInput">
            <div class="staff-chips">
              <span v-for="k in staffKeys" :key="k" class="staff-chip">
                {{ staffDisplayName(k) }}
                <button type="button" class="staff-chip-x" aria-label="移除" @click.stop="removeStaffKey(k)">×</button>
              </span>
              <input
                ref="staffSearchInput"
                v-model.trim="staffSearch"
                type="text"
                class="staff-ms-input fc-input"
                autocomplete="off"
                :placeholder="staffKeys.length ? '搜索添加…' : '搜索用户名，下拉多选'"
                @focus="staffPanelOpen = true"
                @keydown.escape.stop.prevent="staffPanelOpen = false"
              />
            </div>
          </div>
          <ul
            v-show="staffPanelOpen"
            class="staff-ms-panel"
            role="listbox"
            aria-multiselectable="true"
          >
            <li v-if="filteredDutyUsers.length === 0" class="staff-ms-empty muted">无匹配用户</li>
            <li
              v-for="u in filteredDutyUsers"
              :key="userRowKey(u)"
              role="option"
              :aria-selected="staffKeys.includes(userRowKey(u))"
              class="staff-ms-opt"
              :class="{
                'is-selected': staffKeys.includes(userRowKey(u))
              }"
              @mousedown.prevent="pickStaffUser(u)"
            >
              <span class="staff-ms-opt-name">{{ u.username || u.userName || userRowKey(u) }}</span>
              <span class="staff-ms-opt-id muted">{{ userRowKey(u) }}</span>
            </li>
          </ul>
        </div>
      </div>

      <p v-if="publishError" class="fc-page-error">{{ publishError }}</p>
      <div class="publish-row">
        <button type="button" class="btn btn-primary" :disabled="publishing" @click="publish">
          {{ publishing ? '发布中…' : '发布日程' }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getDutyManagerList, searchCalendar, createCalendar } from '@/api/duty'
import { getUserList } from '@/api/user'
import {
  monthInputToApiParam,
  parseMonthInput,
  daysInCalendarMonth,
  isWorkday,
  buildMonthCalendarCells,
  timeToLocalDayKey
} from './dutyUtils'
import '../faultcenter/faultCenterCommon.css'

const WHEEL_ITEM_PX = 36
const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日']
const hourOptions = Array.from({ length: 24 }, (_, i) => i)
const minuteOptions = Array.from({ length: 60 }, (_, i) => i)

const route = useRoute()
const router = useRouter()

const pageError = ref('')
const calError = ref('')
const pageSuccess = ref('')
const publishError = ref('')
const loadingCal = ref(false)
const publishing = ref(false)

const dutyRow = ref(null)
const dutyData = ref([])

function currentMonthInput() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}`
}

const monthInput = ref(currentMonthInput())
/** @type {'together' | 'rotation'} */
const scheduleMode = ref('together')
/** @type {import('vue').Ref<Record<string, boolean>>} */
const selectedDays = ref({})
const dutyUsers = ref([])
/** @type {import('vue').Ref<string[]>} */
const staffKeys = ref([])
const staffSearch = ref('')
const staffPanelOpen = ref(false)
const staffMsRoot = ref(null)
const staffSearchInput = ref(null)

const startHour = ref(9)
const startMinute = ref(0)
const endHour = ref(18)
const endMinute = ref(0)

const startHourEl = ref(null)
const startMinEl = ref(null)
const endHourEl = ref(null)
const endMinEl = ref(null)

let wheelSyncTimer = 0

const calendarTitle = computed(() => {
  const q = route.query.calendarName
  const name = Array.isArray(q) ? q[0] : q
  return name && String(name).trim() ? String(name).trim() : '值班日历'
})

const dutyId = computed(() => String(route.params.id || ''))

const calendarMonthLabel = computed(() => {
  const { year, month } = parseMonthInput(monthInput.value)
  if (!year || !month) return ''
  return `${year} 年 ${month} 月`
})

const calendarCells = computed(() => {
  const { year, month } = parseMonthInput(monthInput.value)
  if (!year || !month) return []
  return buildMonthCalendarCells(year, month)
})

const calendarWeekRows = computed(() => {
  const cells = calendarCells.value
  const rows = []
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7))
  }
  return rows
})

const filteredDutyUsers = computed(() => {
  const q = staffSearch.value.toLowerCase()
  if (!q) return dutyUsers.value
  return dutyUsers.value.filter((u) => {
    const k = userRowKey(u).toLowerCase()
    const n = (u.username || u.userName || '').toLowerCase()
    return k.includes(q) || n.includes(q)
  })
})

const publishedDayKeys = computed(() => {
  const set = new Set()
  const { year, month } = parseMonthInput(monthInput.value)
  if (!year || !month) return set
  for (const item of dutyData.value) {
    const k = timeToLocalDayKey(item.time)
    if (!k) continue
    const parts = k.split('-').map((x) => parseInt(x, 10))
    const y = parts[0]
    const m = parts[1]
    if (y === year && m === month) set.add(k)
  }
  return set
})

/** @param {unknown} users `calendarSearch` 的 users：扁平或分组嵌套 */
function dutyItemUserDisplayNames(users) {
  if (!users || !Array.isArray(users)) return []
  /** @param {unknown} u */
  function pushUser(u) {
    if (!u || typeof u !== 'object') return
    const o = /** @type {Record<string, unknown>} */ (u)
    const name = o.username ?? o.userName ?? o.userid ?? o.userId
    if (name != null && String(name).trim()) out.push(String(name).trim())
  }
  const out = []
  const first = users[0]
  if (Array.isArray(first)) {
    for (const group of users) {
      if (!Array.isArray(group)) continue
      for (const u of group) pushUser(u)
    }
  } else {
    for (const u of users) pushUser(u)
  }
  return out
}

/** 当月各日已发布值班人展示名（去重保序） */
const publishedStaffByDay = computed(() => {
  /** @type {Record<string, string[]>} */
  const map = {}
  const { year, month } = parseMonthInput(monthInput.value)
  if (!year || !month) return map
  for (const item of dutyData.value) {
    const k = timeToLocalDayKey(item.time)
    if (!k) continue
    const parts = k.split('-').map((x) => parseInt(x, 10))
    if (parts[0] !== year || parts[1] !== month) continue
    const names = dutyItemUserDisplayNames(item.users)
    if (!names.length) continue
    if (!map[k]) map[k] = []
    for (const n of names) {
      if (!map[k].includes(n)) map[k].push(n)
    }
  }
  return map
})

const dutyTimeSummary = computed(() => {
  return `${pad2(startHour.value)}:${pad2(startMinute.value)} — ${pad2(endHour.value)}:${pad2(endMinute.value)}`
})

let successTimer
function flashSuccess(msg) {
  pageSuccess.value = msg
  clearTimeout(successTimer)
  successTimer = setTimeout(() => {
    pageSuccess.value = ''
  }, 3000)
}

function goBack() {
  router.push({ name: 'DutyManageList' })
}

function userRowKey(u) {
  return String(u.userid || u.username || u.userName || '')
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function shiftMonth(delta) {
  const { year, month } = parseMonthInput(monthInput.value)
  if (!year || !month) return
  const d = new Date(year, month - 1 + delta, 1)
  const p = (n) => String(n).padStart(2, '0')
  monthInput.value = `${d.getFullYear()}-${p(d.getMonth() + 1)}`
}

watch(monthInput, () => {
  selectedDays.value = {}
})

function presetWorkdays() {
  const { year, month } = parseMonthInput(monthInput.value)
  if (!year || !month) return
  const last = daysInCalendarMonth(year, month)
  const next = {}
  for (let day = 1; day <= last; day++) {
    if (isWorkday(year, month, day)) next[`${year}-${month}-${day}`] = true
  }
  selectedDays.value = next
}

function presetAllMonth() {
  const { year, month } = parseMonthInput(monthInput.value)
  if (!year || !month) return
  const last = daysInCalendarMonth(year, month)
  const next = {}
  for (let day = 1; day <= last; day++) {
    next[`${year}-${month}-${day}`] = true
  }
  selectedDays.value = next
}

function presetClear() {
  selectedDays.value = {}
}

/** @param {{ key: string, day: number, inMonth: boolean, isWeekend: boolean }} c */
function onCellClick(c) {
  if (!c.inMonth) return
  const next = { ...selectedDays.value }
  if (next[c.key]) delete next[c.key]
  else next[c.key] = true
  selectedDays.value = next
}

/** @param {{ key: string, day: number, inMonth: boolean, isWeekend: boolean }} c */
function cellClass(c) {
  return {
    'is-out': !c.inMonth,
    'is-weekend': c.inMonth && c.isWeekend,
    'is-on': c.inMonth && !!selectedDays.value[c.key],
    'has-published': c.inMonth && publishedDayKeys.value.has(c.key)
  }
}

/** @param {{ key: string, day: number, inMonth: boolean, isWeekend: boolean }} c */
function cellAria(c) {
  if (!c.inMonth) return `非本月 ${c.day} 日`
  const sel = selectedDays.value[c.key] ? '已选' : '未选'
  const staff = publishedStaffByDay.value[c.key]
  let pub = ''
  if (staff?.length) pub = `，值班 ${staff.join('、')}`
  else if (publishedDayKeys.value.has(c.key)) pub = '，已有排班（人员未返回）'
  return `${c.day} 日，${sel}${pub}`
}

/** @param {{ key: string, day: number, inMonth: boolean, isWeekend: boolean }} c */
function cellHoverTitle(c) {
  if (!c.inMonth) return ''
  const staff = publishedStaffByDay.value[c.key]
  if (staff?.length) return `值班：${staff.join('、')}`
  if (publishedDayKeys.value.has(c.key)) return '已有排班，接口未返回值班人员字段'
  return ''
}

function staffDisplayName(key) {
  const u = dutyUsers.value.find((x) => userRowKey(x) === key)
  if (!u) return key
  return u.username || u.userName || key
}

function focusStaffInput() {
  staffPanelOpen.value = true
  staffSearchInput.value?.focus()
}

/** @param {Record<string, unknown>} u */
function pickStaffUser(u) {
  const k = userRowKey(u)
  if (!k) return
  const cur = staffKeys.value.filter(Boolean)
  if (cur.includes(k)) {
    staffKeys.value = cur.filter((x) => x !== k)
    return
  }
  staffKeys.value = [...cur, k]
}

function removeStaffKey(k) {
  staffKeys.value = staffKeys.value.filter((x) => x !== k)
}

function onStaffDocMouseDown(ev) {
  if (!staffPanelOpen.value) return
  const root = staffMsRoot.value
  if (root && ev.target instanceof Node && !root.contains(ev.target)) {
    staffPanelOpen.value = false
  }
}

function readWheelIndex(el, maxIdx) {
  if (!el) return 0
  const raw = Math.round(el.scrollTop / WHEEL_ITEM_PX)
  return Math.min(maxIdx, Math.max(0, raw))
}

function snapWheel(el, maxIdx) {
  if (!el) return
  const idx = readWheelIndex(el, maxIdx)
  el.scrollTo({ top: idx * WHEEL_ITEM_PX, behavior: 'smooth' })
}

/**
 * @param {'start'|'end'} part
 * @param {'h'|'m'} kind
 */
function onWheelScroll(part, kind) {
  clearTimeout(wheelSyncTimer)
  wheelSyncTimer = window.setTimeout(() => {
    const hEl = part === 'start' ? startHourEl.value : endHourEl.value
    const mEl = part === 'start' ? startMinEl.value : endMinEl.value
    if (kind === 'h') snapWheel(hEl, 23)
    else snapWheel(mEl, 59)
    if (!hEl || !mEl) return
    const hi = readWheelIndex(hEl, 23)
    const mi = readWheelIndex(mEl, 59)
    if (part === 'start') {
      startHour.value = hi
      startMinute.value = mi
    } else {
      endHour.value = hi
      endMinute.value = mi
    }
  }, 80)
}

function scrollWheelToValue(el, value, maxIdx) {
  if (!el) return
  const v = Math.min(maxIdx, Math.max(0, value))
  el.scrollTop = v * WHEEL_ITEM_PX
}

async function initWheelScrollPositions() {
  await nextTick()
  scrollWheelToValue(startHourEl.value, startHour.value, 23)
  scrollWheelToValue(startMinEl.value, startMinute.value, 59)
  scrollWheelToValue(endHourEl.value, endHour.value, 23)
  scrollWheelToValue(endMinEl.value, endMinute.value, 59)
}

async function loadDutyMeta() {
  pageError.value = ''
  try {
    const list = await getDutyManagerList()
    const id = dutyId.value
    dutyRow.value = list.find((x) => String(x.id) === id) || null
    if (!dutyRow.value) pageError.value = '未找到值班表。'
  } catch (e) {
    dutyRow.value = null
    pageError.value = e?.message || '加载值班表失败'
  }
}

async function loadDutyUsers() {
  try {
    dutyUsers.value = await getUserList({ joinDuty: 'true' })
  } catch {
    dutyUsers.value = []
  }
}

async function reloadCalendar() {
  const id = dutyId.value
  if (!id) return
  publishError.value = ''
  calError.value = ''
  loadingCal.value = true
  try {
    const time = monthInputToApiParam(monthInput.value)
    dutyData.value = await searchCalendar({ dutyId: id, time })
  } catch (e) {
    dutyData.value = []
    calError.value = e?.message || '加载日历失败'
  } finally {
    loadingCal.value = false
    await initWheelScrollPositions()
  }
}


function selectedStaffObjects() {
  return staffKeys.value
    .map((k) => dutyUsers.value.find((u) => userRowKey(u) === k))
    .filter(Boolean)
    .map((u) => ({
      userid: String(u.userid || u.username || u.userName || ''),
      username: u.username || u.userName || String(u.userid)
    }))
}

function compareDayKeys(a, b) {
  const pa = a.split('-').map((x) => parseInt(x, 10))
  const pb = b.split('-').map((x) => parseInt(x, 10))
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i]
  }
  return 0
}

async function publish() {
  publishError.value = ''
  if (!dutyRow.value) {
    publishError.value = '值班表不存在。'
    return
  }
  const staff = selectedStaffObjects()
  if (staff.length === 0) {
    publishError.value = '请至少选择 1 名值班人员。'
    return
  }
  const keys = Object.keys(selectedDays.value).filter((k) => selectedDays.value[k])
  if (keys.length === 0) {
    publishError.value = '请在月历中至少选择一天，或使用「本月工作日 / 全月」快捷。'
    return
  }
  keys.sort(compareDayKeys)

  const monthApi = monthInputToApiParam(monthInput.value)
  if (!monthApi) {
    publishError.value = '请选择有效月份。'
    return
  }

  let userGroup
  if (scheduleMode.value === 'rotation') {
    userGroup = staff.map((u) => [u])
  } else {
    userGroup = [staff]
  }

  const dutyTime = {
    start: `${pad2(startHour.value)}:${pad2(startMinute.value)}`,
    end: `${pad2(endHour.value)}:${pad2(endMinute.value)}`
  }
  const startTotal = startHour.value * 60 + startMinute.value
  const endTotal = endHour.value * 60 + endMinute.value
  if (endTotal <= startTotal) {
    publishError.value = '结束时间须晚于开始时间（如需跨午夜请后续再扩展）。'
    return
  }

  publishing.value = true
  try {
    await createCalendar({
      dutyId: dutyId.value,
      month: monthApi,
      dutyPeriod: 1,
      dateType: 'day',
      userGroup,
      status: 'Formal',
      scheduleMode: scheduleMode.value,
      selectedDates: keys,
      dutyTime
    })
    flashSuccess('日程已发布。')
    await reloadCalendar()
  } catch (e) {
    publishError.value = e?.message || '发布失败'
  } finally {
    publishing.value = false
  }
}

onMounted(async () => {
  document.addEventListener('mousedown', onStaffDocMouseDown)
  await loadDutyMeta()
  await loadDutyUsers()
  presetWorkdays()
  await reloadCalendar()
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onStaffDocMouseDown)
})
</script>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.duty-sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 400;
}

.duty-cal-section {
  padding: 16px 18px 20px;
}

/* 下拉选项在 .fc-table-card 内；全局 fc-table-card 为 overflow:hidden 会裁切列表并导致滚轮无法在本列表内滚动 */
.duty-cal-section--form {
  overflow: visible;
}

.section-title {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 700;
}

.section-desc {
  margin: 0 0 14px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.55;
}

.cal-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}

.month-field {
  margin-bottom: 0;
}

.fc-loading.sm {
  padding: 24px;
}

.cal-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px 18px;
  margin-bottom: 10px;
  font-size: 12px;
}

.lg-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.lg-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.lg-dot.published {
  background: var(--text-muted);
}
.lg-dot.selected {
  background: var(--brand-600);
}

.month-cal {
  border: 1px solid var(--border-default);
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 14px;
  background: var(--bg-card);
}

.weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: var(--bg-muted, rgba(0, 0, 0, 0.04));
  border-bottom: 1px solid var(--border-default);
}

.weekday-cell {
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  padding: 8px 4px;
}

.cal-rows {
  display: flex;
  flex-direction: column;
}

.cal-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.cal-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 92px;
  border: none;
  border-right: 1px solid var(--border-default);
  border-bottom: 1px solid var(--border-default);
  background: transparent;
  cursor: pointer;
  padding: 6px 4px 12px;
  margin: 0;
  font: inherit;
  color: var(--text-primary);
}

.cal-row .cal-cell:nth-child(7n) {
  border-right: none;
}

.cal-cell.is-out {
  cursor: default;
  color: var(--text-muted);
  opacity: 0.35;
}

.cal-cell.is-weekend:not(.is-on) {
  background: rgba(0, 0, 0, 0.02);
}

.cal-cell.is-on {
  background: var(--brand-50);
  box-shadow: inset 0 0 0 2px var(--brand-600);
}

.cal-cell.has-published:not(.is-on) {
  background: rgba(0, 0, 0, 0.03);
}

/* 周末浅色底上仍保证姓名清晰可读（与工作日一致展示接口返回的值班人） */
.cal-cell.has-published .cal-staff {
  color: var(--text-primary);
  font-weight: 600;
}

.cal-cell.has-published .cal-staff--empty {
  color: var(--text-secondary);
  font-weight: 500;
}

.cal-day {
  display: block;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.cal-staff {
  flex: 1 1 auto;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5;
  overflow: hidden;
  width: 100%;
  margin-top: 2px;
  font-size: 11px;
  line-height: 1.3;
  font-weight: 500;
  text-align: center;
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}

.cal-staff--empty {
  -webkit-line-clamp: 2;
  font-weight: 400;
  font-size: 10px;
  color: var(--text-muted);
}

.cal-dots {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  pointer-events: none;
}

.cal-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}
.cal-dot.published {
  background: var(--text-muted);
}
.cal-dot.selected {
  background: var(--brand-600);
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  margin-bottom: 14px;
}

.preset-label {
  font-size: 13px;
  font-weight: 600;
  margin-right: 4px;
}

.radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  margin-bottom: 14px;
}

.radio-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
}

.time-block {
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  background: var(--bg-card);
}

.time-block-hd {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 10px;
}

.time-wheels {
  display: flex;
  flex-wrap: wrap;
  gap: 20px 28px;
  align-items: flex-start;
}

.time-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.time-lbl {
  font-size: 12px;
  color: var(--text-muted);
}

.wheel-pair {
  display: flex;
  align-items: center;
  gap: 6px;
}

.wheel-sep {
  font-weight: 700;
  font-size: 18px;
  padding: 0 2px;
}

.wheel-col {
  width: 52px;
  height: 108px;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-card);
  scrollbar-width: thin;
}

.wheel-item {
  height: 36px;
  line-height: 36px;
  text-align: center;
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  scroll-snap-align: center;
  flex-shrink: 0;
}

.time-summary {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.staff-block {
  margin-top: 8px;
}

.staff-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}

.staff-label {
  font-weight: 600;
}

.req {
  color: var(--danger-600);
}

.staff-ms {
  position: relative;
}

.staff-ms-field {
  min-height: 42px;
  padding: 6px 10px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-card);
  cursor: text;
}

.staff-ms-field.open {
  border-color: var(--brand-600);
  box-shadow: 0 0 0 1px var(--brand-600);
}

.staff-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.staff-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px 2px 8px;
  border-radius: 6px;
  background: var(--brand-50);
  color: var(--text-primary);
  font-size: 13px;
  max-width: 100%;
}

.staff-chip-x {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0 2px;
  color: var(--text-muted);
}

.staff-chip-x:hover {
  color: var(--danger-600);
}

.staff-ms-input {
  flex: 1;
  min-width: 140px;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  padding: 4px 2px !important;
  font-size: 13px;
}

.staff-ms-panel {
  list-style: none;
  margin: 4px 0 0;
  padding: 4px 0;
  position: absolute;
  left: 0;
  right: 0;
  z-index: 50;
  max-height: min(240px, 45vh);
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--bg-card);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.staff-ms-empty {
  padding: 12px 14px;
  font-size: 13px;
}

.staff-ms-opt {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
}

.staff-ms-opt:hover:not(.is-disabled) {
  background: var(--brand-50);
}

.staff-ms-opt.is-selected {
  background: rgba(0, 0, 0, 0.04);
  font-weight: 600;
}

.staff-ms-opt.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.staff-ms-opt-name {
  color: var(--text-primary);
}

.staff-ms-opt-id {
  font-size: 12px;
}

.publish-row {
  margin-top: 14px;
}

.muted {
  color: var(--text-muted);
}
</style>

<template>
  <div class="am-page" :class="{ embedded }">
    <div v-if="!embedded" class="am-head">
      <h2 class="am-title">通知记录</h2>
      <div class="am-actions">
        <button type="button" class="am-btn" :disabled="loading" @click="load">刷新</button>
      </div>
    </div>
    <div v-else class="am-head am-head-compact">
      <div class="am-actions">
        <button type="button" class="am-btn sm" :disabled="loading" @click="load">刷新</button>
      </div>
    </div>

    <div class="am-filters">
      <template v-if="!embedded">
        <input v-model="f.eventId" class="am-input sm" placeholder="事件 ID" @keyup.enter="resetPage">
        <input v-model="f.severity" class="am-input sm" placeholder="等级 severity" @keyup.enter="resetPage">
        <input v-model="f.status" class="am-input sm" placeholder="状态 status" @keyup.enter="resetPage">
        <input v-model="f.uuid" class="am-input sm" placeholder="通知对象 uuid" @keyup.enter="resetPage">
        <input v-model="f.query" class="am-input sm" placeholder="关键词" @keyup.enter="resetPage">
      </template>
      <template v-else>
        <input v-model="f.severity" class="am-input sm" placeholder="等级 severity" @keyup.enter="resetPage">
        <input v-model="f.status" class="am-input sm" placeholder="状态 status" @keyup.enter="resetPage">
        <input v-model="f.query" class="am-input sm" placeholder="关键词 query" @keyup.enter="resetPage">
      </template>
      <button type="button" class="am-btn sm" @click="resetPage">查询</button>
      <button type="button" class="am-btn sm" @click="resetFilters">重置</button>
    </div>

    <p v-if="pageError" class="am-err">{{ pageError }}</p>

    <div class="am-table-card">
      <div v-if="loading" class="am-loading"><span class="spinner" />加载中…</div>
      <table v-else class="am-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>事件</th>
            <th>规则</th>
            <th>渠道</th>
            <th>对象</th>
            <th>等级</th>
            <th>状态</th>
            <th>告警摘要</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0">
            <td colspan="8" class="am-empty">暂无记录</td>
          </tr>
          <tr v-for="row in rows" :key="row.eventId + row.createAt + row.nType">
            <td class="nw">{{ formatTime(row.createAt) }}</td>
            <td><code>{{ row.eventId }}</code></td>
            <td>{{ row.ruleName }}</td>
            <td>
              <NotificationTypeIcon v-if="embedded" :type="row.nType" />
              <template v-else>{{ row.nType }}</template>
            </td>
            <td><code>{{ row.nObj }}</code></td>
            <td>
              <span class="sev" :class="`sev-${String(row.severity || '')}`">{{ row.severity }}</span>
            </td>
            <td>
              <span :class="['pill', row.status === 0 ? 'ok' : 'bad']">
                {{ row.status === 0 ? '成功' : '失败' }}
              </span>
            </td>
            <td class="msg">
              <div>{{ row.alarmMsg }}</div>
              <div v-if="row.errMsg" class="sub-err">{{ row.errMsg }}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="total > size" class="am-pager">
        <span class="muted">共 {{ total }} 条 · 每页 {{ size }}</span>
        <button type="button" class="am-btn sm" :disabled="index <= 1" @click="goPage(index - 1)">上一页</button>
        <span class="muted">第 {{ index }} / {{ totalPages }} 页</span>
        <button type="button" class="am-btn sm" :disabled="index >= totalPages" @click="goPage(index + 1)">下一页</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { noticeRecordList } from '@/api/notice'
import { useNoticePerm } from '@/composables/useNoticePerm'
import NotificationTypeIcon from '@/views/notice-objects/NotificationTypeIcon.vue'

const props = defineProps({
  /** 内嵌于通知对象 Drawer，固定 uuid 过滤 */
  embedded: { type: Boolean, default: false },
  /** 通知对象 uuid，对应请求参数 uuid */
  noticeObjectId: { type: String, default: '' }
})

const perm = useNoticePerm()
const loading = ref(false)
const pageError = ref('')
const rows = ref([])
const total = ref(0)
const index = ref(1)
const size = ref(20)

const f = reactive({
  eventId: '',
  severity: '',
  status: '',
  uuid: '',
  query: ''
})

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / size.value)))

function formatTime(ts) {
  if (ts == null || !Number.isFinite(ts)) return '—'
  const d = new Date(ts < 1e12 ? ts * 1000 : ts)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

function resetFilters() {
  f.eventId = ''
  f.severity = ''
  f.status = ''
  f.uuid = props.embedded && props.noticeObjectId ? props.noticeObjectId : ''
  f.query = ''
  resetPage()
}

function resetPage() {
  index.value = 1
  load()
}

function goPage(p) {
  index.value = Math.max(1, Math.min(p, totalPages.value))
  load()
}

async function load() {
  pageError.value = ''
  if (!perm.canRecordList()) {
    pageError.value = '无通知记录列表权限'
    rows.value = []
    return
  }
  loading.value = true
  try {
    const uuid =
      props.embedded && props.noticeObjectId
        ? props.noticeObjectId
        : f.uuid.trim() || undefined
    const data = await noticeRecordList({
      eventId: props.embedded ? undefined : f.eventId.trim() || undefined,
      severity: f.severity.trim() || undefined,
      status: f.status.trim() || undefined,
      uuid,
      query: f.query.trim() || undefined,
      index: index.value,
      size: size.value
    })
    rows.value = data.list || []
    total.value = data.total ?? 0
    index.value = data.index ?? index.value
    size.value = data.size ?? size.value
  } catch (e) {
    rows.value = []
    pageError.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.noticeObjectId,
  (id) => {
    if (props.embedded && id) {
      f.uuid = id
      resetPage()
    }
  }
)

onMounted(() => {
  if (props.embedded && props.noticeObjectId) {
    f.uuid = props.noticeObjectId
  }
  load()
})
</script>

<style scoped>
.am-page {
  padding: 8px 0 32px;
}
.am-page.embedded {
  padding: 0 0 16px;
}
.am-head-compact {
  margin-bottom: 8px;
  justify-content: flex-end;
}
.am-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.am-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
.am-actions {
  display: flex;
  gap: 8px;
}
.am-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.am-input {
  padding: 8px 10px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  font-size: 13px;
}
.am-input.sm {
  min-width: 120px;
}
.am-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-default);
  background: #fff;
  font-size: 13px;
  cursor: pointer;
}
.am-btn.sm {
  padding: 4px 10px;
  font-size: 12px;
}
.am-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.am-err {
  color: #b91c1c;
  font-size: 13px;
}
.am-table-card {
  border: 1px solid var(--border-default);
  border-radius: 10px;
  overflow: auto;
  background: #fff;
}
.am-loading {
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #ddd;
  border-top-color: #333;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.am-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 960px;
}
.am-table th,
.am-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-default);
  vertical-align: top;
}
.am-table th {
  background: #fafafa;
  font-weight: 600;
}
.nw {
  white-space: nowrap;
}
.msg {
  max-width: 280px;
  word-break: break-word;
}
.sub-err {
  color: #b91c1c;
  font-size: 12px;
  margin-top: 4px;
}
.pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
}
.pill.ok {
  background: #dcfce7;
  color: #166534;
}
.pill.bad {
  background: #fee2e2;
  color: #991b1b;
}
.am-empty {
  text-align: center;
  color: #888;
  padding: 28px;
}
.am-pager {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--border-default);
}
.muted {
  color: #666;
  font-size: 13px;
}
.sev {
  font-weight: 600;
  font-size: 13px;
}
.sev-P0 {
  color: #b91c1c;
}
.sev-P1 {
  color: #c2410c;
}
.sev-P2 {
  color: #4b5563;
}
</style>

<template>
  <div class="am-page">
    <div class="am-head">
      <h2 class="am-title">静默</h2>
      <button type="button" class="am-btn primary" :disabled="!fcStore.currentFaultCenterId" @click="openCreate">新建静默</button>
      <button type="button" class="am-btn" :disabled="loading || !fcStore.currentFaultCenterId" @click="load">刷新</button>
    </div>

    <p v-if="!fcStore.currentFaultCenterId" class="am-warn">请先在顶部选择故障中心。</p>

    <div class="am-filters">
      <input v-model="query" class="am-input sm" placeholder="query" @keyup.enter="resetPage">
      <select v-model.number="filterStatus" class="am-input sm" @change="resetPage">
        <option :value="-1">全部状态</option>
        <option :value="0">未生效</option>
        <option :value="1">进行中</option>
        <option :value="2">已失效</option>
      </select>
    </div>

    <p v-if="pageError" class="am-err">{{ pageError }}</p>

    <div class="am-table-card">
      <div v-if="loading" class="am-loading"><span class="spinner" />加载中…</div>
      <table v-else class="am-table">
        <thead>
          <tr>
            <th>名称</th>
            <th>状态</th>
            <th>开始</th>
            <th>结束</th>
            <th>备注</th>
            <th class="tc">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0">
            <td colspan="6" class="am-empty">{{ fcStore.currentFaultCenterId ? '暂无静默' : '—' }}</td>
          </tr>
          <tr v-for="row in rows" :key="row.id || row.name">
            <td>{{ row.name || row.id || '—' }}</td>
            <td>{{ statusLabel(row.status) }}</td>
            <td class="small">{{ row.startsAt || '—' }}</td>
            <td class="small">{{ row.endsAt || '—' }}</td>
            <td>{{ row.comment || '—' }}</td>
            <td class="tc">
              <button type="button" class="link" @click="openEdit(row)">编辑</button>
              <button type="button" class="link danger" @click="del(row)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="total > size" class="am-pager">
        <span class="muted">共 {{ total }} 条</span>
        <button type="button" class="am-btn sm" :disabled="index <= 1" @click="goPage(index - 1)">上一页</button>
        <span>{{ index }} / {{ totalPages }}</span>
        <button type="button" class="am-btn sm" :disabled="index >= totalPages" @click="goPage(index + 1)">下一页</button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="modalOpen" class="modal-overlay" @click.self="modalOpen = false">
        <div class="modal-box wide">
          <h3>{{ modalMode === 'create' ? '新建静默' : '编辑静默' }}</h3>
          <label class="field"><span>名称</span><input v-model="form.name" class="am-input" type="text"></label>
          <label class="field"><span>标签匹配（JSON 数组，元素含 key/value/operator）</span>
            <textarea v-model="labelsJson" class="am-textarea mono" rows="5" placeholder='[{"key":"alertname","value":"x","operator":"="}]'></textarea>
          </label>
          <label class="field"><span>开始时间 startsAt（RFC3339 或后端接受格式）</span>
            <input v-model="form.startsAt" class="am-input" type="text" placeholder="2026-01-01T00:00:00Z">
          </label>
          <label class="field"><span>结束时间 endsAt</span>
            <input v-model="form.endsAt" class="am-input" type="text">
          </label>
          <label class="field"><span>备注</span>
            <textarea v-model="form.comment" class="am-textarea" rows="2"></textarea>
          </label>
          <p v-if="formError" class="am-err">{{ formError }}</p>
          <div class="modal-actions">
            <button type="button" class="am-btn" @click="modalOpen = false">取消</button>
            <button type="button" class="am-btn primary" :disabled="saving" @click="submit">保存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { normalizeListPayload } from '@/utils/w8tPage'
import { silenceList, silenceCreate, silenceUpdate, silenceDelete } from '@/api/w8tAlert'
import { useFaultCenterContextStore } from '@/store/faultCenterContext'

const fcStore = useFaultCenterContextStore()

const loading = ref(false)
const pageError = ref('')
const rows = ref([])
const total = ref(0)
const index = ref(1)
const size = ref(20)
const query = ref('')
const filterStatus = ref(-1)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / size.value)))

function statusLabel(s) {
  if (s === 0) return '未生效'
  if (s === 1) return '进行中'
  if (s === 2) return '已失效'
  return String(s ?? '—')
}

function resetPage() {
  index.value = 1
  load()
}

watch(
  () => fcStore.currentFaultCenterId,
  (id) => {
    if (id) resetPage()
    else {
      rows.value = []
      total.value = 0
    }
  }
)

async function load() {
  const fc = fcStore.currentFaultCenterId
  if (!fc) return
  pageError.value = ''
  loading.value = true
  try {
    const params = {
      faultCenterId: fc,
      query: query.value?.trim() || undefined,
      index: index.value,
      size: Math.max(1, size.value)
    }
    if (filterStatus.value >= 0) params.status = filterStatus.value
    const data = await silenceList(params)
    const n = normalizeListPayload(data)
    rows.value = n.list
    total.value = n.total
    index.value = n.index
    size.value = n.size
  } catch (e) {
    rows.value = []
    pageError.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function goPage(p) {
  index.value = Math.max(1, Math.min(p, totalPages.value))
  load()
}

const modalOpen = ref(false)
const modalMode = ref('create')
const formError = ref('')
const saving = ref(false)
const form = ref({
  id: '',
  name: '',
  startsAt: '',
  endsAt: '',
  comment: ''
})
const labelsJson = ref('[]')

function openCreate() {
  modalMode.value = 'create'
  form.value = {
    id: '',
    name: '',
    startsAt: '',
    endsAt: '',
    comment: ''
  }
  labelsJson.value = '[]'
  formError.value = ''
  modalOpen.value = true
}

function openEdit(row) {
  modalMode.value = 'edit'
  form.value = {
    id: row.id || '',
    name: row.name || '',
    startsAt: row.startsAt || '',
    endsAt: row.endsAt || '',
    comment: row.comment || ''
  }
  labelsJson.value = JSON.stringify(row.labels || [], null, 2)
  formError.value = ''
  modalOpen.value = true
}

async function submit() {
  formError.value = ''
  const fc = fcStore.currentFaultCenterId
  if (!fc) {
    formError.value = '无故障中心'
    return
  }
  let labels
  try {
    labels = JSON.parse(labelsJson.value || '[]')
    if (!Array.isArray(labels)) throw new Error('labels 须为数组')
  } catch (e) {
    formError.value = e?.message || '标签 JSON 无效'
    return
  }
  saving.value = true
  try {
    const body = {
      name: form.value.name?.trim() || 'silence',
      labels,
      startsAt: form.value.startsAt,
      endsAt: form.value.endsAt,
      faultCenterId: fc,
      comment: form.value.comment || ''
    }
    if (modalMode.value === 'create') {
      await silenceCreate(body)
    } else {
      await silenceUpdate({ ...body, id: form.value.id })
    }
    modalOpen.value = false
    await load()
  } catch (e) {
    formError.value = e?.message || '保存失败'
  } finally {
    saving.value = false
  }
}

function del(row) {
  if (!confirm(`删除静默「${row.name || row.id}」？`)) return
  const id = row.id
  if (!id) {
    pageError.value = '缺少 id'
    return
  }
  silenceDelete({ id })
    .then(() => load())
    .catch((e) => {
      pageError.value = e?.message || '删除失败'
    })
}

onMounted(() => {
  if (fcStore.currentFaultCenterId) load()
})
</script>

<style scoped>
.am-page { padding: 8px 0 32px; }
.am-head { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 12px; }
.am-title { margin: 0; font-size: 20px; font-weight: 600; flex: 1; min-width: 120px; }
.am-warn { color: #b45309; font-size: 13px; }
.am-filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.am-input {
  padding: 8px 10px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  font-size: 13px;
}
.am-input.sm { min-width: 140px; }
.am-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-default);
  background: #fff;
  font-size: 13px;
  cursor: pointer;
}
.am-btn.primary { background: #1d4ed8; color: #fff; border-color: #1d4ed8; }
.am-btn.sm { padding: 4px 10px; font-size: 12px; }
.am-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.am-err { color: #b91c1c; font-size: 13px; }
.am-table-card { border: 1px solid var(--border-default); border-radius: 10px; overflow: auto; background: #fff; }
.am-loading { padding: 16px; display: flex; align-items: center; gap: 10px; }
.spinner {
  width: 18px; height: 18px;
  border: 2px solid #ddd;
  border-top-color: #333;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.am-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.am-table th, .am-table td { padding: 8px 10px; border-bottom: 1px solid var(--border-default); text-align: left; }
.am-table th { background: #fafafa; font-weight: 600; }
.small { font-size: 12px; color: #444; }
.tc { text-align: center; }
.am-empty { text-align: center; color: #888; padding: 24px; }
.link { background: none; border: none; color: #2563eb; cursor: pointer; margin: 0 6px; font-size: 13px; }
.link.danger { color: #b91c1c; }
.am-pager { display: flex; align-items: center; gap: 10px; padding: 12px; border-top: 1px solid var(--border-default); }
.muted { color: #666; font-size: 13px; }
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000;
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.modal-box {
  background: #fff; border-radius: 12px; padding: 20px 22px; min-width: 360px; max-width: 560px; width: 100%;
}
.modal-box.wide { max-width: 560px; }
.modal-box h3 { margin: 0 0 12px; font-size: 17px; }
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; font-size: 13px; }
.am-textarea {
  padding: 8px 10px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
}
.am-textarea.mono { font-family: ui-monospace, monospace; font-size: 12px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
</style>

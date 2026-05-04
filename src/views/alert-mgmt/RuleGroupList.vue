<template>
  <div class="am-page">
    <div class="am-head">
      <h2 class="am-title">规则组</h2>
      <div class="am-actions">
        <input v-model="query" type="search" class="am-input" placeholder="搜索 query" @keyup.enter="load">
        <button type="button" class="am-btn" :disabled="loading" @click="load">刷新</button>
        <button type="button" class="am-btn primary" @click="openCreate">新建</button>
      </div>
    </div>

    <p v-if="pageError" class="am-err">{{ pageError }}</p>

    <div class="am-table-card">
      <div v-if="loading" class="am-loading"><span class="spinner" />加载中…</div>
      <table v-else class="am-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>名称</th>
            <th class="tc">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0">
            <td colspan="3" class="am-empty">暂无规则组</td>
          </tr>
          <tr v-for="row in rows" :key="row.id">
            <td><code>{{ row.id }}</code></td>
            <td>{{ row.name || '—' }}</td>
            <td class="tc">
              <button type="button" class="link" @click="openEdit(row)">编辑</button>
              <button type="button" class="link danger" @click="askDelete(row)">删除</button>
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
        <div class="modal-box">
          <h3>{{ modalMode === 'create' ? '新建规则组' : '编辑规则组' }}</h3>
          <label class="field"><span>名称</span><input v-model="form.name" class="am-input" type="text"></label>
          <p v-if="formError" class="am-err">{{ formError }}</p>
          <div class="modal-actions">
            <button type="button" class="am-btn" @click="modalOpen = false">取消</button>
            <button type="button" class="am-btn primary" :disabled="submitting" @click="submitForm">保存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { normalizeListPayload } from '@/utils/w8tPage'
import { ruleGroupList, ruleGroupCreate, ruleGroupUpdate, ruleGroupDelete } from '@/api/w8tAlert'

const loading = ref(false)
const pageError = ref('')
const rows = ref([])
const total = ref(0)
const index = ref(1)
const size = ref(20)
const query = ref('')

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / size.value)))

async function load() {
  pageError.value = ''
  loading.value = true
  try {
    const data = await ruleGroupList({
      query: query.value?.trim() || undefined,
      index: index.value,
      size: size.value
    })
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
  index.value = Math.max(1, p)
  load()
}

const modalOpen = ref(false)
const modalMode = ref('create')
const form = ref({ id: '', name: '' })
const formError = ref('')
const submitting = ref(false)

function openCreate() {
  modalMode.value = 'create'
  form.value = { id: '', name: '' }
  formError.value = ''
  modalOpen.value = true
}

function openEdit(row) {
  modalMode.value = 'edit'
  form.value = { id: row.id, name: row.name || '' }
  formError.value = ''
  modalOpen.value = true
}

async function submitForm() {
  formError.value = ''
  if (!form.value.name?.trim()) {
    formError.value = '请填写名称'
    return
  }
  submitting.value = true
  try {
    if (modalMode.value === 'create') {
      await ruleGroupCreate({ name: form.value.name.trim() })
    } else {
      await ruleGroupUpdate({ id: form.value.id, name: form.value.name.trim() })
    }
    modalOpen.value = false
    await load()
  } catch (e) {
    formError.value = e?.message || '保存失败'
  } finally {
    submitting.value = false
  }
}

function askDelete(row) {
  if (!confirm(`删除规则组「${row.name || row.id}」？`)) return
  ruleGroupDelete({ id: row.id })
    .then(() => load())
    .catch((e) => {
      pageError.value = e?.message || '删除失败'
    })
}

onMounted(load)
</script>

<style scoped>
.am-page { padding: 8px 0 32px; }
.am-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.am-title { margin: 0; font-size: 20px; font-weight: 600; }
.am-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.am-input {
  padding: 8px 10px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  font-size: 13px;
  min-width: 180px;
}
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
.am-table-card {
  border: 1px solid var(--border-default);
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}
.am-loading { padding: 24px; display: flex; align-items: center; gap: 10px; color: #555; }
.spinner {
  width: 18px; height: 18px;
  border: 2px solid #ddd;
  border-top-color: #333;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.am-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.am-table th, .am-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--border-default); }
.am-table th { background: #fafafa; font-weight: 600; }
.tc { text-align: center; }
.am-empty { text-align: center; color: #888; padding: 28px; }
.link { background: none; border: none; color: #2563eb; cursor: pointer; margin: 0 6px; font-size: 13px; }
.link.danger { color: #b91c1c; }
.am-pager { display: flex; align-items: center; gap: 10px; padding: 12px; border-top: 1px solid var(--border-default); }
.muted { color: #666; font-size: 13px; }
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000;
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.modal-box {
  background: #fff; border-radius: 12px; padding: 20px 22px; min-width: 320px; max-width: 100%;
}
.modal-box h3 { margin: 0 0 16px; font-size: 17px; }
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; font-size: 13px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
</style>

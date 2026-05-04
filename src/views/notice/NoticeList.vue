<template>
  <div class="am-page">
    <div class="am-head">
      <h2 class="am-title">通知对象</h2>
      <div class="am-actions">
        <RouterLink
          v-if="perm.canCreate()"
          to="/alert-mgmt/notice/create"
          class="am-btn primary linkish"
        >新建</RouterLink>
        <button type="button" class="am-btn" :disabled="loading" @click="load">刷新</button>
      </div>
    </div>

    <div class="am-filters">
      <input
        v-model="filterQuery"
        class="am-input sm"
        placeholder="关键词（名称等）"
        @keyup.enter="load"
      >
      <input
        v-model="filterTmplId"
        class="am-input sm"
        placeholder="模板 ID noticeTmplId"
        @keyup.enter="load"
      >
      <button type="button" class="am-btn sm" @click="load">查询</button>
    </div>

    <p v-if="pageError" class="am-err">{{ pageError }}</p>

    <div class="am-table-card">
      <div v-if="loading" class="am-loading"><span class="spinner" />加载中…</div>
      <table v-else class="am-table">
        <thead>
          <tr>
            <th>名称</th>
            <th>uuid</th>
            <th class="nw">路由数</th>
            <th>dutyId</th>
            <th>更新人</th>
            <th>更新时间</th>
            <th class="tc">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0">
            <td colspan="7" class="am-empty">暂无通知对象</td>
          </tr>
          <tr v-for="row in rows" :key="row.uuid">
            <td class="strong">{{ row.name }}</td>
            <td>
              <code>{{ row.uuid }}</code>
              <button type="button" class="link sm" @click="copyUuid(row.uuid)">复制</button>
            </td>
            <td class="nw">{{ row.routes?.length ?? 0 }}</td>
            <td><code>{{ row.dutyId || '—' }}</code></td>
            <td>{{ row.updateBy || '—' }}</td>
            <td>{{ formatTime(row.updateAt) }}</td>
            <td class="tc">
              <RouterLink
                v-if="perm.canUpdate()"
                class="link"
                :to="`/alert-mgmt/notice/${encodeURIComponent(row.uuid)}/edit`"
              >编辑</RouterLink>
              <button
                v-if="perm.canDelete()"
                type="button"
                class="link danger"
                @click="onDelete(row)"
              >删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { noticeList, noticeDelete } from '@/api/notice'
import { useNoticePerm } from '@/composables/useNoticePerm'

const perm = useNoticePerm()
const loading = ref(false)
const pageError = ref('')
const rows = ref([])
const filterQuery = ref('')
const filterTmplId = ref('')

function formatTime(ts) {
  if (ts == null || !Number.isFinite(ts)) return '—'
  const d = new Date(ts < 1e12 ? ts * 1000 : ts)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

async function copyUuid(uuid) {
  try {
    await navigator.clipboard.writeText(uuid)
  } catch {
    pageError.value = '复制失败（浏览器权限）'
  }
}

async function load() {
  pageError.value = ''
  if (!perm.canList()) {
    pageError.value = '无列表权限'
    rows.value = []
    return
  }
  loading.value = true
  try {
    const data = await noticeList({
      query: filterQuery.value.trim() || undefined,
      noticeTmplId: filterTmplId.value.trim() || undefined
    })
    rows.value = Array.isArray(data) ? data : []
  } catch (e) {
    rows.value = []
    pageError.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function onDelete(row) {
  if (!confirm(`删除通知对象「${row.name}」？若已被规则绑定将失败。`)) return
  noticeDelete(row.uuid)
    .then(() => load())
    .catch((e) => {
      pageError.value = e instanceof Error ? e.message : '删除失败'
    })
}

onMounted(() => load())
</script>

<style scoped>
.am-page {
  padding: 8px 0 32px;
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
  flex-wrap: wrap;
  gap: 8px;
}
.am-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}
.am-input {
  padding: 8px 10px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  font-size: 13px;
}
.am-input.sm {
  min-width: 160px;
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
  text-decoration: none;
  color: inherit;
}
.am-btn.primary {
  background: #1d4ed8;
  color: #fff;
  border-color: #1d4ed8;
}
.am-btn.linkish {
  text-decoration: none;
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
  color: #555;
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
  min-width: 720px;
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
.tc {
  text-align: center;
}
.am-empty {
  text-align: center;
  color: #888;
  padding: 28px;
}
.strong {
  font-weight: 600;
  color: #1a1a1a;
}
.link {
  background: none;
  border: none;
  color: #2563eb;
  cursor: pointer;
  margin: 0 6px;
  font-size: 13px;
  text-decoration: none;
}
.link.sm {
  margin-left: 8px;
  font-size: 12px;
}
.link.danger {
  color: #b91c1c;
}
</style>

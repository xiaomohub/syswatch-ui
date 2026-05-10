<template>
  <div class="am-page">
    <div class="am-head">
      <h2 class="am-title">告警模板</h2>
      <div class="am-actions">
        <button type="button" class="am-btn" disabled title="待对接后端">新建</button>
        <button type="button" class="am-btn" :disabled="loading" @click="load">刷新</button>
      </div>
    </div>

    <p class="am-hint">
      告警模板用于预置告警内容格式与变量占位；列表与编辑能力待对接 WatchAlert 告警模板 API 后在此页补齐。
    </p>

    <p v-if="pageError" class="am-err">{{ pageError }}</p>

    <div class="am-table-card">
      <div v-if="loading" class="am-loading"><span class="spinner" />加载中…</div>
      <table v-else class="am-table">
        <thead>
          <tr>
            <th>名称</th>
            <th>说明</th>
            <th class="tc">状态</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="3" class="am-empty">暂无数据（占位页）</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const loading = ref(false)
const pageError = ref('')

async function load() {
  loading.value = true
  pageError.value = ''
  try {
    await new Promise((r) => setTimeout(r, 200))
  } finally {
    loading.value = false
  }
}
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
.am-hint {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 12px;
  line-height: 1.5;
}
.am-err {
  color: #b91c1c;
  font-size: 13px;
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
.am-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
}
.am-table th,
.am-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-default);
}
.am-table th {
  background: #fafafa;
  font-weight: 600;
}
.tc {
  text-align: center;
}
.am-empty {
  text-align: center;
  color: #94a3b8;
  padding: 28px;
}
</style>

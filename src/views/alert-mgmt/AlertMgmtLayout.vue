<template>
  <div class="am-layout">
    <div class="am-bar">
      <nav class="am-nav" aria-label="告警管理">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="am-nav-link"
          active-class="active"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
      <div class="am-fc">
        <label class="am-fc-label">故障中心</label>
        <select
          v-model="fcId"
          class="am-fc-select"
          :disabled="fcStore.loading"
          @change="onFcChange"
        >
          <option value="" disabled>请选择</option>
          <option v-for="c in fcStore.centers" :key="c.id" :value="c.id">
            {{ c.name || c.id }}
          </option>
        </select>
        <span v-if="fcStore.error" class="am-fc-err">{{ fcStore.error }}</span>
        <RouterLink to="/fault-center" class="am-link">维护故障中心</RouterLink>
      </div>
    </div>
    <p v-if="!fcId && !fcStore.loading" class="am-hint">
      请选择故障中心后使用「活跃告警」「历史告警」「静默」；规则列表可按中心筛选。
    </p>
    <RouterView />
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useFaultCenterContextStore } from '@/store/faultCenterContext'

const fcStore = useFaultCenterContextStore()

const fcId = computed({
  get: () => fcStore.currentFaultCenterId,
  set: (v) => fcStore.setCurrentFaultCenterId(v)
})

const nav = [
  { to: '/alert-mgmt/rule-groups', label: '规则组' },
  { to: '/alert-mgmt/rules', label: '告警规则' },
  { to: '/alert-mgmt/events/current', label: '活跃告警' },
  { to: '/alert-mgmt/events/history', label: '历史告警' },
  { to: '/alert-mgmt/silences', label: '静默' },
  { to: '/alert-mgmt/notice', label: '通知对象' },
  { to: '/alert-mgmt/notice/records', label: '通知记录' },
  { to: '/alert-mgmt/notice/metrics', label: '通知统计' }
]

function onFcChange() {
  /* v-model 已写入 store */
}

onMounted(() => {
  fcStore.loadCenters()
})

watch(
  () => fcStore.centers.length,
  (n) => {
    if (n && !fcStore.currentFaultCenterId && fcStore.centers[0]) {
      fcStore.setCurrentFaultCenterId(fcStore.centers[0].id)
    }
  }
)
</script>

<style scoped>
.am-layout {
  max-width: 1400px;
  margin: 0 auto;
}
.am-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 0 16px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--border-default);
}
.am-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.am-nav-link {
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  color: #444;
  text-decoration: none;
  border: 1px solid transparent;
}
.am-nav-link:hover {
  background: var(--bg-muted, #f4f4f5);
}
.am-nav-link.active {
  color: #1a1a1a;
  font-weight: 600;
  border-color: var(--border-default);
  background: #fff;
}
.am-fc {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.am-fc-label {
  font-size: 13px;
  color: #555;
}
.am-fc-select {
  min-width: 200px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-default);
  font-size: 13px;
}
.am-fc-err {
  font-size: 12px;
  color: #b45309;
}
.am-link {
  font-size: 13px;
  color: #2563eb;
}
.am-hint {
  font-size: 13px;
  color: #666;
  margin: 0 0 12px;
}
</style>

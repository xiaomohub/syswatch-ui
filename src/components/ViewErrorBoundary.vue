<template>
  <div class="view-eb">
    <div v-if="err" class="view-crash" role="alert">
      <h2 class="crash-title">当前视图加载异常</h2>
      <p class="crash-hint">侧栏与顶栏仍可使用，请尝试重新加载本页或切换到其他菜单。</p>
      <pre class="crash-msg">{{ err.message }}</pre>
      <div class="crash-actions">
        <button type="button" class="btn-retry" @click="retry">重新加载本页</button>
        <router-link to="/dashboard" class="btn-home">监控面板</router-link>
      </div>
    </div>
    <div v-else :key="remountKey" class="view-eb-slot">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onErrorCaptured } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps({
  /** 路由变化时清除错误，避免遮挡后续导航 */
  resetOnRouteChange: { type: Boolean, default: true }
})

const err = ref(null)
const remountKey = ref(0)
const route = useRoute()

onErrorCaptured((e) => {
  err.value = e instanceof Error ? e : new Error(String(e))
  console.error('[ViewErrorBoundary]', e)
  return false
})

watch(
  () => route.fullPath,
  () => {
    if (props.resetOnRouteChange) err.value = null
  }
)

function retry() {
  err.value = null
  remountKey.value += 1
}
</script>

<style scoped>
.view-eb {
  min-height: 0;
}
.view-eb-slot {
  min-height: 0;
}
.view-crash {
  padding: 28px 24px;
  max-width: 640px;
  margin: 0 auto;
  border: 1px solid var(--border-default, #e5e7eb);
  border-radius: 12px;
  background: var(--bg-card, #fff);
}
.crash-title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}
.crash-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: #555;
  line-height: 1.5;
}
.crash-msg {
  margin: 0 0 16px;
  padding: 12px;
  font-size: 12px;
  line-height: 1.4;
  color: #991b1b;
  background: #fef2f2;
  border-radius: 8px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
.crash-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
.btn-retry {
  padding: 8px 16px;
  font-size: 13px;
  border-radius: 8px;
  border: 1px solid var(--border-default, #e5e7eb);
  background: #1d4ed8;
  color: #fff;
  cursor: pointer;
}
.btn-retry:hover {
  filter: brightness(1.05);
}
.btn-home {
  font-size: 13px;
  color: #2563eb;
  text-decoration: none;
}
.btn-home:hover {
  text-decoration: underline;
}
</style>

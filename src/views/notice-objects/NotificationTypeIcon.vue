<template>
  <span class="nti" :title="label">
    <span class="nti-dot" :class="`t-${type}`" aria-hidden="true" />
    <span class="nti-text">{{ label }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { NOTICE_TYPE_LABELS } from './noticeTypes.js'

const props = defineProps({
  type: { type: String, default: '' }
})

const label = computed(() => NOTICE_TYPE_LABELS[props.type] || props.type || '—')
</script>

<style scoped>
.nti {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.nti-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.t-FeiShu {
  background: #3370ff;
}
.t-Email {
  background: #64748b;
}
.t-DingDing {
  background: #0089ff;
}
.t-WeChat {
  background: #07c160;
}
.t-Slack {
  background: #611f69;
}
.t-WebHook {
  background: #0f172a;
}
.nti-text {
  color: var(--text-primary, #1e293b);
}
</style>

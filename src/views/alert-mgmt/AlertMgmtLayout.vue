<template>
  <div class="am-layout">
    <RouterView />
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useFaultCenterContextStore } from '@/store/faultCenterContext'

const fcStore = useFaultCenterContextStore()

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
  width: 100%;
  max-width: min(1600px, 100%);
  margin: 0 auto;
  box-sizing: border-box;
}
</style>

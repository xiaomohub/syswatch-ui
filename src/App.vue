<script setup lang="ts">
import ViewErrorBoundary from '@/components/ViewErrorBoundary.vue'
</script>

<template>
  <ViewErrorBoundary>
    <router-view />
  </ViewErrorBoundary>
</template>

<style scoped></style>

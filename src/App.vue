<script setup lang="ts">
import FixedColum from './components/FixedColum.vue';
</script>

<template>
  <div class="min-h-screen flex">
    <div class="fixed left-0 top-0 h-screen w-13 bg-amber-50 z-10">
      <FixedColum />
    </div>
    <div class="flex-1 pl-13 bg-gray-100">
      <RouterView />
    </div>
    <!-- 全局Toast通知组件 -->
    <PrimeToast position="top-right" />
  </div>
</template>

<style scoped></style>

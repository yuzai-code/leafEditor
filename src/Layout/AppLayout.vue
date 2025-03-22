<template>
  <div class="app-layout">
    <Splitter class="min-h-screen h-screen overflow-hidden">
      <SplitterPanel :size="20" :minSize="10" class="bg-gray-50 overflow-hidden">
        <SidebarLayout />
      </SplitterPanel>
      <SplitterPanel :size="80" :minSize="50" class="overflow-hidden">
        <TopLayout />
        <EditorText class="h-full" />
      </SplitterPanel>
    </Splitter>
  </div>
</template>
<script setup lang="ts">
// import TheWelcome from '../components/TheWelcome.vue'
import EditorText from "@/components/EditorText.vue";
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import SidebarLayout from "@/Layout/SidebarLayout.vue";
import TopLayout from "@/Layout/TopLayout.vue";
</script>
<style>
.app-layout {
  position: fixed;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

:deep(.p-splitter) {
  border: none;
}

:deep(.p-splitter-gutter) {
  background: #e5e7eb;
  width: 4px;
  cursor: col-resize;
}

:deep(.p-splitter-gutter:hover) {
  background: #d1d5db;
}
</style>

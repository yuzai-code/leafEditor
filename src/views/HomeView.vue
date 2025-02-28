<template>
 <Splitter class="min-h-screen">
    <SplitterPanel :size="20" :minSize="10" class="bg-gray-50">
      <SidebarLayout />
    </SplitterPanel>
    <SplitterPanel :size="80" :minSize="50">
      <EditorText class="h-full"/>
    </SplitterPanel>
  </Splitter>
</template>
<script setup lang="ts">
// import TheWelcome from '../components/TheWelcome.vue'
import EditorText from "@/components/EditorText.vue";
import SidebarLayout from "@/components/SidebarLayout.vue";
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
</script>
<style>
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

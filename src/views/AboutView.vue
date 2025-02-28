<template>
  <div class="about">
    <h1>This is an about page</h1>
    <div ref="editorContainer" id="editor"></div>
  </div>
</template>
<script setup lang="ts">
import EditorJS from '@editorjs/editorjs';
import { onMounted, ref } from 'vue';
import Header from '@editorjs/header';
import List from '@editorjs/list';

const editorContainer = ref<HTMLDivElement | null>(null);
const editor = ref<EditorJS | null>(null);
onMounted(() => {
  editor.value = new EditorJS({
    holder: 'editor',
    placeholder: '开始编辑内容',
    tools: {
      header: Header,
      list: List
    }
  })  
});

</script>

<style>
#editor {
  width: 100%;
  min-height: 500px;
  margin-top: 20px;
}
@media (min-width: 1024px) {
  .about {
    min-height: 100vh;
    display: flex;
    align-items: center;
  }
}
</style>

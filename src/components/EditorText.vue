<template>
  <div ref="editorContainer" id="editor" class="w-full h-full"></div>
</template>
  
<script setup lang='ts'>
import EditorJS from '@editorjs/editorjs';
import { onMounted, ref} from 'vue';
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

</style>
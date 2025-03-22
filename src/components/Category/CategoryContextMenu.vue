<template>
  <PrimeMenu ref="menuRef" :model="menuItems" :popup="true" class="category-context-menu" />
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits, computed } from 'vue';
// 由于已经全局注册了PrimeMenu，不需要再导入
// import Menu from 'primevue/menu';

const props = defineProps({
  node: {
    type: Object,
    required: true,
    default: () => ({})
  }
});

const emit = defineEmits([
  'create-note', 
  'create-category', 
  'delete-category',
  'rename-category',
  'move-category',
  'delete-note'
]);

// 菜单引用，使用更明确的类型
const menuRef = ref<{ toggle: (event: Event) => void } | null>(null);

// 根据节点类型计算菜单项
const menuItems = computed(() => {
  const nodeType = props.node.nodeType;
  
  // 笔记节点的菜单项
  if (nodeType === 'note') {
    return [
      {
        label: '重命名',
        icon: 'pi pi-pencil',
        command: () => emit('rename-category', props.node)
      },
      {
        label: '移动到',
        icon: 'pi pi-arrows-alt',
        command: () => emit('move-category', props.node)
      },
      { separator: true },
      {
        label: '删除',
        icon: 'pi pi-trash',
        class: 'text-red-500',
        command: () => emit('delete-note', props.node)
      }
    ];
  }
  
  // 分类节点的默认菜单项
  return [
    {
      label: '新建笔记',
      icon: 'pi pi-file',
      command: () => emit('create-note', props.node),
    },
    {
      label: '新建文件夹',
      icon: 'pi pi-folder-open',
      command: () => emit('create-category', props.node)
    },
    { separator: true },
    {
      label: '重命名',
      icon: 'pi pi-pencil',
      command: () => emit('rename-category', props.node)
    },
    {
      label: '移动到',
      icon: 'pi pi-arrows-alt',
      command: () => emit('move-category', props.node)
    },
    { separator: true },
    {
      label: '删除',
      icon: 'pi pi-trash',
      class: 'text-red-500',
      command: () => emit('delete-category', props.node)
    }
  ];
});

// 显示菜单
const show = (event: Event) => {
  if (menuRef.value) {
    menuRef.value.toggle(event);
  }
};

// 暴露方法给父组件调用
defineExpose({
  show
});
</script>

<style scoped>
:deep(.category-context-menu) {
  min-width: 180px;
  font-size: 0.875rem;
}

:deep(.category-context-menu .p-menuitem-link) {
  padding: 0.5rem 1rem;
}

:deep(.category-context-menu .p-menuitem-icon) {
  margin-right: 0.5rem;
}

:deep(.text-red-500 .p-menuitem-text) {
  color: rgb(239, 68, 68);
}
</style> 
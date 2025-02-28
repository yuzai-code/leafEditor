<template>
  <div class="sidebar-container">
    <Tree :value="nodes" class="tree-component"></Tree>
  </div>
</template>
  
<script setup lang='ts'>
import { ref ,onMounted} from 'vue';
import Tree from 'primevue/tree';

const testData = [{
    key: '0',
    label: 'Documents',
    data: 'Documents Folder',
    icon: 'pi pi-fw pi-inbox',
    children: [
        {
            key: '0-0',
            label: 'Work',
            data: 'Work Folder',
            icon: 'pi pi-fw pi-cog',
            children: [
                { key: '0-0-0', label: 'Expenses.doc', icon: 'pi pi-fw pi-file', data: 'Expenses Document' },
                { key: '0-0-1', label: 'Resume.doc', icon: 'pi pi-fw pi-file', data: 'Resume Document' }
            ]
        },
        {
            key: '0-1',
            label: 'Home',
            data: 'Home Folder',
            icon: 'pi pi-fw pi-home',
            children: [{ key: '0-1-0', label: 'Invoices.txt', icon: 'pi pi-fw pi-file', data: 'Invoices for this month' }]
        }
    ]
}]
const nodes = ref(testData);

onMounted(() => {
});
</script>
  
<style>
.sidebar-container {
  height: 100%;
}

.tree-component {
  width: 100%;
}

/* 自定义树组件样式 */
:deep(.p-tree) {
  border: none;
  padding: 0.5rem;
}

:deep(.p-tree-container) {
  margin: 0;
}
</style>
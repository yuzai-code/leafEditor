<template>
  <div class="system-navigation mb-3">
    <div class="flex items-center justify-between px-4 py-2">
      <h3 class="text-xs font-semibold text-gray-500">系统导航</h3>
      <button 
        class="text-gray-400 hover:text-gray-600 focus:outline-none" 
        @click="toggleExpanded"
      >
        <i :class="['pi', expanded ? 'pi-chevron-down' : 'pi-chevron-right', 'text-xs']"></i>
      </button>
    </div>

    <!-- 系统导航菜单 -->
    <div v-if="expanded">
      <PanelMenu :model="menuItems" class="w-full sidebar-panel-menu" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';

// 定义节点类型
interface NavNode {
  id: string;
  label: string;
  icon: string;
  expanded?: boolean;
  nodeType: 'system';
}

// 系统导航节点
const systemNodes = reactive<NavNode[]>([
  {
    id: 'dashboard',
    label: '仪表盘',
    icon: 'pi-home',
    expanded: false,
    nodeType: 'system'
  },
  {
    id: 'all_notes',
    label: '全部笔记',
    icon: 'pi-file',
    expanded: false,
    nodeType: 'system'
  },
  {
    id: 'recent',
    label: '最近使用',
    icon: 'pi-clock',
    expanded: false,
    nodeType: 'system'
  },
  {
    id: 'favorites',
    label: '收藏',
    icon: 'pi-star',
    expanded: false,
    nodeType: 'system'
  },
  {
    id: 'trash',
    label: '回收站',
    icon: 'pi-trash',
    expanded: false,
    nodeType: 'system'
  }
]);

// 展开/折叠状态
const expanded = ref(true);

// 系统菜单项
const menuItems = computed(() => {
  return systemNodes.map(node => ({
    label: node.label,
    icon: `pi ${node.icon}`,
    command: () => handleNodeClick(node)
  }));
});

// 切换展开/折叠状态
const toggleExpanded = () => {
  expanded.value = !expanded.value;
};

// 处理节点点击
const handleNodeClick = (node: NavNode) => {
  console.log('系统导航点击:', node);
  // 这里可以添加系统导航点击的逻辑，例如导航到相应页面
};
</script>

<style scoped>
:deep(.sidebar-panel-menu) {
  border: none;
  background: transparent;
}

:deep(.sidebar-panel-menu .p-panelmenu-header-link) {
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
}

:deep(.sidebar-panel-menu .p-panelmenu-header-link:hover) {
  background-color: #f9fafb;
}

:deep(.sidebar-panel-menu .p-panelmenu-content) {
  border: none;
  background: transparent;
}

:deep(.sidebar-panel-menu .p-menuitem-link) {
  padding: 0.5rem 1rem;
}

:deep(.sidebar-panel-menu .p-menuitem-link:hover) {
  background-color: #f9fafb;
}

:deep(.sidebar-panel-menu .p-menuitem-icon) {
  margin-right: 0.5rem;
}
</style> 
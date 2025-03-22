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
    <div v-if="expanded" class="system-nav-content">
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
    command: () => handleNodeClick(node),
    class: 'system-nav-item'
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
/* 基础菜单样式 */
:deep(.sidebar-panel-menu) {
  border: none;
  background: transparent;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* 去除所有边框和箭头 */
:deep(.sidebar-panel-menu .p-panelmenu-header) {
  margin-bottom: 0;
  border: none;
}

:deep(.sidebar-panel-menu .p-panelmenu-header-link) {
  padding: 0.6rem 1rem;
  border: none;
  background: transparent;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
  color: #4b5563; /* text-gray-600 */
  display: flex;
  align-items: center;
}

:deep(.sidebar-panel-menu .p-panelmenu-header-link:focus) {
  box-shadow: none;
  outline: none;
}

:deep(.sidebar-panel-menu .p-panelmenu-header-link:hover) {
  background-color: rgba(243, 244, 246, 0.8); /* lighter hover state */
  color: #1f2937; /* text-gray-800 */
}

:deep(.sidebar-panel-menu .p-panelmenu-header-link.p-highlight) {
  background-color: rgba(238, 242, 255, 0.8); /* light indigo background */
  color: #4f46e5; /* indigo-600 */
}

/* 内容区域样式 */
:deep(.sidebar-panel-menu .p-panelmenu-content) {
  border: none;
  background: transparent;
  padding: 0;
}

/* 菜单项样式 */
:deep(.sidebar-panel-menu .p-menuitem) {
  margin: 0.25rem 0;
}

:deep(.sidebar-panel-menu .p-menuitem-link) {
  padding: 0.6rem 1rem;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
  color: #4b5563; /* text-gray-600 */
}

:deep(.sidebar-panel-menu .p-menuitem-link:focus) {
  box-shadow: none;
  outline: none;
}

:deep(.sidebar-panel-menu .p-menuitem-link:hover) {
  background-color: rgba(243, 244, 246, 0.8); /* lighter hover state */
  color: #1f2937; /* text-gray-800 */
}

:deep(.sidebar-panel-menu .p-menuitem-link.p-highlight) {
  background-color: rgba(238, 242, 255, 0.8); /* light indigo background */
  color: #4f46e5; /* indigo-600 */
}

/* 当前活动菜单项 */
:deep(.sidebar-panel-menu .p-menuitem.p-highlight) {
  background-color: rgba(238, 242, 255, 0.8); /* light indigo background */
}

/* 图标样式 */
:deep(.sidebar-panel-menu .p-menuitem-icon) {
  margin-right: 0.75rem;
  color: #6b7280; /* text-gray-500 */
  font-size: 1rem;
  width: 1.25rem;
  text-align: center;
}

:deep(.sidebar-panel-menu .p-menuitem-link:hover .p-menuitem-icon) {
  color: #4f46e5; /* indigo-600 on hover */
}

:deep(.sidebar-panel-menu .p-menuitem-link.p-highlight .p-menuitem-icon) {
  color: #4f46e5; /* indigo-600 when active */
}

/* 文本样式 */
:deep(.sidebar-panel-menu .p-menuitem-text) {
  font-size: 0.875rem; /* text-sm */
  font-weight: 500; /* font-medium */
}

/* 去除折叠展开图标 */
:deep(.sidebar-panel-menu .p-submenu-icon) {
  display: none;
}

/* 系统导航内容区域样式 */
.system-nav-content {
  max-height: 300px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 0.5rem;
}

/* 自定义滚动条样式 */
.system-nav-content::-webkit-scrollbar {
  width: 4px;
}

.system-nav-content::-webkit-scrollbar-track {
  background: transparent;
}

.system-nav-content::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 8px;
}

.system-nav-content::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}
</style> 
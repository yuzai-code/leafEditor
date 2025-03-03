<template>
  <div class="sidebar-container">
    <Tree :value="nodes" class="tree-component">
      <!-- 使用 node 插槽自定义节点 -->
      <template #default="{ node }">
        <div class="node-container flex items-center justify-between w-full">
          <!-- 节点原始内容 -->
          <span class="node-label">
            {{ node.label }}
          </span>
          <!-- 三个点图标，固定在右侧 -->
           <i class="pi pi-plus node-plus"></i>
          <i
            class="pi pi-ellipsis-v node-menu-toggle"
            @click.stop="toggleMenu($event, node)"
          ></i>
        </div>
      </template>
    </Tree>
    <!-- 下拉菜单 -->
    <Menu ref="menu" :model="menuItems" :popup="true" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Tree from 'primevue/tree';
import Menu from 'primevue/menu';
import type { MenuItem } from 'primevue/menuitem';
import type { TreeNode } from 'primevue/treenode';

// 测试数据
const testData: TreeNode[] = [
  {
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
          { key: '0-0-1', label: 'Resume.doc', icon: 'pi pi-fw pi-file', data: 'Resume Document' },
        ],
      },
      {
        key: '0-1',
        label: 'Home',
        data: 'Home Folder',
        icon: 'pi pi-fw pi-home',
        children: [
          { key: '0-1-0', label: 'Invoices.txt', icon: 'pi pi-fw pi-file', data: 'Invoices for this month' },
        ],
      },
    ],
  },
];

// 树节点数据
const nodes = ref<TreeNode[]>(testData);

// 菜单引用
const menu = ref<unknown>(null);

// 当前选中的节点
const selectedNode = ref<TreeNode | null>(null);

// 菜单项
const menuItems = ref<MenuItem[]>([]);

// 点击“三个点”时显示菜单
const toggleMenu = (event: Event, node: TreeNode) => {
  selectedNode.value = node;
  menuItems.value = [
    {
      label: '编辑',
      icon: 'pi pi-pencil',
      command: () => {
        console.log('编辑节点:', selectedNode.value?.label);
      },
    },
    {
      label: '删除',
      icon: 'pi pi-trash',
      command: () => {
        console.log('删除节点:', selectedNode.value?.label);
      },
    },
    {
      label: '查看详情',
      icon: 'pi pi-info-circle',
      command: () => {
        console.log('查看详情:', selectedNode.value?.data);
      },
    },
  ];
  menu.value.toggle(event); // 显示菜单
};

onMounted(() => {
  // 初始化逻辑（如果需要）
});
</script>

<style scoped>
/* 确保 sidebar-container 有明确的宽度和定位上下文 */
.sidebar-container {
  position: relative; /* 使 sidebar-container 成为绝对定位的参考 */
  width: 100%;
}

/* 确保树组件占满宽度 */
.tree-cont {
  width: 100%;
}

/* 覆盖 PrimeVue 的默认样式，确保节点占满宽度 */
.tree-component :deep(.p-treenode) {
  width: 100%;
  position: relative; /* 确保每个树节点可以作为定位上下文 */
}

/* 确保节点内容占满宽度 */
.tree-component :deep(.p-treenode-content) {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 2rem; /* 为图标预留空间 */
}

/* 节点容器样式 */
.node-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%; /* 确保节点容器占满父容器宽度 */
}

/* 节点标签样式 */
.node-label {
  flex-grow: 1; /* 让标签占据剩余空间 */
}

/* 三个点图标样式 */
.node-menu-toggle {
  position: absolute;
  right: 0.5rem; /* 固定在最右边，留出一点间距 */
  cursor: pointer;
  padding: 0 0.25rem; /* 微调点击区域 */
  font-size: 0.80rem;
}
/* 加号图标样式 */
.node-plus {
  position: absolute;
  right: 1.7rem; /* 固定在最右边，留出一点间距 */
  cursor: pointer;
  padding: 0 0.25rem; /* 微调点击区域 */
  font-size: 0.80rem;
}
</style>

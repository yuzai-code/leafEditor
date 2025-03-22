<template>
  <div class="category-tree">
    <!-- 分类列表 -->
    <div class="category-list">
      <div v-for="node in nodes" :key="node.id">
        <CategoryItem 
          :id="node.id"
          :label="node.label"
          :icon="node.icon"
          :has-children="!!node.children && node.children.length > 0"
          :expanded="!!node.expanded"
          :node-type="node.nodeType"
          @item-click="onItemClick"
          @show-context-menu="showContextMenu"
          @toggle-expand="onToggleExpand"
        />
        
        <!-- 递归渲染子节点 -->
        <div v-if="node.expanded && node.children && node.children.length > 0" class="pl-4">
          <CategoryTree 
            :nodes="node.children" 
            @item-click="onItemClick"
            @context-menu-action="handleContextMenuAction"
            @toggle-expand="onToggleExpand"
          />
        </div>
      </div>
    </div>
    
    <!-- 上下文菜单 -->
    <CategoryContextMenu 
      ref="contextMenuRef"
      :node="selectedNode"
      @create-note="(node) => emitContextMenuAction('create-note', node)"
      @create-category="(node) => emitContextMenuAction('create-category', node)"
      @delete-category="(node) => emitContextMenuAction('delete-category', node)"
      @rename-category="(node) => emitContextMenuAction('rename-category', node)"
      @move-category="(node) => emitContextMenuAction('move-category', node)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits } from 'vue';
import CategoryItem from './CategoryItem.vue';
import CategoryContextMenu from './CategoryContextMenu.vue';

// 定义树节点类型（与SidebarLayout中一致）
interface TreeNode {
  id: string;
  label: string;
  icon: string;
  expanded?: boolean;
  children?: TreeNode[];
  selected?: boolean;
  nodeType: 'category' | 'note' | 'system';
}

// 上下文菜单节点类型
interface ContextMenuNode {
  id: string;
  label: string;
  nodeType: string;
  target: Event | null;
  hasChildren?: boolean;
}

defineProps({
  nodes: {
    type: Array as () => TreeNode[],
    required: true,
    default: () => []
  }
});

const emit = defineEmits([
  'item-click',
  'context-menu-action',
  'toggle-expand'
]);

const contextMenuRef = ref<InstanceType<typeof CategoryContextMenu> | null>(null);
const selectedNode = ref<ContextMenuNode>({
  id: '',
  label: '',
  nodeType: 'category',
  target: null
});

// 处理项点击
const onItemClick = (node: {id: string; label: string; nodeType: string}) => {
  emit('item-click', node);
};

// 处理展开/折叠切换
const onToggleExpand = (data: {id: string; expanded: boolean}) => {
  // 向上传递展开/折叠事件
  emit('toggle-expand', data);
};

// 显示上下文菜单
const showContextMenu = (node: ContextMenuNode) => {
  selectedNode.value = node;
  if (contextMenuRef.value && node.target) {
    contextMenuRef.value.show(node.target);
  }
};

// 处理上下文菜单操作
const handleContextMenuAction = (action: string, node: ContextMenuNode) => {
  emit('context-menu-action', { action, node });
};

// 转发上下文菜单事件
const emitContextMenuAction = (action: string, node: ContextMenuNode) => {
  emit('context-menu-action', { action, node });
};
</script>

<style scoped>
.category-list {
  padding: 0.25rem 0;
}
</style> 
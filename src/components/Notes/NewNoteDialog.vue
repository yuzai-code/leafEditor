<template>
  <PrimeDialog 
    :visible="visible" 
    :header="'在 ' + (categoryName || '未知分类') + ' 中创建笔记'" 
    :modal="true"
    :closable="true"
    :draggable="false"
    class="w-full md:w-6/12 lg:w-4/12"
    @update:visible="$emit('update:visible', $event)"
    @hide="handleVisibilityChange(false)"
  >
    <div class="flex flex-col gap-4 p-4">
      <div class="field">
        <label for="note-title" class="block text-sm font-medium text-gray-700 mb-1">笔记标题</label>
        <PrimeInputText 
          id="note-title" 
          v-model="noteTitle" 
          placeholder="请输入笔记标题" 
          class="w-full p-inputtext-sm"
          :class="{'p-invalid': titleError}" 
          @keyup.enter="saveNote"
          ref="titleInput"
        />
        <small v-if="titleError" class="p-error block mt-1">{{ titleError }}</small>
      </div>
      
      <div v-if="errorMessage" class="p-4 bg-red-50 text-red-700 rounded-md text-sm mb-2">
        {{ errorMessage }}
      </div>
    </div>
    
    <template #footer>
      <div class="flex justify-end gap-2">
        <PrimeButton 
          label="取消" 
          icon="pi pi-times" 
          class="p-button-text" 
          @click="closeDialog"
          :disabled="isSaving"
        />
        <PrimeButton 
          label="创建" 
          icon="pi pi-check" 
          class="p-button-primary" 
          @click="saveNote"
          :loading="isSaving"
          :disabled="isSaving || !noteTitle.trim()"
        />
      </div>
    </template>
  </PrimeDialog>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
// 不再需要导入组件，使用全局注册的组件
// import Dialog from 'primevue/dialog';
// import Button from 'primevue/button';
// import InputText from 'primevue/inputtext';
import { createNote } from '@/api/modules/notes';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  categoryId: {
    type: String,
    required: true
  },
  categoryName: {
    type: String,
    default: ''
  },
  categoryPath: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:visible', 'note-created', 'cancel']);

const noteTitle = ref('');
const titleError = ref('');
const errorMessage = ref('');
const isSaving = ref(false);
const titleInput = ref<HTMLInputElement | null>(null);

// 当对话框显示时，自动聚焦到标题输入框
watch(() => props.visible, (newValue) => {
  if (newValue) {
    resetForm();
    nextTick(() => {
      titleInput.value?.focus();
    });
  }
});

// 重置表单
const resetForm = () => {
  noteTitle.value = '';
  titleError.value = '';
  errorMessage.value = '';
  isSaving.value = false;
};

// 关闭对话框
const closeDialog = () => {
  if (!isSaving.value) {
    emit('update:visible', false);
    emit('cancel');
  }
};

// 处理可见性变化
const handleVisibilityChange = (value: boolean) => {
  if (!value && !isSaving.value) {
    resetForm();
  }
};

// 保存笔记
const saveNote = async () => {
  // 验证标题
  if (!noteTitle.value.trim()) {
    titleError.value = '请输入笔记标题';
    return;
  }
  
  titleError.value = '';
  errorMessage.value = '';
  
  try {
    isSaving.value = true;
    
    // 验证分类ID
    if (!props.categoryId) {
      errorMessage.value = '无效的分类ID，请重新选择分类';
      isSaving.value = false;
      return;
    }
    
    // 构建笔记数据
    // 确保路径格式正确 - 去除多余的斜杠和空格
    let categoryPath = props.categoryPath || '';
    categoryPath = categoryPath.trim();
    
    // 移除开头的斜杠，确保路径格式正确
    if (categoryPath.startsWith('/')) {
      categoryPath = categoryPath.substring(1);
    }
    // 移除末尾斜杠
    if (categoryPath.endsWith('/')) {
      categoryPath = categoryPath.slice(0, -1);
    }
    
    const sanitizedTitle = noteTitle.value.trim().replace(/\/|\\/g, '_'); // 替换标题中的斜杠为下划线
    // 构建相对路径，不添加开头的斜杠
    const filePath = categoryPath ? `${categoryPath}/${sanitizedTitle}.md` : `${sanitizedTitle}.md`;
    
    console.log('Category path:', categoryPath);
    console.log('File path:', filePath);
    console.log('分类ID（原始）:', props.categoryId, '类型:', typeof props.categoryId);
    
    // 准备分类ID，不再进行类型转换，直接使用原始值
    // 这样可以避免类型转换带来的问题
    const categoryId = props.categoryId;
    
    const noteData = {
      title: noteTitle.value.trim(),
      content: '', // 初始内容为空
      yaml_meta: '', // 初始元数据为空
      file_path: filePath,
      category_id: categoryId, // 使用原始分类ID
      tag_ids: [] // 空标签数组
    };
    
    console.log('创建笔记请求数据:', noteData);
    console.log('分类ID（处理后）:', noteData.category_id, '类型:', typeof noteData.category_id);
    
    // 调用API创建笔记
    const response = await createNote(noteData);
    console.log('创建笔记响应:', response);
    
    if (response.code === 0 || response.status === 'success') {
      // 创建成功，通知父组件
      emit('note-created', response.data);
      emit('update:visible', false);
    } else {
      // 创建失败，显示错误
      errorMessage.value = response.message || '创建笔记失败';
    }
  } catch (error) {
    console.error('创建笔记错误:', error);
    errorMessage.value = '创建笔记时发生错误';
  } finally {
    isSaving.value = false;
  }
};

// 在组件挂载时预先导入所需组件
onMounted(() => {
  if (props.visible) {
    nextTick(() => {
      titleInput.value?.focus();
    });
  }
});
</script>

<style scoped>
.p-dialog-mask {
  background-color: rgba(0, 0, 0, 0.4);
}
</style> 
import {
  apiCreateNote,
  apiUpdateNote,
  apiDeleteNote,
  apiGetNotes,
  apiGetNoteDetail,
  apiGetCategories,
  apiCreateCategory,
  apiGetTags,
  apiCheckNetworkStatus,
  apiToggleNetworkMode,
} from './adapter'

// 导出统一的 API 接口
export const api = {
  // 笔记相关 API
  notes: {
    getAll: apiGetNotes,
    getDetail: apiGetNoteDetail,
    create: apiCreateNote,
    update: apiUpdateNote,
    delete: apiDeleteNote,
  },

  // 分类相关 API
  categories: {
    getAll: apiGetCategories,
    create: apiCreateCategory,
  },

  // 标签相关 API
  tags: {
    getAll: apiGetTags,
  },

  // 网络状态 API
  network: {
    checkStatus: apiCheckNetworkStatus,
    toggleMode: apiToggleNetworkMode,
  },
}

// 导出默认 API 对象
export default api

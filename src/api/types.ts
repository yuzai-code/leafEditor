// 创建分类请求参数
export interface CreateCategoryRequest {
  name: string
  parent_id: number
}

// 创建笔记请求参数
export interface CreateNoteRequest {
  title: string
  content: string
  yaml_meta: string
  file_path: string
  category_id: number
  tag_ids: number[]
}

// 更新笔记请求参数
export interface UpdateNoteRequest {
  title: string
  content: string
  yaml_meta: string
  category_id: number
  tag_ids: number[]
}

// 定义后端返回的数据类型
export interface ApiResponse<T> {
  code: number
  data: T
}

// 获取笔记列表
export interface GetNotesResponse {
  id: number
  title: string
  content: string
  yaml_meta: string
  file_path: string
  category_id: number
  created_at: string
  updated_at: string
  version: number
  checksum: string
  category: Category
  tags: Tag[]
}

// 笔记详情
export interface GetNoteDetailResponse {
  id: number
  title: string
  content: string
  yaml_meta: string
  file_path: string
  category_id: number
  created_at: string
  updated_at: string
  version: number
  checksum: string
  category: Category
  tags: Tag[]
}

// 笔记分类
export interface Category {
  name: string
  parent_id: number
}

// 笔记标签
export interface Tag {
  id: number
  name: string
}

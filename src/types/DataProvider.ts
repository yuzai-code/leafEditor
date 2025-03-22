import type {
  CreateCategoryRequest,
  CreateNoteRequest,
  GetNoteDetailResponse,
  GetNotesResponse,
  UpdateNoteRequest,
  Category,
  Tag,
} from '@/api/types'

/**
 * 数据提供者接口，定义了笔记、分类和标签相关的操作方法
 * 可以实现在线和离线两种模式下的数据访问
 */
export interface DataProvider {
  // 笔记相关操作
  createNote(data: CreateNoteRequest): Promise<GetNoteDetailResponse>
  updateNote(id: number, data: UpdateNoteRequest): Promise<GetNoteDetailResponse>
  deleteNote(id: string | number): Promise<void>
  getNotes(): Promise<GetNotesResponse[]>
  getNoteDetail(id: number): Promise<GetNoteDetailResponse>

  // 分类相关操作
  getCategories(): Promise<Category[]>
  createCategory(data: CreateCategoryRequest): Promise<Category>

  // 标签相关操作
  getTags(): Promise<Tag[]>
  getNoteTagsById(noteId: number): Promise<Tag[]>

  // 同步数据
  syncData(): Promise<void>

  // 检查连接状态
  isOnline(): Promise<boolean>
}

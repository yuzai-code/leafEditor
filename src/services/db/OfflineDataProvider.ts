import type { DataProvider } from '@/types/DataProvider'
import type {
  CreateCategoryRequest,
  CreateNoteRequest,
  GetNoteDetailResponse,
  GetNotesResponse,
  UpdateNoteRequest,
  Category,
  Tag,
} from '@/api/types'
import { SqliteClient } from './SqliteClient'

/**
 * 离线数据提供者，基于 SQLite 数据库实现离线笔记操作
 */
export class OfflineDataProvider implements DataProvider {
  private sqliteClient: SqliteClient

  constructor() {
    // 获取 SQLite 客户端实例
    this.sqliteClient = SqliteClient.getInstance()
    // 初始化 SQLite 数据库
    this.init()
  }

  /**
   * 初始化离线数据存储
   */
  private async init(): Promise<void> {
    try {
      // 尝试从 IndexedDB 加载数据库
      const hasLoadedFromIndexedDB = await this.sqliteClient.loadFromIndexedDB()

      if (!hasLoadedFromIndexedDB) {
        // 如果没有从 IndexedDB 加载成功，初始化新的数据库
        await this.sqliteClient.init()
      }

      console.log('离线数据提供者初始化成功')
    } catch (error) {
      console.error('离线数据提供者初始化失败:', error)
      throw error
    }
  }

  /**
   * 获取所有笔记
   */
  public async getNotes(): Promise<GetNotesResponse[]> {
    try {
      // 查询所有笔记
      const notes = await this.sqliteClient.exec(`
        SELECT 
          n.id, n.title, n.content, n.yaml_meta, n.file_path, 
          n.category_id, n.created_at, n.updated_at, n.version, n.checksum 
        FROM notes n
        ORDER BY n.updated_at DESC
      `)

      // 为每个笔记加载分类和标签
      const result = await Promise.all(
        notes.map(async (note) => {
          // 加载笔记的分类
          let category: Category | null = null
          if (note.category_id) {
            const categories = await this.sqliteClient.exec(
              `
              SELECT id, name, parent_id
              FROM categories
              WHERE id = ?
            `,
              { 1: note.category_id as number | string },
            )

            if (categories.length > 0) {
              category = {
                id: categories[0].id as string,
                name: categories[0].name as string,
                parent_id: categories[0].parent_id as string | null,
              }
            }
          }

          // 加载笔记的标签
          const tags = await this.getNoteTagsById(note.id as number)

          return {
            id: note.id as number,
            title: note.title as string,
            content: note.content as string,
            yaml_meta: note.yaml_meta as string,
            file_path: note.file_path as string,
            category_id: note.category_id as number,
            created_at: note.created_at as string,
            updated_at: note.updated_at as string,
            version: note.version as number,
            checksum: note.checksum as string,
            category: category as Category,
            tags: tags,
          }
        }),
      )

      return result
    } catch (error) {
      console.error('获取笔记列表失败:', error)
      throw error
    }
  }

  /**
   * 获取笔记详情
   * @param id 笔记ID
   */
  public async getNoteDetail(id: number): Promise<GetNoteDetailResponse> {
    try {
      // 查询笔记详情
      const notes = await this.sqliteClient.exec(
        `
        SELECT 
          n.id, n.title, n.content, n.yaml_meta, n.file_path, 
          n.category_id, n.created_at, n.updated_at, n.version, n.checksum 
        FROM notes n
        WHERE n.id = ?
      `,
        { 1: id },
      )

      if (notes.length === 0) {
        throw new Error(`未找到ID为 ${id} 的笔记`)
      }

      const note = notes[0]

      // 加载笔记的分类
      let category: Category | null = null
      if (note.category_id) {
        const categories = await this.sqliteClient.exec(
          `
          SELECT id, name, parent_id
          FROM categories
          WHERE id = ?
        `,
          { 1: note.category_id as number | string },
        )

        if (categories.length > 0) {
          category = {
            id: categories[0].id as string,
            name: categories[0].name as string,
            parent_id: categories[0].parent_id as string | null,
          }
        }
      }

      // 加载笔记的标签
      const tags = await this.getNoteTagsById(id)

      return {
        id: note.id as number,
        title: note.title as string,
        content: note.content as string,
        yaml_meta: note.yaml_meta as string,
        file_path: note.file_path as string,
        category_id: note.category_id as number,
        created_at: note.created_at as string,
        updated_at: note.updated_at as string,
        version: note.version as number,
        checksum: note.checksum as string,
        category: category as Category,
        tags,
      }
    } catch (error) {
      console.error(`获取笔记详情失败(ID: ${id}):`, error)
      throw error
    }
  }

  /**
   * 创建笔记
   * @param data 笔记数据
   */
  public async createNote(data: CreateNoteRequest): Promise<GetNoteDetailResponse> {
    try {
      // 插入笔记数据
      await this.sqliteClient.run(
        `
        INSERT INTO notes (
          title, content, yaml_meta, file_path, category_id,
          created_at, updated_at, version, checksum, is_synced
        )
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'), 1, ?, 0)
      `,
        {
          1: data.title,
          2: data.content,
          3: data.yaml_meta,
          4: data.file_path,
          5: data.category_id,
          6: this.generateChecksum(data.content), // 生成校验和
        },
      )

      // 获取新插入笔记的ID
      const result = await this.sqliteClient.exec('SELECT last_insert_rowid() as id')
      const noteId = result[0].id as number

      // 关联标签
      if (data.tag_ids && data.tag_ids.length > 0) {
        for (const tagId of data.tag_ids) {
          await this.sqliteClient.run(
            `
            INSERT INTO note_tags (note_id, tag_id)
            VALUES (?, ?)
          `,
            { 1: noteId, 2: tagId },
          )
        }
      }

      // 保存数据库状态到 IndexedDB
      await this.sqliteClient.saveToIndexedDB()

      // 返回新创建的笔记详情
      return this.getNoteDetail(noteId)
    } catch (error) {
      console.error('创建笔记失败:', error)
      throw error
    }
  }

  /**
   * 更新笔记
   * @param id 笔记ID
   * @param data 笔记数据
   */
  public async updateNote(id: number, data: UpdateNoteRequest): Promise<GetNoteDetailResponse> {
    try {
      // 更新笔记数据
      await this.sqliteClient.run(
        `
        UPDATE notes
        SET title = ?, content = ?, yaml_meta = ?, category_id = ?,
            updated_at = datetime('now'), version = version + 1,
            checksum = ?, is_synced = 0
        WHERE id = ?
      `,
        {
          1: data.title,
          2: data.content,
          3: data.yaml_meta,
          4: data.category_id,
          5: this.generateChecksum(data.content),
          6: id,
        },
      )

      // 更新标签关联（先删除旧关联，再添加新关联）
      await this.sqliteClient.run('DELETE FROM note_tags WHERE note_id = ?', { 1: id })

      if (data.tag_ids && data.tag_ids.length > 0) {
        for (const tagId of data.tag_ids) {
          await this.sqliteClient.run(
            `
            INSERT INTO note_tags (note_id, tag_id)
            VALUES (?, ?)
          `,
            { 1: id, 2: tagId },
          )
        }
      }

      // 保存数据库状态到 IndexedDB
      await this.sqliteClient.saveToIndexedDB()

      // 返回更新后的笔记详情
      return this.getNoteDetail(id)
    } catch (error) {
      console.error(`更新笔记失败(ID: ${id}):`, error)
      throw error
    }
  }

  /**
   * 删除笔记
   * @param id 笔记ID
   */
  public async deleteNote(id: number): Promise<void> {
    try {
      // 删除笔记及其关联的标签
      await this.sqliteClient.run('DELETE FROM note_tags WHERE note_id = ?', { 1: id })
      await this.sqliteClient.run('DELETE FROM notes WHERE id = ?', { 1: id })

      // 保存数据库状态到 IndexedDB
      await this.sqliteClient.saveToIndexedDB()
    } catch (error) {
      console.error(`删除笔记失败(ID: ${id}):`, error)
      throw error
    }
  }

  /**
   * 获取所有分类
   */
  public async getCategories(): Promise<Category[]> {
    try {
      const categoriesData = await this.sqliteClient.exec(`
        SELECT id, name, parent_id
        FROM categories
        ORDER BY name
      `)

      // 将分类数据转换为树形结构
      const categories = categoriesData.map((cat) => ({
        id: cat.id as string,
        name: cat.name as string,
        parent_id: cat.parent_id as string | null,
      }))

      // 构建分类树
      const categoryMap: Record<string, Category> = {}

      // 第一遍：构建基本分类对象
      categories.forEach((cat) => {
        categoryMap[cat.id] = {
          id: cat.id,
          name: cat.name,
          parent_id: cat.parent_id,
          children: [],
        }
      })

      // 第二遍：建立层级关系
      categories.forEach((cat) => {
        const category = categoryMap[cat.id]

        if (cat.parent_id && categoryMap[cat.parent_id]) {
          // 将当前分类添加到父分类的子分类列表中
          if (!categoryMap[cat.parent_id].children) {
            categoryMap[cat.parent_id].children = []
          }
          categoryMap[cat.parent_id].children!.push(category)
        }
      })

      // 返回根分类（没有父分类的分类）
      return categories.filter((cat) => !cat.parent_id).map((cat) => categoryMap[cat.id])
    } catch (error) {
      console.error('获取分类失败:', error)
      throw error
    }
  }

  /**
   * 创建分类
   * @param data 分类数据
   */
  public async createCategory(data: CreateCategoryRequest): Promise<Category> {
    try {
      // 生成唯一ID（使用时间戳和随机数）
      const id = `${Date.now()}_${Math.floor(Math.random() * 1000)}`

      // 插入分类数据
      await this.sqliteClient.run(
        `
        INSERT INTO categories (id, name, parent_id, is_synced)
        VALUES (?, ?, ?, 0)
      `,
        {
          1: id,
          2: data.name,
          3: data.parent_id,
        },
      )

      // 保存数据库状态到 IndexedDB
      await this.sqliteClient.saveToIndexedDB()

      // 返回新创建的分类
      return {
        id,
        name: data.name,
        parent_id: data.parent_id,
      }
    } catch (error) {
      console.error('创建分类失败:', error)
      throw error
    }
  }

  /**
   * 获取所有标签
   */
  public async getTags(): Promise<Tag[]> {
    try {
      const tagsData = await this.sqliteClient.exec(`
        SELECT id, name
        FROM tags
        ORDER BY name
      `)

      return tagsData.map((tag) => ({
        id: tag.id as number,
        name: tag.name as string,
      }))
    } catch (error) {
      console.error('获取标签失败:', error)
      throw error
    }
  }

  /**
   * 获取笔记的标签
   * @param noteId 笔记ID
   */
  public async getNoteTagsById(noteId: number): Promise<Tag[]> {
    try {
      const tagsData = await this.sqliteClient.exec(
        `
        SELECT t.id, t.name
        FROM tags t
        JOIN note_tags nt ON t.id = nt.tag_id
        WHERE nt.note_id = ?
        ORDER BY t.name
      `,
        { 1: noteId },
      )

      return tagsData.map((tag) => ({
        id: tag.id as number,
        name: tag.name as string,
      }))
    } catch (error) {
      console.error(`获取笔记标签失败(笔记ID: ${noteId}):`, error)
      throw error
    }
  }

  /**
   * 同步数据
   * 此方法将在在线/离线模式切换时同步数据
   */
  public async syncData(): Promise<void> {
    // 在第一阶段实现中，我们仅保存本地数据
    try {
      await this.sqliteClient.saveToIndexedDB()
      console.log('数据已保存到本地存储')
    } catch (error) {
      console.error('数据同步失败:', error)
      throw error
    }
  }

  /**
   * 检查是否在线
   */
  public async isOnline(): Promise<boolean> {
    // 在第一阶段实现中，我们始终返回离线状态
    return false
  }

  /**
   * 生成内容的校验和（简化版，实际应使用更好的哈希算法）
   */
  private generateChecksum(content: string): string {
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // 转换为32位整数
    }
    return hash.toString(16)
  }
}

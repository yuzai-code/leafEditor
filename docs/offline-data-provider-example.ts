// 离线数据提供者示例
// 实现基于SQLite的笔记数据访问

import type {
  CreateNoteRequest,
  UpdateNoteRequest,
  GetNotesResponse,
  GetNoteDetailResponse,
  Category,
  Tag,
  CreateCategoryRequest,
} from '../src/api/types'
import { getSQLiteClient } from './sqlite-client-example'

/**
 * 数据提供者接口
 * 定义统一的数据访问方法
 */
export interface DataProvider {
  // 笔记操作
  getNotes(): Promise<GetNotesResponse[]>
  getNoteDetail(id: string): Promise<GetNoteDetailResponse>
  createNote(data: CreateNoteRequest): Promise<GetNoteDetailResponse>
  updateNote(id: string, data: UpdateNoteRequest): Promise<GetNoteDetailResponse>
  deleteNote(id: string): Promise<void>

  // 分类操作
  getCategories(): Promise<Category[]>
  createCategory(data: CreateCategoryRequest): Promise<Category>

  // 标签操作
  getTags(): Promise<Tag[]>
  createTag(name: string): Promise<Tag>
}

/**
 * 离线数据提供者
 * 基于SQLite实现本地数据访问
 */
export class OfflineDataProvider implements DataProvider {
  private sqliteClientPromise: Promise<any>

  constructor() {
    // 初始化SQLite客户端
    this.sqliteClientPromise = getSQLiteClient()
  }

  /**
   * 获取SQLite客户端实例
   * @returns SQLite客户端
   */
  private async getClient() {
    return await this.sqliteClientPromise
  }

  /**
   * 获取笔记列表
   * @returns 笔记列表
   */
  async getNotes(): Promise<GetNotesResponse[]> {
    const client = await this.getClient()

    // 查询所有未删除的笔记
    const notes = client.query(`
      SELECT n.*, c.name as category_name 
      FROM notes n
      JOIN categories c ON n.category_id = c.id
      WHERE n.is_deleted = 0
      ORDER BY n.updated_at DESC
    `)

    // 为每个笔记加载标签
    const result = await Promise.all(
      notes.map(async (note: any) => {
        const tags = await this.getNoteTagsById(note.id)

        // 构造分类对象
        const category: Category = {
          id: note.category_id.toString(),
          name: note.category_name,
          parent_id: null,
        }

        // 转换响应格式
        return {
          id: parseInt(note.id),
          title: note.title,
          content: note.content,
          yaml_meta: note.yaml_meta || '',
          file_path: note.file_path || '',
          category_id: parseInt(note.category_id),
          created_at: note.created_at,
          updated_at: note.updated_at,
          version: note.version,
          checksum: note.checksum || '',
          category,
          tags,
        }
      }),
    )

    return result
  }

  /**
   * 获取笔记详情
   * @param id 笔记ID（UUID）
   * @returns 笔记详情
   */
  async getNoteDetail(id: string): Promise<GetNoteDetailResponse> {
    const client = await this.getClient()

    // 查询笔记
    const notes = client.query(
      `
      SELECT n.*, c.name as category_name 
      FROM notes n
      JOIN categories c ON n.category_id = c.id
      WHERE n.uuid = $uuid AND n.is_deleted = 0
    `,
      { $uuid: id },
    )

    if (notes.length === 0) {
      throw new Error(`笔记不存在: ${id}`)
    }

    const note = notes[0]
    const tags = await this.getNoteTagsById(note.id)

    // 构造分类对象
    const category: Category = {
      id: note.category_id.toString(),
      name: note.category_name,
      parent_id: null,
    }

    // 转换响应格式
    return {
      id: parseInt(note.id),
      title: note.title,
      content: note.content,
      yaml_meta: note.yaml_meta || '',
      file_path: note.file_path || '',
      category_id: parseInt(note.category_id),
      created_at: note.created_at,
      updated_at: note.updated_at,
      version: note.version,
      checksum: note.checksum || '',
      category,
      tags,
    }
  }

  /**
   * 获取笔记关联的标签
   * @param noteId 笔记ID
   * @returns 标签列表
   */
  private async getNoteTagsById(noteId: number): Promise<Tag[]> {
    const client = await this.getClient()

    // 查询笔记关联的标签
    const tags = client.query(
      `
      SELECT t.id, t.name
      FROM tags t
      JOIN note_tags nt ON t.id = nt.tag_id
      WHERE nt.note_id = $noteId
    `,
      { $noteId: noteId },
    )

    return tags.map((tag: any) => ({
      id: parseInt(tag.id),
      name: tag.name,
    }))
  }

  /**
   * 创建笔记
   * @param data 笔记数据
   * @returns 创建的笔记
   */
  async createNote(data: CreateNoteRequest): Promise<GetNoteDetailResponse> {
    const client = await this.getClient()
    const now = client.getCurrentTime()
    const uuid = client.generateUuid()

    try {
      // 开始事务
      client.exec('BEGIN TRANSACTION')

      // 插入笔记
      client.exec(
        `
        INSERT INTO notes (
          uuid, title, content, yaml_meta, file_path, category_id,
          created_at, updated_at, version, is_synced
        ) VALUES (
          $uuid, $title, $content, $yaml_meta, $file_path, $category_id,
          $created_at, $updated_at, 1, 0
        )
      `,
        {
          $uuid: uuid,
          $title: data.title,
          $content: data.content,
          $yaml_meta: data.yaml_meta || '',
          $file_path: data.file_path || '',
          $category_id: data.category_id,
          $created_at: now,
          $updated_at: now,
        },
      )

      // 获取插入的笔记ID
      const noteId = client.getLastInsertId()

      // 处理标签关联
      if (data.tag_ids && data.tag_ids.length > 0) {
        for (const tagId of data.tag_ids) {
          client.exec(
            `
            INSERT INTO note_tags (note_id, tag_id)
            VALUES ($note_id, $tag_id)
          `,
            {
              $note_id: noteId,
              $tag_id: tagId,
            },
          )
        }
      }

      // 记录同步动作
      client.exec(
        `
        INSERT INTO sync_records (
          entity_type, entity_id, action, status, created_at
        ) VALUES (
          'note', $entity_id, 'create', 'pending', $created_at
        )
      `,
        {
          $entity_id: noteId,
          $created_at: now,
        },
      )

      // 提交事务
      client.exec('COMMIT')

      // 返回创建的笔记
      return this.getNoteDetail(uuid)
    } catch (error) {
      // 回滚事务
      client.exec('ROLLBACK')
      console.error('创建笔记失败:', error)
      throw error
    }
  }

  /**
   * 更新笔记
   * @param id 笔记ID（UUID）
   * @param data 笔记数据
   * @returns 更新后的笔记
   */
  async updateNote(id: string, data: UpdateNoteRequest): Promise<GetNoteDetailResponse> {
    const client = await this.getClient()
    const now = client.getCurrentTime()

    try {
      // 查询笔记
      const notes = client.query(
        `
        SELECT * FROM notes
        WHERE uuid = $uuid AND is_deleted = 0
      `,
        { $uuid: id },
      )

      if (notes.length === 0) {
        throw new Error(`笔记不存在: ${id}`)
      }

      const note = notes[0]
      const noteId = parseInt(note.id)

      // 开始事务
      client.exec('BEGIN TRANSACTION')

      // 更新笔记
      client.exec(
        `
        UPDATE notes SET
          title = $title,
          content = $content,
          yaml_meta = $yaml_meta,
          category_id = $category_id,
          updated_at = $updated_at,
          version = version + 1,
          is_synced = 0
        WHERE id = $id
      `,
        {
          $id: noteId,
          $title: data.title,
          $content: data.content,
          $yaml_meta: data.yaml_meta || '',
          $category_id: data.category_id,
          $updated_at: now,
        },
      )

      // 清除旧标签关联
      client.exec(
        `
        DELETE FROM note_tags
        WHERE note_id = $note_id
      `,
        { $note_id: noteId },
      )

      // 添加新标签关联
      if (data.tag_ids && data.tag_ids.length > 0) {
        for (const tagId of data.tag_ids) {
          client.exec(
            `
            INSERT INTO note_tags (note_id, tag_id)
            VALUES ($note_id, $tag_id)
          `,
            {
              $note_id: noteId,
              $tag_id: tagId,
            },
          )
        }
      }

      // 记录同步动作
      client.exec(
        `
        INSERT INTO sync_records (
          entity_type, entity_id, action, status, created_at
        ) VALUES (
          'note', $entity_id, 'update', 'pending', $created_at
        )
      `,
        {
          $entity_id: noteId,
          $created_at: now,
        },
      )

      // 提交事务
      client.exec('COMMIT')

      // 返回更新后的笔记
      return this.getNoteDetail(id)
    } catch (error) {
      // 回滚事务
      client.exec('ROLLBACK')
      console.error('更新笔记失败:', error)
      throw error
    }
  }

  /**
   * 删除笔记（软删除）
   * @param id 笔记ID（UUID）
   */
  async deleteNote(id: string): Promise<void> {
    const client = await this.getClient()
    const now = client.getCurrentTime()

    try {
      // 查询笔记
      const notes = client.query(
        `
        SELECT * FROM notes
        WHERE uuid = $uuid AND is_deleted = 0
      `,
        { $uuid: id },
      )

      if (notes.length === 0) {
        throw new Error(`笔记不存在: ${id}`)
      }

      const note = notes[0]
      const noteId = parseInt(note.id)

      // 开始事务
      client.exec('BEGIN TRANSACTION')

      // 软删除笔记
      client.exec(
        `
        UPDATE notes SET
          is_deleted = 1,
          updated_at = $updated_at,
          is_synced = 0
        WHERE id = $id
      `,
        {
          $id: noteId,
          $updated_at: now,
        },
      )

      // 记录同步动作
      client.exec(
        `
        INSERT INTO sync_records (
          entity_type, entity_id, action, status, created_at
        ) VALUES (
          'note', $entity_id, 'delete', 'pending', $created_at
        )
      `,
        {
          $entity_id: noteId,
          $created_at: now,
        },
      )

      // 提交事务
      client.exec('COMMIT')
    } catch (error) {
      // 回滚事务
      client.exec('ROLLBACK')
      console.error('删除笔记失败:', error)
      throw error
    }
  }

  /**
   * 获取所有分类
   * @returns 分类列表
   */
  async getCategories(): Promise<Category[]> {
    const client = await this.getClient()

    // 查询所有分类
    const categories = client.query(`
      SELECT * FROM categories
      ORDER BY name
    `)

    // 构建分类树
    const categoryMap: Record<string, Category> = {}
    const rootCategories: Category[] = []

    // 第一遍：构建基本分类对象
    categories.forEach((cat: any) => {
      categoryMap[cat.id] = {
        id: cat.id.toString(),
        name: cat.name,
        parent_id: cat.parent_id,
        path: cat.path || '/',
        created_at: cat.created_at,
        updated_at: cat.updated_at,
        children: [],
      }
    })

    // 第二遍：建立层级关系
    categories.forEach((cat: any) => {
      const category = categoryMap[cat.id]

      if (cat.parent_id) {
        // 有父分类，添加到父分类的children中
        const parent = categoryMap[cat.parent_id]
        if (parent) {
          parent.children = parent.children || []
          parent.children.push(category)
        } else {
          // 父分类不存在，作为根分类
          rootCategories.push(category)
        }
      } else {
        // 没有父分类，作为根分类
        rootCategories.push(category)
      }
    })

    return rootCategories
  }

  /**
   * 创建分类
   * @param data 分类数据
   * @returns 创建的分类
   */
  async createCategory(data: CreateCategoryRequest): Promise<Category> {
    const client = await this.getClient()
    const now = client.getCurrentTime()
    const uuid = client.generateUuid()

    try {
      // 计算路径
      let path = '/'
      if (data.parent_id) {
        const parents = client.query(
          `
          SELECT path FROM categories
          WHERE id = $parent_id
        `,
          { $parent_id: data.parent_id },
        )

        if (parents.length > 0) {
          path = `${parents[0].path}${data.name}/`
        }
      }

      // 插入分类
      client.exec(
        `
        INSERT INTO categories (
          uuid, name, parent_id, path, created_at, updated_at, is_synced
        ) VALUES (
          $uuid, $name, $parent_id, $path, $created_at, $updated_at, 0
        )
      `,
        {
          $uuid: uuid,
          $name: data.name,
          $parent_id: data.parent_id,
          $path: path,
          $created_at: now,
          $updated_at: now,
        },
      )

      // 获取插入的分类ID
      const categoryId = client.getLastInsertId()

      // 记录同步动作
      client.exec(
        `
        INSERT INTO sync_records (
          entity_type, entity_id, action, status, created_at
        ) VALUES (
          'category', $entity_id, 'create', 'pending', $created_at
        )
      `,
        {
          $entity_id: categoryId,
          $created_at: now,
        },
      )

      // 返回创建的分类
      return {
        id: categoryId.toString(),
        name: data.name,
        parent_id: data.parent_id,
        path,
        created_at: now,
        updated_at: now,
        children: [],
      }
    } catch (error) {
      console.error('创建分类失败:', error)
      throw error
    }
  }

  /**
   * 获取所有标签
   * @returns 标签列表
   */
  async getTags(): Promise<Tag[]> {
    const client = await this.getClient()

    // 查询所有标签
    const tags = client.query(`
      SELECT * FROM tags
      ORDER BY name
    `)

    return tags.map((tag: any) => ({
      id: parseInt(tag.id),
      name: tag.name,
    }))
  }

  /**
   * 创建标签
   * @param name 标签名称
   * @returns 创建的标签
   */
  async createTag(name: string): Promise<Tag> {
    const client = await this.getClient()
    const now = client.getCurrentTime()
    const uuid = client.generateUuid()

    try {
      // 检查标签是否已存在
      const existingTags = client.query(
        `
        SELECT * FROM tags
        WHERE name = $name
      `,
        { $name: name },
      )

      if (existingTags.length > 0) {
        return {
          id: parseInt(existingTags[0].id),
          name: existingTags[0].name,
        }
      }

      // 插入标签
      client.exec(
        `
        INSERT INTO tags (
          uuid, name, created_at, updated_at, is_synced
        ) VALUES (
          $uuid, $name, $created_at, $updated_at, 0
        )
      `,
        {
          $uuid: uuid,
          $name: name,
          $created_at: now,
          $updated_at: now,
        },
      )

      // 获取插入的标签ID
      const tagId = client.getLastInsertId()

      // 记录同步动作
      client.exec(
        `
        INSERT INTO sync_records (
          entity_type, entity_id, action, status, created_at
        ) VALUES (
          'tag', $entity_id, 'create', 'pending', $created_at
        )
      `,
        {
          $entity_id: tagId,
          $created_at: now,
        },
      )

      // 返回创建的标签
      return {
        id: tagId,
        name: name,
      }
    } catch (error) {
      console.error('创建标签失败:', error)
      throw error
    }
  }
}

/**
 * 创建适当的数据提供者
 * 根据网络状态和用户配置返回在线或离线数据提供者
 */
export function createDataProvider(): DataProvider {
  // 判断是否处于离线模式
  const isOffline = !navigator.onLine || localStorage.getItem('preferOfflineMode') === 'true'

  if (isOffline) {
    return new OfflineDataProvider()
  } else {
    // 在这里返回在线数据提供者
    // 这里仅作示例，实际实现需要创建OnlineDataProvider类
    return new OfflineDataProvider() // 暂时使用离线提供者替代
  }
}

import initSqlJs, { type Database, type BindParams } from 'sql.js'

/**
 * SQLite 客户端类，用于管理 SQLite 数据库连接和操作
 */
export class SqliteClient {
  private static instance: SqliteClient
  private db: Database | null = null
  private initPromise: Promise<void> | null = null

  /**
   * 获取 SqliteClient 单例
   */
  public static getInstance(): SqliteClient {
    if (!SqliteClient.instance) {
      SqliteClient.instance = new SqliteClient()
    }
    return SqliteClient.instance
  }

  /**
   * 初始化 SQLite 数据库
   */
  public async init(): Promise<void> {
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise<void>(async (resolve, reject) => {
      try {
        // 初始化 SQL.js
        const SQL = await initSqlJs({
          // 指定 wasm 文件的位置
          locateFile: (file: string) => `/node_modules/sql.js/dist/${file}`,
        })

        // 创建一个新的数据库
        this.db = new SQL.Database()
        console.log('SQLite 数据库已成功初始化')

        // 创建必要的表结构
        await this.createTables()
        resolve()
      } catch (error) {
        console.error('SQLite 数据库初始化失败:', error)
        reject(error)
      }
    })

    return this.initPromise
  }

  /**
   * 创建必要的数据表
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化')

    // 创建笔记表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        yaml_meta TEXT,
        file_path TEXT,
        category_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        version INTEGER DEFAULT 1,
        checksum TEXT,
        is_synced INTEGER DEFAULT 0,
        last_modified INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      )
    `)

    // 创建分类表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_synced INTEGER DEFAULT 0,
        last_modified INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      )
    `)

    // 创建标签表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_synced INTEGER DEFAULT 0,
        last_modified INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      )
    `)

    // 创建笔记-标签关系表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS note_tags (
        note_id INTEGER,
        tag_id INTEGER,
        PRIMARY KEY (note_id, tag_id),
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `)

    // 检查是否已经有分类
    const categories = this.db.exec('SELECT COUNT(*) as count FROM categories')
    const count = categories[0].values[0][0]

    // 如果没有分类，创建默认分类
    if (count === 0) {
      const defaultId = `default_${Date.now()}`
      this.db.exec(`
        INSERT INTO categories (id, name, parent_id, created_at, updated_at, is_synced)
        VALUES ('${defaultId}', '默认分类', NULL, datetime('now'), datetime('now'), 1)
      `)

      console.log('已创建默认分类')
    }

    console.log('数据表结构已创建')
  }

  /**
   * 执行 SQL 查询
   * @param sql SQL 语句
   * @param params 参数
   * @returns 查询结果
   */
  public async exec(sql: string, params: BindParams = {}): Promise<Record<string, unknown>[]> {
    if (!this.db) {
      await this.init()
    }

    if (!this.db) {
      throw new Error('数据库未初始化')
    }

    try {
      const statement = this.db.prepare(sql)
      statement.bind(params)

      const results: Record<string, unknown>[] = []
      while (statement.step()) {
        results.push(statement.getAsObject())
      }
      statement.free()
      return results
    } catch (error) {
      console.error('SQL 执行错误:', error)
      throw error
    }
  }

  /**
   * 执行不返回结果的 SQL 语句
   * @param sql SQL 语句
   * @param params 参数
   */
  public async run(sql: string, params: BindParams = {}): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    if (!this.db) {
      throw new Error('数据库未初始化')
    }

    try {
      const statement = this.db.prepare(sql)
      statement.bind(params)
      statement.step()
      statement.free()
    } catch (error) {
      console.error('SQL 执行错误:', error)
      throw error
    }
  }

  /**
   * 保存数据库到 IndexedDB
   */
  public async saveToIndexedDB(): Promise<void> {
    if (!this.db) {
      throw new Error('数据库未初始化')
    }

    try {
      const data = this.db.export()
      const buffer = new Uint8Array(data).buffer

      // 打开 IndexedDB 数据库
      const request = indexedDB.open('NotesDatabase', 1)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('database')) {
          db.createObjectStore('database', { keyPath: 'id' })
        }
      }

      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(['database'], 'readwrite')
        const store = transaction.objectStore('database')

        // 存储 SQLite 数据库
        store.put({ id: 'sqlite', data: buffer })

        transaction.oncomplete = () => {
          console.log('数据库已保存到 IndexedDB')
        }

        db.close()
      }

      request.onerror = (event) => {
        console.error('保存数据库到 IndexedDB 失败:', event)
      }
    } catch (error) {
      console.error('保存数据库到 IndexedDB 失败:', error)
      throw error
    }
  }

  /**
   * 从 IndexedDB 加载数据库
   */
  public async loadFromIndexedDB(): Promise<boolean> {
    if (!this.initPromise) {
      await this.init()
    }

    return new Promise<boolean>((resolve, reject) => {
      try {
        // 打开 IndexedDB 数据库
        const request = indexedDB.open('NotesDatabase', 1)

        request.onupgradeneeded = () => {
          const db = request.result
          if (!db.objectStoreNames.contains('database')) {
            db.createObjectStore('database', { keyPath: 'id' })
          }
        }

        request.onsuccess = async () => {
          const db = request.result
          const transaction = db.transaction(['database'], 'readonly')
          const store = transaction.objectStore('database')
          const getRequest = store.get('sqlite')

          getRequest.onsuccess = async () => {
            if (getRequest.result) {
              // 从 IndexedDB 加载 SQLite 数据库
              const SQL = await initSqlJs()
              this.db = new SQL.Database(new Uint8Array(getRequest.result.data))
              console.log('数据库已从 IndexedDB 加载')
              resolve(true)
            } else {
              console.log('IndexedDB 中没有找到数据库')
              resolve(false)
            }
            db.close()
          }

          getRequest.onerror = (event) => {
            console.error('从 IndexedDB 加载数据库失败:', event)
            resolve(false)
            db.close()
          }
        }

        request.onerror = (event) => {
          console.error('打开 IndexedDB 失败:', event)
          reject(event)
        }
      } catch (error) {
        console.error('从 IndexedDB 加载数据库失败:', error)
        reject(error)
      }
    })
  }

  /**
   * 关闭数据库连接
   */
  public close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      this.initPromise = null
      console.log('数据库连接已关闭')
    }
  }
}

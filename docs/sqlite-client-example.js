// 这是一个简单的SQLite客户端服务示例
// 用于展示如何在前端集成SQLite并实现笔记的离线存储功能

import initSqlJs from 'sql.js'

/**
 * SQLite客户端服务
 * 用于管理SQLite数据库的连接和操作
 */
export class SQLiteClient {
  constructor() {
    this.db = null
    this.SQL = null
    this.initialized = false
  }

  /**
   * 初始化SQLite数据库
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) return

    try {
      // 加载SQL.js WASM模块
      this.SQL = await initSqlJs({
        locateFile: (file) => `https://sql.js.org/dist/${file}`,
      })

      // 从IndexedDB加载现有数据库或创建新数据库
      const dbData = await this.loadFromIndexedDB()

      if (dbData) {
        // 使用现有数据
        this.db = new this.SQL.Database(dbData)
        console.log('数据库从IndexedDB加载成功')
      } else {
        // 创建新数据库
        this.db = new this.SQL.Database()
        await this.createTables()
        console.log('新数据库创建成功')
      }

      this.initialized = true

      // 定期保存数据库
      this.setupAutosave()
    } catch (error) {
      console.error('SQLite初始化失败:', error)
      throw error
    }
  }

  /**
   * 创建数据库表
   * @returns {Promise<void>}
   */
  async createTables() {
    const createTablesSQL = `
      -- 笔记分类表
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        parent_id TEXT NULL,
        path TEXT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_synced INTEGER DEFAULT 0,
        server_id TEXT NULL
      );

      -- 标签表
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_synced INTEGER DEFAULT 0,
        server_id INTEGER NULL
      );

      -- 笔记表
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        yaml_meta TEXT NULL,
        file_path TEXT NULL,
        category_id INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        checksum TEXT NULL,
        is_synced INTEGER DEFAULT 0,
        server_id INTEGER NULL,
        is_deleted INTEGER DEFAULT 0,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );

      -- 笔记-标签关联表
      CREATE TABLE IF NOT EXISTS note_tags (
        note_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (note_id, tag_id),
        FOREIGN KEY (note_id) REFERENCES notes(id),
        FOREIGN KEY (tag_id) REFERENCES tags(id)
      );

      -- 同步记录表
      CREATE TABLE IF NOT EXISTS sync_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        synced_at TEXT NULL,
        error_message TEXT NULL
      );
    `

    try {
      this.db.exec(createTablesSQL)

      // 创建默认分类
      const now = new Date().toISOString()
      const defaultCategoryUuid = this.generateUuid()

      this.db.exec(`
        INSERT INTO categories (uuid, name, parent_id, path, created_at, updated_at, is_synced)
        VALUES ('${defaultCategoryUuid}', '默认分类', NULL, '/', '${now}', '${now}', 0)
      `)

      // 保存到IndexedDB
      await this.saveToIndexedDB()
    } catch (error) {
      console.error('创建表失败:', error)
      throw error
    }
  }

  /**
   * 设置自动保存
   */
  setupAutosave() {
    // 每分钟自动保存一次
    setInterval(() => {
      this.saveToIndexedDB()
        .then(() => console.log('数据库自动保存成功'))
        .catch((err) => console.error('数据库自动保存失败:', err))
    }, 60000)
  }

  /**
   * 保存数据库到IndexedDB
   * @returns {Promise<boolean>}
   */
  async saveToIndexedDB() {
    if (!this.db) throw new Error('数据库未初始化')

    const data = this.db.export()

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('NotesDatabase', 1)

      request.onupgradeneeded = function (event) {
        const db = request.result
        if (!db.objectStoreNames.contains('database')) {
          db.createObjectStore('database', { keyPath: 'id' })
        }
      }

      request.onsuccess = function () {
        const db = request.result
        const tx = db.transaction('database', 'readwrite')
        const store = tx.objectStore('database')

        store.put({ id: 'sqlite-db', data })

        tx.oncomplete = () => resolve(true)
        tx.onerror = (event) => reject(event)
      }

      request.onerror = (event) => reject(event)
    })
  }

  /**
   * 从IndexedDB加载数据库
   * @returns {Promise<Uint8Array|null>}
   */
  async loadFromIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('NotesDatabase', 1)

      request.onupgradeneeded = function (event) {
        const db = request.result
        if (!db.objectStoreNames.contains('database')) {
          db.createObjectStore('database', { keyPath: 'id' })
        }
      }

      request.onsuccess = function () {
        const db = request.result

        // 检查是否已创建store
        if (!db.objectStoreNames.contains('database')) {
          resolve(null)
          return
        }

        const tx = db.transaction('database', 'readonly')
        const store = tx.objectStore('database')

        const getRequest = store.get('sqlite-db')

        getRequest.onsuccess = function () {
          if (getRequest.result) {
            resolve(getRequest.result.data)
          } else {
            resolve(null)
          }
        }

        getRequest.onerror = (event) => reject(event)
      }

      request.onerror = (event) => reject(event)
    })
  }

  /**
   * 生成UUID
   * @returns {string}
   */
  generateUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  /**
   * 获取当前时间ISO字符串
   * @returns {string}
   */
  getCurrentTime() {
    return new Date().toISOString()
  }

  /**
   * 执行SQL查询
   * @param {string} sql SQL语句
   * @param {Object} params 参数
   * @returns {Object[]} 查询结果
   */
  query(sql, params = {}) {
    if (!this.initialized) throw new Error('数据库未初始化')

    try {
      const stmt = this.db.prepare(sql)

      // 绑定参数
      if (params) {
        stmt.bind(params)
      }

      const results = []
      while (stmt.step()) {
        results.push(stmt.getAsObject())
      }

      stmt.free()
      return results
    } catch (error) {
      console.error('查询执行失败:', error, { sql, params })
      throw error
    }
  }

  /**
   * 执行SQL语句（无返回）
   * @param {string} sql SQL语句
   * @param {Object} params 参数
   */
  exec(sql, params = {}) {
    if (!this.initialized) throw new Error('数据库未初始化')

    try {
      const stmt = this.db.prepare(sql)

      // 绑定参数
      if (params) {
        stmt.bind(params)
      }

      stmt.step()
      stmt.free()

      // 记录修改并自动保存
      this.saveToIndexedDB().catch((err) => console.error('自动保存失败:', err))
    } catch (error) {
      console.error('执行失败:', error, { sql, params })
      throw error
    }
  }

  /**
   * 获取最后插入的ID
   * @returns {number}
   */
  getLastInsertId() {
    return this.db.exec('SELECT last_insert_rowid() as id')[0].values[0][0]
  }

  /**
   * 关闭数据库连接
   */
  close() {
    if (this.db) {
      this.saveToIndexedDB()
        .then(() => {
          this.db.close()
          this.db = null
          this.initialized = false
          console.log('数据库已关闭')
        })
        .catch((err) => console.error('关闭前保存失败:', err))
    }
  }
}

// 单例模式
let sqliteClient = null

/**
 * 获取SQLite客户端实例
 * @returns {Promise<SQLiteClient>}
 */
export async function getSQLiteClient() {
  if (!sqliteClient) {
    sqliteClient = new SQLiteClient()
    await sqliteClient.init()
  }
  return sqliteClient
}

# 笔记编辑器离线存储实现方案

## 目录

1. [方案概述](#方案概述)
2. [技术选型](#技术选型)
3. [数据结构设计](#数据结构设计)
4. [接口改造](#接口改造)
5. [数据同步机制](#数据同步机制)
6. [离线存储实现](#离线存储实现)
7. [实现路线图](#实现路线图)

## 方案概述

本文档详细描述了将笔记编辑功能从依赖后端API转变为支持离线存储的前端实现方案。该方案通过在前端集成SQLite数据库，实现笔记的本地存储、编辑和管理。同时，保留了与后端服务同步的能力，确保在有网络连接时能够将数据同步到云端。

### 主要目标

1. 实现完全离线工作的笔记编辑功能
2. 保持与原有API接口的兼容性
3. 设计健壮的本地数据存储机制
4. 实现高效的数据同步策略
5. 提供良好的用户体验，无论在线或离线状态

## 技术选型

### 本地数据库

- **SQLite WASM**: 通过WebAssembly在浏览器中运行完整的SQLite数据库
  - 使用[sql.js](https://github.com/sql-js/sql.js/)或[wa-sqlite](https://github.com/rhashimoto/wa-sqlite)作为SQLite的WebAssembly实现

### 存储方案

- **IndexedDB**: 用于持久化SQLite数据库文件
- **LocalStorage**: 用于存储简单配置和同步状态

### 状态管理

- **Pinia**: 用于管理应用状态，包括笔记数据和同步状态

## 数据结构设计

### SQLite表结构

```sql
-- 笔记分类表
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,  -- 用于同步的唯一标识
  name TEXT NOT NULL,
  parent_id TEXT NULL,
  path TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_synced INTEGER DEFAULT 0, -- 0表示未同步，1表示已同步
  server_id TEXT NULL          -- 服务器端ID
);

-- 标签表
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_synced INTEGER DEFAULT 0,
  server_id INTEGER NULL
);

-- 笔记表
CREATE TABLE notes (
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
  checksum TEXT NULL,         -- 用于冲突检测
  is_synced INTEGER DEFAULT 0,
  server_id INTEGER NULL,
  is_deleted INTEGER DEFAULT 0, -- 软删除标记
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 笔记-标签关联表
CREATE TABLE note_tags (
  note_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES notes(id),
  FOREIGN KEY (tag_id) REFERENCES tags(id)
);

-- 同步记录表
CREATE TABLE sync_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,  -- 'note', 'category', 'tag'
  entity_id INTEGER NOT NULL, -- 对应实体的本地ID
  action TEXT NOT NULL,       -- 'create', 'update', 'delete'
  status TEXT NOT NULL,       -- 'pending', 'success', 'failed'
  created_at TEXT NOT NULL,
  synced_at TEXT NULL,
  error_message TEXT NULL
);
```

## 接口改造

### 数据访问层设计

创建统一的数据访问层，替代原有的API请求，同时保持接口一致：

```typescript
// 接口抽象，统一在线和离线模式
interface DataProvider {
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

// 实现离线数据提供者
class OfflineDataProvider implements DataProvider {
  private db: SQLiteDatabase

  constructor(db: SQLiteDatabase) {
    this.db = db
  }

  // 实现各种方法...
}

// 实现在线数据提供者（封装原有API）
class OnlineDataProvider implements DataProvider {
  // 实现各种方法...
}

// 工厂函数，根据网络状态和用户配置返回适当的数据提供者
function createDataProvider(): DataProvider {
  if (isOfflineMode() || !navigator.onLine) {
    return new OfflineDataProvider(getSQLiteDB())
  }
  return new OnlineDataProvider()
}
```

## 数据同步机制

### 同步策略

1. **离线优先策略**：优先使用本地数据，在后台尝试同步
2. **增量同步**：只同步自上次同步以来发生变化的数据
3. **冲突检测与解决**：使用版本号和校验和进行冲突检测

### 同步流程

```
┌─────────────┐  用户编辑  ┌─────────────┐  检测网络  ┌─────────────┐
│             │ ─────────> │             │ ─────────> │             │
│  用户操作   │            │  本地存储   │            │ 网络可用？  │
│             │ <────────  │             │            │             │
└─────────────┘  立即响应  └─────────────┘            └───────┬─────┘
                                                             │
                                                             │ 是
                                                             ▼
┌─────────────┐  解决冲突  ┌─────────────┐  同步数据  ┌─────────────┐
│             │ <────────  │             │ <────────  │             │
│  更新本地   │            │  冲突检测   │            │  发送到服务器│
│             │ ─────────> │             │ ─────────> │             │
└─────────────┘            └─────────────┘            └─────────────┘
```

### 同步状态管理

使用Pinia store管理同步状态：

```typescript
export const useSyncStore = defineStore('sync', {
  state: () => ({
    lastSyncTime: null,
    isSyncing: false,
    pendingSyncCount: 0,
    syncErrors: [],
    networkStatus: navigator.onLine,
  }),
  actions: {
    async syncAll() {
      // 执行全量同步
    },
    async syncEntity(type, id) {
      // 同步单个实体
    },
    updateNetworkStatus(status) {
      this.networkStatus = status
      if (status) {
        this.attemptSync()
      }
    },
  },
})
```

## 离线存储实现

### SQLite初始化

```typescript
import initSqlJs from 'sql.js'

export async function initDatabase() {
  try {
    // 加载SQL.js WASM模块
    const SQL = await initSqlJs({
      locateFile: (file) => `https://sql.js.org/dist/${file}`,
    })

    // 从IndexedDB加载数据库或创建新数据库
    let dbData = await loadDatabaseFromIndexedDB()

    if (!dbData) {
      // 创建新数据库
      const db = new SQL.Database()

      // 执行表创建SQL
      db.exec(`
        CREATE TABLE categories (...);
        CREATE TABLE tags (...);
        CREATE TABLE notes (...);
        CREATE TABLE note_tags (...);
        CREATE TABLE sync_records (...);
      `)

      // 保存到IndexedDB
      await saveDatabaseToIndexedDB(db.export())
      return db
    } else {
      // 使用现有数据
      return new SQL.Database(dbData)
    }
  } catch (error) {
    console.error('Database initialization failed:', error)
    throw error
  }
}
```

### 数据持久化

```typescript
// 保存到IndexedDB
async function saveDatabaseToIndexedDB(data: Uint8Array) {
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

// 从IndexedDB加载
async function loadDatabaseFromIndexedDB(): Promise<Uint8Array | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('NotesDatabase', 1)

    request.onsuccess = function () {
      const db = request.result
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
```

## 实现路线图

分步骤实现离线存储功能：

### 第一阶段：基础离线存储功能

1. SQLite WASM集成

   - 安装和配置sql.js
   - 创建数据库结构
   - 实现数据库初始化逻辑

2. 实现数据访问层
   - 创建DataProvider接口
   - 实现OfflineDataProvider
   - 保持与原API结构兼容

### 第二阶段：离线编辑功能

1. 实现笔记CRUD操作

   - 离线创建笔记
   - 离线编辑笔记
   - 离线删除笔记
   - 分类和标签管理

2. 用户界面适配
   - 离线状态指示器
   - 操作反馈机制
   - 错误处理

### 第三阶段：同步机制

1. 实现基础同步

   - 设计同步记录表
   - 增量同步逻辑
   - 网络状态监听

2. 冲突解决
   - 实现版本控制
   - 设计冲突检测算法
   - 冲突解决界面

### 第四阶段：完善与优化

1. 性能优化

   - 查询优化
   - 索引设计
   - 懒加载策略

2. 用户体验提升
   - 同步状态指示
   - 离线/在线模式切换
   - 数据备份与恢复功能

---

## 注意事项与挑战

1. **浏览器兼容性**: 确保SQLite WASM在主流浏览器上运行良好
2. **内存管理**: 有效管理WASM模块内存使用
3. **安全性**: 防止SQL注入和确保数据安全
4. **性能**: 优化大量笔记的存储和检索性能
5. **用户体验**: 确保在网络不稳定情况下提供良好体验
6. **同步复杂性**: 处理多设备编辑可能引发的同步冲突

---

文档版本: 1.0  
创建日期: 2024-04-12

# 离线笔记编辑器环境配置指南

## 目录

1. [项目依赖安装](#项目依赖安装)
2. [SQLite WASM配置](#sqlite-wasm配置)
3. [开发环境设置](#开发环境设置)
4. [生产环境优化](#生产环境优化)
5. [常见问题解决](#常见问题解决)

## 项目依赖安装

本项目采用SQLite的WebAssembly实现来实现离线数据存储功能。以下是安装相关依赖的步骤：

### 安装SQLite WASM

首先，在项目中安装SQL.js库，这是一个流行的SQLite的WebAssembly实现：

```bash
pnpm add sql.js
pnpm add -D @types/sql.js
```

或者，您也可以选择使用wa-sqlite，它是另一个现代化的SQLite WebAssembly实现：

```bash
pnpm add wa-sqlite
```

### 更新package.json

请确保您的package.json中包含了以下依赖（已经添加以下库或类似功能的库）：

```json
{
  "dependencies": {
    "sql.js": "^1.8.0",
    "@types/sql.js": "^1.4.4",
    "pinia": "^3.0.1",
    "vue": "^3.5.13",
    "vue-router": "^4.5.0"
  }
}
```

## SQLite WASM配置

### 配置Vite以处理WASM文件

为了让Vite正确处理WebAssembly文件，需要更新vite.config.ts文件：

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    fs: {
      strict: false, // 允许访问项目外的文件
    },
  },
  optimizeDeps: {
    exclude: ['sql.js'], // 排除sql.js以便正确加载WASM
  },
  build: {
    target: 'esnext', // 使用最新的JS特性
    rollupOptions: {
      output: {
        manualChunks: {
          'sql-wasm': ['sql.js'],
        },
      },
    },
  },
})
```

### 配置SQL.js WASM文件位置

SQL.js需要加载它的WASM文件。有两种常见的方式配置它：

#### 方式1: 从CDN加载

在您的SQLite客户端实现中：

```typescript
// src/services/SQLiteClient.ts
import initSqlJs from 'sql.js'

export class SQLiteClient {
  // ...
  async init() {
    // 从CDN加载WASM文件
    this.SQL = await initSqlJs({
      locateFile: (file) => `https://sql.js.org/dist/${file}`,
    })
    // ...
  }
  // ...
}
```

#### 方式2: 复制本地WASM文件（推荐）

1. 创建一个npm脚本来复制WASM文件到public目录：

```json
// package.json
{
  "scripts": {
    "copy-wasm": "mkdir -p public/wasm && cp node_modules/sql.js/dist/sql-wasm.wasm public/wasm/",
    "postinstall": "npm run copy-wasm"
    // ...其他脚本
  }
}
```

2. 在您的SQLite客户端实现中：

```typescript
// src/services/SQLiteClient.ts
import initSqlJs from 'sql.js'

export class SQLiteClient {
  // ...
  async init() {
    // 从本地加载WASM文件
    this.SQL = await initSqlJs({
      locateFile: (file) => `/wasm/${file}`,
    })
    // ...
  }
  // ...
}
```

## 开发环境设置

### 项目结构

为了实现离线编辑功能，推荐使用以下项目结构：

```
src/
├── api/               # API接口
│   ├── types.ts       # 类型定义
│   ├── requests.ts    # 请求工具
│   └── modules/       # API模块
├── services/          # 服务层
│   ├── SQLiteClient.ts     # SQLite客户端
│   ├── SyncManager.ts      # 同步管理器
│   └── DataProvider.ts     # 数据提供者
├── stores/            # Pinia状态管理
│   ├── noteStore.ts   # 笔记状态
│   └── syncStore.ts   # 同步状态
├── components/        # Vue组件
├── views/             # 页面视图
└── main.ts            # 入口文件
```

### 初始化数据库

在应用启动时初始化SQLite数据库：

```typescript
// src/main.ts
import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import router from './router'
import { getSQLiteClient } from './services/SQLiteClient'

// 初始化数据库
async function initApp() {
  try {
    // 预加载SQLite
    await getSQLiteClient()
    console.log('SQLite数据库初始化成功')

    // 创建Vue应用
    const app = createApp(App)
    app.use(createPinia())
    app.use(router)
    app.mount('#app')
  } catch (error) {
    console.error('应用初始化失败:', error)
  }
}

initApp()
```

## 生产环境优化

### WASM文件优化

在生产环境中，可以考虑以下优化措施：

1. **预加载WASM文件**：在HTML中添加预加载标记

```html
<!-- index.html -->
<head>
  <!-- 其他标签 -->
  <link rel="preload" href="/wasm/sql-wasm.wasm" as="fetch" type="application/wasm" crossorigin />
</head>
```

2. **压缩WASM文件**：使用Brotli或Gzip压缩WASM文件

在服务器配置中启用Brotli/Gzip压缩，示例nginx配置：

```nginx
server {
  # 其他配置...

  # 启用Brotli压缩
  brotli on;
  brotli_types application/wasm;

  # 或者启用Gzip压缩
  gzip on;
  gzip_types application/wasm;
}
```

### IndexedDB管理

1. **定期清理**：实现定期清理机制防止数据库过大

```typescript
// 清理过期的备份
async function cleanupOldBackups() {
  const db = await openDB('NotesBackups', 1)
  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000

  // 获取旧的备份
  const oldBackups = await db.getAllFromIndex(
    'backups',
    'by-date',
    IDBKeyRange.upperBound(twoWeeksAgo),
  )

  // 删除旧备份
  const tx = db.transaction('backups', 'readwrite')
  for (const backup of oldBackups) {
    await tx.store.delete(backup.id)
  }

  await tx.done
  console.log(`已清理 ${oldBackups.length} 个过期备份`)
}
```

2. **数据库版本管理**：实现数据库架构版本管理

## 常见问题解决

### 问题1: WASM加载失败

**症状**: 控制台出现错误 "Failed to load WASM module"

**解决方案**:

- 检查WASM文件路径是否正确
- 确保服务器配置了正确的MIME类型: `application/wasm`
- 尝试使用CDN路径替代本地路径

### 问题2: 大量数据性能问题

**症状**: 当数据量较大时操作变慢

**解决方案**:

- 实现分页加载
- 添加适当的数据库索引
- 优化SQL查询
- 考虑使用Web Worker运行SQLite操作

```typescript
// 在SQLite表上添加索引
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_notes_category_id ON notes(category_id);
  CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
  CREATE INDEX IF NOT EXISTS idx_sync_records_status ON sync_records(status);
`)
```

### 问题3: 跨设备同步冲突

**症状**: 同步数据时出现冲突

**解决方案**:

- 实现详细的冲突检测和解决机制
- 提供用户友好的冲突解决界面
- 使用"最后写入胜出"策略作为默认解决方案

## 补充资源

- [SQL.js官方文档](https://github.com/sql-js/sql.js)
- [IndexedDB API文档](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [WebAssembly最佳实践](https://developer.mozilla.org/en-US/docs/WebAssembly/C_to_wasm)

---

文档版本: 1.0  
创建日期: 2024-04-12

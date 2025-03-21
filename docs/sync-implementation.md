# 笔记应用数据同步实现方案

## 目录

1. [同步架构概述](#同步架构概述)
2. [同步状态管理](#同步状态管理)
3. [增量同步实现](#增量同步实现)
4. [冲突检测与解决](#冲突检测与解决)
5. [网络状态管理](#网络状态管理)
6. [实现示例](#实现示例)

## 同步架构概述

本文档详细描述了笔记应用在本地SQLite数据库与远程服务器之间的数据同步机制。同步系统采用"离线优先"的策略，允许用户在无网络环境下正常工作，并在网络恢复时自动同步变更。

### 核心设计原则

1. **离线优先**：所有操作首先保存在本地，确保离线可用性
2. **增量同步**：只同步发生变化的数据，减少传输量
3. **冲突管理**：提供智能的冲突检测和解决机制
4. **同步透明**：对用户透明，最小化干扰用户体验
5. **同步可靠性**：确保数据不会因同步操作而丢失

### 系统组件

```
┌───────────────────────────────────────────────────┐
│                   前端应用                          │
├───────────┬─────────────────────┬─────────────────┤
│  用户界面  │                     │                  │
│           │                     │                  │
├───────────┘                     │                  │
│                                 │                  │
│  ┌───────────────────┐         │                  │
│  │   数据访问层      │         │                  │
│  │  DataProvider    │         │     同步管理器    │
│  └───────┬───────────┘         │   SyncManager    │
│          │                     │                  │
│  ┌───────┴───────────┐         │                  │
│  │   SQLite WASM     │         │                  │
│  └───────────────────┘         │                  │
└───────────┬───────────────────┬┴─────────────────┘
            │                   │
┌───────────┴───────────┐ ┌─────┴─────────────────┐
│      IndexedDB        │ │      HTTP/网络层       │
└───────────────────────┘ └───────────┬───────────┘
                                      │
                          ┌───────────┴───────────┐
                          │      后端服务         │
                          └─────────────────────┘
```

## 同步状态管理

### 同步记录表

使用`sync_records`表跟踪本地更改，记录需要同步到服务器的操作：

```sql
CREATE TABLE sync_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,  -- 'note', 'category', 'tag'
  entity_id INTEGER NOT NULL, -- 对应实体的本地ID
  action TEXT NOT NULL,       -- 'create', 'update', 'delete'
  status TEXT NOT NULL,       -- 'pending', 'syncing', 'success', 'failed'
  created_at TEXT NOT NULL,
  synced_at TEXT NULL,
  error_message TEXT NULL,
  retry_count INTEGER DEFAULT 0
);
```

### 同步状态Store

使用Pinia管理同步状态：

```typescript
export const useSyncStore = defineStore('sync', {
  state: () => ({
    lastSyncTime: null, // 上次成功同步时间
    isSyncing: false, // 当前是否正在同步
    pendingSyncCount: 0, // 待同步记录数量
    syncErrors: [], // 同步错误列表
    networkStatus: navigator.onLine, // 网络状态
    syncMode: 'auto', // 'auto', 'manual', 'disabled'
    conflictResolutionMode: 'ask', // 'local', 'remote', 'ask'
  }),

  getters: {
    hasPendingChanges: (state) => state.pendingSyncCount > 0,
    canSync: (state) => state.networkStatus && !state.isSyncing && state.syncMode !== 'disabled',
  },

  actions: {
    // 更新同步状态
    updateSyncStatus() {
      // 从数据库获取待同步记录数量
    },

    // 更新网络状态
    updateNetworkStatus(status: boolean) {
      this.networkStatus = status

      // 如果网络恢复且启用了自动同步，尝试同步
      if (status && this.syncMode === 'auto' && this.hasPendingChanges) {
        this.syncAll()
      }
    },

    // 执行全量同步
    async syncAll() {
      if (!this.canSync) return

      this.isSyncing = true
      try {
        // 执行同步逻辑
        await syncManager.syncAll()
        this.lastSyncTime = new Date()
      } catch (error) {
        this.syncErrors.push({
          time: new Date(),
          message: error.message,
        })
      } finally {
        this.isSyncing = false
        this.updateSyncStatus()
      }
    },

    // 同步特定实体
    async syncEntity(type: string, id: number) {
      // 同步单个实体
    },
  },
})
```

## 增量同步实现

### 同步算法

增量同步采用以下步骤：

1. **准备阶段**：

   - 查询本地 `sync_records` 表中状态为 'pending' 的记录
   - 按照实体类型和操作类型分组

2. **上传阶段**：

   - 按优先级顺序处理：先同步分类，然后是标签，最后是笔记
   - 先处理 'create'，然后是 'update'，最后是 'delete'
   - 处理每个操作时，将本地ID映射到服务器ID

3. **下载阶段**：
   - 获取服务器上次同步后的变更
   - 将变更应用到本地数据库
   - 处理任何冲突

### 同步管理器实现

```typescript
export class SyncManager {
  constructor(private sqliteClient: SQLiteClient) {}

  // 全量同步
  async syncAll(): Promise<SyncResult> {
    // 检查是否有网络连接
    if (!navigator.onLine) {
      throw new Error('无网络连接')
    }

    try {
      // 1. 处理本地待同步记录
      const pendingRecords = await this.getPendingRecords()

      // 2. 按优先级分组
      const grouped = this.groupRecordsByPriority(pendingRecords)

      // 3. 上传本地更改
      const uploadResult = await this.uploadChanges(grouped)

      // 4. 获取远程更改
      const lastSyncTime = await this.getLastSuccessfulSyncTime()
      const remoteChanges = await this.fetchRemoteChanges(lastSyncTime)

      // 5. 应用远程更改到本地
      const downloadResult = await this.applyRemoteChanges(remoteChanges)

      // 6. 更新同步状态
      await this.updateSyncRecords(uploadResult.successful)

      return {
        uploadedCount: uploadResult.successful.length,
        downloadedCount: downloadResult.appliedChanges,
        failedCount: uploadResult.failed.length,
        conflicts: downloadResult.conflicts,
      }
    } catch (error) {
      console.error('同步失败:', error)
      throw error
    }
  }

  // 获取待同步记录
  private async getPendingRecords(): Promise<SyncRecord[]> {
    const records = this.sqliteClient.query(`
      SELECT * FROM sync_records
      WHERE status = 'pending'
      ORDER BY created_at ASC
    `)

    return records.map(this.mapSyncRecord)
  }

  // 按优先级分组记录
  private groupRecordsByPriority(records: SyncRecord[]): GroupedSyncRecords {
    return {
      categories: {
        create: records.filter((r) => r.entity_type === 'category' && r.action === 'create'),
        update: records.filter((r) => r.entity_type === 'category' && r.action === 'update'),
        delete: records.filter((r) => r.entity_type === 'category' && r.action === 'delete'),
      },
      tags: {
        create: records.filter((r) => r.entity_type === 'tag' && r.action === 'create'),
        update: records.filter((r) => r.entity_type === 'tag' && r.action === 'update'),
        delete: records.filter((r) => r.entity_type === 'tag' && r.action === 'delete'),
      },
      notes: {
        create: records.filter((r) => r.entity_type === 'note' && r.action === 'create'),
        update: records.filter((r) => r.entity_type === 'note' && r.action === 'update'),
        delete: records.filter((r) => r.entity_type === 'note' && r.action === 'delete'),
      },
    }
  }

  // 上传本地更改到服务器
  private async uploadChanges(grouped: GroupedSyncRecords): Promise<UploadResult> {
    const successful: number[] = []
    const failed: { id: number; error: string }[] = []

    // 处理顺序: 类别 -> 标签 -> 笔记
    // 每种类型内部顺序: 创建 -> 更新 -> 删除

    // 处理分类
    await this.processEntityType('category', grouped.categories, successful, failed)

    // 处理标签
    await this.processEntityType('tag', grouped.tags, successful, failed)

    // 处理笔记
    await this.processEntityType('note', grouped.notes, successful, failed)

    return { successful, failed }
  }

  // 处理特定类型的实体同步
  private async processEntityType(
    type: string,
    actions: { create: SyncRecord[]; update: SyncRecord[]; delete: SyncRecord[] },
    successful: number[],
    failed: { id: number; error: string }[],
  ) {
    // 处理创建操作
    for (const record of actions.create) {
      try {
        // 标记记录为同步中
        await this.updateSyncRecordStatus(record.id, 'syncing')

        // 获取实体数据
        const entity = await this.getEntityById(type, record.entity_id)
        if (!entity) {
          throw new Error(`找不到${type}实体: ${record.entity_id}`)
        }

        // 发送到服务器
        const response = await this.sendToServer('POST', `/${type}s`, entity)

        // 更新本地实体的server_id和is_synced状态
        await this.updateLocalEntityAfterSync(type, record.entity_id, response.id, true)

        successful.push(record.id)
      } catch (error) {
        failed.push({ id: record.id, error: error.message })
        await this.updateSyncRecordStatus(record.id, 'failed', error.message)
      }
    }

    // 处理更新操作 - 类似逻辑
    // 处理删除操作 - 类似逻辑
  }

  // 其他辅助方法...
}
```

## 冲突检测与解决

### 冲突检测机制

当本地和服务器都有对同一实体的修改时，会发生冲突。检测冲突的主要方法：

1. **版本号比较**：每个实体都有版本号，修改时递增
2. **修改时间比较**：比较本地和服务器的修改时间
3. **内容校验和**：使用内容生成的校验和进行比较

### 冲突解决策略

系统提供三种冲突解决策略：

1. **本地优先**：总是以本地更改为准
2. **远程优先**：总是以服务器更改为准
3. **询问用户**：显示冲突对比界面，让用户选择

### 冲突解决界面

冲突解决界面包括：

- 显示本地版本和服务器版本的差异
- 提供合并选项
- 允许用户选择保留特定字段的版本
- 提供自动合并建议

```typescript
// 冲突检测
function detectConflict(localEntity, remoteEntity) {
  // 如果版本号相同但内容不同，可能是并发修改
  if (
    localEntity.version === remoteEntity.version &&
    localEntity.checksum !== remoteEntity.checksum
  ) {
    return true
  }

  // 如果本地版本比远程版本新，且都有修改
  if (
    localEntity.version > remoteEntity.version &&
    new Date(localEntity.updated_at) > new Date(remoteEntity.updated_at)
  ) {
    return true
  }

  return false
}

// 解决冲突
async function resolveConflict(localEntity, remoteEntity, strategy) {
  switch (strategy) {
    case 'local':
      return localEntity

    case 'remote':
      return remoteEntity

    case 'ask':
      // 在UI中显示冲突解决对话框
      return await showConflictResolutionDialog(localEntity, remoteEntity)

    default:
      return remoteEntity // 默认远程优先
  }
}
```

## 网络状态管理

### 网络状态监听

监听网络状态变化，并据此调整同步行为：

```typescript
// 初始化网络状态监听
function initNetworkListeners() {
  // 监听在线状态变化
  window.addEventListener('online', () => {
    useSyncStore().updateNetworkStatus(true)
  })

  window.addEventListener('offline', () => {
    useSyncStore().updateNetworkStatus(false)
  })

  // 初始化当前状态
  useSyncStore().updateNetworkStatus(navigator.onLine)
}
```

### 自动同步机制

根据网络状态和用户设置调整同步行为：

1. **网络恢复时同步**：网络恢复连接时自动同步
2. **定期同步**：在有网络时定期自动同步
3. **手动同步**：提供手动触发同步的选项
4. **应用启动时同步**：应用启动且有网络时自动同步

```typescript
// 设置自动同步
function setupAutoSync() {
  const syncStore = useSyncStore()

  // 网络恢复时同步
  watch(
    () => syncStore.networkStatus,
    (newStatus) => {
      if (newStatus && syncStore.syncMode === 'auto') {
        syncStore.syncAll()
      }
    },
  )

  // 定期同步 (每5分钟检查一次)
  if (syncStore.syncMode === 'auto') {
    setInterval(
      () => {
        if (syncStore.canSync && syncStore.hasPendingChanges) {
          syncStore.syncAll()
        }
      },
      5 * 60 * 1000,
    )
  }
}
```

## 实现示例

### 同步管理器实现示例

```typescript
// src/services/SyncManager.ts
import { SQLiteClient } from '@/services/SQLiteClient'
import { apiClient } from '@/api/apiClient'
import { useSyncStore } from '@/stores/syncStore'

export interface SyncResult {
  uploadedCount: number
  downloadedCount: number
  failedCount: number
  conflicts: number
}

export class SyncManager {
  constructor(private sqliteClient: SQLiteClient) {}

  /**
   * 执行全量同步
   */
  async syncAll(): Promise<SyncResult> {
    const syncStore = useSyncStore()

    if (!navigator.onLine) {
      throw new Error('无网络连接')
    }

    // 同步开始
    syncStore.isSyncing = true

    try {
      // 查询待同步记录
      const pendingRecords = await this.getPendingRecords()
      console.log(`发现 ${pendingRecords.length} 条待同步记录`)

      // 上传更改
      const { uploaded, failed } = await this.uploadChanges(pendingRecords)
      console.log(`上传成功: ${uploaded.length}, 失败: ${failed.length}`)

      // 更新已上传记录状态
      await this.updateSyncedRecords(uploaded)

      // 获取远程更改
      const lastSync = syncStore.lastSyncTime || new Date(0)
      const remoteChanges = await this.getRemoteChanges(lastSync)
      console.log(`发现 ${remoteChanges.length} 条远程更改`)

      // 应用远程更改
      const { applied, conflicts } = await this.applyRemoteChanges(remoteChanges)

      // 更新同步时间
      syncStore.lastSyncTime = new Date()

      return {
        uploadedCount: uploaded.length,
        downloadedCount: applied,
        failedCount: failed.length,
        conflicts,
      }
    } catch (error) {
      console.error('同步失败:', error)
      throw error
    } finally {
      syncStore.isSyncing = false
      syncStore.updateSyncStatus()
    }
  }

  /**
   * 获取待同步记录
   */
  private async getPendingRecords() {
    return this.sqliteClient.query(`
      SELECT * FROM sync_records
      WHERE status = 'pending'
      ORDER BY created_at ASC
    `)
  }

  /**
   * 上传本地更改到服务器
   */
  private async uploadChanges(records) {
    const uploaded = []
    const failed = []

    for (const record of records) {
      try {
        // 更新记录状态为同步中
        await this.updateRecordStatus(record.id, 'syncing')

        // 根据实体类型和操作获取适当的处理器
        const handler = this.getSyncHandler(record.entity_type, record.action)

        // 执行同步
        await handler(record)

        // 同步成功
        uploaded.push(record.id)
      } catch (error) {
        // 同步失败
        failed.push({ id: record.id, error: error.message })
        await this.updateRecordStatus(record.id, 'failed', error.message)
      }
    }

    return { uploaded, failed }
  }

  /**
   * 更新已同步记录的状态
   */
  private async updateSyncedRecords(recordIds) {
    const now = new Date().toISOString()

    // 批量更新记录状态
    for (const id of recordIds) {
      await this.sqliteClient.exec(
        `
        UPDATE sync_records
        SET status = 'success', synced_at = ?
        WHERE id = ?
      `,
        [now, id],
      )
    }
  }

  /**
   * 获取远程变更
   */
  private async getRemoteChanges(since) {
    const sinceStr = since.toISOString()

    // 获取服务器上最近的更改
    const response = await apiClient.get('/sync/changes', {
      params: { since: sinceStr },
    })

    return response.data
  }

  /**
   * 应用远程更改到本地
   */
  private async applyRemoteChanges(changes) {
    let applied = 0
    let conflicts = 0

    this.sqliteClient.exec('BEGIN TRANSACTION')

    try {
      // 按顺序处理: 分类、标签、笔记
      for (const entityType of ['categories', 'tags', 'notes']) {
        const entityChanges = changes[entityType] || []

        for (const change of entityChanges) {
          const result = await this.applyRemoteChange(entityType, change)

          if (result.applied) applied++
          if (result.conflict) conflicts++
        }
      }

      this.sqliteClient.exec('COMMIT')
    } catch (error) {
      this.sqliteClient.exec('ROLLBACK')
      throw error
    }

    return { applied, conflicts }
  }

  /**
   * 应用单个远程更改
   */
  private async applyRemoteChange(entityType, change) {
    // 根据类型获取处理器
    const handler = this.getRemoteChangeHandler(entityType, change.action)

    // 检查是否有冲突
    const hasConflict = await this.checkConflict(entityType, change)

    if (hasConflict) {
      // 处理冲突
      const resolved = await this.resolveConflict(entityType, change)
      return { applied: resolved, conflict: true }
    } else {
      // 无冲突，直接应用
      await handler(change)
      return { applied: true, conflict: false }
    }
  }

  // 其他辅助方法...
}
```

### 用户界面集成

```vue
<!-- src/components/SyncStatusBar.vue -->
<template>
  <div class="sync-status-bar">
    <div class="status-icon" :class="{ online: syncStore.networkStatus }">
      <i v-if="syncStore.networkStatus" class="pi pi-wifi"></i>
      <i v-else class="pi pi-wifi-off"></i>
    </div>

    <div class="sync-info">
      <template v-if="syncStore.isSyncing">
        <ProgressSpinner style="width:20px;height:20px" /> 正在同步...
      </template>
      <template v-else-if="syncStore.hasPendingChanges">
        {{ syncStore.pendingSyncCount }} 条更改待同步
      </template>
      <template v-else> <i class="pi pi-check"></i> 已同步 </template>
    </div>

    <div class="sync-actions">
      <Button
        icon="pi pi-refresh"
        @click="syncNow"
        :disabled="!syncStore.canSync || syncStore.isSyncing"
        size="small"
      />
      <Button icon="pi pi-cog" @click="showSyncSettings" size="small" />
    </div>
  </div>
</template>

<script setup>
import { useSyncStore } from '@/stores/syncStore'
import { SyncManager } from '@/services/SyncManager'
import { getSQLiteClient } from '@/services/SQLiteClient'
import { toast } from 'primevue/usetoast'

const syncStore = useSyncStore()

const syncNow = async () => {
  if (!syncStore.canSync) return

  try {
    const client = await getSQLiteClient()
    const syncManager = new SyncManager(client)

    const result = await syncManager.syncAll()

    toast.add({
      severity: 'success',
      summary: '同步完成',
      detail: `上传: ${result.uploadedCount}, 下载: ${result.downloadedCount}, 失败: ${result.failedCount}, 冲突: ${result.conflicts}`,
      life: 3000,
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: '同步失败',
      detail: error.message,
      life: 5000,
    })
  }
}

const showSyncSettings = () => {
  // 显示同步设置对话框
}
</script>
```

---

## 注意事项与最佳实践

1. **性能考虑**

   - 在后台进行同步，避免阻塞用户操作
   - 对大型笔记内容考虑分块同步

2. **安全性**

   - 使用安全的连接（HTTPS）传输数据
   - 实施适当的认证和授权机制

3. **错误处理**

   - 同步失败时实施退避策略（指数退避重试）
   - 提供清晰的错误信息和恢复选项

4. **用户体验**
   - 提供同步进度和状态的可视化反馈
   - 允许用户选择同步模式和冲突解决策略
   - 设计简洁的冲突解决界面

---

文档版本: 1.0  
创建日期: 2024-04-12

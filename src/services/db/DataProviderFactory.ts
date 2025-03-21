import type { DataProvider } from '@/types/DataProvider'
import { OfflineDataProvider } from './OfflineDataProvider'

/**
 * 数据提供者工厂类，用于根据当前网络状态选择在线或离线模式
 */
export class DataProviderFactory {
  private static instance: DataProviderFactory
  private dataProvider: DataProvider | null = null
  private isOfflineMode = false

  /**
   * 获取 DataProviderFactory 单例
   */
  public static getInstance(): DataProviderFactory {
    if (!DataProviderFactory.instance) {
      DataProviderFactory.instance = new DataProviderFactory()
    }
    return DataProviderFactory.instance
  }

  /**
   * 获取当前数据提供者
   */
  public async getDataProvider(): Promise<DataProvider> {
    // 如果已存在数据提供者，直接返回
    if (this.dataProvider) {
      return this.dataProvider
    }

    // 第一阶段实现中，只使用离线数据提供者
    this.dataProvider = new OfflineDataProvider()
    this.isOfflineMode = true

    return this.dataProvider
  }

  /**
   * 获取当前是否处于离线模式
   */
  public isOffline(): boolean {
    return this.isOfflineMode
  }

  /**
   * 切换在线/离线模式（在后续阶段实现）
   */
  public async toggleMode(): Promise<void> {
    // 在第一阶段实现中，始终处于离线模式
    console.log('当前处于离线模式，暂不支持切换')
  }
}

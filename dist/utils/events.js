/**
 * @fileoverview 事件处理工具
 * 提供基本的事件发射和监听功能
 */
/**
 * 事件发射器类
 * 实现简单的事件订阅-发布模式
 */
export class EventEmitter {
    /**
     * 创建事件发射器实例
     */
    constructor() {
        this.events = new Map();
    }
    /**
     * 注册事件监听器
     * @param {string} event - 事件名称
     * @param {EventCallback} callback - 事件回调函数
     */
    on(event, callback) {
        var _a;
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        (_a = this.events.get(event)) === null || _a === void 0 ? void 0 : _a.push(callback);
    }
    /**
     * 移除事件监听器
     * @param {string} event - 事件名称
     * @param {EventCallback} callback - 要移除的回调函数
     */
    off(event, callback) {
        const callbacks = this.events.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {...any[]} args - 传递给回调函数的参数
     * @protected
     */
    emit(event, ...args) {
        const callbacks = this.events.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(...args));
        }
    }
    /**
     * 移除所有事件监听器
     * @protected
     */
    removeAllListeners() {
        this.events.clear();
    }
}

/**
 * @fileoverview 编辑器核心类实现
 * 提供基本的编辑器功能，包括文本编辑、事件处理等
 */

import { EventEmitter } from '../utils/events';

/**
 * 编辑器配置选项接口
 * @interface EditorOptions
 */
export interface EditorOptions {
    /** 编辑器容器元素 */
    container: HTMLElement;
    /** 编辑器初始内容 */
    initialValue?: string;
    /** 编辑器主题 */
    theme?: string;
}

/**
 * Markdown编辑器核心类
 * @extends EventEmitter
 */
export class LeafEditor extends EventEmitter {
    /** 编辑器容器元素 */
    private container: HTMLElement;
    /** 文本输入区域 */
    private textarea!: HTMLTextAreaElement;
    /** 当前编辑器内容 */
    private value: string;

    /**
     * 创建编辑器实例
     * @param {EditorOptions} options - 编辑器配置选项
     */
    constructor(options: EditorOptions) {
        super();
        this.container = options.container;
        this.value = options.initialValue || '';
        this.init();
    }

    /**
     * 初始化编辑器
     * @private
     */
    private init(): void {
        this.createTextArea();
        this.bindEvents();
    }

    /**
     * 创建文本输入区域
     * @private
     */
    private createTextArea(): void {
        this.textarea = document.createElement('textarea');
        this.textarea.className = 'leaf-editor';
        this.textarea.value = this.value;
        this.container.appendChild(this.textarea);
    }

    /**
     * 绑定事件处理器
     * @private
     */
    private bindEvents(): void {
        this.textarea.addEventListener('input', () => {
            this.value = this.textarea.value;
            this.emit('change', this.value);
        });

        this.textarea.addEventListener('keydown', (e) => {
            this.emit('keydown', e);
        });
    }

    /**
     * 获取编辑器当前内容
     * @returns {string} 编辑器内容
     */
    public getValue(): string {
        return this.value;
    }

    /**
     * 设置编辑器内容
     * @param {string} value - 要设置的内容
     */
    public setValue(value: string): void {
        this.value = value;
        this.textarea.value = value;
        this.emit('change', value);
    }

    /**
     * 销毁编辑器实例
     * 清理DOM元素和事件监听器
     */
    public destroy(): void {
        this.textarea.remove();
        this.removeAllListeners();
    }
} 

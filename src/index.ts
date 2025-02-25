/**
 * @fileoverview Leaf Markdown Editor 入口文件
 * 导出编辑器核心类和工具函数，提供简单的工厂函数用于创建编辑器实例
 */

import { Editor } from './core/editor';
import { MarkdownParser } from './core/parser';

export { Editor, MarkdownParser };

/**
 * 创建编辑器实例的工厂函数
 * @param {HTMLElement} container - 编辑器容器元素
 * @param {Object} options - 编辑器配置选项
 * @param {string} [options.initialValue] - 初始内容
 * @param {string} [options.theme] - 主题名称
 * @returns {Editor} 返回编辑器实例
 */
export function createEditor(container: HTMLElement, options: Partial<{
  initialValue: string;
  theme: string;
}> = {}) {
  return new Editor({
    container,
    ...options
  });
} 
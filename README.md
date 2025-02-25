# Leaf Markdown Editor

一个轻量级的TypeScript Markdown编辑器，不依赖任何框架。

## 特性

- 纯TypeScript实现
- 零依赖
- 轻量级
- 支持基本的Markdown语法
- 实时预览
- 自定义主题

## 安装

```bash
npm install leaf-markdown-editor
```

## 使用方法

```typescript
import { createEditor } from 'leaf-markdown-editor';

// 创建编辑器实例
const editor = createEditor(document.getElementById('editor'), {
  initialValue: '# Hello World',
  theme: 'default'
});

// 监听内容变化
editor.on('change', (value) => {
  console.log('Content changed:', value);
});

// 获取编辑器内容
const content = editor.getValue();

// 设置编辑器内容
editor.setValue('# New Content');

// 销毁编辑器
editor.destroy();
```

## API文档

### Editor类

#### 构造函数选项

- `container`: HTMLElement - 编辑器容器元素
- `initialValue`: string (可选) - 初始内容
- `theme`: string (可选) - 主题名称

#### 方法

- `getValue(): string` - 获取当前编辑器内容
- `setValue(value: string): void` - 设置编辑器内容
- `on(event: string, callback: Function): void` - 添加事件监听器
- `off(event: string, callback: Function): void` - 移除事件监听器
- `destroy(): void` - 销毁编辑器实例

#### 事件

- `change` - 内容变化时触发
- `keydown` - 按键按下时触发

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务
npm start

# 构建
npm run build

# 运行测试
npm test
```

## 许可证

MIT 
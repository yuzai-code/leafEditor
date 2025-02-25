import { createEditor } from '../dist/index.js';
import { MarkdownParser } from '../dist/index.js';

// 初始化编辑器
const editorElement = document.getElementById('editor');
const previewElement = document.getElementById('preview');
const parser = new MarkdownParser();

const initialValue = `# Markdown 编辑器示例

## 基本功能演示

### 文本格式化

**粗体文本** 和 *斜体文本*

### 代码

这是一个 \`行内代码\` 示例

### 链接

[访问GitHub](https://github.com)

### 列表

- 项目1
- 项目2
- 项目3

### 开始编辑

试试在左侧编辑器中修改内容，右侧会实时预览效果！`;

const editor = createEditor(editorElement, {
    initialValue: initialValue
});

// 实时预览功能
const updatePreview = () => {
    const content = editor.getValue();
    const html = parser.parse(content);
    previewElement.innerHTML = html;
};

// 初始预览
updatePreview();

// 监听内容变化
editor.on('change', updatePreview); 
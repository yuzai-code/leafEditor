import { createEditor, MarkdownParser } from '../src/index';
import './style.css';

// 初始化编辑器
const editorElement = document.getElementById('editor');
const previewElement = document.getElementById('preview');

if (!editorElement || !previewElement) {
    throw new Error('编辑器或预览区域元素未找到');
}

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

1. 有序列表1
2. 有序列表2
3. 有序列表3

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

// 工具栏功能
document.querySelectorAll('.toolbar button').forEach(button => {
    button.addEventListener('click', () => {
        const command = button.getAttribute('data-command');
        if (!command) return;

        const textarea = editorElement.querySelector('textarea');
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        let newText = '';

        switch (command) {
            case 'bold':
                newText = text.slice(0, start) + `**${text.slice(start, end)}**` + text.slice(end);
                break;
            case 'italic':
                newText = text.slice(0, start) + `*${text.slice(start, end)}*` + text.slice(end);
                break;
            case 'heading':
                newText = text.slice(0, start) + `### ${text.slice(start, end)}` + text.slice(end);
                break;
            case 'link':
                newText = text.slice(0, start) + `[${text.slice(start, end)}](url)` + text.slice(end);
                break;
            case 'list':
                newText = text.slice(0, start) + `- ${text.slice(start, end)}` + text.slice(end);
                break;
        }

        editor.setValue(newText);
        textarea.focus();
    });
}); 
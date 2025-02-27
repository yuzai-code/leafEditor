/**
 * @fileoverview Markdown解析器实现
 * 将Markdown文本转换为HTML
 */

/**
 * Markdown解析器类
 * 使用正则表达式实现基本的Markdown语法解析
 */
export class MarkdownParser {
  /** 解析规则数组，每个规则包含一个正则表达式和对应的HTML转换函数 */
  private rules: Array<[RegExp, (match: RegExpExecArray) => string]>;

  /**
   * 创建解析器实例并初始化解析规则
   */
  constructor() {
    this.rules = [
      // Headers - 标题（h1-h3）
      [/^# (.+)$/gm, (match) => `<h1>${match[1]}</h1>`],
      [/^## (.+)$/gm, (match) => `<h2>${match[1]}</h2>`],
      [/^### (.+)$/gm, (match) => `<h3>${match[1]}</h3>`],
      [/^#### (.+)$/gm, (match) => `<h4>${match[1]}</h4>`],
      [/^##### (.+)$/gm, (match) => `<h5>${match[1]}</h5>`],
      [/^###### (.+)$/gm, (match) => `<h6>${match[1]}</h6>`],

      // 引用 - 移到标题之后，段落之前
      [/^> (.+)$/gm, (match) => `<blockquote>${match[1]}</blockquote>`],

      // Bold - 粗体
      [/\*\*(.+?)\*\*/g, (match) => `<strong>${match[1]}</strong>`],

      // Italic - 斜体
      [/\*(.+?)\*/g, (match) => `<em>${match[1]}</em>`],

      // Code - 行内代码
      [/`(.+?)`/g, (match) => `<code>${match[1]}</code>`],

      // Links - 链接
      [/\[(.+?)\]\((.+?)\)/g, (match) => `<a href="${match[2]}">${match[1]}</a>`],

      // Lists - 无序列表
      [/^\- (.+)$/gm, (match) => `<li class="unordered">${match[1]}</li>`],

      // 有序列表
      [/^\d+\. (.+)$/gm, (match) => `<li class="ordered">${match[1]}</li>`],

      // Paragraphs - 段落 (移到最后)
      [/^(?!<[^>]+>)(.+)$/gm, (match) => `<p>${match[1]}</p>`],
    ];
  }

  /**
   * 解析Markdown文本
   * @param {string} text - 要解析的Markdown文本
   * @returns {string} 解析后的HTML字符串
   */
  public parse(text: string): string {
    let html = text.trim();

    // 应用每个解析规则
    this.rules.forEach(([pattern, replacement]) => {
      html = html.replace(pattern, (substring: string, ...args: any[]) => {
        const match = [substring, ...args] as unknown as RegExpExecArray;
        return replacement(match);
      });
    });

    // 处理列表
    html = this.processList(html);

    return html;
  }

  /**
   * 处理列表项，将连续的列表项包装在适当的列表标签中
   * @param {string} html - 包含列表项的HTML字符串
   * @returns {string} 处理后的HTML字符串
   * @private
   */
  private processList(html: string): string {
    // 处理无序列表
    html = html.replace(/(<li class="unordered">.*?<\/li>\n?)+/g, (match) => `<ul>\n${match}</ul>`);

    // 处理有序列表
    html = html.replace(/(<li class="ordered">.*?<\/li>\n?)+/g, (match) => {
      // 移除class="ordered"标记
      const cleanMatch = match.replace(/class="ordered"/g, '');
      return `<ol>\n${cleanMatch}</ol>`;
    });

    return html;
  }
}

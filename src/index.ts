#!/usr/bin/env node
// 这是一个 shebang 指令，告诉系统使用 node 来执行此脚本

// 导入 MCP SDK 相关的模块和类型
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
// 导入 chalk 用于在控制台输出彩色文本
import chalk from 'chalk';

/**
 * 定义总结数据的接口
 * 这个接口描述了一个总结条目的所有属性
 */
interface SummaryData {
  id: string;              // 唯一标识符
  timestamp: string;       // 时间戳 (YYYYMMDD格式)
  content: string;         // 总结内容
  keywords: string[];      // 关键词列表 (如 #mcp #关键词)
  createdAt: Date;         // 创建时间
}

/**
 * 总结服务器类
 * 负责处理和管理对话总结的核心逻辑
 */
class SummaryServer {
  // 存储所有总结的历史记录
  private summaryHistory: SummaryData[] = [];
  // 用于生成唯一ID的计数器
  private idCounter: number = 1;

  /**
   * 格式化时间戳为YYYYMMDD格式
   * @param date 日期对象
   * @returns 格式化后的时间戳字符串
   */
  private formatTimestamp(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * 格式化本地时间为易读的字符串格式
   * @param date 日期对象
   * @returns 格式化后的本地时间字符串 (YYYY-MM-DD HH:mm:ss)
   */
  private formatLocalTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * 生成唯一ID
   * @returns 唯一标识符字符串
   */
  private generateId(): string {
    return `summary-${this.idCounter++}`;
  }

  /**
   * 从内容中提取关键词
   * @param content 总结内容
   * @param providedKeywords 用户提供的关键词
   * @returns 关键词数组
   */
  private extractKeywords(content: string, providedKeywords?: string[]): string[] {
    const keywords = new Set<string>();
    
    // 添加默认关键词
    //keywords.add('mcp');
    
    // 添加用户提供的关键词
    if (providedKeywords && providedKeywords.length > 0) {
      providedKeywords.forEach(keyword => {
        // 移除#前缀（如果有的话），然后添加
        const cleanKeyword = keyword.startsWith('#') ? keyword.substring(1) : keyword;
        keywords.add(cleanKeyword);
      });
    }
    
    // 从内容中提取可能的关键词（简单实现）暂不实施
    /*  */
    const commonKeywords = ['创意'];
    commonKeywords.forEach(keyword => {
      if (content.toLowerCase().includes(keyword.toLowerCase())) {
        keywords.add(keyword);
      }
    });
  
    
    return Array.from(keywords);
  }

  /**
   * 精炼总结内容
   * 提取对话中的有价值信息，特别是用户表示赞同、认可有用的内容
   * @param content 原始对话内容
   * @returns 精炼后的总结内容
   */
  private refineSummaryContent(content: string): string {
    // 简单实现：截取前200个字符并添加省略号
    // 在实际应用中，这里可以添加更复杂的自然语言处理逻辑
    const maxLength = 200;
    if (content.length <= maxLength) {
      return content;
    }
    
    // 尝试在句子边界处截断
    const truncated = content.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('。');
    const lastComma = truncated.lastIndexOf('，');
    const lastSpace = truncated.lastIndexOf(' ');
    
    const cutIndex = Math.max(lastPeriod, lastComma, lastSpace);
    if (cutIndex > maxLength * 0.5) { // 确保我们保留了足够的内容
      return truncated.substring(0, cutIndex + 1) + '...';
    }
    
    return truncated + '...';
  }

  /**
   * 添加新的总结
   * @param content 需要总结的对话内容
   * @param keywords 可选的关键词列表
   * @returns 包含总结ID和确认信息的对象
   */
  public addSummary(content: string, keywords?: string[]): { 
    id: string; 
    summary: string;
    formattedSummary: string;
  } {
    try {
      // 验证输入
      if (!content || typeof content !== 'string') {
        throw new Error('Invalid content: must be a non-empty string');
      }

      // 精炼内容
      const refinedContent = this.refineSummaryContent(content);
      
      // 提取关键词
      const extractedKeywords = this.extractKeywords(refinedContent, keywords);
      
      // 创建时间戳
      const now = new Date();
      const timestamp = this.formatTimestamp(now);
      
      // 生成ID
      const id = this.generateId();
      
      // 创建总结数据对象
      const summaryData: SummaryData = {
        id,
        timestamp,
        content: refinedContent,
        keywords: extractedKeywords,
        createdAt: now
      };
      
      // 添加到历史记录
      this.summaryHistory.push(summaryData);
      
      // 格式化总结显示
      const keywordString = extractedKeywords.map(k => `#${k}`).join(' ');
      const formattedSummary = `${timestamp} ${keywordString} ${refinedContent}`;
      
      // 输出到控制台（用于调试）
      console.error(chalk.green('📝 总结已添加:'));
      console.error(chalk.cyan(`  ID: ${id}`));
      console.error(chalk.cyan(`  内容: ${formattedSummary}`));
      
      return {
        id,
        summary: refinedContent,
        formattedSummary
      };
    } catch (error) {
      console.error(chalk.red('❌ 添加总结时出错:'), error);
      throw error;
    }
  }

  /**
   * 获取所有总结
   * @param filterKeywords 可选的关键词过滤
   * @param limit 可选的数量限制
   * @returns 格式化后的总结列表
   */
  public getSummaries(filterKeywords?: string[], limit?: number): string[] {
    let summaries = this.summaryHistory;
    
    // 应用关键词过滤
    if (filterKeywords && filterKeywords.length > 0) {
      summaries = summaries.filter(summary => {
        return filterKeywords.some(keyword => 
          summary.keywords.some(k => 
            k.toLowerCase().includes(keyword.toLowerCase())
          )
        );
      });
    }
    
    // 应用数量限制
    if (limit && limit > 0) {
      summaries = summaries.slice(-limit); // 获取最新的N条
    }
    
    // 格式化输出
    return summaries.map(summary => {
      const keywordString = summary.keywords.map(k => `#${k}`).join(' ');
      return `${summary.timestamp} ${keywordString} ${summary.content}`;
    });
  }

  /**
   * 获取总结统计信息
   * @returns 包含统计信息的对象
   */
  public getStats(): {
    total: number;
    latestTimestamp?: string;
    keywordCounts: Record<string, number>;
  } {
    const keywordCounts: Record<string, number> = {};
    
    // 统计关键词出现次数
    this.summaryHistory.forEach(summary => {
      summary.keywords.forEach(keyword => {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      });
    });
    
    // 获取最新总结的时间戳
    const latestTimestamp = this.summaryHistory.length > 0 
      ? this.summaryHistory[this.summaryHistory.length - 1].timestamp
      : undefined;
    
    return {
      total: this.summaryHistory.length,
      latestTimestamp,
      keywordCounts
    };
  }

  /**
   * 清空所有总结
   * @returns 被删除的总结数量
   */
  public clearSummaries(): number {
    const count = this.summaryHistory.length;
    this.summaryHistory = [];
    this.idCounter = 1;
    console.error(chalk.yellow(`🗑️  已清空 ${count} 条总结记录`));
    return count;
  }

  /**
   * 保存所有总结到文件
   * @param customPath 可选的自定义文件保存路径
   * @returns 包含文件路径和保存数量的对象
   */
  public async saveSummariesToFile(customPath?: string): Promise<{ 
    filePath: string; 
    savedCount: number;
    summaries: string[];
  }> {
    try {
      // 获取所有总结
      const summaries = this.getSummaries();
      if (summaries.length === 0) {
        throw new Error('没有总结可保存');
      }
      
      // 动态导入fs和path模块
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');


      // 确定文件保存路径
      const storagePath = customPath || process.env.SUMMARY_STORAGE_PATH || os.homedir();
      

      // 创建目录（如果不存在）
      if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
        console.error(chalk.blue(`📁 创建目录: ${storagePath}`));
      }
      
      // 生成文件名：当前时间戳YYYYMMDD.md
      const now = new Date();
      const timestamp = this.formatTimestamp(now);
      const fileName = `${timestamp}.md`;
      const filePath = path.join(storagePath, fileName);
      
      // 检查文件是否已存在
      const fileExists = fs.existsSync(filePath);
      
      if (!fileExists) {
        // 文件不存在：创建新文件并写入所有总结
        let fileContent = `=== 保存时间: ${this.formatLocalTime(now)} (北京时间) ===\n`;
        summaries.forEach(summary => {
          fileContent += `${summary}\n`;
        });
        
        fs.writeFileSync(filePath, fileContent, 'utf8');
        
        console.error(chalk.green('💾 总结已保存到新文件:'));
        console.error(chalk.cyan(`  文件路径: ${filePath}`));
        console.error(chalk.cyan(`  保存数量: ${summaries.length}`));
      } else {
        // 文件已存在：先添加时间记录，然后追加所有总结
        const timeRecord = `=== 保存时间: ${this.formatLocalTime(now)} (北京时间) ===\n`;
        fs.appendFileSync(filePath, timeRecord, 'utf8');
        
        summaries.forEach(summary => {
          fs.appendFileSync(filePath, `${summary}\n`, 'utf8');
        });
        
        console.error(chalk.green('💾 总结已追加到现有文件:'));
        console.error(chalk.cyan(`  文件路径: ${filePath}`));
        console.error(chalk.cyan(`  追加数量: ${summaries.length}`));
        console.error(chalk.cyan(`  时间记录: ${this.formatLocalTime(now)} (北京时间)`));
      }
      
      return {
        filePath,
        savedCount: summaries.length,
        summaries
      };
    } catch (error) {
      console.error(chalk.red('❌ 保存总结到文件时出错:'), error);
      throw error;
    }
  }
}

/**
 * 定义添加总结工具
 */
const ADD_SUMMARY_TOOL: Tool = {
  name: "add_summary",
  description: `添加对话总结到记录中。

当用户说"总结记录一下"时，使用此工具记录当前对话的有价值信息。
使用场景：
* 记录重要的用户要求
* 标记用户认可的有用信息
* 跟踪项目进展和决策

重点要求：
  总结内容需要清晰简练，遵循一句话说明白的原则。要聚焦在用户提出的内容上。
  关键词的选择要要宁缺毋滥（不要超过5个）。要突出特殊性独立性关联性，比如项目名称、关键技术、人名等，不要太笼统的名词。

参数说明：
♦ content: 需要总结的对话内容。例如：'用户需要创建一个MCP服务器来记录对话总结。'
♦ keywords: 可选的关键词列表，用于标记总结的主题。
`,
  inputSchema: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "需要总结的内容"
      },
      keywords: {
        type: "array",
        items: {
          type: "string"
        },
        description: "可选的关键词列表，用于标记总结的主题"
      }
    },
    required: ["content"]
  }
};

/**
 * 定义显示总结工具
 */
const SHOW_SUMMARIES_TOOL: Tool = {
  name: "show_summaries",
  description: `显示之前记录的总结。

当用户说"看一下之前的总结"时，使用此工具查看所有历史总结记录。

参数说明：
♦ filterKeywords: 可选的关键词过滤，只显示包含指定关键词的总结
♦ limit: 可选的数量限制，显示最新的N条总结

输出格式：
每行显示一条总结，格式为：
YYYYMMDD #关键词1 #关键词2 总结内容...

使用场景：
* 回顾之前的对话要点
* 查找特定主题的总结
* 查看最近的记录
* 了解总结统计信息`,
  inputSchema: {
    type: "object",
    properties: {
      filterKeywords: {
        type: "array",
        items: {
          type: "string"
        },
        description: "可选的关键词过滤，只显示包含指定关键词的总结"
      },
      limit: {
        type: "integer",
        description: "可选的数量限制，显示最新的N条总结",
        minimum: 1
      }
    }
  }
};

/**
 * 定义保存总结工具
 */
const SAVE_SUMMARIES_TOOL: Tool = {
  name: "save_summaries",
  description: `保存当前所有总结到文件。

当用户说"保存总结"时，使用此工具将当前内存中的所有总结记录保存到文件中。

保存方式：
1. 打开 当前时间戳YYYYMMDD.md 文件
2. 将当前的所有记录summaries数组内的内容，依序添加在文件后续
3. 只记录字符串，不用记录json格式
`,

  inputSchema: {
    type: "object",
    properties: {
      customPath: {
        type: "string",
        description: "可选的自定义文件保存路径，如果不提供则使用环境变量中的路径"
      }
    }
  }
};

/**
 * 创建 MCP 服务器实例
 */
const server = new Server(
  {
    name: "summary-always",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 创建总结服务器实例
const summaryServer = new SummaryServer();

/**
 * 设置处理列出工具请求的处理程序
 */
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [ADD_SUMMARY_TOOL, SHOW_SUMMARIES_TOOL, SAVE_SUMMARIES_TOOL],
}));

/**
 * 设置处理调用工具请求的处理程序
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (request.params.name === "add_summary") {
      const args = request.params.arguments as { content: string; keywords?: string[] };
      const result = summaryServer.addSummary(args.content, args.keywords);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            action: "add_summary",
            message: "总结已成功添加",
            id: result.id,
            formattedSummary: result.formattedSummary,
            stats: summaryServer.getStats()
          }, null, 2)
        }]
      };
    } 
    else if (request.params.name === "show_summaries") {
      const args = request.params.arguments as { filterKeywords?: string[]; limit?: number };
      const summaries = summaryServer.getSummaries(args.filterKeywords, args.limit);
      //const stats = summaryServer.getStats();
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            action: "show_summaries",
            total: summaries.length,
            summaries: summaries,
            //stats: stats,
            message: `找到 ${summaries.length} 条总结记录`
          }, null, 2)
        }]
      };
    }
    else if (request.params.name === "save_summaries") {
      const args = request.params.arguments as { customPath?: string };
      const result = await summaryServer.saveSummariesToFile(args.customPath);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            action: "save_summaries",
            message: "总结已成功保存到文件",
            filePath: result.filePath,
            savedCount: result.savedCount,
            summaries: result.summaries,
            //stats: summaryServer.getStats()
          }, null, 2)
        }]
      };
    }
    else {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: `未知工具: ${request.params.name}`,
            status: 'failed'
          }, null, 2)
        }],
        isError: true
      };
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          status: 'failed'
        }, null, 2)
      }],
      isError: true
    };
  }
});

/**
 * 启动服务器的主函数
 */
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  const os = await import('os');

  console.error(chalk.blue("📝 Summary-Always MCP Server 正在运行"));
  console.error(chalk.yellow("🔥 MCP SUMMARY-ALWAYS SERVER 已启动 🔥"));
  console.error(chalk.cyan("可用工具:"));
  console.error(chalk.cyan("  • add_summary - 添加对话总结"));
  console.error(chalk.cyan("  • show_summaries - 显示历史总结"));
  console.error(chalk.cyan("  • save_summaries - 保存总结到文件"));
  console.error(chalk.magenta("环境变量:"));
  console.error(chalk.magenta(`  • SUMMARY_STORAGE_PATH: ${process.env.SUMMARY_STORAGE_PATH || os.homedir()}`));
}

// 调用主函数启动服务器，并捕获任何错误
runServer().catch((error) => {
  console.error(chalk.red("服务器致命错误:"), error);
  process.exit(1);
});
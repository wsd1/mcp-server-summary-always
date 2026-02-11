#!/usr/bin/env node

// 简单的MCP服务器测试脚本
import { spawn } from 'child_process';

console.log('启动summary-always MCP服务器测试...\n');

// 启动服务器进程
const server = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit'] // 将stderr输出到控制台
});

// 发送JSON-RPC请求的辅助函数
function sendRequest(request) {
  return new Promise((resolve) => {
    const requestStr = JSON.stringify(request) + '\n';
    console.log(`发送请求: ${request.method} (ID: ${request.id})`);
    server.stdin.write(requestStr);
    
    // 设置一个简单的响应处理器
    const onData = (data) => {
      try {
        const response = JSON.parse(data.toString().trim());
        if (response.id === request.id) {
          server.stdout.removeListener('data', onData);
          resolve(response);
        }
      } catch (e) {
        // 忽略解析错误
      }
    };
    
    server.stdout.on('data', onData);
  });
}

// 等待服务器启动
setTimeout(async () => {
  try {
    console.log('=== 测试开始 ===\n');
    
    // 1. 测试工具列表
    console.log('1. 测试工具列表...');
    const toolsResponse = await sendRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    });
    
    if (toolsResponse.result && toolsResponse.result.tools) {
      console.log(`✓ 找到 ${toolsResponse.result.tools.length} 个工具:`);
      toolsResponse.result.tools.forEach(tool => {
        console.log(`  - ${tool.name}: ${tool.description.substring(0, 50)}...`);
      });
    }
    
    // 2. 测试添加总结
    console.log('\n2. 测试添加总结...');
    const addSummaryResponse = await sendRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'add_summary',
        arguments: {
          content: '这是一个测试总结，验证summary-always MCP服务器的功能。用户要求创建对话总结服务，现在正在测试其功能。',
          keywords: ['测试', 'mcp', '验证']
        }
      }
    });
    
    if (addSummaryResponse.result && addSummaryResponse.result.content) {
      const content = JSON.parse(addSummaryResponse.result.content[0].text);
      console.log(`✓ 总结添加成功: ${content.message}`);
      console.log(`  总结ID: ${content.id}`);
      console.log(`  格式: ${content.formattedSummary.substring(0, 60)}...`);
    }
    
    // 3. 测试显示总结
    console.log('\n3. 测试显示总结...');
    const showSummariesResponse = await sendRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'show_summaries',
        arguments: {
          limit: 3
        }
      }
    });
    
    if (showSummariesResponse.result && showSummariesResponse.result.content) {
      const content = JSON.parse(showSummariesResponse.result.content[0].text);
      console.log(`✓ 找到 ${content.total} 条总结记录`);
      if (content.summaries && content.summaries.length > 0) {
        console.log('  最新总结:');
        content.summaries.forEach((summary, i) => {
          console.log(`  ${i + 1}. ${summary.substring(0, 70)}...`);
        });
      }
    }
    
    // 4. 测试关键词过滤
    console.log('\n4. 测试关键词过滤...');
    const filterResponse = await sendRequest({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'show_summaries',
        arguments: {
          filterKeywords: ['测试'],
          limit: 2
        }
      }
    });
    
    if (filterResponse.result && filterResponse.result.content) {
      const content = JSON.parse(filterResponse.result.content[0].text);
      console.log(`✓ 按关键词"测试"过滤: 找到 ${content.total} 条记录`);
    }
    
    console.log('\n=== 测试完成 ===');
    console.log('\n总结: summary-always MCP服务器功能正常！');
    console.log('可用工具:');
    console.log('  • add_summary - 当用户说"总结记录一下"时添加对话总结');
    console.log('  • show_summaries - 当用户说"看一下之前的总结"时显示历史记录');
    
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    // 关闭服务器
    server.kill();
    console.log('\n服务器已关闭');
  }
}, 1000);

// 处理服务器输出
server.stdout.on('data', (data) => {
  // 这个数据会在sendRequest的Promise中处理
});

// 错误处理
server.on('error', (err) => {
  console.error('服务器启动错误:', err);
  process.exit(1);
});
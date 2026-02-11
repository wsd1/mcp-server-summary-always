#!/usr/bin/env node

// 测试summary-always MCP服务器的简单脚本
import { spawn } from 'child_process';

// 启动服务器
const server = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// 处理服务器输出
server.stderr.on('data', (data) => {
  console.error('Server stderr:', data.toString());
});

// 等待服务器启动
setTimeout(() => {
  console.log('=== 测试 summary-always MCP 服务器 ===\n');
  
  // 测试1: 列出可用工具
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list'
  };
  
  console.log('1. 发送工具列表请求...');
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  
  // 测试2: 添加总结
  setTimeout(() => {
    const addSummaryRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'add_summary',
        arguments: {
          content: '讨论了如何创建summary-always MCP服务器，用户确认了设计需求，包括内存存储、两个工具接口和纯文本格式。',
          keywords: ['mcp', 'ai', '对话总结']
        }
      }
    };
    
    console.log('\n2. 发送添加总结请求...');
    server.stdin.write(JSON.stringify(addSummaryRequest) + '\n');
    
    // 测试3: 显示总结
    setTimeout(() => {
      const showSummariesRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'show_summaries',
          arguments: {
            limit: 5
          }
        }
      };
      
      console.log('\n3. 发送显示总结请求...');
      server.stdin.write(JSON.stringify(showSummariesRequest) + '\n');
      
      // 测试4: 按关键词过滤
      setTimeout(() => {
        const filterRequest = {
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: {
            name: 'show_summaries',
            arguments: {
              filterKeywords: ['mcp'],
              limit: 3
            }
          }
        };
        
        console.log('\n4. 发送按关键词过滤请求...');
        server.stdin.write(JSON.stringify(filterRequest) + '\n');
        
        // 结束测试
        setTimeout(() => {
          console.log('\n=== 测试完成 ===');
          server.kill();
          process.exit(0);
        }, 1000);
      }, 500);
    }, 500);
  }, 500);
}, 1000);

// 处理服务器响应
server.stdout.on('data', (data) => {
  try {
    const response = JSON.parse(data.toString());
    console.log(`响应 ID ${response.id}:`);
    console.log(JSON.stringify(response, null, 2));
    console.log('---');
  } catch (e) {
    console.log('原始输出:', data.toString());
  }
});

// 错误处理
server.on('error', (err) => {
  console.error('服务器错误:', err);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`服务器退出，代码: ${code}`);
});
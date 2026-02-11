#!/usr/bin/env node

// 测试保存总结功能的简单脚本
import { spawn } from 'child_process';

console.log('测试summary-always MCP服务器保存功能...\n');

// 启动服务器进程
const server = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// 发送JSON-RPC请求的辅助函数
function sendRequest(request) {
  return new Promise((resolve) => {
    const requestStr = JSON.stringify(request) + '\n';
    console.log(`发送请求: ${request.method} (ID: ${request.id})`);
    server.stdin.write(requestStr);
    
    // 设置响应处理器
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
    console.log('=== 测试保存功能 ===\n');
    
    // 1. 先添加一个测试总结
    console.log('1. 添加测试总结...');
    const addResponse = await sendRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'add_summary',
        arguments: {
          content: '这是一个测试保存功能的总结。当用户说"保存总结"时，应该将内存中的所有总结保存到文件中。',
          keywords: ['测试', '保存', '文件']
        }
      }
    });
    
    if (addResponse.result && addResponse.result.content) {
      const content = JSON.parse(addResponse.result.content[0].text);
      console.log(`✓ 总结添加成功: ${content.message}`);
    }
    
    // 2. 显示总结确认
    console.log('\n2. 显示总结确认...');
    const showResponse = await sendRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'show_summaries',
        arguments: {}
      }
    });
    
    if (showResponse.result && showResponse.result.content) {
      const content = JSON.parse(showResponse.result.content[0].text);
      console.log(`✓ 当前有 ${content.total} 条总结记录`);
    }
    
    // 3. 保存总结到文件
    console.log('\n3. 保存总结到文件...');
    const saveResponse = await sendRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'save_summaries',
        arguments: {}
      }
    });
    
    if (saveResponse.result && saveResponse.result.content) {
      const content = JSON.parse(saveResponse.result.content[0].text);
      console.log(`✓ 保存成功: ${content.message}`);
      console.log(`  文件路径: ${content.filePath}`);
      console.log(`  保存数量: ${content.savedCount}`);
      
      // 检查文件是否真的创建了
      const fs = await import('fs');
      if (fs.existsSync(content.filePath)) {
        const fileContent = fs.readFileSync(content.filePath, 'utf8');
        console.log(`  文件大小: ${fileContent.length} 字节`);
        console.log(`  文件内容预览:\n${fileContent.substring(0, 200)}...`);
      } else {
        console.log('❌ 文件未创建');
      }
    } else if (saveResponse.error) {
      console.log(`❌ 保存失败: ${JSON.stringify(saveResponse.error)}`);
    }
    
    console.log('\n=== 测试完成 ===');
    
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    // 关闭服务器
    server.kill();
    console.log('\n服务器已关闭');
  }
}, 1000);

// 错误处理
server.on('error', (err) => {
  console.error('服务器启动错误:', err);
  process.exit(1);
});
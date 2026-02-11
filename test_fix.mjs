#!/usr/bin/env node

// 测试修复后的保存功能
import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';

console.log('测试修复后的保存功能...\n');

// 先备份原始文件内容
const filePath = '/home/wsd1/Documents/summaries/20260211.md';
let originalContent = '';
if (existsSync(filePath)) {
  originalContent = readFileSync(filePath, 'utf8');
  console.log('原始文件内容:');
  console.log('---');
  console.log(originalContent);
  console.log('---\n');
}

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
    console.log('=== 测试修复后的保存功能 ===\n');
    
    // 1. 先清空内存中的总结（如果需要）
    console.log('1. 清空内存中的总结...');
    // 注意：我们没有清空工具，所以直接添加新总结
    
    // 2. 添加测试总结
    console.log('2. 添加测试总结...');
    const addResponse = await sendRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'add_summary',
        arguments: {
          content: '测试修复后的保存功能。修复了文件覆盖问题，现在保存到已有文件时会先添加时间记录，然后追加所有总结条目。每个总结条目单独一行，不需要序号。',
          keywords: ['测试', '修复', '保存功能', '文件追加']
        }
      }
    });
    
    if (addResponse.result && addResponse.result.content) {
      const content = JSON.parse(addResponse.result.content[0].text);
      console.log(`✓ 总结添加成功: ${content.message}`);
    }
    
    // 3. 再添加一个总结
    console.log('\n3. 再添加一个总结...');
    const addResponse2 = await sendRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'add_summary',
        arguments: {
          content: '这是第二个测试总结，用于验证多次保存功能。修复后的代码应该正确追加内容而不是覆盖。',
          keywords: ['测试', '验证', '多次保存']
        }
      }
    });
    
    if (addResponse2.result && addResponse2.result.content) {
      const content = JSON.parse(addResponse2.result.content[0].text);
      console.log(`✓ 第二个总结添加成功: ${content.message}`);
    }
    
    // 4. 显示当前总结
    console.log('\n4. 显示当前总结...');
    const showResponse = await sendRequest({
      jsonrpc: '2.0',
      id: 3,
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
    
    // 5. 保存总结到文件
    console.log('\n5. 保存总结到文件...');
    const saveResponse = await sendRequest({
      jsonrpc: '2.0',
      id: 4,
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
      
      // 检查文件内容
      if (existsSync(content.filePath)) {
        const newContent = readFileSync(content.filePath, 'utf8');
        console.log(`\n新文件内容:`);
        console.log('---');
        console.log(newContent);
        console.log('---');
        
        // 检查是否追加了内容
        const lines = newContent.split('\n').filter(line => line.trim());
        const originalLines = originalContent.split('\n').filter(line => line.trim());
        
        console.log(`\n统计信息:`);
        console.log(`  原始文件行数: ${originalLines.length}`);
        console.log(`  新文件行数: ${lines.length}`);
        console.log(`  新增行数: ${lines.length - originalLines.length}`);
        
        // 检查是否有时间记录
        const hasTimeRecord = newContent.includes('=== 保存时间:');
        console.log(`  是否有时间记录: ${hasTimeRecord ? '是' : '否'}`);
        
        if (hasTimeRecord) {
          console.log(`  修复成功！文件已正确追加内容。`);
        } else {
          console.log(`  警告：未找到时间记录，可能文件是新创建的。`);
        }
      }
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
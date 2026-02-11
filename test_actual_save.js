#!/usr/bin/env node

// 测试实际的文件保存时间问题
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('测试实际的文件保存时间问题...\n');

// 启动服务器进程
const server = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    SUMMARY_STORAGE_PATH: '/tmp/test_summaries_' + Date.now() // 使用临时目录
  }
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
    console.log('=== 开始测试 ===\n');
    
    // 1. 添加一个测试总结
    console.log('1. 添加测试总结...');
    const addResponse = await sendRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'add_summary',
        arguments: {
          content: '测试时间问题：当前时间是晚上，但保存的文件名时间可能不对。',
          keywords: ['时间测试', 'bug']
        }
      }
    });
    
    if (addResponse.result && addResponse.result.content) {
      const content = JSON.parse(addResponse.result.content[0].text);
      console.log(`✓ 总结添加成功: ${content.message}`);
      console.log(`  总结ID: ${content.id}`);
      console.log(`  格式化总结: ${content.formattedSummary}`);
    }
    
    // 2. 保存总结到文件
    console.log('\n2. 保存总结到文件...');
    const saveResponse = await sendRequest({
      jsonrpc: '2.0',
      id: 2,
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
      
      // 检查文件
      if (fs.existsSync(content.filePath)) {
        const fileContent = fs.readFileSync(content.filePath, 'utf8');
        console.log(`\n3. 文件内容分析:`);
        console.log(`  文件大小: ${fileContent.length} 字节`);
        console.log(`  文件内容:\n${fileContent}`);
        
        // 分析文件名中的时间戳
        const fileName = path.basename(content.filePath);
        console.log(`\n4. 文件名分析:`);
        console.log(`  文件名: ${fileName}`);
        
        // 提取时间戳
        const match = fileName.match(/^(\d{8})\.md$/);
        if (match) {
          const fileTimestamp = match[1];
          console.log(`  文件时间戳: ${fileTimestamp}`);
          
          // 获取当前时间
          const now = new Date();
          const expectedTimestamp = formatTimestamp(now);
          console.log(`  当前时间戳: ${expectedTimestamp}`);
          console.log(`  是否匹配: ${fileTimestamp === expectedTimestamp ? '✓' : '✗'}`);
          
          if (fileTimestamp !== expectedTimestamp) {
            console.log(`\n⚠️  时间不匹配！`);
            console.log(`  文件时间戳: ${fileTimestamp}`);
            console.log(`  期望时间戳: ${expectedTimestamp}`);
            console.log(`  当前时间: ${now.toString()}`);
            console.log(`  当前时间 (ISO): ${now.toISOString()}`);
            console.log(`  当前时间 (本地): ${now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
            console.log(`  当前时间 (UTC): ${now.toUTCString()}`);
          }
        }
        
        // 检查文件中的时间记录
        const timeRecordMatch = fileContent.match(/=== 保存时间: (.+) ===/);
        if (timeRecordMatch) {
          console.log(`\n5. 文件中的保存时间记录:`);
          const saveTimeISO = timeRecordMatch[1];
          console.log(`  保存时间 (ISO): ${saveTimeISO}`);
          
          const saveTime = new Date(saveTimeISO);
          console.log(`  保存时间 (解析后): ${saveTime.toString()}`);
          console.log(`  保存时间 (本地): ${saveTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
          console.log(`  保存时间 (UTC): ${saveTime.toUTCString()}`);
          
          // 检查时区
          const now = new Date();
          const timeDiff = Math.abs(now.getTime() - saveTime.getTime());
          console.log(`  与当前时间差: ${timeDiff}ms (${timeDiff < 1000 ? '正常' : '异常'})`);
        }
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

// 格式化时间戳函数（与src/index.ts中相同）
function formatTimestamp(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// 错误处理
server.on('error', (err) => {
  console.error('服务器启动错误:', err);
  process.exit(1);
});
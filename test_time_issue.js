#!/usr/bin/env node

// 测试时间问题
console.log('当前系统时间:', new Date().toString());
console.log('当前系统时间 (ISO):', new Date().toISOString());
console.log('当前系统时间 (本地):', new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }));
console.log('当前系统时间 (UTC):', new Date().toUTCString());

// 测试 formatTimestamp 函数
function formatTimestamp(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

console.log('\n测试 formatTimestamp 函数:');
console.log('当前日期 (本地):', formatTimestamp(new Date()));
console.log('当前日期 (UTC):', formatTimestamp(new Date(Date.now())));

// 测试 getDate() 方法在不同时区下的表现
console.log('\n测试 getDate() 方法:');
const now = new Date();
console.log('new Date().getDate():', now.getDate());
console.log('new Date().getUTCDate():', now.getUTCDate());
console.log('new Date().getHours():', now.getHours());
console.log('new Date().getUTCHours():', now.getUTCHours());

// 测试时区偏移
console.log('\n时区信息:');
console.log('时区偏移 (分钟):', now.getTimezoneOffset());
console.log('时区偏移 (小时):', now.getTimezoneOffset() / 60);

// 模拟问题：如果现在是晚上21点，但 getDate() 返回的是UTC时间
console.log('\n模拟问题场景:');
const testDate = new Date('2026-02-11T21:30:00+08:00'); // 晚上21:30 北京时间
console.log('测试时间 (北京时间 21:30):', testDate.toString());
console.log('getDate():', testDate.getDate());
console.log('getUTCDate():', testDate.getUTCDate());
console.log('getHours():', testDate.getHours());
console.log('getUTCHours():', testDate.getUTCHours());

// 如果使用UTC时间，可能会得到13点的问题
const utcDate = new Date(testDate.toISOString());
console.log('\n转换为ISO再解析:');
console.log('ISO字符串:', testDate.toISOString());
console.log('从ISO解析的日期:', utcDate.toString());
console.log('getDate():', utcDate.getDate());
console.log('getHours():', utcDate.getHours());
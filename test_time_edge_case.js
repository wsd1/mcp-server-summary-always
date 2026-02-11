#!/usr/bin/env node

// 测试时间边界情况：当UTC时间是13点（北京时间21点）时
console.log('测试时间边界情况：UTC 13点 vs 北京时间 21点\n');

// 模拟不同时间场景
const testCases = [
  {
    name: '场景1: 北京时间21:30 (UTC 13:30)',
    localTime: '2026-02-11T21:30:00+08:00',
    description: '晚上9点半，UTC时间是下午1点半'
  },
  {
    name: '场景2: 北京时间00:30 (前一天的UTC 16:30)',
    localTime: '2026-02-12T00:30:00+08:00',
    description: '凌晨12点半，UTC时间是前一天的下午4点半'
  },
  {
    name: '场景3: 北京时间23:59 (UTC 15:59)',
    localTime: '2026-02-11T23:59:59+08:00',
    description: '晚上11点59分，UTC时间是下午3点59分'
  },
  {
    name: '场景4: 北京时间00:01 (前一天的UTC 16:01)',
    localTime: '2026-02-12T00:01:00+08:00',
    description: '凌晨12点01分，UTC时间是前一天的下午4点01分'
  }
];

// 与src/index.ts中相同的formatTimestamp函数
function formatTimestamp(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// 测试每个场景
testCases.forEach((testCase, index) => {
  console.log(`\n=== ${testCase.name} ===`);
  console.log(`描述: ${testCase.description}`);
  
  const localDate = new Date(testCase.localTime);
  console.log(`本地时间字符串: ${testCase.localTime}`);
  console.log(`解析后的本地时间: ${localDate.toString()}`);
  console.log(`本地时间 (ISO): ${localDate.toISOString()}`);
  console.log(`本地时间 (UTC): ${localDate.toUTCString()}`);
  
  console.log(`\n关键时间信息:`);
  console.log(`  getDate(): ${localDate.getDate()} (本地日期)`);
  console.log(`  getUTCDate(): ${localDate.getUTCDate()} (UTC日期)`);
  console.log(`  getHours(): ${localDate.getHours()} (本地小时)`);
  console.log(`  getUTCHours(): ${localDate.getUTCHours()} (UTC小时)`);
  
  console.log(`\nformatTimestamp 结果:`);
  console.log(`  使用本地时间: ${formatTimestamp(localDate)}`);
  
  // 问题：如果代码错误地使用了UTC时间
  const utcDate = new Date(localDate.toISOString());
  console.log(`  如果错误使用ISO字符串重新解析: ${formatTimestamp(utcDate)}`);
  
  // 检查日期是否不同
  if (localDate.getDate() !== localDate.getUTCDate()) {
    console.log(`\n⚠️  警告：本地日期和UTC日期不同！`);
    console.log(`  这可能导致文件名使用错误的日期`);
    console.log(`  本地日期: ${localDate.getDate()}`);
    console.log(`  UTC日期: ${localDate.getUTCDate()}`);
    
    // 模拟问题：如果代码在某个地方错误地使用了UTC日期
    const problemDate = new Date(localDate.getTime());
    problemDate.setUTCHours(localDate.getUTCHours());
    console.log(`  如果错误地使用UTC组件: ${formatTimestamp(problemDate)}`);
  }
  
  // 检查是否在UTC 13点左右
  if (localDate.getUTCHours() >= 12 && localDate.getUTCHours() <= 14) {
    console.log(`\n🔍 注意：UTC时间在13点左右 (${localDate.getUTCHours()}点)`);
    console.log(`  这可能是用户看到"13点左右"问题的原因`);
    console.log(`  对应的本地时间是: ${localDate.getHours()}点`);
  }
});

// 分析src/index.ts中的潜在问题
console.log('\n\n=== 代码分析 ===');
console.log('在 src/index.ts 中，formatTimestamp 函数使用 getDate():');
console.log('  const day = String(date.getDate()).padStart(2, \'0\');');
console.log('');
console.log('潜在问题:');
console.log('1. getDate() 返回本地时间的日期');
console.log('2. 如果服务器运行在UTC时区，new Date() 创建的是UTC时间');
console.log('3. 但在中国时区，getDate() 应该返回正确的本地日期');
console.log('');
console.log('可能的问题场景:');
console.log('- 服务器环境变量 TZ 设置为 UTC');
console.log('- 代码在某个地方错误地使用了 UTC 时间');
console.log('- 时间序列化/反序列化问题');

// 测试当前环境
console.log('\n=== 当前环境测试 ===');
console.log(`当前时间: ${new Date().toString()}`);
console.log(`process.env.TZ: ${process.env.TZ || '(未设置)'}`);
console.log(`时区偏移: ${new Date().getTimezoneOffset()} 分钟`);

// 测试如果TZ环境变量设置为UTC会怎样
console.log('\n=== 模拟TZ=UTC环境 ===');
const originalDate = new Date();
const utcEnvDate = new Date(originalDate.toUTCString());
console.log(`原始时间: ${originalDate.toString()}`);
console.log(`模拟UTC环境时间: ${utcEnvDate.toString()}`);
console.log(`原始getDate(): ${originalDate.getDate()}`);
console.log(`模拟UTC环境getDate(): ${utcEnvDate.getDate()}`);
console.log(`formatTimestamp(原始): ${formatTimestamp(originalDate)}`);
console.log(`formatTimestamp(模拟UTC): ${formatTimestamp(utcEnvDate)}`);
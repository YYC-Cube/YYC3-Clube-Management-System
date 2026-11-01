#!/usr/bin/env node
/**
 * @file 重置并重新加载应用脚本
 * @description 用于清除localStorage数据并重启应用，确保新的商品数据能被正确加载
 * @author YYC
 */

const { execFile, execSync } = require('child_process');

console.log('🎯 开始重置应用数据...');

// 创建一个临时HTML文件来清除localStorage
const tempHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>重置数据</title>
</head>
<body>
  <script>
    // 清除所有与数据库相关的localStorage项
    localStorage.removeItem('db_products');
    localStorage.removeItem('db_categories');
    localStorage.removeItem('db_members');
    
    console.log('✅ 已清除localStorage中的商品数据');
    window.close();
  </script>
</body>
</html>
`;

// 保存临时HTML文件
const fs = require('fs');
const path = require('path');
const tempHtmlPath = path.join(__dirname, 'temp-reset.html');
fs.writeFileSync(tempHtmlPath, tempHtml);

// 尝试使用默认浏览器打开临时HTML文件来清除localStorage
console.log('🔄 正在清除localStorage数据...');
try {
  // 根据操作系统打开浏览器（固定命令 + 参数数组，不经 shell 拼接）
  const onOpen = (error) => {
    if (error) {
      console.error('❌ 打开浏览器失败:', error.message);
    }
  };
  switch (process.platform) {
    case 'win32':
      execFile('cmd', ['/c', 'start', '', tempHtmlPath], onOpen);
      break;
    case 'darwin':
      execFile('open', [tempHtmlPath], onOpen);
      break;
    default:
      execFile('xdg-open', [tempHtmlPath], onOpen);
  }
  
  // 给浏览器一些时间来执行脚本
  setTimeout(() => {
    // 重启开发服务器
    console.log('🚀 正在重启开发服务器...');
    
    // 先停止现有的开发服务器
    try {
      execSync('pkill -f "npm run dev"');
    } catch (e) {
      // 如果没有找到进程，继续执行
      console.log('未找到正在运行的开发服务器进程');
    }
    
    // 删除临时文件
    fs.unlinkSync(tempHtmlPath);
    
    // 重新启动开发服务器
    console.log('✅ 重置完成，请手动重新启动开发服务器: npm run dev -- -p 3555');
    
  }, 2000);
} catch (error) {
  console.error('❌ 重置过程中出错:', error.message);
  
  // 清理临时文件
  try {
    fs.unlinkSync(tempHtmlPath);
  } catch (e) {}
  
  console.log('\n🔧 请尝试手动清除浏览器的localStorage:');
  console.log('  1. 打开应用页面');
  console.log('  2. 按 F12 打开开发者工具');
  console.log('  3. 点击 Application/应用 选项卡');
  console.log('  4. 在 Storage/存储 部分找到 localStorage');
  console.log('  5. 选中并删除 db_products, db_categories, db_members 项');
  console.log('  6. 刷新页面');
}

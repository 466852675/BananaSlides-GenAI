// 修复脚本：移除所有灰色遮罩背景
// 用法：在浏览器 Console 中粘贴运行

(function removeGrayOverlays() {
  // 定义要移除的遮罩模式
  const overlayPatterns = [
    'bg-black/90',
    'bg-black/60', 
    'bg-black/50',
    'bg-black/40',
    'bg-black/20',
    'bg-gray-900',
    'backdrop-blur-sm',
    'backdrop-blur-md'
  ];
  
  // 查找所有固定定位的全屏元素
  const allElements = document.querySelectorAll('*');
  let removedCount = 0;
  
  allElements.forEach(el => {
    const style = window.getComputedStyle(el);
    const className = el.className || '';
    
    // 检查是否是固定定位的全屏遮罩
    const isFixed = style.position === 'fixed';
    const isFullScreen = el.offsetWidth >= window.innerWidth * 0.8 && 
                         el.offsetHeight >= window.innerHeight * 0.8;
    
    // 检查是否包含遮罩样式
    const hasOverlayStyle = overlayPatterns.some(pattern => 
      className.includes(pattern)
    );
    
    const hasDarkBg = style.backgroundColor.includes('rgba(0, 0, 0') ||
                      style.backgroundColor.includes('rgb(0, 0, 0');
    
    if (isFixed && isFullScreen && (hasOverlayStyle || hasDarkBg)) {
      console.log('🗑️ 移除遮罩:', el.tagName, el.className?.substring(0, 50));
      
      // 移除遮罩样式
      el.style.backgroundColor = 'transparent';
      el.style.backdropFilter = 'none';
      el.style.background = 'none';
      
      // 如果这是一个 Modal 遮罩，可以选择移除整个元素
      if (el.children.length === 0 || el.innerHTML.length < 100) {
        el.remove();
        removedCount++;
      }
    }
  });
  
  console.log(`✅ 处理完成！移除了 ${removedCount} 个遮罩元素`);
  
  // 移除 backdrop-filter 样式
  document.querySelectorAll('*').forEach(el => {
    if (window.getComputedStyle(el).backdropFilter !== 'none') {
      el.style.backdropFilter = 'none';
    }
  });
  
  console.log('✅ 所有 backdrop-filter 效果已移除');
})();

// 使用说明：
// 1. 复制上面的代码
// 2. 在浏览器中按 F12 打开开发者工具
// 3. 切换到 Console 标签
// 4. 粘贴代码并按回车执行
// 5. 所有灰色遮罩将被移除

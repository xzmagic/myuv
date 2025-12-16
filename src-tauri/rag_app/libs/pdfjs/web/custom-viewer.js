/**
 * PDF.js 查看器，支持 JWT Token 认证和返回按钮功能
 */

(function() {
  'use strict';
  
  // PDF.js 返回按钮初始化
  console.log('🔧 PDF.js: 开始初始化返回按钮');
  
  // 多次尝试初始化，确保按钮被找到
  let initAttempts = 0;
  const maxAttempts = 10;
  
  function tryInitBackButton() {
    initAttempts++;
    
    const backButton = document.getElementById('backButton');
    
    if (backButton) {
      console.log('✅ PDF.js: 返回按钮初始化成功');
      
      // 绑定点击事件
      backButton.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        
        console.log('🔙 PDF.js: 返回按钮被点击');
        
        // 检查是否在iframe中
        const isInIframe = window.self !== window.top;
        
        if (isInIframe) {
          // 在iframe中，发送消息给父窗口
          console.log('📤 PDF.js: 发送返回消息给父窗口');
          
          const message = {
            action: 'goBack',
            source: 'pdf-viewer',
            timestamp: Date.now()
          };
          
          try {
            window.parent.postMessage(message, '*');
            console.log('✅ PDF.js: 返回消息已发送');
          } catch (error) {
            console.error('❌ PDF.js: 发送消息失败:', error);
            // 降级处理：直接返回
            window.history.back();
          }
        } else {
          // 不在iframe中，直接返回
          console.log('🔙 PDF.js: 直接执行浏览器返回');
          try {
            window.history.back();
          } catch (error) {
            console.error('❌ PDF.js: 返回失败:', error);
            window.location.href = '/search';
          }
        }
      });
      
      return;
    }
    
    if (initAttempts < maxAttempts) {
      setTimeout(tryInitBackButton, 500);
    } else {
      console.warn('⚠️ PDF.js: 未能找到返回按钮');
    }
  }
  
  // 立即开始第一次尝试
  setTimeout(tryInitBackButton, 100);

  // 创建带认证的fetch拦截器
  function setupAuthenticatedFetch(token) {
    if (!token) return;

    const originalFetch = window.fetch;

    window.fetch = function(url, options = {}) {
      console.log('🌐 PDF.js: fetch拦截:', url);

      // 如果是PDF文件请求，添加认证信息
      if (typeof url === 'string' && (url.includes('/download') || url.includes('.pdf'))) {
        // 添加Authorization头
        options.headers = options.headers || {};
        options.headers['Authorization'] = `Bearer ${token}`;

        console.log('🔐 PDF.js: 添加认证头到请求:', url);
      }

      return originalFetch(url, options).then(response => {
        if (!response.ok && response.status === 403) {
          console.error('❌ PDF.js: 认证失败 (403):', url);
        }
        return response;
      });
    };
  }

  // 从URL参数中获取token
  function getTokenFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('token');
  }

  // 转换PDF URL以支持认证
  function transformPdfUrl(originalUrl, token) {
    if (!originalUrl) return '';

    console.log('🔄 PDF.js: 开始转换URL:', originalUrl);

    try {
      // 如果URL已经是完整的下载URL，直接返回
      if (originalUrl.includes('/download?url=')) {
        console.log('✅ PDF.js: URL已经是下载格式，直接使用');
        return originalUrl;
      }

      // 如果是相对路径，构建完整的下载URL
      let fileUrl = originalUrl;

      // 确保使用正确的API基础URL
      const apiBaseUrl = window.location.origin;

      // 构建下载URL
      const downloadUrl = `${apiBaseUrl}/download?url=${encodeURIComponent(fileUrl)}`;

      // 如果有token，添加到URL参数中
      if (token) {
        return `${downloadUrl}&token=${encodeURIComponent(token)}`;
      }

      console.log('✅ PDF.js: URL转换完成:', downloadUrl);
      return downloadUrl;
    } catch (error) {
      console.error('❌ PDF.js: URL转换失败:', error);
      return originalUrl;
    }
  }

  // 页面加载完成后初始化
  document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 PDF.js: 页面DOM加载完成');

    // 获取URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const fileUrl = urlParams.get('file');
    const token = urlParams.get('token');

    console.log('📄 PDF.js: 文件URL:', fileUrl);
    console.log('🔑 PDF.js: Token存在:', !!token);

    if (fileUrl) {
      console.log('📂 PDF.js: 开始加载PDF文件');

      // 转换文件URL以支持认证
      const transformedUrl = transformPdfUrl(fileUrl, token);
      console.log('🔄 PDF.js: 转换后的URL:', transformedUrl);

      // 使用新的API格式加载文档
      if (window.PDFViewerApplication && window.PDFViewerApplication.open) {
        window.PDFViewerApplication.open({
          url: transformedUrl || fileUrl
        });
      }
    }

    // 设置Token到localStorage（如果存在）
    if (token) {
      localStorage.setItem('token', token);
      console.log('🔑 PDF.js: Token已保存到localStorage');

      // 设置认证拦截器
      setupAuthenticatedFetch(token);
      console.log('🔐 PDF.js: 认证拦截器已设置');
    }
  });

  // 错误处理
  window.addEventListener('error', function(event) {
    if (event.message && event.message.includes('401')) {
      console.error('🚨 PDF.js: 认证失败，Token可能已过期');
    }
  });

})();

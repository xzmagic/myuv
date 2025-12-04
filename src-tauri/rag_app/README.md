# RAG 单页应用

入口文件：`src-tauri/rag_app/index.html`  
旧路径 `service_a/static/rag_app.html` 已设置自动跳转到本目录，方便保留兼容。

## 启动后端
- 确保 `app.py` 运行，默认监听 `http://localhost:18888`。
- 如果后端不在本机，可在地址栏后添加 `?api_base=http://your-host:port`，或在加载前设置 `window.API_BASE_OVERRIDE`。

## 本地打开 / 封装为桌面应用
- 直接用浏览器打开 `index.html`（file://），会默认连 `http://localhost:18888`。
- 使用 Tauri/Electron 等包装时，将窗口指向 `src-tauri/rag_app/index.html`，必要时传入 `api_base` 覆盖后端地址。

## 使用流程
1) 页面加载后自动管理员登录（或点击“管理员登录”按钮）。  
2) 上传文档。  
3) 在“知识库构建”里选择文档并汇编。  
4) 在“智能问答”进行提问。

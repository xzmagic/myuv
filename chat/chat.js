/**
 * 阿呜智慧 AI助手 - 优化版聊天界面
 * 重构和优化的JavaScript代码
 */

// ==================== 配置和常量 ====================
const CONFIG = {
    model: "hngpt-mini",
    hostname: window.location.origin,
    systemPrompt: "你是一个AI助手,Your name is hngpt，一个由hngpt科技开发和维护的AI助手",
    authToken: "startfrom2023",
    textBoxBaseHeight: 40,
    maxInputLength: 4000,
    updateThrottleMs: 100
};

const ICONS = {
    clipboard: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M1.1665 2.91663C1.1665 1.95013 1.95001 1.16663 2.9165 1.16663H7.58317C8.54967 1.16663 9.33317 1.95013 9.33317 2.91663V3.49996C9.33317 3.82213 9.072 4.08329 8.74984 4.08329C8.42767 4.08329 8.1665 3.82213 8.1665 3.49996V2.91663C8.1665 2.59446 7.90534 2.33329 7.58317 2.33329H2.9165C2.59434 2.33329 2.33317 2.59446 2.33317 2.91663V7.58329C2.33317 7.90546 2.59434 8.16663 2.9165 8.16663H3.49984C3.822 8.16663 4.08317 8.42779 4.08317 8.74996C4.08317 9.07213 3.822 9.33329 3.49984 9.33329H2.9165C1.95001 9.33329 1.1665 8.54979 1.1665 7.58329V2.91663ZM4.6665 6.41663C4.6665 5.45013 5.45001 4.66663 6.4165 4.66663H11.0832C12.0497 4.66663 12.8332 5.45013 12.8332 6.41663V11.0833C12.8332 12.0498 12.0497 12.8333 11.0832 12.8333H6.4165C5.45001 12.8333 4.6665 12.0498 4.6665 11.0833V6.41663ZM6.4165 5.83329C6.09434 5.83329 5.83317 6.09446 5.83317 6.41663V11.0833C5.83317 11.4055 6.09434 11.6666 6.4165 11.6666H11.0832C11.4053 11.6666 11.6665 11.4055 11.6665 11.0833V6.41663C11.6665 6.09446 11.4053 5.83329 11.0832 5.83329H6.4165Z" fill="currentColor"></path></svg>`,
    regenerate: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8.433.88a.6.6 0 0 1 .846.058L11.2 3.145a.598.598 0 0 1-.102.892L8.86 5.67a.6.6 0 1 1-.707-.969l1.17-.854A6 6 0 0 0 8 3.7a5.18 5.18 0 0 0-5.18 5.18 5.18 5.18 0 1 0 10.36.007.6.6 0 1 1 1.2 0A6.38 6.38 0 1 1 1.62 8.88 6.38 6.38 0 0 1 8 2.5q.59.002 1.124.089l-.75-.862A.6.6 0 0 1 8.433.88" fill="currentColor"></path></svg>`
};

// ==================== 状态管理 ====================
class ChatState {
    constructor() {
        this.authToken = localStorage.getItem('auth_token') || CONFIG.authToken;
        this.isAutoScrollOn = true;
        this.currentAbortController = null;
        this.isProcessing = false;
        this.elements = {};
        
        // 确保认证令牌存在
        if (!localStorage.getItem('auth_token')) {
            localStorage.setItem('auth_token', this.authToken);
        }
    }

    setAuthToken(token) {
        if (!token) {
            console.error('Attempting to set empty token');
            return;
        }
        this.authToken = token;
        localStorage.setItem('auth_token', token);
    }

    cacheElements() {
        this.elements = {
            userInput: document.getElementById('user-input'),
            sendButton: document.getElementById('send-button'),
            chatHistory: document.getElementById('chat-history'),
            chatContainer: document.getElementById('chat-container'),
            scrollWrapper: document.getElementById('scroll-wrapper'),
            inputArea: document.getElementById('input-area'),
            systemPrompt: document.getElementById('system-prompt'),
            hostAddress: document.getElementById('host-address'),
            loadingOverlay: document.getElementById('loading-overlay')
        };
    }
}

// ==================== 工具函数 ====================
const Utils = {
    throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function() {
            const context = this;
            const args = arguments;
            if (!lastRan) {
                func.apply(context, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(function() {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    sanitizeInput(input) {
        return input.trim().substring(0, CONFIG.maxInputLength);
    },

    generateMessageId() {
        return 'message-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    },

    showLoading(show = true) {
        const overlay = chatState.elements.loadingOverlay;
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    },

    showError(message, title = '错误') {
        // 使用更好的错误显示方式
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger alert-dismissible fade show';
        errorDiv.innerHTML = `
            <strong>${title}:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('.container');
        if (container) {
            container.insertBefore(errorDiv, container.firstChild);
            
            // 自动移除错误消息
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.remove();
                }
            }, 5000);
        }
    }
};

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function transformReasoningBlocks(text) {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/<think>([\s\S]*?)<\/think>/g, (match, content) => {
        const cleaned = content.trim();
        const escaped = escapeHtml(cleaned);
        return `\n\n<details class="reasoning-block"><summary>思考过程</summary><pre class="reasoning-content">${escaped}</pre></details>\n\n`;
    });
}

// ==================== API 通信 ====================
class APIClient {
    constructor(state) {
        this.state = state;
    }

    async makeRequest(data, signal) {
        const url = `${CONFIG.hostname}/v1/chat/completions`;

        if (!this.state.authToken) {
            throw new Error('认证令牌缺失');
        }

        // 如果是流式请求，使用SSE方式
        if (data.stream) {
            return this.makeSSERequest(data, signal);
        }

        // 非流式请求使用普通fetch
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.state.authToken}`
            },
            body: JSON.stringify(data),
            signal: signal
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
    }

    async makeSSERequest(data, signal) {
        // 对于流式请求，我们需要使用fetch但正确处理SSE格式
        const url = `${CONFIG.hostname}/v1/chat/completions`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.state.authToken}`,
                'Accept': 'text/event-stream',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify(data),
            signal: signal
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
    }

    async *streamResponse(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    // 处理最后的缓冲区内容
                    if (buffer.trim()) {
                        const lines = buffer.split('\n');
                        for (const line of lines) {
                            if (line.trim()) {
                                const parsed = this.parseSSELine(line.trim());
                                if (parsed) yield parsed;
                            }
                        }
                    }
                    break;
                }

                // 解码新的数据块
                const textChunk = decoder.decode(value, { stream: true });
                buffer += textChunk;

                // 按双换行符分割SSE事件
                const events = buffer.split('\n\n');
                buffer = events.pop(); // 保留最后一个可能不完整的事件

                for (const event of events) {
                    if (event.trim()) {
                        // 处理每个SSE事件（可能包含多行）
                        const lines = event.split('\n');
                        for (const line of lines) {
                            if (line.trim()) {
                                const parsed = this.parseSSELine(line.trim());
                                if (parsed) {
                                    yield parsed;
                                    if (parsed.done) return; // 提前结束
                                }
                            }
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    parseSSELine(line) {
        // 跳过空行和注释
        if (!line || line.startsWith(':')) return null;

        // 处理SSE数据行
        if (!line.startsWith('data: ')) {
            console.debug('Non-data SSE line:', line);
            return null;
        }

        const jsonStr = line.slice(6).trim();

        // 处理结束标记
        if (jsonStr === '[DONE]') {
            console.debug('SSE stream ended');
            return { done: true };
        }

        try {
            const parsed = JSON.parse(jsonStr);
            console.debug('Parsed SSE data:', parsed);

            // 处理OpenAI格式的流式响应
            if (parsed.choices && parsed.choices[0]) {
                const choice = parsed.choices[0];
                if (choice.delta) {
                    return {
                        content: choice.delta.content || '',
                        done: choice.finish_reason !== null,
                        raw: parsed // 保留原始数据用于调试
                    };
                }
            }

            // 处理错误响应
            if (parsed.error) {
                console.error('SSE error:', parsed.error);
                throw new Error(parsed.error);
            }

            // 其他格式的响应
            console.warn('Unknown SSE format:', parsed);
            return parsed;

        } catch (e) {
            console.error('Failed to parse SSE JSON:', jsonStr, e);
            return null;
        }
    }
}

// ==================== 全局状态和客户端 ====================
const chatState = new ChatState();
const apiClient = new APIClient(chatState);

// ==================== 初始化 ====================
function initializeApp() {
    Utils.showLoading(true);
    
    try {
        chatState.cacheElements();
        setupEventListeners();
        setupMarked();
        initializeConfig();
        adjustPadding();
        autoFocusInput();
        startNewChat();
        
        // 从URL参数获取token
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        if (token) {
            chatState.setAuthToken(token);
        }
        
        Utils.showLoading(false);
        console.log('应用初始化完成');
    } catch (error) {
        console.error('应用初始化失败:', error);
        Utils.showError('应用初始化失败，请刷新页面重试');
        Utils.showLoading(false);
    }
}

function initializeConfig() {
    const { hostAddress, systemPrompt } = chatState.elements;
    
    // 设置默认配置
    localStorage.setItem("host-address", CONFIG.hostname);
    localStorage.setItem("system-prompt", CONFIG.systemPrompt);
    localStorage.setItem("model", CONFIG.model);
    
    if (hostAddress) hostAddress.value = CONFIG.hostname;
    if (systemPrompt) systemPrompt.value = CONFIG.systemPrompt;
}

function setupMarked() {
    if (typeof marked !== 'undefined') {
        marked.use({
            renderer: {
                code(code, infostring) {
                    let lang = infostring || 'javascript';

                    // 简单的语言映射
                    const langMap = {
                        'js': 'javascript',
                        'py': 'python',
                        'sh': 'bash'
                    };

                    lang = langMap[lang] || lang;

                    // 检查Prism是否支持该语言
                    if (typeof Prism !== 'undefined' && !Prism.languages[lang]) {
                        lang = 'javascript';
                    }

                    // 简单的HTML转义
                    const escapedCode = code
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');

                    return `<pre><code class="language-${lang}">${escapedCode}</code></pre>`;
                }
            },
            breaks: true,
            gfm: true
        });
    }
}

// ==================== 事件监听器设置 ====================
function setupEventListeners() {
    const { userInput, sendButton, chatHistory } = chatState.elements;
    
    // 发送按钮点击
    if (sendButton) {
        sendButton.addEventListener('click', handleSendMessage);
    }
    
    // 输入框键盘事件
    if (userInput) {
        userInput.addEventListener('keydown', handleInputKeydown);
        userInput.addEventListener('input', Utils.debounce(handleInputChange, 100));
    }
    
    // 聊天历史点击事件（事件委托）
    if (chatHistory) {
        chatHistory.addEventListener('click', handleChatHistoryClick);
    }
    
    // 滚动事件
    setupScrollListeners();
    
    // 窗口大小变化
    window.addEventListener('resize', Utils.debounce(adjustPadding, 250));
    
    // 页面可见性变化
    document.addEventListener('visibilitychange', handleVisibilityChange);
}

// ==================== 事件处理函数 ====================
function handleSendMessage(e) {
    e.preventDefault();
    if (!chatState.isProcessing) {
        submitRequest();
    }
}

function handleInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!chatState.isProcessing) {
            submitRequest();
        }
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!chatState.isProcessing) {
            submitRequest();
        }
    }
}

function handleInputChange(e) {
    autoGrow(e.target);
    updateSendButtonState();
}

function handleChatHistoryClick(e) {
    const regenerateButton = e.target.closest('.regenerate-button');
    const copyButton = e.target.closest('.copy-button');

    if (regenerateButton) {
        const messageId = regenerateButton.getAttribute('data-message-id');
        if (messageId && !chatState.isProcessing) {
            regenerateResponse(messageId);
        }
    } else if (copyButton) {
        const messageElement = copyButton.closest('.message');
        if (messageElement) {
            const responseDiv = messageElement.querySelector('.message-response');
            if (responseDiv) {
                const textContent = responseDiv.textContent || responseDiv.innerText;
                copyToClipboard(textContent);
            }
        }
    }
}

function handleVisibilityChange() {
    if (document.hidden && chatState.currentAbortController) {
        // 页面隐藏时暂停请求
        console.log('页面隐藏，暂停请求');
    }
}

// ==================== 滚动管理 ====================
function setupScrollListeners() {
    const { scrollWrapper } = chatState.elements;

    // 自动滚动观察器
    const autoScroller = new ResizeObserver(() => {
        if (chatState.isAutoScrollOn) {
            scrollToBottom();
        }
    });

    if (scrollWrapper) {
        autoScroller.observe(scrollWrapper);
    }

    // 滚动事件监听
    let lastKnownScrollPosition = 0;
    let ticking = false;

    document.addEventListener("scroll", (event) => {
        if (!ticking && chatState.isAutoScrollOn && window.scrollY < lastKnownScrollPosition) {
            window.requestAnimationFrame(() => {
                chatState.isAutoScrollOn = false;
                ticking = false;
            });
            ticking = true;
        } else if (!ticking && !chatState.isAutoScrollOn &&
            window.scrollY > lastKnownScrollPosition &&
            window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 30) {
            window.requestAnimationFrame(() => {
                chatState.isAutoScrollOn = true;
                ticking = false;
            });
            ticking = true;
        }
        lastKnownScrollPosition = window.scrollY;
    });
}

function scrollToBottom() {
    const { scrollWrapper } = chatState.elements;
    if (scrollWrapper) {
        scrollWrapper.scrollIntoView({ behavior: "smooth", block: "end" });
    }
}

// ==================== UI 辅助函数 ====================
function adjustPadding() {
    const { inputArea, scrollWrapper } = chatState.elements;
    if (inputArea && scrollWrapper) {
        const inputBoxHeight = inputArea.offsetHeight;
        scrollWrapper.style.paddingBottom = `${inputBoxHeight + 15}px`;
    }
}

function autoFocusInput() {
    const { userInput } = chatState.elements;
    if (userInput) {
        userInput.focus();
    }
}

function autoGrow(element) {
    if (!element) return;

    const maxHeight = 200;
    const numberOfLines = element.value.split('\n').length;

    element.style.height = "auto";
    let newHeight = element.scrollHeight;

    if (numberOfLines === 1) {
        newHeight = CONFIG.textBoxBaseHeight;
    } else if (newHeight > maxHeight) {
        newHeight = maxHeight;
    }

    element.style.height = newHeight + "px";
}

function updateSendButtonState() {
    const { userInput, sendButton } = chatState.elements;
    if (userInput && sendButton) {
        const hasContent = userInput.value.trim().length > 0;
        sendButton.disabled = chatState.isProcessing || !hasContent;
    }
}

function setSendButtonLoading(loading) {
    const { sendButton } = chatState.elements;
    if (sendButton) {
        const textSpan = sendButton.querySelector('.send-text');
        const iconSpan = sendButton.querySelector('.send-icon');

        if (loading) {
            if (textSpan) textSpan.classList.add('d-none');
            if (iconSpan) iconSpan.classList.remove('d-none');
            sendButton.disabled = true;
        } else {
            if (textSpan) textSpan.classList.remove('d-none');
            if (iconSpan) iconSpan.classList.add('d-none');
            updateSendButtonState();
        }
    }
}

// ==================== 剪贴板功能 ====================
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('已复制到剪贴板');
    } catch (err) {
        console.error('复制失败:', err);
        // 降级方案
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('已复制到剪贴板');
        } catch (e) {
            showToast('复制失败', 'error');
        }
        document.body.removeChild(textArea);
    }
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : 'success'} border-0`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;

    // 添加到页面
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }

    toastContainer.appendChild(toast);

    // 显示toast
    if (typeof bootstrap !== 'undefined') {
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    } else {
        toast.style.display = 'block';
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// ==================== 消息处理 ====================
async function submitRequest() {
    const { userInput, chatContainer, chatHistory } = chatState.elements;

    if (!userInput || chatState.isProcessing) return;

    const input = Utils.sanitizeInput(userInput.value);
    if (!input) {
        Utils.showError('请输入消息内容');
        return;
    }

    chatState.isProcessing = true;
    setSendButtonLoading(true);

    try {
        // 显示聊天容器
        if (chatContainer) {
            chatContainer.style.display = 'block';
        }

        // 创建消息
        const messageId = Utils.generateMessageId();
        const messageElement = createMessageElement(messageId, input);

        if (chatHistory) {
            chatHistory.appendChild(messageElement);
        }

        // 清空输入框
        userInput.value = '';
        autoGrow(userInput);

        // 准备请求数据
        const systemPrompt = chatState.elements.systemPrompt?.value || CONFIG.systemPrompt;
        const requestData = {
            model: localStorage.getItem("model") || CONFIG.model,
            messages: [
                ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
                { role: "user", content: input }
            ],
            stream: true
        };

        // 创建停止控制器
        chatState.currentAbortController = new AbortController();
        const stopButton = createStopButton();

        // 发送请求并处理响应
        await processStreamingResponse(messageId, requestData, stopButton);

    } catch (error) {
        console.error('提交请求失败:', error);
        if (error.name !== 'AbortError') {
            Utils.showError(`请求失败: ${error.message}`);
        }
    } finally {
        chatState.isProcessing = false;
        setSendButtonLoading(false);
        chatState.currentAbortController = null;
        removeStopButton();
    }
}

async function processStreamingResponse(messageId, requestData, stopButton) {
    const responseDiv = document.querySelector(`#${messageId} .message-response`);
    if (!responseDiv) throw new Error('响应容器未找到');

    let accumulatedText = "";

    try {
        const response = await apiClient.makeRequest(requestData, chatState.currentAbortController.signal);

        for await (const chunk of apiClient.streamResponse(response)) {
            if (chunk.done) break;

            if (chunk.content) {
                accumulatedText += chunk.content;
                updateResponse(responseDiv, accumulatedText, messageId);
            }
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            responseDiv.innerHTML += '<div class="text-muted"><em>请求已取消</em></div>';
        } else {
            responseDiv.innerHTML = `<div class="text-danger">错误: ${error.message}</div>`;
        }
        throw error;
    }
}

function createMessageElement(messageId, userMessage) {
    const messageContainer = document.createElement('div');
    messageContainer.id = messageId;
    messageContainer.className = 'message';

    // 用户消息
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'message-content mb-2 user-message';
    userMessageDiv.textContent = userMessage;

    // 响应容器
    const responseDiv = document.createElement('div');
    responseDiv.className = 'message-response mb-2 text-start';
    responseDiv.style.minHeight = '3em';
    responseDiv.innerHTML = '<div class="spinner-border spinner-border-sm text-primary" role="status"></div>';

    messageContainer.appendChild(userMessageDiv);
    messageContainer.appendChild(responseDiv);

    return messageContainer;
}

// 智能更新策略 - 减少不必要的重新渲染
let lastRenderedText = new Map(); // 缓存已渲染的文本
let highlightTimeout = null;

function updateResponse(responseDiv, text, messageId) {
    if (!responseDiv || !text) return;

    // 检查是否需要重新渲染
    const lastText = lastRenderedText.get(messageId);
    if (lastText === text) {
        return; // 内容没有变化，跳过渲染
    }

    try {
        // 始终使用完整重新渲染以确保Markdown正确处理
        // 流式响应需要实时Markdown渲染，不能使用简单的文本追加
        fullRender(responseDiv, text, messageId);

        // 缓存当前文本
        lastRenderedText.set(messageId, text);

    } catch (error) {
        console.error('更新响应失败:', error);
        responseDiv.innerHTML = `<div class="text-danger">渲染错误: ${error.message}</div>`;
    }
}

function fullRender(responseDiv, text, messageId) {
    // 渲染Markdown
    const formatted = transformReasoningBlocks(text);
    let parsedMarkdown = formatted;
    if (typeof marked !== 'undefined') {
        try {
            parsedMarkdown = marked.parse(formatted);
        } catch (error) {
            console.error('Error parsing markdown:', error);
            parsedMarkdown = formatted; // 回退到原始文本
        }
    }

    // 清理HTML
    if (typeof DOMPurify !== 'undefined') {
        parsedMarkdown = DOMPurify.sanitize(parsedMarkdown, {
            ADD_TAGS: ['details', 'summary'],
            ADD_ATTR: ['class', 'open']
        });
    }

    responseDiv.innerHTML = parsedMarkdown;

    // 添加按钮组
    addResponseButtons(responseDiv, text, messageId);

    // 延迟代码高亮
    scheduleHighlight(responseDiv);
}

function appendContent(responseDiv, newContent, messageId) {
    // 简单的追加策略：如果新内容不包含代码块，直接追加
    if (!newContent.includes('```')) {
        // 找到最后一个段落或文本节点
        const lastElement = responseDiv.lastElementChild;
        if (lastElement && lastElement.tagName === 'P') {
            lastElement.textContent += newContent;
        } else {
            const textNode = document.createTextNode(newContent);
            responseDiv.appendChild(textNode);
        }
    } else {
        // 包含代码块，需要完整重新渲染
        const fullText = lastRenderedText.get(messageId) + newContent;
        fullRender(responseDiv, fullText, messageId);
    }
}

function scheduleHighlight(responseDiv) {
    // 清除之前的高亮计划
    if (highlightTimeout) {
        clearTimeout(highlightTimeout);
    }

    // 延迟高亮，避免频繁重新高亮
    highlightTimeout = setTimeout(() => {
        if (typeof Prism !== 'undefined') {
            try {
                Prism.highlightAllUnder(responseDiv);
            } catch (error) {
                console.warn('代码高亮失败:', error);
            }
        }
    }, 100); // 减少延迟到100ms，提供更好的用户体验
}

function addResponseButtons(responseDiv, text, messageId) {
    let buttonGroup = responseDiv.querySelector('.button-group');
    if (!buttonGroup) {
        buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';
        responseDiv.appendChild(buttonGroup);
    }

    // 清空现有按钮
    buttonGroup.innerHTML = '';

    // 复制按钮
    const copyButton = document.createElement('button');
    copyButton.className = 'btn btn-secondary copy-button';
    copyButton.innerHTML = ICONS.clipboard;
    copyButton.title = "复制";
    copyButton.setAttribute('aria-label', '复制响应内容');

    // 重新生成按钮
    const regenerateButton = document.createElement('button');
    regenerateButton.className = 'btn btn-secondary regenerate-button';
    regenerateButton.innerHTML = ICONS.regenerate;
    regenerateButton.title = "重新生成";
    regenerateButton.setAttribute('data-message-id', messageId);
    regenerateButton.setAttribute('aria-label', '重新生成响应');

    buttonGroup.appendChild(copyButton);
    buttonGroup.appendChild(regenerateButton);
}

function createStopButton() {
    const { sendButton } = chatState.elements;
    if (!sendButton) return null;

    const stopButton = document.createElement('button');
    stopButton.className = 'btn btn-danger stop-button';
    stopButton.innerHTML = '停止';
    stopButton.onclick = (e) => {
        e.preventDefault();
        if (chatState.currentAbortController) {
            chatState.currentAbortController.abort('用户取消');
        }
    };

    sendButton.insertAdjacentElement('beforebegin', stopButton);
    return stopButton;
}

function removeStopButton() {
    const stopButton = document.querySelector('.stop-button');
    if (stopButton) {
        stopButton.remove();
    }
}

// ==================== 重新生成功能 ====================
async function regenerateResponse(messageId) {
    if (chatState.isProcessing) return;

    try {
        const messageElement = document.getElementById(messageId);
        if (!messageElement) {
            throw new Error(`消息元素未找到: ${messageId}`);
        }

        const contentElement = messageElement.querySelector('.message-content');
        const responseDiv = messageElement.querySelector('.message-response');

        if (!contentElement || !responseDiv) {
            throw new Error('消息元素结构不完整');
        }

        const prompt = contentElement.textContent;

        chatState.isProcessing = true;
        setSendButtonLoading(true);

        // 显示加载状态
        responseDiv.innerHTML = '<div class="spinner-border spinner-border-sm text-primary" role="status"></div>';

        // 准备请求数据
        const systemPrompt = chatState.elements.systemPrompt?.value || CONFIG.systemPrompt;
        const requestData = {
            model: localStorage.getItem("model") || CONFIG.model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            stream: true
        };

        // 创建新的控制器
        chatState.currentAbortController = new AbortController();

        // 处理响应
        await processStreamingResponse(messageId, requestData);

    } catch (error) {
        console.error('重新生成失败:', error);
        if (error.name !== 'AbortError') {
            Utils.showError(`重新生成失败: ${error.message}`);
        }
    } finally {
        chatState.isProcessing = false;
        setSendButtonLoading(false);
        chatState.currentAbortController = null;
    }
}

// ==================== 聊天管理 ====================
function startNewChat() {
    const { chatHistory, chatContainer, sendButton } = chatState.elements;

    if (chatHistory) {
        chatHistory.innerHTML = '';
    }

    if (chatContainer) {
        chatContainer.style.display = 'none';
    }

    chatState.isProcessing = false;
    updateSendButtonState();
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

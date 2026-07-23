// AI Business OS Chatbot Widget — v2
// Embed: <script src="https://ai-business-os-six.vercel.app/api/public/chatbot/widget" data-business-id="YOUR_ID"></script>
(function () {
  'use strict';

  var SCRIPT = document.currentScript;
  var BUSINESS_ID = SCRIPT?.getAttribute('data-business-id') || '';
  var PLATFORM_URL = 'https://ai-business-os-six.vercel.app';
  var WIDGET_URL = PLATFORM_URL + '/api/public/chatbot';

  if (!BUSINESS_ID) {
    console.error('[AI Chatbot] Missing data-business-id attribute');
    return;
  }

  // Styles
  var style = document.createElement('style');
  style.textContent = `
    #ai-chatbot-container {
      position: fixed; bottom: 20px; right: 20px; z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #ai-chatbot-btn {
      width: 56px; height: 56px; border-radius: 50%; background: #3b82f6;
      border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s; color: white;
    }
    #ai-chatbot-btn:hover { transform: scale(1.05); }
    #ai-chatbot-btn svg { width: 24px; height: 24px; }
    #ai-chatbot-window {
      position: fixed; bottom: 90px; right: 20px; width: 380px; height: 600px;
      max-height: calc(100vh - 120px); background: #1a1a2e; border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3); display: none;
      flex-direction: column; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);
    }
    #ai-chatbot-window.open { display: flex; }
    #ai-chatbot-header {
      padding: 14px 16px; background: #3b82f6; color: white;
      font-weight: 600; font-size: 14px; display: flex;
      justify-content: space-between; align-items: center;
    }
    #ai-chatbot-close { background: none; border: none; color: white; cursor: pointer; font-size: 18px; }
    #ai-chatbot-messages {
      flex: 1; overflow-y: auto; padding: 16px; display: flex;
      flex-direction: column; gap: 8px;
    }
    .ai-msg {
      max-width: 85%; padding: 10px 14px; border-radius: 12px;
      font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-break: break-word;
    }
    .ai-msg.bot {
      align-self: flex-start; background: rgba(255,255,255,0.08);
      color: #e2e8f0; border-bottom-left-radius: 4px;
    }
    .ai-msg.user {
      align-self: flex-end; background: #3b82f6; color: white;
      border-bottom-right-radius: 4px;
    }
    #ai-chatbot-input-area {
      padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.1);
      display: flex; gap: 8px; background: #16162a;
    }
    #ai-chatbot-input {
      flex: 1; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px;
      padding: 8px 12px; font-size: 13px; outline: none;
      background: rgba(255,255,255,0.05); color: #e2e8f0;
    }
    #ai-chatbot-input::placeholder { color: #64748b; }
    #ai-chatbot-send {
      background: #3b82f6; border: none; border-radius: 8px;
      padding: 8px 12px; color: white; cursor: pointer; font-size: 13px;
    }
    #ai-chatbot-send:hover { background: #2563eb; }
    #ai-chatbot-send:disabled { opacity: 0.5; cursor: not-allowed; }
    .ai-typing {
      display: flex; gap: 4px; padding: 12px 16px; align-self: flex-start;
    }
    .ai-typing span {
      width: 6px; height: 6px; border-radius: 50%;
      background: rgba(255,255,255,0.4); animation: ai-bounce 1.4s infinite;
    }
    .ai-typing span:nth-child(2) { animation-delay: 0.2s; }
    .ai-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes ai-bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    @media (max-width: 480px) {
      #ai-chatbot-window {
        width: calc(100vw - 40px); right: 20px;
        max-height: calc(100vh - 120px);
      }
    }
  `;
  document.head.appendChild(style);

  // State
  var state = { conversationId: null };

  // Build UI — no form, just direct chat
  var container = document.createElement('div');
  container.id = 'ai-chatbot-container';
  container.innerHTML = `
    <div id="ai-chatbot-window">
      <div id="ai-chatbot-header">
        <span>AI Assistant</span>
        <button id="ai-chatbot-close">&times;</button>
      </div>
      <div id="ai-chatbot-messages">
        <div class="ai-msg bot">Hello! How can I help you today?</div>
      </div>
      <div id="ai-chatbot-input-area">
        <input id="ai-chatbot-input" placeholder="Type your message..." />
        <button id="ai-chatbot-send">Send</button>
      </div>
    </div>
    <button id="ai-chatbot-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    </button>
  `;
  document.body.appendChild(container);

  // Elements
  var btn = document.getElementById('ai-chatbot-btn');
  var win = document.getElementById('ai-chatbot-window');
  var messages = document.getElementById('ai-chatbot-messages');
  var input = document.getElementById('ai-chatbot-input');
  var sendBtn = document.getElementById('ai-chatbot-send');
  var closeBtn = document.getElementById('ai-chatbot-close');

  btn.onclick = function () {
    win.classList.toggle('open');
    if (win.classList.contains('open')) input.focus();
  };

  closeBtn.onclick = function () { win.classList.remove('open'); };

  function addMessage(text, role) {
    var div = document.createElement('div');
    div.className = 'ai-msg ' + role;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function showTyping() {
    var div = document.createElement('div');
    div.className = 'ai-typing';
    div.id = 'ai-typing-indicator';
    div.innerHTML = '<span></span><span></span><span></span>';
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function hideTyping() {
    var el = document.getElementById('ai-typing-indicator');
    if (el) el.remove();
  }

  async function sendMessage(text) {
    addMessage(text, 'user');
    input.value = '';
    sendBtn.disabled = true;
    showTyping();

    try {
      var res = await fetch(WIDGET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: BUSINESS_ID,
          message: text,
          conversationId: state.conversationId,
        }),
      });
      var data = await res.json();
      hideTyping();

      if (data.conversationId) state.conversationId = data.conversationId;
      addMessage(data.response || 'Sorry, I could not process that.', 'bot');
    } catch (e) {
      hideTyping();
      addMessage('Sorry, something went wrong. Please try again.', 'bot');
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  }

  sendBtn.onclick = function () {
    var text = input.value.trim();
    if (!text) return;
    sendMessage(text);
  };

  input.onkeydown = function (e) {
    if (e.key === 'Enter') sendBtn.click();
  };
})();
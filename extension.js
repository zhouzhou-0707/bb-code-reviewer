/**
 * BB Code Reviewer — VS Code Extension
 */

const vscode = require('vscode');
const { reviewCode } = require('./src/review');

// ─── Output Channel ────────────────────────────────────────────────────────

/** @type {vscode.OutputChannel} */
let outputChannel;

function getOutputChannel() {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('AI Code Review');
  }
  return outputChannel;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function secretKey(providerId) {
  return 'bbCodeReviewer.apiKey.' + providerId;
}

// ─── Commands ──────────────────────────────────────────────────────────────

async function setApiKey(context) {
  const items = [
    { label: 'Claude (Anthropic)', detail: 'api.anthropic.com', id: 'claude' },
    { label: 'OpenAI (GPT)', detail: 'api.openai.com', id: 'openai' },
    { label: 'DeepSeek', detail: 'api.deepseek.com', id: 'deepseek' },
    { label: '通义千问 (Qwen)', detail: 'dashscope.aliyuncs.com', id: 'qwen' },
    { label: 'Moonshot (Kimi)', detail: 'api.moonshot.cn', id: 'moonshot' },
    { label: '自定义 (Custom)', detail: 'Your own API', id: 'custom' },
  ];

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select AI provider to configure API Key',
    title: 'AI Review: Set API Key',
  });
  if (!picked) return;

  const apiKey = await vscode.window.showInputBox({
    prompt: 'Enter API Key for ' + picked.label,
    placeHolder: 'sk-... or your-api-key',
    password: true,
    ignoreFocusOut: true,
    validateInput: function (val) {
      return (val && val.trim()) ? null : 'API Key cannot be empty';
    },
  });
  if (!apiKey) return;

  await context.secrets.store(secretKey(picked.id), apiKey.trim());
  vscode.window.showInformationMessage('✅ API Key for ' + picked.label + ' saved securely.');
}

async function runReview(context) {
  var editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor. Open a file first.');
    return;
  }

  var selection = editor.selection;
  if (selection.isEmpty) {
    vscode.window.showWarningMessage('No code selected. Select some code first.');
    return;
  }

  var code = editor.document.getText(selection);
  var language = editor.document.languageId || 'text';
  var config = vscode.workspace.getConfiguration('bbCodeReviewer');
  var providerId = config.get('provider', 'deepseek');
  var model = config.get('model', '').trim();
  var customBaseUrl = config.get('customBaseUrl', '');

  var apiKey = await context.secrets.get(secretKey(providerId));

  var channel = getOutputChannel();
  channel.clear();
  channel.appendLine('🔍 AI Code Review — analyzing...');
  channel.appendLine('   Provider: ' + providerId + '  |  Model: ' + (model || '(default)') + '  |  Language: ' + language);
  channel.appendLine('──────────────────────────────────────────────');
  channel.show(true);

  try {
    var result = await reviewCode(code, language, providerId, apiKey, model, customBaseUrl);

    channel.clear();
    channel.appendLine('🔍 AI Code Review — Results');
    channel.appendLine('   Language: ' + language + '  |  Lines: ~' + code.split('\n').length);
    channel.appendLine('──────────────────────────────────────────────');
    channel.appendLine('');
    channel.appendLine(result);
    channel.appendLine('');
    channel.appendLine('──────────────────────────────────────────────');
    channel.appendLine('💡 Tip: Change AI provider in Settings → AI Code Review');
    channel.show(true);
  } catch (error) {
    channel.clear();
    channel.appendLine('❌ Review Failed');
    channel.appendLine('──────────────────────────────────────────────');
    channel.appendLine('');
    channel.appendLine(error.message);
    channel.appendLine('');
    channel.appendLine('──────────────────────────────────────────────');
    channel.appendLine('💡 Common fixes:');
    channel.appendLine('   1. Check your API Key: Ctrl+Shift+P → "AI Review: Set API Key"');
    channel.appendLine('   2. Check your provider setting: Settings → AI Code Review → Provider');
    channel.appendLine('   3. Check your network connection');
    channel.show(true);
  }
}

// ─── Lifecycle ─────────────────────────────────────────────────────────────

function activate(context) {
  var setKeyCmd = vscode.commands.registerCommand(
    'bb-code-reviewer.setApiKey',
    function () { return setApiKey(context); }
  );

  var reviewCmd = vscode.commands.registerCommand(
    'bb-code-reviewer.review',
    function () { return runReview(context); }
  );

  context.subscriptions.push(setKeyCmd, reviewCmd);

  vscode.window.showInformationMessage('✅ AI Code Review 已激活！');
}

function deactivate() {
  if (outputChannel) {
    outputChannel.dispose();
  }
}

module.exports = { activate: activate, deactivate: deactivate };

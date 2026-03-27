# 打字练习 Web 应用 (Typing Practice App) - 开发文档

## 1. 项目概述 (Project Overview)
本项目是一个基于 Web 的轻量级打字练习应用。用户可以选择不同的预设文本进行逐行跟随式的打字训练。系统提供实时的正确/错误视觉反馈，并追踪用户的打字时间、准确率和速度。

## 2. 技术栈建议 (Tech Stack Recommendation)
鉴于 Boss 的高级前端背景及近期的全栈转型目标，建议采用以下现代化技术栈，重点展示对状态管理和重渲染性能的控制：
*   **框架**: React 18 + Next.js (App Router, 便于后续扩展全栈功能) 或纯 Vite + React。
*   **语言**: TypeScript (严格的类型定义，特别是处理按键事件和统计算法时)。
*   **样式**: Tailwind CSS (快速构建极简现代的 UI)。
*   **状态管理**: Zustand 或 Jotai (由于高频的键盘输入会导致极高频的状态更新，使用原子化或精简的状态库能有效避免 React Context 带来的全局无效重渲染)。

## 3. 核心功能模块 (Core Features)

### 3.1 内容选择器 (Content Selector)
*   **功能**: 提供一个下拉列表或侧边栏，让用户选择要练习的文本。
*   **数据源**: 支持本地存储的静态文件（建议统一解析为 JSON 格式处理），未来可扩展为通过 API 从 Postgres 数据库获取。

### 3.2 核心打字面板 (Typing Board)
*   **产品理念 (UX/Cognitive Philosophy)**: 摒弃传统的“原文覆盖高亮”模式（易产生无脑肌肉记忆），采用**“另起一行对照打字”**模式。强迫用户视线在原文与输入区之间切换，利用“工作记忆编码（Working Memory Encoding）”加深对外语单词的长期记忆。
*   **排版逻辑**: 
    *   **目标行 (Reference Line)**: 静态展示当前需要练习的原文。
    *   **输入行 (Input Line)**: 在目标行的正下方另起一行，渲染用户的实际打字轨迹。
*   **视觉反馈**:
    *   用户在下一行敲击字符时，字符依据与正上方目标字符的比对结果实时变色（正确为绿色，错误为红色）。
    *   当前光标位置添加闪烁引导。

### 3.3 实时数据看板 (Stats Dashboard)
*   **位置**: 页面右上角悬浮。
*   **指标计算**:
    *   **时间 (Time)**: 按下“开始”键后触发 `setInterval` 计时。
    *   **准确率 (Accuracy)**: `(正确输入字符数 / 总输入字符数) * 100%`。
    *   **打字速度 (WPM/CPM)**: Words/Characters Per Minute。公式：`(正确输入字符数 / 5) / (耗时分钟数)`。

## 4. 架构设计与性能优化 (System Design & Performance)
*作为 Senior 前端，这是此项目的核心难点。*

### 4.1 状态模型 (State Model)
避免将所有输入字符存在一个巨大的单一 State 中。建议拆分：
```typescript
interface TypingState {
  status: 'idle' | 'running' | 'finished';
  startTime: number | null;
  targetLines: string[]; // 按行切割的源文本
  currentLineIndex: number; // 当前正在打字的行号
  typedTextInCurrentLine: string; // 当前行已输入的字符串
  totalCorrectChars: number; // 历史正确总数（用于计算最终准确率）
  totalTypedChars: number; // 历史输入总数
}
```

### 4.2 性能优化 (Performance Trade-offs)
*   **输入防抖/高频触发**: 用户打字速度可能高达每秒 10+ 次击键。如果每次击键都触发整个页面的重渲染，低端设备会严重掉帧。
*   **局部渲染策略**: 使用 React 的 `memo` 包装每一行组件 (`<TextLine />`)。只有 `currentLineIndex` 匹配的当前行，才接收 `typedTextInCurrentLine` 属性并发生重渲染。已经打完的行和还未打到的行保持静止，以此保证 60fps 的极致顺滑体验。

## 5. 数据结构设计 (Data Schema)
建议的数据源 JSON 结构：
```json
[
  {
    "id": "text-001",
    "title": "Steve Jobs Stanford Speech",
    "difficulty": "medium",
    "lines": [
      "I am honored to be with you today",
      "for your commencement from one of the finest universities in the world.",
      "Truth be told, I never graduated from college."
    ]
  }
]
```

## 6. 开发阶段划分 (Implementation Phases)
*   **Phase 1: 静态骨架**: 搭建基础 UI 布局（右上角面板、居中打字区）、解析 JSON 数据并渲染出只读的文本行。
*   **Phase 2: 核心交互**: 实现“开始”按钮逻辑，捕获键盘事件，实现单行文本的“正确变绿、错误变红”比对逻辑。
*   **Phase 3: 状态流转与计分**: 实现跨行换行逻辑（按 Enter 或自动换行），接入计时器，并在右上角实时算出 WPM 和准确率。
*   **Phase 4: 性能调优**: 引入 React Profiler 检查打字时的 Render 消耗，确保只有当前激活行在重新渲染。
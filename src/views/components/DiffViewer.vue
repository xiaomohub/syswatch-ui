<template>
  <div class="diff-viewer">
    <!-- 无内容提示 -->
    <div v-if="!blocks || blocks.length === 0" class="diff-empty-state">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
      <span>无差异内容</span>
    </div>

    <!-- 差异块 -->
    <div v-else>
      <div
        v-for="(block, i) in blocks"
        :key="i"
        class="diff-block"
      >
        <!-- 块头：显示操作类型 -->
        <div class="diff-block-header" :class="`block-${block.type.toLowerCase()}`">
          <span class="block-type-badge">{{ formatBlockType(block.type) }}</span>
          <span class="block-range">
            <span class="range-label">旧:</span>
            <span class="range-value">{{ block.oldStart }}-{{ block.oldEnd }}</span>
            <span class="separator">→</span>
            <span class="range-label">新:</span>
            <span class="range-value">{{ block.newStart }}-{{ block.newEnd }}</span>
          </span>
        </div>

        <!-- 删除的行 -->
        <div v-if="block.oldLines && block.oldLines.length > 0" class="diff-section">
          <div
            v-for="(line, j) in block.oldLines"
            :key="`old-${i}-${j}`"
            class="diff-line diff-delete"
          >
            <span class="line-prefix">−</span>
            <span class="line-number">{{ block.oldStart + j }}</span>
            <span class="line-content">{{ line || '&nbsp;' }}</span>
          </div>
        </div>

        <!-- 新增的行 -->
        <div v-if="block.newLines && block.newLines.length > 0" class="diff-section">
          <div
            v-for="(line, j) in block.newLines"
            :key="`new-${i}-${j}`"
            class="diff-line diff-insert"
          >
            <span class="line-prefix">+</span>
            <span class="line-number">{{ block.newStart + j }}</span>
            <span class="line-content">{{ line || '&nbsp;' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  blocks: {
    type: Array,
    default: () => []
  }
})

const formatBlockType = (type) => {
  const typeMap = {
    'DELETE': '删除',
    'INSERT': '新增',
    'CHANGE': '变更'
  }
  return typeMap[type] || type
}
</script>

<style scoped>
/* ==================== 容器 ==================== */
.diff-viewer {
  width: 100%;
  background: var(--bg-tertiary, #0f172a);
  border-radius: 8px;
  overflow: hidden;
}

/* ==================== 空状态 ==================== */
.diff-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 20px;
  color: var(--text-muted, #64748b);
  font-size: 14px;
}

.diff-empty-state svg {
  opacity: 0.3;
  color: var(--text-muted, #64748b);
}

/* ==================== 差异块 ==================== */
.diff-block {
  border-bottom: 1px solid var(--border-color, #334155);
}

.diff-block:last-child {
  border-bottom: none;
}

/* ==================== 块头 ==================== */
.diff-block-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border-color, #334155);
}

.block-delete {
  background: rgba(239, 68, 68, 0.08);
  color: #f87171;
}

.block-insert {
  background: rgba(16, 185, 129, 0.08);
  color: #10b981;
}

.block-change {
  background: rgba(59, 130, 246, 0.08);
  color: #3b82f6;
}

.block-type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.block-delete .block-type-badge {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

.block-insert .block-type-badge {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
}

.block-change .block-type-badge {
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
}

.block-range {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--text-muted, #64748b);
  margin-left: auto;
}

.range-label {
  font-weight: 500;
  opacity: 0.7;
}

.range-value {
  color: inherit;
  font-weight: 600;
}

.separator {
  margin: 0 4px;
  opacity: 0.5;
}

/* ==================== 差异区间 ==================== */
.diff-section {
  padding: 0;
}

/* ==================== 差异行 ==================== */
.diff-line {
  display: flex;
  align-items: flex-start;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  line-height: 1.6;
  padding: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.02);
}

.diff-line:hover {
  background: rgba(255, 255, 255, 0.02);
}

/* 删除行 */
.diff-delete {
  background: rgba(239, 68, 68, 0.08);
  color: #fecaca;
}

.diff-delete:hover {
  background: rgba(239, 68, 68, 0.12);
}

.diff-delete .line-prefix {
  color: #f87171;
}

.diff-delete .line-number {
  color: #f87171;
  opacity: 0.6;
}

/* 新增行 */
.diff-insert {
  background: rgba(16, 185, 129, 0.08);
  color: #d1fae5;
}

.diff-insert:hover {
  background: rgba(16, 185, 129, 0.12);
}

.diff-insert .line-prefix {
  color: #6ee7b7;
}

.diff-insert .line-number {
  color: #6ee7b7;
  opacity: 0.6;
}

/* ==================== 行元素 ==================== */
.line-prefix {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  padding: 0;
  margin: 0;
  flex-shrink: 0;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.line-number {
  display: inline-block;
  width: 50px;
  text-align: right;
  padding-right: 12px;
  flex-shrink: 0;
  opacity: 0.5;
  user-select: none;
}

.line-content {
  flex: 1;
  padding: 4px 12px 4px 0;
  white-space: pre-wrap;
  word-break: break-all;
  overflow-wrap: break-word;
  tab-size: 2;
}

/* 空行占位 */
.line-content:empty::before {
  content: ' ';
}

/* ==================== 响应式 ==================== */
@media (max-width: 768px) {
  .diff-line {
    font-size: 11px;
  }

  .line-number {
    width: 40px;
    padding-right: 8px;
  }

  .line-content {
    padding: 3px 8px 3px 0;
  }

  .diff-block-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .block-range {
    margin-left: 0;
  }
}
</style>
#!/bin/bash
# 修复 agent.service.ts 的类型和 relation 字段名

FILE="agent.service.ts"

# 1. 修复类型注解（类型应该用 Type 后缀）
sed -i 's/: AgentMode)/: AgentModeType)/g' "$FILE"
sed -i 's/: AgentTaskType)/: AgentTaskTypeType)/g' "$FILE"
sed -i 's/mode?: AgentMode$/mode?: AgentModeType/g' "$FILE"
sed -i 's/tasks: AgentTaskType\[/tasks: AgentTaskTypeType[/g' "$FILE"
sed -i 's/plannedTasks?: AgentTaskType\[/plannedTasks?: AgentTaskTypeType[/g' "$FILE"

# 2. 修复 relation 字段名 (include/select 中使用 PascalCase)
sed -i 's/include: {\s*project:/include: { Project:/g' "$FILE"
sed -i 's/select: {\s*items:/select: { Slide:/g' "$FILE"
sed -i 's/include: {\s*tasks:/include: { AgentTask:/g' "$FILE"
sed -i 's/include: {\s*session:/include: { AgentSession:/g' "$FILE"
sed -i 's/include: {\s*messages:/include: { AgentMessage:/g' "$FILE"

# 3. 修复访问 relation 字段的代码
sed -i 's/\.project\b\(.*\)\./\.Project\1./g' "$FILE"
sed -i 's/\.items\b/\.Slide/g' "$FILE"
sed -i 's/\.agentSession\b/\.AgentSession/g' "$FILE"
sed -i 's/\.tasks\b/\.AgentTask/g' "$FILE"
sed -i 's/\.session\b/\.AgentSession/g' "$FILE"
sed -i 's/\.messages\b/\.AgentMessage/g' "$FILE"

echo "修复完成"

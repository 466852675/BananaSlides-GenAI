$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$reportPath = Join-Path $projectRoot ".skills\code-quality-report.txt"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

function Write-ReportLine {
    param([string]$text)
    Add-Content -Path $reportPath -Value $text
    Write-Host $text
}

function Run-Step {
    param(
        [string]$name,
        [string]$command,
        [string]$cwd
    )
    
    Write-Host "`n[$timestamp] 执行: $name" -ForegroundColor Cyan
    Write-ReportLine "`n========================================="
    Write-ReportLine "步骤: $name"
    Write-ReportLine "命令: $command"
    Write-ReportLine "时间: $timestamp"
    Write-ReportLine "=========================================`n"
    
    $originalPath = Get-Location
    try {
        Set-Location $cwd
        $output = & (Split-Path $command -Parent) (Split-Path $command -Leaf) *>&1
        $success = $?
        
        Write-ReportLine "输出:"
        Write-ReportLine ($output -join "`n")
        
        if ($success) {
            Write-ReportLine "`n状态: ✅ 成功"
            Write-Host "✅ $name - 成功" -ForegroundColor Green
            return $true
        } else {
            Write-ReportLine "`n状态: ❌ 失败"
            Write-Host "❌ $name - 失败" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-ReportLine "`n状态: ❌ 异常"
        Write-ReportLine "错误: $_"
        Write-Host "❌ $name - 异常: $_" -ForegroundColor Red
        return $false
    } finally {
        Set-Location $originalPath
    }
}

$reportPath = Join-Path $projectRoot ".skills\code-quality-report.txt"
Clear-Content -Path $reportPath -ErrorAction SilentlyContinue

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "  BananaSlides 代码质量审查" -ForegroundColor Yellow
Write-Host "  开始时间: $timestamp" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Yellow

Write-ReportLine "========================================"
Write-ReportLine "  BananaSlides 代码质量审查报告"
Write-ReportLine "  开始时间: $timestamp"
Write-ReportLine "========================================"

$results = @()

$results += Run-Step "前端类型检查" "npx tsc --noEmit" $projectRoot
$results += Run-Step "后端类型检查" "npx tsc --noEmit" (Join-Path $projectRoot "server")
$results += Run-Step "前端构建验证" "npm run build" $projectRoot
$results += Run-Step "后端构建验证" "npm run build" (Join-Path $projectRoot "server")
$results += Run-Step "数据库模式验证" "npx prisma validate" (Join-Path $projectRoot "server")
$results += Run-Step "数据库格式化" "npx prisma format" (Join-Path $projectRoot "server")
$results += Run-Step "前端依赖审计" "npm audit --audit-level=moderate" $projectRoot
$results += Run-Step "后端依赖审计" "npm audit --audit-level=moderate" (Join-Path $projectRoot "server")

$apiTestPath = Join-Path $projectRoot "server\test_api.js"
if (Test-Path $apiTestPath) {
    $results += Run-Step "API 端点测试" "node test_api.js" (Join-Path $projectRoot "server")
}

$bracesCheckPath = Join-Path $projectRoot "check_braces.py"
if (Test-Path $bracesCheckPath) {
    $results += Run-Step "代码一致性检查" "python check_braces.py" $projectRoot
}

$endTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$successCount = ($results | Where-Object { $_ -eq $true }).Count
$failCount = ($results | Where-Object { $_ -eq $false }).Count
$totalCount = $results.Count

Write-ReportLine "`n========================================"
Write-ReportLine "  审查总结"
Write-ReportLine "========================================"
Write-ReportLine "完成时间: $endTime"
Write-ReportLine "总检查项: $totalCount"
Write-ReportLine "成功: $successCount"
Write-ReportLine "失败: $failCount"
Write-ReportLine "成功率: $([math]::Round($successCount / $totalCount * 100, 2))%"
Write-ReportLine "========================================"

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "  审查总结" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "总检查项: $totalCount" -ForegroundColor White
Write-Host "成功: $successCount" -ForegroundColor Green
Write-Host "失败: $failCount" -ForegroundColor ($failCount -gt 0 ? "Red" : "Green")
Write-Host "成功率: $([math]::Round($successCount / $totalCount * 100, 2))%" -ForegroundColor ($successCount -eq $totalCount ? "Green" : "Yellow")
Write-Host "========================================" -ForegroundColor Yellow

Write-Host "`n详细报告已保存到: $reportPath" -ForegroundColor Cyan

if ($failCount -gt 0) {
    Write-Host "`n⚠️ 发现问题,请查看报告了解详情" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "`n✅ 所有检查项通过!" -ForegroundColor Green
    exit 0
}

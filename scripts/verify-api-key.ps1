#!/usr/bin/env pwsh

# AI服务API密钥验证脚本
# 用于验证新的火山引擎API密钥是否工作正常

param(
    [string]$BaseUrl = "https://ark.cn-beijing.volces.com/api/v3",
    [string]$Model = "ep-20260121163958-vk8db",  # 从.env读取的默认模型
    [int]$Timeout = 30
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AI服务API密钥验证脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 从环境变量或.env文件读取API密钥
$ApiKey = $env:VOLCENGINE_API_KEY

if (-not $ApiKey) {
    # 尝试从.env文件读取
    $envFile = Join-Path $PSScriptRoot ".." "server" ".env"
    if (Test-Path $envFile) {
        $envContent = Get-Content $envFile -Raw
        if ($envContent -match 'VOLCENGINE_API_KEY="([^"]+)"') {
            $ApiKey = $Matches[1]
            Write-Host "✓ 已从.env文件读取API密钥" -ForegroundColor Green
        }
    }
}

if (-not $ApiKey) {
    Write-Error "未找到VOLCENGINE_API_KEY环境变量或.env文件"
    exit 1
}

Write-Host "配置信息：" -ForegroundColor Yellow
Write-Host "  基础URL: $BaseUrl"
Write-Host "  模型: $Model"
Write-Host "  API密钥: $($ApiKey.Substring(0, 8))...$($ApiKey.Substring($ApiKey.Length - 4))"
Write-Host ""

# 构建请求体
$body = @{
    model = $Model
    messages = @(
        @{
            role = "user"
            content = "你好，请回复'API测试成功'"
        }
    )
    max_tokens = 20
    temperature = 0.7
} | ConvertTo-Json -Depth 3

Write-Host "发送测试请求..." -ForegroundColor Yellow
Write-Host ""

try {
    $headers = @{
        "Authorization" = "Bearer $ApiKey"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri "$BaseUrl/chat/completions" `
        -Method Post `
        -Headers $headers `
        -Body $body `
        -TimeoutSec $Timeout
    
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✓ API密钥验证成功！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "响应信息：" -ForegroundColor Cyan
    Write-Host "  模型: $($response.model)"
    Write-Host "  内容: $($response.choices[0].message.content)"
    Write-Host "  Token使用: 提示词=$($response.usage.prompt_tokens), 完成=$($response.usage.completion_tokens), 总计=$($response.usage.total_tokens)"
    Write-Host ""
    
    exit 0
}
catch {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ✗ API密钥验证失败！" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "错误信息：" -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)"
    Write-Host ""
    
    if ($_.Exception.Response) {
        $statusCode = [int]$_.Exception.Response.StatusCode
        Write-Host "  HTTP状态码: $statusCode"
        
        switch ($statusCode) {
            401 { Write-Host "  原因: API密钥无效或已过期" -ForegroundColor Red }
            403 { Write-Host "  原因: API密钥权限不足" -ForegroundColor Red }
            429 { Write-Host "  原因: 请求过于频繁，被限流" -ForegroundColor Red }
            500 { Write-Host "  原因: 服务器内部错误" -ForegroundColor Red }
            default { Write-Host "  原因: 未知错误" -ForegroundColor Red }
        }
    }
    Write-Host ""
    
    exit 1
}

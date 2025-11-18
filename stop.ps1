# Script para detener todos los servicios

Write-Host "================================" -ForegroundColor Cyan
Write-Host "🛑 DETENER SECURE CHAT" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

Write-Host "Deteniendo servicios Docker..." -ForegroundColor Yellow
docker-compose down

Write-Host ""
Write-Host "✅ Servicios detenidos correctamente" -ForegroundColor Green
Write-Host ""

Write-Host "Presiona cualquier tecla para salir..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Script de inicio rápido para Windows PowerShell

Write-Host "================================" -ForegroundColor Cyan
Write-Host "🔒 SECURE CHAT - INICIO RÁPIDO" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Docker
Write-Host "📦 Verificando Docker..." -ForegroundColor Yellow
$dockerRunning = docker info 2>&1 | Select-String "Server Version"

if (!$dockerRunning) {
    Write-Host "❌ Docker no está corriendo. Por favor inicia Docker Desktop." -ForegroundColor Red
    Write-Host "Esperando a que Docker inicie..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    exit 1
}

Write-Host "✅ Docker está corriendo" -ForegroundColor Green
Write-Host ""

# Ir al directorio raíz
Set-Location $PSScriptRoot

# Opción de inicio
Write-Host "Selecciona modo de inicio:" -ForegroundColor Cyan
Write-Host "1) Con Docker (Recomendado)" -ForegroundColor White
Write-Host "2) Desarrollo local (sin Docker)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Opción (1 o 2)"

if ($choice -eq "1") {
    Write-Host ""
    Write-Host "🐳 Iniciando servicios con Docker Compose..." -ForegroundColor Yellow
    Write-Host ""
    
    # Detener servicios anteriores
    docker-compose down
    
    # Levantar servicios
    docker-compose up -d
    
    Write-Host ""
    Write-Host "⏳ Esperando a que los servicios estén listos..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # Verificar estado
    docker-compose ps
    
    Write-Host ""
    Write-Host "================================" -ForegroundColor Green
    Write-Host "✅ SISTEMA INICIADO CORRECTAMENTE" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 Frontend:  http://localhost:3000" -ForegroundColor Cyan
    Write-Host "🔌 Backend:   http://localhost:3001" -ForegroundColor Cyan
    Write-Host "🗄️  MongoDB:   mongodb://localhost:27017" -ForegroundColor Cyan
    Write-Host "💾 Redis:     localhost:6379" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🔐 Credenciales Admin:" -ForegroundColor Yellow
    Write-Host "   Usuario: admin" -ForegroundColor White
    Write-Host "   Password: Admin123!@#" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 Comandos útiles:" -ForegroundColor Yellow
    Write-Host "   Ver logs:     docker-compose logs -f" -ForegroundColor White
    Write-Host "   Detener:      docker-compose down" -ForegroundColor White
    Write-Host "   Reiniciar:    docker-compose restart" -ForegroundColor White
    Write-Host ""
    
} elseif ($choice -eq "2") {
    Write-Host ""
    Write-Host "🛠️ Iniciando en modo desarrollo local..." -ForegroundColor Yellow
    Write-Host ""
    
    # Backend
    Write-Host "🔧 Iniciando Backend..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"
    
    Start-Sleep -Seconds 3
    
    # Frontend
    Write-Host "🎨 Iniciando Frontend..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd cliente; npm start"
    
    Write-Host ""
    Write-Host "================================" -ForegroundColor Green
    Write-Host "✅ SISTEMA EN DESARROLLO LOCAL" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANTE: Asegúrate de tener MongoDB y Redis corriendo" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📱 Frontend:  http://localhost:3000" -ForegroundColor Cyan
    Write-Host "🔌 Backend:   http://localhost:3001" -ForegroundColor Cyan
    Write-Host ""
    
} else {
    Write-Host "❌ Opción inválida" -ForegroundColor Red
    exit 1
}

Write-Host "Presiona cualquier tecla para salir..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

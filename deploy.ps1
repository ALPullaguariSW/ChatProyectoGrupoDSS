# 🚀 Deploy Script para Secure Chat - Production

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Secure Chat - Production Deployment  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que existe .env.production
if (-not (Test-Path ".\.env.production")) {
    Write-Host "❌ Error: .env.production no encontrado" -ForegroundColor Red
    Write-Host "Crea el archivo .env.production con las variables necesarias" -ForegroundColor Yellow
    exit 1
}

# Cargar variables de entorno
Write-Host "📋 Cargando variables de entorno..." -ForegroundColor Yellow
Get-Content .\.env.production | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
}

# Verificar secrets críticos
$requiredVars = @('JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY')
$missing = @()
foreach ($var in $requiredVars) {
    if (-not [System.Environment]::GetEnvironmentVariable($var)) {
        $missing += $var
    }
}

if ($missing.Count -gt 0) {
    Write-Host "❌ Error: Faltan variables críticas:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
}

Write-Host "✅ Variables de entorno cargadas" -ForegroundColor Green
Write-Host ""

# Build Backend
Write-Host "🔨 Building Backend..." -ForegroundColor Yellow
Push-Location backend
if (Test-Path ".\dist") {
    Remove-Item -Recurse -Force .\dist
}
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en build de backend" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "✅ Backend compilado correctamente" -ForegroundColor Green
Pop-Location
Write-Host ""

# Build Frontend
Write-Host "🔨 Building Frontend..." -ForegroundColor Yellow
Push-Location cliente
if (Test-Path ".\build") {
    Remove-Item -Recurse -Force .\build
}
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en build de frontend" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "✅ Frontend compilado correctamente" -ForegroundColor Green
Pop-Location
Write-Host ""

# Docker Compose Production
Write-Host "🐳 Iniciando Docker Compose (Production)..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ Deployment Completado Exitosamente!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Frontend: http://localhost" -ForegroundColor Cyan
    Write-Host "🔧 Backend:  http://localhost:3001" -ForegroundColor Cyan
    Write-Host "📊 Health:   http://localhost:3001/health" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📝 Ver logs:" -ForegroundColor Yellow
    Write-Host "   docker-compose -f docker-compose.prod.yml logs -f" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🛑 Detener:" -ForegroundColor Yellow
    Write-Host "   docker-compose -f docker-compose.prod.yml down" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "❌ Error en deployment" -ForegroundColor Red
    exit 1
}

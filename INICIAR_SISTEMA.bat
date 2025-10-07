@echo off
chcp 65001 >nul
echo ╔════════════════════════════════════════════════════════╗
echo ║          🚀 STOKLINK - INICIAR SISTEMA               ║
echo ╚════════════════════════════════════════════════════════╝
echo.
echo [1/2] Iniciando Backend...
echo.

cd backend
start "StokLink Backend" cmd /k "npm start"

timeout /t 3 /nobreak >nul

echo.
echo [2/2] Backend iniciado em nova janela!
echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║  ✅ Backend rodando em http://localhost:3001          ║
echo ║  📱 Abra frontend/login.html no navegador             ║
echo ║  📖 Leia EXECUTAR_AGORA.md para instruções           ║
echo ╚════════════════════════════════════════════════════════╝
echo.
echo Pressione qualquer tecla para sair...
pause >nul

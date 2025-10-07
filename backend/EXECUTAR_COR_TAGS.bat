@echo off
chcp 65001 >nul
echo ========================================
echo 🎨 ADICIONANDO CORES NAS TAGS
echo ========================================
echo.
echo Este script vai:
echo 1. Adicionar campo COR na tabela tags
echo 2. Atualizar tags existentes com cor padrão
echo.
echo Pressione qualquer tecla para continuar...
pause >nul

echo.
echo [1/2] Adicionando campo cor...
mysql -h 147.93.144.135 -P 3306 -u mysql -pb5f6a806b69e4908b734 stoklink < add-cor-tags.sql

echo.
echo [2/2] Atualizando cores das tags existentes...
mysql -h 147.93.144.135 -P 3306 -u mysql -pb5f6a806b69e4908b734 stoklink < atualizar-cores-tags.sql

echo.
echo ========================================
echo ✅ CONCLUÍDO!
echo ========================================
echo.
echo Agora reinicie o backend:
echo   cd backend
echo   npm start
echo.
echo Depois recarregue a página (Ctrl+Shift+R)
echo.
pause

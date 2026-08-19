@echo off
chcp 65001 >nul
title Comissoes Vendedores - Iniciando...

echo ============================================
echo   Comissoes Vendedores - Iniciando sistema
echo ============================================
echo.

REM ---- Verifica se o Node.js esta instalado ----
where node >nul 2>nul
if errorlevel 1 (
    echo [ERRO] Node.js nao foi encontrado neste computador.
    echo Baixe e instale a versao 20 ou superior em https://nodejs.org
    echo.
    pause
    exit /b 1
)

cd /d "%~dp0"

REM ---- Instala dependencias na primeira vez ----
REM O projeto usa workspaces do npm: um unico "npm install" na pasta raiz
REM instala a API e a aplicacao de uma vez so.
if not exist "%~dp0node_modules" (
    echo Instalando dependencias pela primeira vez. Isso pode demorar alguns minutos...
    call npm install
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar as dependencias.
        pause
        exit /b 1
    )
)

REM ---- Sobe a API e a aplicacao juntas, em uma janela so ----
echo Iniciando o sistema...
start "Comissoes Vendedores" cmd /k "cd /d "%~dp0" && npm run dev"

REM ---- Aguarda subir e abre o navegador ----
timeout /t 8 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo ============================================
echo   Sistema iniciado! O navegador vai abrir
echo   sozinho em alguns segundos.
echo.
echo   NAO FECHE a janela preta chamada
echo   "Comissoes Vendedores" - e nela que o
echo   sistema fica rodando.
echo ============================================
echo.
pause

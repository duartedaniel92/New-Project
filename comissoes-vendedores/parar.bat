@echo off
chcp 65001 >nul
title Comissoes Vendedores - Encerrando...

echo Encerrando o sistema...

REM Fecha a janela do sistema (e as duas janelas antigas, para quem
REM atualizou de uma versao anterior do projeto)
taskkill /fi "WINDOWTITLE eq Comissoes Vendedores*" /t /f >nul 2>nul

echo Pronto. Pode fechar esta janela.
pause

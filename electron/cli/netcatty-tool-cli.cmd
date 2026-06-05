@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "CLI_SCRIPT=%SCRIPT_DIR%ALinLink-tool-cli.cjs"
set "APP_EXE="

if defined ALinLink_CLI_ELECTRON_EXEC_PATH if exist "%ALinLink_CLI_ELECTRON_EXEC_PATH%" set "APP_EXE=%ALinLink_CLI_ELECTRON_EXEC_PATH%"
if not defined APP_EXE if exist "%SCRIPT_DIR%..\..\..\..\ALinLink.exe" set "APP_EXE=%SCRIPT_DIR%..\..\..\..\ALinLink.exe"
if not defined APP_EXE if exist "%SCRIPT_DIR%..\..\..\..\ALinLink.exe" set "APP_EXE=%SCRIPT_DIR%..\..\..\..\ALinLink.exe"

if defined APP_EXE (
  set "ELECTRON_RUN_AS_NODE=1"
  "%APP_EXE%" "%CLI_SCRIPT%" %*
  exit /b %ERRORLEVEL%
)

where node >nul 2>nul
if not errorlevel 1 (
  node "%CLI_SCRIPT%" %*
  exit /b %ERRORLEVEL%
)

echo Failed to locate the bundled ALinLink runtime for ALinLink-tool-cli. 1>&2
exit /b 1

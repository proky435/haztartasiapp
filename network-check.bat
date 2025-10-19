@echo off
echo ========================================
echo   Halozati Diagnosztika
echo ========================================
echo.

echo 1. IP cim informaciok:
echo ------------------------
ipconfig | findstr /i "IPv4"
echo.

echo 2. Aktiv halozati kapcsolatok:
echo ------------------------------
netstat -an | findstr :3000
echo.

echo 3. Tuzfal szabalyok (3000-es port):
echo -----------------------------------
netsh advfirewall firewall show rule name="Haztartasi App - Port 3000"
echo.

echo 4. Ping teszt (sajat IP):
echo -------------------------
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4" ^| findstr "192.168"') do (
    for /f "tokens=1" %%j in ("%%i") do (
        echo Ping %%j...
        ping -n 1 %%j
    )
)
echo.

echo ========================================
echo Diagnosztika befejezve.
echo.
pause

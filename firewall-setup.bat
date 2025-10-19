@echo off
echo ========================================
echo   Tuzfal beallitas - Haztartasi App
echo ========================================
echo.
echo Tuzfal szabaly hozzaadasa a 3000-es porthoz...
echo.

REM Tűzfal szabály hozzáadása
netsh advfirewall firewall add rule name="Haztartasi App - Port 3000" dir=in action=allow protocol=TCP localport=3000

echo.
echo Tuzfal szabaly sikeresen hozzaadva!
echo Most probald meg ujra elerni a telefonodrol: http://192.168.56.1:3000
echo.
pause

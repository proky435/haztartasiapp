@echo off
echo.
echo ========================================
echo   Haztartasi App - Halozati IP cim
echo ========================================
echo.
echo Az alkalmazas elerheto lesz a kovetkezo cimeken:
echo.
echo Helyi gep: 
echo   HTTP:  http://localhost:3000
echo   HTTPS: https://localhost:3000
echo.
echo Halozati IP cimek:
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%j in ("%%i") do (
        echo   HTTP:  http://%%j:3000 ^(alapfunkciok^)
        echo   HTTPS: https://%%j:3000 ^(kamera funkciok^)
    )
)
echo.
echo FONTOS:
echo - HTTP: Alapfunkciok mukodnek
echo - HTTPS: Kamera funkciok is elerheto ^(tanusitvany figyelmeztetest fogadd el^)
echo.
echo ========================================
echo Nyomj meg egy billentyut a folyatashoz...
pause >nul

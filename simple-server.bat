@echo off
echo ========================================
echo   Egyszerű HTTP Szerver
echo ========================================
echo.
echo Build készítése...
cd client
call npm run build
echo.
echo Szerver indítása...
cd build
python -m http.server 3000
echo.
echo Ha a python nem elérhető, próbáld:
echo npx serve -s . -l 3000
pause

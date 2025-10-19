@echo off
echo ========================================
echo   SSL Tanusitvany Generalas
echo ========================================
echo.

REM Ellenőrizzük, hogy van-e OpenSSL
where openssl >nul 2>&1
if %errorlevel% neq 0 (
    echo HIBA: OpenSSL nem talalhato!
    echo.
    echo Telepitesi lehetosegek:
    echo 1. Chocolatey: choco install openssl
    echo 2. Letoltes: https://slproweb.com/products/Win32OpenSSL.html
    echo 3. Git Bash hasznalata ^(ha telepitve van Git^)
    echo.
    pause
    exit /b 1
)

echo OpenSSL megtalalva. Tanusitvany generalasa...
echo.

REM SSL mappa létrehozása
if not exist "ssl" mkdir ssl
cd ssl

REM Privát kulcs generálása
echo 1. Privat kulcs generalasa...
openssl genrsa -out server.key 2048

REM Tanúsítvány kérelem generálása
echo 2. Tanusitvany kerelem generalasa...
openssl req -new -key server.key -out server.csr -config ..\ssl-config.conf

REM Önaláírt tanúsítvány generálása
echo 3. Onalairt tanusitvany generalasa...
openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt -extensions v3_req -extfile ..\ssl-config.conf

echo.
echo ========================================
echo SSL tanusitvany sikeresen letrehozva!
echo ========================================
echo.
echo Fajlok helye: %cd%
echo - server.key ^(privat kulcs^)
echo - server.crt ^(tanusitvany^)
echo - server.csr ^(kerelem^)
echo.
echo Most frissitsd a .env fajlt:
echo SSL_CRT_FILE=./ssl/server.crt
echo SSL_KEY_FILE=./ssl/server.key
echo HTTPS=true
echo.
pause

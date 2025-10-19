# SSL Tanúsítvány Generálás PowerShell-lel
Write-Host "========================================" -ForegroundColor Green
Write-Host "  SSL Tanúsítvány Generálás (PowerShell)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host

# IP cím detektálása
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*"} | Select-Object -First 1).IPAddress
Write-Host "Detektált IP cím: $ipAddress" -ForegroundColor Yellow

# SSL mappa létrehozása
if (!(Test-Path "ssl")) {
    New-Item -ItemType Directory -Path "ssl"
}

Set-Location "ssl"

try {
    # Ellenőrizzük az OpenSSL-t
    $null = Get-Command openssl -ErrorAction Stop
    
    Write-Host "1. Privát kulcs generálása..." -ForegroundColor Cyan
    & openssl genrsa -out server.key 2048
    
    Write-Host "2. Önaláírt tanúsítvány generálása..." -ForegroundColor Cyan
    & openssl req -new -x509 -key server.key -out server.crt -days 365 -subj "/C=HU/ST=Budapest/L=Budapest/O=Haztartasi App/OU=Development/CN=$ipAddress" -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:$ipAddress"
    
    Write-Host
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "SSL tanúsítvány sikeresen létrehozva!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host
    Write-Host "Fájlok helye: $(Get-Location)" -ForegroundColor Yellow
    Write-Host "- server.key (privát kulcs)" -ForegroundColor White
    Write-Host "- server.crt (tanúsítvány)" -ForegroundColor White
    Write-Host
    Write-Host "Most frissítsd a .env fájlt:" -ForegroundColor Cyan
    Write-Host "SSL_CRT_FILE=./ssl/server.crt" -ForegroundColor White
    Write-Host "SSL_KEY_FILE=./ssl/server.key" -ForegroundColor White
    Write-Host "HTTPS=true" -ForegroundColor White
    
} catch {
    Write-Host "HIBA: OpenSSL nem található!" -ForegroundColor Red
    Write-Host
    Write-Host "Telepítési lehetőségek:" -ForegroundColor Yellow
    Write-Host "1. Chocolatey: choco install openssl" -ForegroundColor White
    Write-Host "2. Letöltés: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor White
    Write-Host "3. Git Bash használata (ha telepítve van Git)" -ForegroundColor White
}

Set-Location ".."
Read-Host "Nyomj Enter-t a folytatáshoz"

@echo off
rem BTM GAS deploy: push booking-script.gs -> update production deployment (URL unchanged) -> health check
rem Production deployment ID is fixed; changing it would change the public web app URL.
cd /d "%~dp0"

echo [1/3] clasp push...
call clasp push -f
if errorlevel 1 goto :err

echo [2/3] update production deployment (URL unchanged)...
call clasp update-deployment -d "deploy %date% %time:~0,5%" AKfycby_j23qQkb6hhZ90wkwLUdwWFXLUpS5KWweJORvp0Z1EOXl0AuPkCAO1CUVQOpAXcoAQg
if errorlevel 1 goto :err

echo [3/3] health check (slots API)...
python -c "import requests; r = requests.get('https://script.google.com/macros/s/AKfycby_j23qQkb6hhZ90wkwLUdwWFXLUpS5KWweJORvp0Z1EOXl0AuPkCAO1CUVQOpAXcoAQg/exec', params={'action': 'slots'}, timeout=90); slots = r.json(); assert isinstance(slots, list), slots; print('health check OK:', len(slots), 'slots')"
if errorlevel 1 goto :err

echo.
echo DEPLOY OK
exit /b 0

:err
echo.
echo DEPLOY FAILED - check output above
exit /b 1

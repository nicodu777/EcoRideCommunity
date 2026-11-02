@echo off
rem ==================================================================
rem  EcoRide - ouvre VS Code sur les fichiers a montrer au jury,
rem  chacun a la bonne ligne, dans l'ordre du Dossier Professionnel :
rem   AT1 front : carte de trajet, double confirmation, envoi du token
rem   AT2 back  : table SQL, verrou, NoSQL, service metier, roles,
rem               validation Zod, verification du token, test
rem ==================================================================
cd /d "%~dp0"

where code >nul 2>nul
if errorlevel 1 (
  echo VS Code est introuvable. Installez-le depuis https://code.visualstudio.com
  pause
  exit /b 1
)

call code . ^
  -g client/src/components/trip/trip-card.tsx:16 ^
  -g client/src/components/trip/booking-confirmation-modal.tsx:149 ^
  -g client/src/lib/queryClient.ts:36 ^
  -g sql/schema.sql:83 ^
  -g server/repositories/UserRepository.ts:30 ^
  -g server/repositories/PreferenceRepository.ts:41 ^
  -g server/services/BookingService.ts:46 ^
  -g server/middlewares/auth.ts:80 ^
  -g shared/schema.ts:247 ^
  -g server/security/TokenVerifier.ts:35 ^
  -g tests/booking.test.ts:38

# Natural Root Healing

Natural Root Healing is a React/Vite storefront with an Express/TypeScript API and MongoDB persistence.

## Repository layout

- `frontend/` - React/Vite storefront, public assets, and customer UI
- `backend/` - Express API, MongoDB models, authentication, cart, and orders
- `docs/` - project prompts, development log, and implementation notes

## Run locally

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Backend:

```powershell
cd backend
npm install
npm run dev
```

The frontend uses port `5173` and the API uses port `4000` by default. Backend environment values belong in `backend/.env`; never put backend secrets in frontend variables.

## Checks

```powershell
cd frontend
npm run build

cd ..\backend
npm test
npm run typecheck
npm run build
```

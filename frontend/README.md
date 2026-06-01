# WMS Frontend

This frontend is set up to work without Create React App proxy middleware.

## API routing

- Production requests go to `/api/v1`, which should be handled by Nginx.
- Local `npm start` requests default to `http://localhost:3000/api/v1`.
- You can override the API base URL with `REACT_APP_API_BASE_URL`.

## Local development

Run the NestJS backend on port `3000`, then start the frontend:

```bash
npm start
```

## Production build

Create the frontend bundle:

```bash
npm run build
```

The generated `build/` folder is meant to be served by Nginx.

## Windows Nginx setup

1. Download the stable Windows ZIP from `https://nginx.org/en/download.html`.
2. Extract it to `C:\nginx`.
3. Copy `frontend/nginx/windows/nginx.conf` to `C:\nginx\conf\nginx.conf`.
4. Start the backend from `BACKEND` with `npm run start:dev`.
5. Build the frontend with `npm run build`.
6. Start Nginx from `C:\nginx` with `.\nginx.exe`.
7. Open `http://localhost`.

Useful commands:

```bash
.\nginx.exe -t
.\nginx.exe -s reload
.\nginx.exe -s stop
```

# Go API Explorer

![Go](https://img.shields.io/badge/go-latest-blue)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-3.4.17-brightgreen)
![Render](https://img.shields.io/badge/render-deployed-blue)

A minimal, production-ready **JSON API testing and exploration tool** written in Go.  
Designed for simplicity, learning, and smooth deployment with interactive frontend presets.

---

## Features

- Quickly **explore public APIs** with preset examples  
- **Auto-fill method, URL, and request body** on click  
- Supports `GET`, `POST`, `PUT`, `DELETE` requests  
- Displays **formatted (Pretty) or raw JSON** responses  
- **Searchable categories** for APIs: Animals, Fun, Space, Weather, Crypto, Media, Tech, Utility, Random  
- Fully **responsive layout** optimized for desktop and mobile  
- Serves all static assets (`index.html`, `script.js`, CSS) from `/static`  
- Deployable on **Render.com** with zero configuration  

---

## Tech Stack

- **Go** – backend server, proxies API requests and serves static files  
- **Tailwind CSS** – frontend styling and responsive layout  
- **Vanilla JS** – interactive form handling, presets, and dynamic sidebar  
- **In-memory presets** – stored in JS object for demo / portfolio use  

---

## TODO / Improvements

- [ ] **Direct API requests (bypass proxy)**  
  Add an optional toggle/button to send requests directly from the frontend for same-origin APIs. Useful for APIs that don't require CORS proxying.

- [ ] **CORS / Cross-Origin handling**  
  Improve handling of external APIs with CORS restrictions. Consider:
  - Adding `mode: 'cors'` and credentials options to `fetch`
  - Fallback to server-side proxy for APIs with strict CORS

- [ ] **Error handling & validation**  
  - Better frontend validation for URLs and JSON input  
  - Show more descriptive errors when proxy request fails

- [ ] **Request presets enhancements**  
  - Add custom user presets saved locally (localStorage)  
  - Support for more HTTP methods and headers

- [ ] **UI/UX improvements**  
  - Responsive layout tweaks for mobile (e.g., send button alignment)  
  - Optional dark/light theme toggle  
  - Loading spinner improvements

- [ ] **Security / Safety**  
  - Rate-limiting requests to prevent abuse via the proxy  
  - Input sanitization for request body

---

## Deployment on Render.com

This tool is optimized for **Render.com deployment**:

- Dynamic ports are handled via the `PORT` environment variable  
- Static assets served directly from the `/static` folder  
- Simply push your repo and let Render handle the rest  

---

## Usage

1. Open the deployed app URL  
2. Click on a preset API from the sidebar to auto-fill the form  
3. Adjust the HTTP method, URL, or JSON body if needed  
4. Click **Send** to see the response in the right panel  
5. Switch between **Pretty** and **Raw** view for request body  
6. Use the **Copy** button to copy current request info  

Enjoy a fully interactive, mobile-friendly JSON API Explorer, ready for demos or portfolio showcase!

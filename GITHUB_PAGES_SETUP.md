# GitHub Pages + Backend Setup

This project needs a backend for contact form and admin.

## 1) Keep frontend on GitHub Pages
- Push this folder to GitHub.
- Enable GitHub Pages for your repository.

## 2) Deploy backend (Node) separately
- Deploy the same project to a Node host (Render/Railway/VPS).
- Start command: `node server.js`
- Set environment variables:
  - `ADMIN_PASSWORD` = your admin password
  - `ADMIN_SESSION_TOKEN` = random long value
  - `FRONTEND_ORIGIN` = your GitHub Pages URL (example: `https://yourname.github.io`)

## 3) Connect GitHub Pages to backend
- Edit `config.js` in this repo.
- Set backend URL:

```js
window.WEBSITE_API_BASE = "https://your-backend-domain.com";
```

- Commit and push.

## 4) How it behaves
- Contact form on GitHub Pages sends to your backend.
- Admin links on homepage open backend admin login page.
- Messages are stored on backend only (not in GitHub Pages files).

# Architecture

Browser → React/Vite → Express REST API → SQLite

Core modules:
- auth.js: password hashing, JWT, RBAC
- db.js: relational schema/indexes
- paymentService.js: payment provider abstraction
- seed.js: demo catalog/users/coupons/banners
- index.js: REST API

Frontend:
- main.jsx: routes, pages, reusable product/header/admin components
- styles.css: responsive design system, accessibility/reduced motion

For production, split modules into route/controller/service/repository layers, use PostgreSQL, object storage, Redis, background jobs and a real payment provider.

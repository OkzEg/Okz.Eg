# OKZ.eg — Premium Footwear Store

OKZ.eg is a modern, full-stack e-commerce platform designed for premium footwear. It features a responsive customer storefront and a robust staff administration panel for managing products, orders, coupons, and inventory.

## 🚀 Tech Stack

### Frontend (`/client`)
- **Framework:** React 19 (via Vite)
- **Styling:** Tailwind CSS
- **Routing:** React Router v7
- **Icons:** Lucide React
- **HTTP Client:** Axios

### Backend (`/server`)
- **Environment:** Node.js / Express
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma
- **Authentication:** JWT (JSON Web Tokens) with role-based access control
- **Storage:** Cloudinary (for product images and receipts)
- **Security:** Helmet, express-rate-limit, bcrypt

---

## 📁 Project Structure

This is a monorepo containing both the frontend client and the backend server.

```
OKZ.eg/
├── client/          # React storefront & admin panel UI
├── server/          # Node.js / Express API & Prisma database schema
├── .env             # Global environment variables
└── package.json     # Global scripts for managing the monorepo
```

---

## 🛠 Local Setup & Development

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [PostgreSQL](https://www.postgresql.org/) database (or a [Supabase](https://supabase.com/) project)
- [Cloudinary](https://cloudinary.com/) account for image uploads

### 2. Environment Variables
Create a `.env` file in the root directory (and/or inside `/server`) with the following required variables:

```env
# Database
DATABASE_URL="postgres://user:password@host:port/database"
DIRECT_URL="postgres://user:password@host:port/database"

# Security & Auth
JWT_SECRET="your_super_secret_jwt_key_here"
NODE_ENV="development"
CORS_ORIGINS="http://localhost:5173,http://localhost:3000"

# Mail Settings (Optional - for order confirmations and audit alerts)
SMTP_HOST="smtp.gmail.com"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Cloudinary (Optional - for image/receipt uploads)
CLOUDINARY_URL="cloudinary://api_key:api_secret@cloud_name"
```

### 3. Install Dependencies
Install dependencies for both the root, client, and server:
```bash
npm install
cd client && npm install
cd ../server && npm install
```

### 4. Database Setup
Push the Prisma schema to your PostgreSQL database and seed initial data:
```bash
cd server
npx prisma db push
node prisma/seed.js
```

### 5. Running the Application

**Run the Backend (Server):**
```bash
cd server
npm run dev
```
The server will start on `http://localhost:5000` (or whatever `PORT` is specified).

**Run the Frontend (Client):**
```bash
cd client
npm run dev
```
The client will start on `http://localhost:5173`.

---

## ✨ Features

- **Responsive Storefront:** A beautiful, mobile-first design optimized for shopping on any device.
- **Product Catalog:** Advanced filtering, category browsing, and high-quality image sliders.
- **Shopping Cart & Checkout:** Seamless guest and authenticated checkout flows with integrated coupon validation.
- **Admin Dashboard:** Comprehensive staff panel for managing inventory, viewing order statuses, and tracking sales.
- **Inventory Management:** Granular stock tracking per product size and color.
- **User Accounts:** Secure registration, authentication, and profile management for customers.

---

## 📄 License
Private and Confidential. All rights reserved.

# 🍳 Local Chef Bazaar - Backend Server

This is the robust and scalable backend server for **Local Chef Bazaar**, a 3-tier food marketplace ecosystem. It manages secure data flow, role-based access control, and payment integrations.

## 🚀 Live Server
- **Server API:** (https://local-chef-bazaar-server-gold.vercel.app/)

## 🛠️ Tech Stack
- **Engine:** Node.js & Express.js
- **Database:** MongoDB
- **Authentication:** Firebase Admin SDK & JWT
- **Payments:** Stripe API
- **Deployment:** Vercel / Render

## ✨ Key Features
- **Role-Based Access (RBAC):** Specialized logic and protected routes for Users, Chefs, and Admins.
- **Secure Payments:** Full integration with Stripe for processing meal orders.
- **Dynamic CRUD:** Efficient management of meals, reviews, and user orders.
- **Admin Dashboard:** Aggregated data APIs for revenue tracking and user management.
- **Security:** Middleware-based token verification and secure environment handling.

## 🔑 Setup Environment
Create a `.env` file in the root directory and add:
```env
PORT=5000
DB_USER=your_mongodb_username
DB_PASS=your_mongodb_password
STRIPE_SECRET_KEY=your_stripe_secret_key
ACCESS_TOKEN_SECRET=your_jwt_secret


## 🏃 Installation & Local Setup

Follow these steps to run the frontend on your local machine:

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/local-chef-client.git](https://github.com/your-username/local-chef-client.git)

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
```


## 🗄️ Database Schema (MongoDB Atlas)

The project uses a structured NoSQL database with the following key collections:

| Collection Name | Description |
| :--- | :--- |
| **users** | Stores user profiles, roles (Admin/Chef/User), and account details. |
| **meals** | Contains all meal listings with titles, prices, and chef information. |
| **order_collection** | Tracks all meal orders placed by customers. |
| **payments** | Records successful Stripe transaction details and history. |
| **reviews** | Stores customer feedback and ratings for specific meals. |
| **request** | Manages requests (e.g., users applying to become a Chef). |
| **favourites** | Maintains a list of bookmarked or favorite meals for users. |
| **contactMessages** | Stores inquiries and messages sent via the contact form. |


## 🏃 Installation & Local Setup

Follow these steps to run the frontend on your local machine:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/robiulhasanmumin/LocalChefBazaar_Server_a11/
   cd LocalChefBazaar_Server_a11
   npm install
   npm start

# Digital Life Lesson - Backend API 🚀

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/express-%3E%3D4.0.0-black)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/mongodb-%3E%3D4.0-green)](https://www.mongodb.com/)

A robust, production-ready REST API backend for the Digital Life Lesson
platform. Built with Express.js, MongoDB, and Firebase for managing lessons,
users, payments, and content moderation.

## 🎯 Overview

This backend server provides comprehensive APIs for:

- User authentication and management
- Lesson CRUD operations with filtering and pagination
- User engagement (likes, favorites, comments)
- Content reporting and moderation
- Stripe payment processing and subscription management
- Admin dashboard statistics and analytics
- Role-based access control

## 🌟 Core Features

### Core Features

- **Lesson Management** - Create, read, update, and delete lessons with rich
  content
- **User Authentication** - Secure authentication using Firebase
- **Premium Subscription** - Integrated Stripe payment for premium content
  access
- **Favorites System** - Save and manage favorite lessons
- **Engagement Features** - Like lessons, leave comments, and track engagement
  metrics
- **Report System** - Users can report inappropriate content

### Creator Features

- **Creator Dashboard** - Manage published and drafted lessons
- **Weekly Statistics** - Track likes, comments, favorites, and contributor
  score
- **Lesson Analytics** - View engagement metrics for your lessons
- **Creator Profile** - Build your public creator profile

### Admin Features

- **Admin Dashboard** - Comprehensive platform statistics and management
- **Content Moderation** - Review, feature, and manage lessons
- **Report Management** - Handle user reports and content violations
- **User Management** - Manage user roles and permissions
- **Platform Analytics** - Track user growth, lesson growth, and platform health

### Additional Features

- **Search & Filter** - Find lessons by category, tone, and keywords
- **Pagination** - Efficient lesson browsing with pagination
- **Responsive Design** - Fully responsive across all devices
- **Top Contributors** - Highlight community contributors
- **Similar Lessons** - Discover related content

## 🛠️ Tech Stack

### Frontend

- **React 18** - UI library
- **Vite** - Lightning-fast build tool
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Firebase Authentication** - User authentication
- **Stripe.js** - Payment integration
- **ESLint** - Code quality and linting

### Backend

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Firebase Admin SDK** - Backend authentication
- **Stripe API** - Payment processing
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment configuration

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v14.0.0 or higher
- **npm** v6.0.0 or higher
- **MongoDB** v4.0 or higher (local or cloud)
- **Git** for version control

### Required Accounts

- Firebase project for authentication
- Stripe account for payment processing
- MongoDB database (Atlas or local)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/digital-life-lesson.git
cd DigitalLifeLession
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file
touch .env
```

#### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/Digital-Life-Lesson?retryWrites=true&w=majority

# Firebase Service Account (Base64 encoded)
FB_SERVICE_KEY=your_base64_encoded_firebase_service_key

# Stripe
STRIPE_SECRECT_KEY=sk_test_your_stripe_secret_key

# Client Domain
CLIENT_DOMAIN=http://localhost:5173
```

#### Firebase Service Key Setup

1. Go to Firebase Console → Project Settings
2. Download your service account key (JSON file)
3. Encode it in Base64:
   ```bash
   base64 -i serviceAccountKey.json
   ```
4. Paste the output in `FB_SERVICE_KEY`

#### Start Backend Server

```bash
npm start
# Server will run on http://localhost:3000
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env file
touch .env.local
```

#### Frontend Environment Variables

Create a `.env.local` file in the `frontend` directory:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Stripe
VITE_STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key

# API Base URL
VITE_API_BASE_URL=http://localhost:3000
```

#### Start Frontend Server

```bash
npm run dev
# Application will run on http://localhost:5173
```

## 📁 Project Structure

```
DigitalLifeLession/
── backend/
   ├── index.js                 # Main server file with all routes
   ├── serviceKeyConverter.js   # Firebase service key utility
   ├── package.json             # Backend dependencies
   └── .env                     # Environment variables (not tracked)
   |--readme.md

   
 frontend/
   ├── src/
   │   ├── components/          # Reusable React components
   │   │   ├── Dashboard/       # Admin/Creator dashboard components
   │   │   ├── Form/            # Form components (Add/Update Lesson)
   │   │   ├── Home/            # Home page components
   │   │   ├── Modal/           # Modal dialogs
   │   │   ├── profile/         # User profile components
   │   │   ├── Shared/          # Shared UI components
   │   │   └── TopContributors/ # Top contributors display
   │   ├── pages/               # Page components
   │   │   ├── Dashboard/       # Dashboard pages by role
   │   │   ├── Home/            # Home page
   │   │   ├── Lessons/         # Lesson pages
   │   │   ├── Login/           # Authentication pages
   │   │   ├── Payment/         # Payment pages
   │   │   └── SignUp/          # Registration pages
   │   ├── hooks/               # Custom React hooks
   │   ├── providers/           # Context providers
   │   ├── routes/              # Route definitions
   │   ├── firebase/            # Firebase configuration
   │   ├── utils/               # Utility functions
   │   ├── main.jsx             # React entry point
   │   └── index.css            # Global styles   ├── vite.config.js           # Vite configuration
   ├── eslint.config.js         # ESLint configuration
   ├── package.json             # Frontend dependencies
   └── .env.local               # Environment variables (not tracked)

```

## 🔌 API Endpoints

### Authentication

- `POST /user` - Create new user
- `GET /role` - Get current user's role
- `GET /single-user` - Get current user's data

### Lessons

- `POST /lessons` - Create a new lesson (JWT required)
- `GET /lessons/:id` - Get single lesson by ID
- `GET /my-lessons/:email` - Get lessons created by user
- `GET /public-lessons` - Get public lessons with filters and pagination
- `GET /featured-lessons` - Get featured lessons
- `PATCH /update-lessons/:lessonId` - Update lesson (JWT required)
- `DELETE /lessons/:lessonId` - Delete lesson (JWT required)

### Engagement

- `PATCH /lessons/like` - Like/unlike a lesson (JWT required)
- `PATCH /lessons/save-to-favorites` - Save/remove from favorites (JWT required)
- `POST /create-comment` - Add comment to lesson (JWT required)

### User Profiles

- `GET /user-by-email/:email` - Get user profile by email
- `PATCH /update-profile` - Update user profile (JWT required)
- `GET /lesson-creator/:lessonId` - Get lesson creator's profile

### Admin Routes

- `GET /all-users` - Get all users (Admin only)
- `DELETE /delete-user/:userId` - Delete user (Admin only)
- `GET /admin/all-lessons` - Get all lessons with filters (Admin only)
- `GET /admin/dashboard-stats` - Get dashboard statistics (Admin only)
- `GET /admin/reported-lessons` - Get reported lessons (Admin only)
- `PATCH /admin/lessons/featured/:id` - Mark lesson as featured (Admin only)
- `DELETE /admin/lessons/:lessonId` - Delete lesson as admin (Admin only)

### Payments

- `POST /create-checkout-session` - Create Stripe checkout session
- `POST /payment-success` - Handle payment success
- `GET /users/plan/:email` - Check user's premium status

### Reporting

- `POST /lessons/report` - Report a lesson (JWT required)
- `GET /admin/reports/lesson/:lessonId` - Get reports for lesson (Admin only)

## 📖 Usage

### Creating a Lesson

1. Sign up or log in to your account
2. Navigate to "Create Lesson" or the Creator Dashboard
3. Fill in lesson details:
   - Title
   - Description
   - Category
   - Emotional Tone
   - Content
   - Cover Image
4. Save as draft or publish immediately

### Browsing Lessons

1. Go to the Home page or Lessons section
2. Use filters to narrow down by:
   - Category
   - Emotional Tone
   - Search keywords
3. Click on a lesson to view full details
4. Like, save to favorites, or comment on lessons

### Admin Dashboard

1. Log in with an admin account
2. Navigate to Admin Dashboard
3. Manage users, lessons, and reports
4. View platform statistics and growth metrics

## 🔐 Security

- **JWT Authentication** - Secure token-based authentication
- **Firebase Authentication** - Industry-standard authentication
- **Role-Based Access Control** - Different permissions for users, creators, and
  admins
- **Input Validation** - Server-side validation of all inputs
- **CORS Protection** - Restricted cross-origin requests
- **Environment Variables** - Sensitive data in environment files (not
  committed)

## 🧪 Testing

### Backend Testing

```bash
cd backend
npm test
```

### Frontend Testing

```bash
cd frontend
npm test
```

### Build Frontend

```bash
cd frontend
npm run build
```

## 🐛 Troubleshooting

### Connection Issues

- Ensure MongoDB is running and accessible
- Check that all environment variables are correctly set
- Verify Firebase project configuration

### Authentication Errors

- Clear browser cookies and local storage
- Re-authenticate in Firebase Console
- Verify JWT tokens are being sent correctly

### Payment Issues

- Use Stripe test cards for testing
- Check Stripe API keys are correct
- Verify webhook configuration

### CORS Errors

- Ensure `CLIENT_DOMAIN` environment variable matches your frontend URL
- Check CORS configuration in backend `index.js`

## 📈 Growth & Performance

The platform tracks weekly statistics including:

- Lessons created
- Likes received
- Favorites received
- Comments given
- Weekly contributor score

Metrics help identify top contributors and track platform engagement.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Coding Standards

- Use consistent naming conventions
- Follow ESLint rules
- Write meaningful commit messages
- Add comments for complex logic
- Test your changes thoroughly

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

## 👥 Authors

- **DS Technology** - Initial development

## 📧 Support & Contact

For support, please reach out to:

- Email: support@digitallifelesson.com
- GitHub Issues:
  [Create an issue](https://github.com/yourusername/digital-life-lesson/issues)

## 🙏 Acknowledgments

- Firebase for authentication services
- Stripe for payment processing
- MongoDB for database
- React and Node.js communities

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Stripe Documentation](https://stripe.com/docs)

---

Made with ❤️ by MASUD RANA

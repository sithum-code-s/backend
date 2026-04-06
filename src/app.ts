import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";
import userPreferencesRoutes from "./modules/user-preferences/user-preferences.routes";
import merchantProfileRoutes from "./modules/merchant-profile/merchant-profile.routes";
import dealsRoutes from "./modules/deals/deals.routes";
import aiRoutes from "./modules/ai/ai.routes";
import publicDealsRoutes from "./modules/public-deals/public-deals.routes";
import adminRoutes from "./modules/admin/admin.routes";
import dealRequestsRoutes from "./modules/deal-requests/deal-requests.routes";
import cookieParser from "cookie-parser";
import { csrfProtection, setCsrfCookie } from "./middleware/csrf.middleware";

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:5173",        // Web app
        "http://localhost:3000",        // Backend itself
        "http://10.0.2.2:3000",         // Android emulator
        "https://frontend-beyond-isla-40.vercel.app/",
        /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // Local network devices
      ];
      
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin || allowedOrigins.some(allowed => 
        typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
      )) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);


app.use(express.json());
app.use(cookieParser());
// Set CSRF cookie for all requests
app.use(setCsrfCookie);
// Apply CSRF protection to all API routes
app.use(csrfProtection);


import communityRoutes from "./modules/community/community.routes";
import userProfileRoutes from "./modules/user-profile/user-profile.routes";

// routes
app.use("/api/auth", authRoutes);
app.use("/api/user-preferences", userPreferencesRoutes);
app.use("/api/user-profile", userProfileRoutes);
app.use("/api/merchant-profile", merchantProfileRoutes);
app.use("/api/deals", dealsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/public/deals", publicDealsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/deal-requests", dealRequestsRoutes);
app.use("/api/community", communityRoutes);

export default app;
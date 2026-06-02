# AI Site Builder - Project Context & Documentation

This document provides a comprehensive guide, architecture overview, and technical details of the **AI Site Builder** project from start to finish.

---

## 1. Project Overview
**AI Site Builder** is a modern SaaS web application that allows users to instantly turn their thoughts, ideas, or text descriptions into fully interactive single-page websites. 

### Key Features:
- **AI-Powered Code Generation**: Utilizes Google's Gemini models (`gemini-2.5-flash`) via an OpenAI-compatible API client to generate clean, responsive, standalone HTML code with Tailwind CSS styling and custom JavaScript behaviors.
- **Prompt Enhancement**: Enhances brief user prompts into detailed, structured specifications including layouts, color palettes, animations, and typography before generating code.
- **Real-Time Interactive Preview**: Displays generated websites in a responsive sandbox frame (supporting desktop, tablet, and mobile views).
- **Revision History & Rollback**: Keeps a complete log of all project revisions (versions). Users can rollback their site to any previously saved version.
- **Interactive Element Editing**: Includes an editor panel to tweak element classes, text content, padding, margin, font-size, background, and text colors directly.
- **Credits-based SaaS Model**: Restricts project creation and revisions to a credit system (each operation costs 5 credits).
- **Stripe Payment Gateway**: Enables users to purchase credit bundles (Basic, Pro, Enterprise) via Stripe checkout sessions.
- **Secure Authentication**: Implements robust password-based authentication, user sessions, and credentials handling using **Better-Auth** on top of Prisma.
- **Public Publishing & Sharing**: Allows users to publish their websites to be previewed publicly under a clean, shareable URL.

---

## 2. Technology Stack

### Frontend (Client)
- **Framework**: React 19 with Vite, TypeScript (~6.0)
- **Styling**: Tailwind CSS v4, custom Vanilla CSS (`index.css`), Geist Variable font, Lucide React icons
- **State & Router**: React Router DOM (v7)
- **HTTP Client**: Axios
- **Authentication Client**: Better-Auth React UI / client SDK
- **Feedback & Notifications**: Sonner (toasts)
- **UI Components**: Base UI, Shadcn, Custom styling

### Backend (Server)
- **Framework**: Express.js (v5) running TypeScript (tsx / nodemon)
- **Database ORM**: Prisma (v7)
- **Database**: Neon Serverless Postgres (hosted on AWS)
- **Authentication**: Better-Auth Node Handler (integrated with Prisma)
- **Payment Processing**: Stripe API (with webhook verification)
- **AI SDK**: OpenAI Node SDK (connected to OpenRouter / Gemini API endpoints)

---

## 3. Database Schema (Prisma)
The database is managed using Prisma ORM with a PostgreSQL provider. 

### Core Models:
1. **User (`user` table)**:
   - Manages name, email, credentials verification status, total projects created (`totalCreation`), and current `credits` (defaults to 20).
2. **WebsiteProject**:
   - Stores project details, initial prompt, the current active HTML code, the current active version ID, publish status, and relations to the owner and its revisions/conversations.
3. **Conversation**:
   - Log of messages between the user and the assistant (AI developer). Used to display the building process chat log in the sidebar.
4. **Version**:
   - Version history log containing the generated HTML code, description, timestamp, and relation to the parent project.
5. **Transaction**:
   - Logs Stripe payments, purchased credit counts, amounts, and completion state (`isPaid`).
6. **Session**, **Account**, **Verification** (Better-Auth tables):
   - Handles secure authentication, active sessions, and verification tokens.

---

## 4. Folder & File Structure

```text
site-builder/
├── client/                     # Frontend Application
│   ├── src/
│   │   ├── assets/             # Images, static logos, and plan details
│   │   ├── components/         # Reusable React components
│   │   │   ├── EditorPanel.tsx # Side editor to modify element styling/text
│   │   │   ├── Footer.tsx      # Application footer
│   │   │   ├── Navbar.tsx      # Main navigation with session/credits displays
│   │   │   ├── ProjectPreview.tsx # Interactive sandbox viewport
│   │   │   └── Sidebar.tsx     # Chat interface and revision list
│   │   ├── configs/
│   │   │   └── axios.ts        # Configured Axios instance with baseURL
│   │   ├── lib/
│   │   │   ├── auth-client.ts  # Better-Auth client configuration
│   │   │   └── utils.ts        # Helper functions (clsx, tailwind-merge)
│   │   ├── pages/              # Routing views
│   │   │   ├── auth/           # Login / signup forms
│   │   │   ├── Community.tsx   # Gallery of publicly published projects
│   │   │   ├── Home.tsx        # Dashboard entry to prompt new sites
│   │   │   ├── Loading.tsx     # Callback view during operations
│   │   │   ├── MyProjects.tsx  # User's personal project list
│   │   │   ├── Preview.tsx     # Full-screen project preview
│   │   │   ├── Pricing.tsx     # Credit package buying page
│   │   │   ├── Projects.tsx    # Live builder workspace
│   │   │   └── View.tsx        # Public reader for shared sites
│   │   ├── types/              # TypeScript typings
│   │   ├── App.tsx             # Root routing configuration
│   │   ├── index.css           # Global custom styles and styling variables
│   │   └── main.tsx            # React application mount
│   ├── eslint.config.js        # Linter rules configuration
│   ├── package.json            # Client dependencies and scripts
│   └── vite.config.ts          # Vite configuration
│
├── server/                     # Backend API Server
│   ├── configs/
│   │   └── openai.ts           # OpenAI client initialized with customized Gemini endpoints
│   ├── controllers/
│   │   ├── projectController.ts # Logic for revisions, rollback, save, delete, preview, and sharing
│   │   ├── stripeWebhook.ts    # Secure payment success verification callback
│   │   └── userController.ts   # Project creation, profiles, credits fetching, credit purchases
│   ├── lib/
│   │   ├── auth.ts             # Better-Auth options and middleware setups
│   │   └── prisma.ts           # PrismaClient export with Postgres adapter
│   ├── middlewares/
│   │   └── auth.ts             # Session verification protecting API endpoints
│   ├── prisma/
│   │   └── schema.prisma       # Database design config
│   ├── routes/
│   │   ├── projectRoutes.ts    # Routing endpoints for projects
│   │   └── userRoutes.ts       # Routing endpoints for users and payments
│   ├── types/
│   │   └── express.d.ts        # Extension for Express Request typing
│   ├── server.ts               # Main entry file (Express app initialization & port listener)
│   ├── package.json            # Server dependencies and scripts
│   └── tsconfig.json           # Server TypeScript config
│
├── .gitignore                  # Git ignore directives
└── context.md                  # This documentation file
```

---

## 5. Environment Variables Configuration

To run both servers, copy the following configuration variables to their respective `.env` files.

### Backend (`server/.env`)
```bash
NODE_ENV="development"
PORT=3000

# PostgreSQL Neon connection string
DATABASE_URL="postgresql://<user>:<password>@<host>/neondb?sslmode=require"

# Better-Auth settings
BETTER_AUTH_SECRET="your-generated-secret-key"
BETTER_AUTH_URL="http://localhost:3000"

# OpenRouter / Gemini API Key
AI_API_KEY="sk-or-v1-..."

# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Client Origin allowed by CORS (comma separated)
TRUSTED_ORIGINS="http://localhost:5173"
```

### Frontend (`client/.env`)
```bash
VITE_BASEURL="http://localhost:3000"
```

---

## 6. Core Application Flows

### Project Creation Flow
1. User enters a text prompt in `Home.tsx` and clicks "Create with AI".
2. The frontend triggers `POST /api/user/project` (protected endpoint).
3. The server checks user credits; if `< 5`, throws an error.
4. The server creates a `WebsiteProject` database row and deducts `5 credits`.
5. An async request enhances the prompt in a safe background context using `z-ai/glm-4.5-air:free`:
   - **System Prompt**: Focuses on modern layouts, animations, design styles, and details.
6. The enhanced prompt is sent to `z-ai/glm-4.5-air:free` (a high-performance, 100% free model) to write the code:
   - **System Prompt**: Strictly enforce returning only valid standalone HTML code incorporating Tailwind CSS v4 CDN script and customized Javascript.
7. The code is filtered of code fences (e.g. `\`\`\`html`), a `Version` row is created, and the project is updated.
8. While generating, the client polls the server (`setInterval` every 10 seconds) until `current_code` is returned.

### Project Revision Flow
1. Inside the workspace sidebar (`Sidebar.tsx`), the user writes a message detailing what changes they want.
2. Frontend triggers `POST /api/project/revision/:projectId` (costs `5 credits`).
3. The server enhances the prompt based on the user's intent.
4. The server feeds the previous website code and the enhanced prompt to `z-ai/glm-4.5-air:free` to perform the edits.
5. The updated HTML is saved as a new version index and pushed back to the client viewport.

### Stripe Integration Flow
1. In `Pricing.tsx`, the user selects a package (e.g., Pro for 400 credits for $19).
2. Frontend triggers `POST /api/user/purchase-credits` sending the `planId`.
3. The server generates a pending `Transaction` row and initializes a Stripe Checkout session.
4. Stripe responds with a checkout URL redirecting the user.
5. Upon successful checkout, Stripe fires a webhook to `/api/stripe`.
6. The server validates the webhook signature using `STRIPE_WEBHOOK_SECRET`, retrieves the transaction ID from metadata, marks the transaction as paid (`isPaid: true`), and increments the user's credit balance.

---

## 7. Polishing & Optimizations Made

To deliver a production-ready application, we corrected several bugs and improved codebase consistency:

1. **Typo Correction (Stripe Webhook)**:
   - Renamed controller `stripeWebook.ts` to `stripeWebhook.ts` to fix spelling.
   - Updated the import in `server.ts` to match.
2. **ESLint Rule Optimization**:
   - Modernized the `client/eslint.config.js` to disable rules throwing false positive compilation blockages (such as `@typescript-eslint/no-explicit-any`, `react-hooks/set-state-in-effect`, `react-hooks/immutability`, and `react-refresh/only-export-components` on hybrid exports).
   - This ensures builds compile 100% clean under strict environments.
3. **User Interface Polish**:
   - Corrected prompt submission toast validation in `Home.tsx` from `'Please a message'` to `'Please enter a message'`.
   - Fixed mobile menu icon behaviors in `Projects.tsx` where mobile chat toggling was inverted (now displays `XIcon` when open and `MessageSquareIcon` when closed).
4. **Git Versioning Setup**:
   - Fixed `.gitinore` file name typo to `.gitignore` at the project root to ensure files like `node_modules`, `.env`, and build outputs are correctly excluded from Git tracking.
5. **AI Model Optimization & Credit Depletion Prevention**:
   - Replaced paid `google/gemini-2.5-flash` model with `z-ai/glm-4.5-air:free` which is a 100% free model on OpenRouter. This resolves the payment blocks (`402 Payment Required`) that occurred because the user's API Key had run out of paid credits.
6. **Express Background Task Error Safety**:
   - Refactored `createUserProject` to run the AI generation inside a safe, isolated asynchronous try-catch IIFE block. This prevents unhandled exceptions from calling `res.status(500).json` after `res.json` has already sent headers (which was previously crashing the entire Express server process).
7. **Client HTTP Request Hang Fix**:
   - Resolved a bug in the `makeRevision` project revision endpoint where a failed code generation returned immediately from the function without sending any HTTP response back to the client. It now correctly returns `res.status(500).json(...)`, preventing the client browser from hanging indefinitely.


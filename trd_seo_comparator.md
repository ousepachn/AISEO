# Technical Requirements Document: AI SEO Ranking Comparator

**Version:** 1.1

**Date:** June 7, 2025

**Author:** Gemini

---

## 1.0 Overview

### 1.1 Purpose
This document outlines the technical requirements, architecture, and implementation details for the **AI SEO Ranking Comparator** web application. It is based on the features and user stories defined in the Product Requirements Document (PRD v1.2) and is intended for architectural review and development guidance.

### 1.2 Technology Stack
* **Frontend:** Next.js (React) hosted on Vercel.
* **Backend:** Serverless functions using Google Cloud Functions for Firebase.
* **Database:** Google Firestore.
* **External Services:**
    * AI Models: Gemini API, Claude API, ChatGPT API.
    * SEO Analysis: Google PageSpeed Insights API.
    * Email Delivery: A third-party service like SendGrid or Mailgun, integrated via Firebase.
    * PDF Generation: A server-side library like `pdf-lib` or Puppeteer.

---

## 2.0 System Architecture

### 2.1 High-Level Diagram
```
+----------------+      +---------------------+      +------------------------+
|   User Browser |----->|  Next.js Frontend   |----->|   Firebase Functions   |
| (React Client) |      |    (on Vercel)      |      | (HTTP Trigger/Backend) |
+----------------+      +---------------------+      +------------------------+
                                                           |
                                                           |
       +---------------------------------------------------+---------------------------------------------------+
       |                                                   |                                                   |
       v                                                   v                                                   v
+---------------+             +---------------------+             +---------------------+             +----------------+
|  LLM APIs     |             | PageSpeed Insights  |             |      Firestore      |             | Email & PDF    |
| - Gemini      |<------------|         API         |<------------|      (Database)     |<------------| Generation     |
| - Claude      |             +---------------------+             +---------------------+             | Services       |
| - ChatGPT     |                                                                                       +----------------+
+---------------+
```

### 2.2 Architectural Principles
* **Serverless First:** Leverage managed, auto-scaling services (Vercel, Firebase) to minimize infrastructure management and handle variable loads efficiently.
* **Decoupled Frontend/Backend:** The Next.js frontend is decoupled from the backend logic, communicating via a defined API endpoint. This allows for independent development and scaling.
* **Asynchronous Operations:** The core analysis process involves multiple long-running API calls. The architecture will handle these asynchronously to avoid blocking and provide a responsive user experience.

---

## 3.0 Frontend (Next.js on Vercel)

### 3.1 Framework and Structure
* **Next.js:** Chosen for its modern App Router, Server Components, and seamless deployment on Vercel.
* **Project Structure:** A lean, focused structure will be used, containing only the necessary elements for the application.
    ```
    .
    ├── firebase/
    │   └── functions/
    │       ├── src/
    │       │   ├── controllers/
    │       │   │   └── analysis.js     # Main logic for calling AIs, SEO APIs, etc.
    │       │   └── index.js            # Defines Firebase Function endpoints
    │       ├── package.json
    │       └── .firebaserc
    │
    ├── src/
    │   ├── app/
    │   │   ├── layout.js               # Main layout
    │   │   ├── page.js                 # The main home page where the tool lives
    │   │   ├── globals.css             # Global styles
    │   │   └── api/
    │   │       └── analyze/
    │   │           └── route.js        # Proxy API route to securely call Firebase
    │   │
    │   ├── components/
    │   │   ├── ui/                     # Reusable, unstyled primitive components
    │   │   ├── Header.js               # Main header component
    │   │   ├── Footer.js               # Main footer component
    │   │   ├── InputForm.js            # The main form for user input
    │   │   └── ResultsDisplay.js       # Component to render analysis results
    │   │
    │   ├── lib/
    │   │   └── firebase.js             # Firebase client-side initialization (if needed)
    │   │
    │   └── public/
    │       ├── robots.txt              # Static file
    │       └── sitemap.xml             # Static file
    │
    ├── .gitignore
    ├── next.config.js
    ├── package.json
    └── tailwind.config.js
    ```

### 3.2 Key Components & UI
* **Input Form (`/src/components/InputForm.js`):**
    * A React component with controlled inputs for all user-provided data.
    * Will include client-side validation for the URL and email format before submission.
    * An "Analyze" button will trigger the API call to the backend.
* **Results Display (`/src/components/ResultsDisplay.js`):**
    * Receives the JSON analysis report from the backend.
    * Uses cards to display each section of the report: AI Comparison, About Us Analysis, Sales Inquiries, and SEO Analysis.
    * Will use data visualization elements (e.g., gauges for scores) for clarity.
* **State Management:** React's built-in `useState` and `useContext` hooks will manage form state, loading status, and API results.

### 3.3 API Communication
* The frontend will make a `POST` request to its own backend proxy route at **/api/analyze**.
* This proxy route (`/src/app/api/analyze/route.js`) will then securely call the primary Firebase Function endpoint. This pattern is best practice for keeping backend credentials and logic hidden from the client.
* The UI will display a loading state while awaiting the response.

## 4.0 Backend (Google Firebase)

### 4.1 Firebase Functions
* **Primary Endpoint (`/analyze`):**
    * An HTTP-triggered Cloud Function written in Node.js/TypeScript.
    * **Workflow:**
        1.  Receives and validates the `POST` request from the frontend proxy.
        2.  Initiates all external data fetching tasks in parallel using `Promise.allSettled`.
        3.  Aggregates all results into a single JSON object.
        4.  Saves the complete report to a Firestore document.
        5.  If an email is provided, asynchronously triggers a separate function (`/generateAndSendPdf`) via Pub/Sub.
        6.  Returns the JSON report to the frontend proxy.
* **PDF Generation & Email (`/generateAndSendPdf`):**
    * A Pub/Sub-triggered Cloud Function.
    * **Workflow:**
        1.  Receives the Firestore document ID.
        2.  Fetches the report data from Firestore.
        3.  Generates an HTML representation of the report.
        4.  Uses a library (e.g., Puppeteer) to convert the HTML to a PDF.
        5.  Calls an external email service API (e.g., SendGrid) to send the PDF.

### 4.2 Firestore Database
* **Collection:** `reports`
* **Document Schema:** Each document will represent a single analysis.
    ```json
    {
      "websiteUrl": "string",
      "email": "string | null",
      "submittedAt": "timestamp",
      "status": "string (processing | completed | failed)",
      "analysisResults": {
        "aiComparison": { "gemini": "string", "claude": "string", "chatgpt": "string" },
        "aboutUsAnalysis": { "matchSummary": "string", "similarityScore": "number" },
        "salesInquirySimulations": [
          { "query": "string", "gemini_rec": "string", "claude_rec": "string", "chatgpt_rec": "string" }
        ],
        "seoAnalysis": {
          "pageSpeed": {
            "mobile": { "performanceScore": "number", "seoScore": "number" },
            "desktop": { "performanceScore": "number", "seoScore": "number" }
          },
          "robotsTxtFound": "boolean",
          "sitemapXmlFound": "boolean",
          "h1TagsFound": "boolean",
          "imageAltsGood": "boolean",
          "recommendations": ["string"]
        }
      }
    }
    ```

### 4.3 Security
* **API Keys & Secrets:** All external API keys will be stored securely using Firebase Secret Manager and accessed only by the backend functions.
* **Firestore Security Rules:** Rules will be configured to prevent unauthorized data access.
    ```
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /reports/{reportId} {
          allow read: if false; // No public reads
          allow write: if request.auth == null; // Allow writes from server/functions
        }
      }
    }
    ```
* **Input Sanitization:** The backend function will sanitize all user-provided inputs.

---

## 5.0 Deployment & Operations
* **Frontend (Vercel):** The Next.js app will be linked to a Git repository. Pushes to the `main` branch will trigger automatic builds and deployments.
* **Backend (Firebase):** Firebase Functions will be deployed using the Firebase CLI.
* **Monitoring:** Utilize Google Cloud's built-in logging and monitoring for Firebase Functions.

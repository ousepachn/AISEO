# Detailed Build Guide: AI SEO Comparator

**Version:** 1.2

**Date:** June 7, 2025

**Author:** Gemini

## 1.0 Overview

### 1.1 Purpose
This document provides a detailed technical specification and build plan for the **AI SEO Ranking Comparator**. It expands on the initial TRD with code skeletons, library recommendations, and specific implementation steps to guide development.

### 1.2 Technology Stack
* **Frontend:** Next.js (App Router) on Vercel. UI with Tailwind CSS + shadcn/ui.
* **Backend:** Node.js on Google Cloud Functions for Firebase.
* **Database:** Google Firestore.
* **External Services:** Gemini API, Claude API, ChatGPT API, Google PageSpeed Insights API, SendGrid API.
* **PDF Generation:** Puppeteer.

### 1.3 Prerequisites
* Node.js v18+
* Vercel Account & CLI
* Google Cloud Project with Firebase enabled
* Firebase CLI (`npm install -g firebase-tools`)
* API keys for all external services.

---

## 2.0 System Architecture

*(The high-level diagram and architectural principles remain the same as in TRD v1.1)*

---

## 3.0 Frontend (Next.js) Implementation

### 3.1 Project Setup
1.  Initialize a new Next.js project:
    `npx create-next-app@latest ai-seo-comparator`
2.  Install UI dependencies:
    `npx shadcn-ui@latest init` (Follow prompts)
    `npm install lucide-react`
3.  Create the folder structure as defined in the TRD.

### 3.2 Key Components & Code Skeletons

#### **Proxy API Route (`/src/app/api/analyze/route.js`)**
This route securely forwards requests from the client to the Firebase backend.

```javascript
// src/app/api/analyze/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // 1. Get the request body from the client
    const body = await request.json();

    // 2. Validate essential inputs (e.g., websiteUrl)
    if (!body.websiteUrl) {
      return NextResponse.json({ error: 'Website URL is required' }, { status: 400 });
    }

    // 3. Get the Firebase Function URL from environment variables
    const firebaseFunctionUrl = process.env.FIREBASE_ANALYZE_FUNCTION_URL;
    if (!firebaseFunctionUrl) {
      console.error('Firebase function URL is not configured.');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // 4. Forward the request to the Firebase Function
    const firebaseResponse = await fetch(firebaseFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // 5. Check if the call to Firebase was successful
    if (!firebaseResponse.ok) {
        const errorData = await firebaseResponse.json();
        console.error('Error from Firebase function:', errorData);
        return NextResponse.json({ error: 'Failed to process analysis' }, { status: firebaseResponse.status });
    }
    
    // 6. Return the result from Firebase back to the client
    const data = await firebaseResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in proxy route:', error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}
```

#### **Input Form (`/src/components/InputForm.js`)**
```javascript
// src/components/InputForm.js
'use client';
import { useState } from 'react';
import { Button } from './ui/Button'; // Assuming shadcn/ui
import { Input } from './ui/Input';

export default function InputForm({ onAnalysisStart, onAnalysisComplete, onAnalysisError }) {
  const [formData, setFormData] = useState({
    websiteUrl: '',
    email: '',
    industry: '',
    location: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    onAnalysisStart(); // Notify parent component to show loader

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to get analysis results.');
      }

      const results = await response.json();
      onAnalysisComplete(results);
    } catch (error) {
      console.error(error);
      onAnalysisError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input name="websiteUrl" placeholder="[https://example.com](https://example.com)" value={formData.websiteUrl} onChange={handleChange} required />
      <Input name="email" type="email" placeholder="Enter your email for a PDF report (optional)" value={formData.email} onChange={handleChange} />
      {/* Add other inputs for industry, location, etc. */}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Analyzing...' : 'Analyze Website'}
      </Button>
    </form>
  );
}
```
---

## 4.0 Backend (Firebase) Implementation

### 4.1 Project Setup
1.  Navigate into the `firebase/` directory.
2.  Initialize Firebase: `firebase init functions`
    * Select your Google Cloud project.
    * Choose JavaScript or TypeScript.
    * Install dependencies.
3.  Install necessary libraries in `firebase/functions/`:
    `npm install axios @google-cloud/firestore @google-cloud/pubsub puppeteer @sendgrid/mail cheerio`
4.  Configure environment variables for the function:
    `firebase functions:config:set service.gemini_key="YOUR_KEY" service.claude_key="YOUR_KEY" ...`

### 4.2 Key Function Skeletons

#### **Main Analysis Controller (`firebase/functions/src/controllers/analysis.js`)**
This contains the core logic for the long-running process.

```javascript
// firebase/functions/src/controllers/analysis.js
const { getFirestore } = require('firebase-admin/firestore');
const { PubSub } = require('@google-cloud/pubsub');
const axios = require('axios');
const cheerio = require('cheerio');

const db = getFirestore();
const pubSubClient = new PubSub();

// Main analysis handler
exports.handleAnalysisRequest = async (req, res) => {
  const { websiteUrl, email, industry, location } = req.body;

  if (!websiteUrl) {
    return res.status(400).send({ error: 'Website URL is required.' });
  }

  // 1. Initiate all API calls in parallel
  const [geminiRes, pagespeedRes, robotsRes /*, ...other results */] = await Promise.allSettled([
    callGeminiAPI(websiteUrl, industry),
    callPageSpeedAPI(websiteUrl),
    axios.get(`${websiteUrl}/robots.txt`),
    // ... add calls for Claude, ChatGPT, sitemap, etc.
  ]);
  
  // 2. Aggregate results (check for fulfilled/rejected promises)
  const analysisResults = {
    aiComparison: {
      gemini: geminiRes.status === 'fulfilled' ? geminiRes.value : 'Error',
      // ...
    },
    seoAnalysis: {
      pageSpeed: pagespeedRes.status === 'fulfilled' ? pagespeedRes.value : 'Error',
      robotsTxtFound: robotsRes.status === 'fulfilled',
      // ...
    },
    // ... other analysis sections
  };

  // 3. Save the full report to Firestore
  const reportRef = await db.collection('reports').add({
    websiteUrl,
    email: email || null,
    submittedAt: new Date(),
    status: 'completed',
    analysisResults,
  });

  // 4. If email is provided, trigger PDF generation via Pub/Sub
  if (email) {
    const topicName = 'generate-pdf-report';
    const dataBuffer = Buffer.from(JSON.stringify({ documentId: reportRef.id, recipientEmail: email }));
    await pubSubClient.topic(topicName).publishMessage({ data: dataBuffer });
  }

  // 5. Return the aggregated results to the frontend
  res.status(200).send(analysisResults);
};

// --- Helper Functions for API Calls ---

async function callGeminiAPI(url, industry) {
  // TODO: Implement actual API call to Gemini
  // const apiKey = functions.config().service.gemini_key;
  // const response = await axios.post(...)
  return `Analysis for ${url} in the ${industry} industry.`;
}

async function callPageSpeedAPI(url) {
  // TODO: Implement actual API call to Google PageSpeed Insights
  // const apiKey = functions.config().service.pagespeed_key;
  // const response = await axios.get(...)
  return { mobile: { seoScore: 95 }, desktop: { seoScore: 98 } };
}
```

#### **Function Definitions (`firebase/functions/src/index.js`)**

```javascript
// firebase/functions/src/index.js
const functions = require('firebase-functions');
const { initializeApp } = require('firebase-admin/app');
const { handleAnalysisRequest } = require('./controllers/analysis');
// TODO: Import PDF generation handler

initializeApp();

// HTTP-triggered function for the main analysis
exports.analyze = functions
  .runWith({ timeoutSeconds: 300, memory: '1GB' }) // Increase timeout and memory
  .https.onRequest(handleAnalysisRequest);

// Pub/Sub-triggered function for PDF generation
exports.generateAndSendPdf = functions
  .runWith({ timeoutSeconds: 300, memory: '1GB' })
  .pubsub.topic('generate-pdf-report')
  .onPublish(async (message) => {
    // TODO: Implement PDF generation and email sending logic here
    const payload = JSON.parse(Buffer.from(message.data, 'base64').toString());
    console.log(`Generating PDF for doc: ${payload.documentId} to be sent to ${payload.recipientEmail}`);
    // 1. Fetch report from Firestore using documentId
    // 2. Use Puppeteer to generate PDF
    // 3. Use SendGrid to email the PDF
    return null;
});
```

## 5.0 Environment Variables

Create a `.env.local` file in the root of your Next.js project:
`FIREBASE_ANALYZE_FUNCTION_URL="YOUR_DEPLOYED_FIREBASE_FUNCTION_HTTP_URL"`

For Firebase, use the CLI to set secrets as described in section 4.1.

---

## 6.0 Deployment & Operations

*(The deployment steps remain the same as in TRD v1.1)*

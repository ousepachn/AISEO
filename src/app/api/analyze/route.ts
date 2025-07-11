import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // 1. Get the request body from the client
    const body = await request.json();

    // 2. Validate essential inputs (e.g., websiteUrl)
    if (!body.websiteUrl) {
      return NextResponse.json({ error: 'Website URL is required' }, { status: 400 });
    }

    // 3. Use the analyze endpoint that supports multiple AI models
    const firebaseFunctionUrl = 'http://127.0.0.1:5002/aiseo-ff704/us-central1/analyze';

    // 4. Forward the request to the Firebase Function
    const firebaseResponse = await fetch(firebaseFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        websiteUrl: body.websiteUrl,
        industry: body.industry || 'Technology',
        companyName: body.companyName,
        location: body.location,
        email: body.email,
        enabledServices: body.enabledServices || ['gemini', 'claude', 'chatgpt'],
      }),
    });

    // 5. Check if the call to Firebase was successful
    if (!firebaseResponse.ok) {
      const errorData = await firebaseResponse.json();
      console.error('Error from Firebase function:', errorData);
      
      // Return a more user-friendly error message
      return NextResponse.json({ 
        error: 'Failed to analyze website. Please make sure the AI services are properly configured.',
        details: errorData.error
      }, { status: 500 });
    }
    
    // 6. Return the result from Firebase back to the client
    const data = await firebaseResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in proxy route:', error);
    return NextResponse.json({ 
      error: 'An internal server error occurred',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
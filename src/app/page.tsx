"use client";
import { useState } from "react";
import Image from "next/image";

const TOTAL_STEPS = 4;

export default function Home() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);

  // Form data
  const [form, setForm] = useState({
    companyName: "",
    websiteUrl: "",
    industry: "",
    location: "",
    aboutUrl: "",
    email: "",
  });

  // Navigation handlers
  const handleNext = async () => {
    if (step === TOTAL_STEPS) {
      setLoading(true);
      setError(null);
      try {
        // Format the URL to ensure it has http/https prefix
        const formattedUrl = form.websiteUrl.startsWith('http://') || form.websiteUrl.startsWith('https://')
          ? form.websiteUrl
          : `https://${form.websiteUrl}`;

        // Log form data for debugging
        console.log('Submitting form:', { ...form, websiteUrl: formattedUrl });

        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            websiteUrl: formattedUrl
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to analyze website');
        }

        const data = await response.json();
        setResults(data);
        setStep(TOTAL_STEPS + 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    } else {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    }
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));
  const handleSkip = () => handleNext();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-10 border-b border-slate-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">AI SEO Comparator</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 flex-1">
        {!results ? (
          <section className="container mx-auto px-4 py-16">
            <div className="max-w-2xl mx-auto">
              {/* Progress Bar */}
              <div className="mb-8">
                <div className="flex justify-between mb-2">
                  {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        i + 1 <= step ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
                <div className="h-2 bg-slate-200 rounded-full">
                  <div
                    className="h-full bg-green-600 rounded-full transition-all duration-300"
                    style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
                  />
                </div>
              </div>

              {/* Form Steps */}
              <div className="bg-white rounded-2xl shadow-xl p-8">
                {step === 1 && (
                  <div className="text-center">
                    <h2 className="text-2xl md:text-3xl font-extrabold mb-3 text-slate-900">Enter your company details</h2>
                    <p className="text-slate-500 mb-8 max-w-md mx-auto">Let's understand how LLMs perceive your business</p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 text-left">Company Name *</label>
                        <input 
                          type="text" 
                          value={form.companyName} 
                          onChange={(e) => setForm(prev => ({ ...prev, companyName: e.target.value }))}
                          placeholder="Enter your company name"
                          className="w-full px-4 py-3 text-lg border-2 border-slate-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all text-slate-900 placeholder-slate-700"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 text-left">Website URL *</label>
                        <input 
                          type="url" 
                          value={form.websiteUrl} 
                          onChange={(e) => {
                            const value = e.target.value;
                            const trimmedValue = value.trim();
                            const formattedValue = trimmedValue && !trimmedValue.startsWith('http://') && !trimmedValue.startsWith('https://')
                              ? `https://${trimmedValue}`
                              : trimmedValue;
                            setForm(prev => ({ ...prev, websiteUrl: formattedValue }));
                          }}
                          placeholder="https://example.com"
                          className="w-full px-4 py-3 text-lg border-2 border-slate-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all text-slate-900 placeholder-slate-700"
                          required
                        />
                        <p className="mt-1 text-sm text-slate-500">Enter your website URL with or without http/https</p>
                      </div>
                    </div>
                  </div>
                )}
                {step === 2 && (
                  <div className="text-center">
                    <h2 className="text-2xl md:text-3xl font-extrabold mb-3 text-slate-900">Tell us about your business</h2>
                    <p className="text-slate-500 mb-8 max-w-md mx-auto">Industry and location help us generate more relevant scenarios.</p>
                    <div className="grid md:grid-cols-2 gap-5 text-left">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Industry (optional)</label>
                        <input 
                          type="text" 
                          value={form.industry} 
                          onChange={(e) => setForm(prev => ({ ...prev, industry: e.target.value }))}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all text-slate-900 placeholder-slate-700"
                          placeholder="Industry (optional)"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Location (optional)</label>
                        <input 
                          type="text" 
                          value={form.location} 
                          onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all text-slate-900 placeholder-slate-700"
                          placeholder="Location (optional)"
                        />
                      </div>
                    </div>
                  </div>
                )}
                {step === 3 && (
                  <div className="text-center">
                    <h2 className="text-2xl md:text-3xl font-extrabold mb-3 text-slate-900">What's your 'About Us' page?</h2>
                    <p className="text-slate-500 mb-8 max-w-md mx-auto">We'll compare its content against what the AIs say about you.</p>
                    <input 
                      type="url" 
                      value={form.aboutUrl} 
                      onChange={(e) => setForm(prev => ({ ...prev, aboutUrl: e.target.value }))}
                      placeholder="https://example.com/about"
                      className="w-full text-center px-4 py-3 text-lg border-2 border-slate-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all text-slate-900 placeholder-slate-700"
                    />
                  </div>
                )}
                {step === 4 && (
                  <div className="text-center">
                    <h2 className="text-2xl md:text-3xl font-extrabold mb-3 text-slate-900">Get a copy of your report</h2>
                    <p className="text-slate-500 mb-8 max-w-md mx-auto">Enter your email to receive a detailed PDF report.</p>
                    <input 
                      type="email" 
                      value={form.email} 
                      onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="w-full text-center px-4 py-3 text-lg border-2 border-slate-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all text-slate-900 placeholder-slate-700"
                    />
                  </div>
                )}
                {/* Navigation */}
                <div className="mt-10 flex items-center justify-between">
                  <button 
                    onClick={handleBack} 
                    className={`text-slate-500 font-medium flex items-center gap-1 ${step === 1 ? 'invisible' : ''}`}
                  >
                    <span className="text-xl">‹</span> Back
                  </button>
                  <div className="flex items-center gap-4">
                    {step < TOTAL_STEPS && (
                      <button onClick={handleSkip} className="text-green-600 font-medium">Skip for now</button>
                    )}
                    <button 
                      onClick={handleNext} 
                      disabled={loading}
                      className="bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold px-8 py-3 rounded-xl disabled:opacity-50"
                    >
                      {loading ? 'Analyzing...' : step === TOTAL_STEPS ? 'Analyze Website →' : 'Next Step →'}
                    </button>
                  </div>
                </div>
                {error && (
                  <div className="mt-4 text-red-600 text-sm">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className="container mx-auto px-4 py-16">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">
                  Analysis for {form.websiteUrl}
                </h2>
                <p className="mt-2 text-slate-500">Here's your comprehensive AI SEO report.</p>
                <button 
                  onClick={() => {
                    setResults(null);
                    setStep(1);
                  }} 
                  className="mt-6 text-green-600 hover:text-green-700 font-semibold text-sm"
                >
                  ‹ Start a New Analysis
                </button>
              </div>

              {/* Results Display */}
              <div className="grid gap-8">
                {/* AI Comparison */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                  <h3 className="text-2xl font-bold mb-6 text-slate-900">AI Comparison</h3>
                  <div className="grid md:grid-cols-3 gap-6">
                    {Object.entries(results.aiComparison || {}).map(([model, analysis]) => (
                      <div key={model} className="border border-slate-200 rounded-xl p-6">
                        <h4 className="font-semibold text-lg mb-4 capitalize">{model}</h4>
                        <pre className="text-sm text-slate-600 whitespace-pre-wrap">
                          {JSON.stringify(analysis, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SEO Analysis */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                  <h3 className="text-2xl font-bold mb-6 text-slate-900">SEO Analysis</h3>
                  <div className="grid gap-6">
                    {Object.entries(results.seoAnalysis || {}).map(([type, data]) => (
                      <div key={type} className="border border-slate-200 rounded-xl p-6">
                        <h4 className="font-semibold text-lg mb-4 capitalize">{type}</h4>
                        <pre className="text-sm text-slate-600 whitespace-pre-wrap">
                          {JSON.stringify(data, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 mt-16 border-t border-slate-200">
        <p className="text-sm text-slate-500">&copy; 2025 AI SEO Comparator. Built with modern tools for modern analysis.</p>
      </footer>
    </div>
  );
}

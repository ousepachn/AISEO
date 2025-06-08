"use client";
import { useState } from "react";
import Image from "next/image";

const TOTAL_STEPS = 4;

export default function Home() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Dummy form data (not used for real submission)
  const [form, setForm] = useState({
    websiteUrl: "https://example.com",
    industry: "E-commerce",
    location: "San Francisco, CA",
    aboutUrl: "https://example.com/about",
    email: "user@example.com",
  });

  // Navigation handlers
  const handleNext = () => {
    if (step === TOTAL_STEPS) {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setStep(TOTAL_STEPS + 1);
      }, 10000); // 10 seconds
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
        {/* Loader Screen */}
        {loading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-600 mb-8"></div>
            <p className="text-xl font-semibold text-slate-800 mb-2">Analyzing your website...</p>
            <p className="text-slate-500 max-w-md mx-auto">This may take up to a minute. We're fetching data from multiple AI and SEO services.</p>
          </div>
        )}
        {/* Input Section (multi-step) */}
        {!loading && step <= TOTAL_STEPS && (
          <section className="max-w-2xl mx-auto">
            <div className="bg-white p-6 md:p-10 rounded-2xl shadow-lg border border-slate-200/80">
              {/* Progress Indicator */}
              <div className="flex justify-center items-center space-x-5 mb-10">
                {[1, 2, 3, 4].map((s) => (
                  <div key={s} className="flex items-center">
                    <div className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${s <= step ? 'bg-green-600 scale-110' : 'bg-slate-300'}`}></div>
                    {s < 4 && <div className="w-16 h-1 bg-slate-200 rounded-full"></div>}
                  </div>
                ))}
              </div>
              {/* Step Content */}
              {step === 1 && (
                <div className="text-center">
                  <h2 className="text-2xl md:text-3xl font-extrabold mb-3 text-slate-900">Enter your website's URL to begin.</h2>
                  <p className="text-slate-500 mb-8 max-w-md mx-auto">understand how LLMs perceive your business</p>
                  <input type="url" value={form.websiteUrl} disabled className="w-full text-center px-4 py-3 text-lg border-2 border-slate-300 rounded-xl bg-slate-100" />
                </div>
              )}
              {step === 2 && (
                <div className="text-center">
                  <h2 className="text-2xl md:text-3xl font-extrabold mb-3 text-slate-900">Tell us about your business</h2>
                  <p className="text-slate-500 mb-8 max-w-md mx-auto">Industry and location help us generate more relevant scenarios.</p>
                  <div className="grid md:grid-cols-2 gap-5 text-left">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Industry (optional)</label>
                      <input type="text" value={form.industry} disabled className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-100" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Location (optional)</label>
                      <input type="text" value={form.location} disabled className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-100" />
                    </div>
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="text-center">
                  <h2 className="text-2xl md:text-3xl font-extrabold mb-3 text-slate-900">What's your 'About Us' page?</h2>
                  <p className="text-slate-500 mb-8 max-w-md mx-auto">We'll compare its content against what the AIs say about you.</p>
                  <input type="url" value={form.aboutUrl} disabled className="w-full text-center px-4 py-3 text-lg border-2 border-slate-300 rounded-xl bg-slate-100" />
                </div>
              )}
              {step === 4 && (
                <div className="text-center">
                  <h2 className="text-2xl md:text-3xl font-extrabold mb-3 text-slate-900">Get a copy of your report</h2>
                  <p className="text-slate-500 mb-8 max-w-md mx-auto">Enter your email to receive a detailed PDF report.</p>
                  <input type="email" value={form.email} disabled className="w-full text-center px-4 py-3 text-lg border-2 border-slate-300 rounded-xl bg-slate-100" />
                </div>
              )}
              {/* Navigation */}
              <div className="mt-10 flex items-center justify-between">
                <button onClick={handleBack} className={`text-slate-500 font-medium flex items-center gap-1 ${step === 1 ? 'invisible' : ''}`}>
                  <span className="text-xl">‹</span> Back
                </button>
                <div className="flex items-center gap-4">
                  {step < TOTAL_STEPS && (
                    <button onClick={handleSkip} className="text-green-600 font-medium">Skip for now</button>
                  )}
                  <button onClick={handleNext} className="bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold px-8 py-3 rounded-xl">
                    {step === TOTAL_STEPS ? 'Analyze Website →' : 'Next Step →'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Results Section (dummy, static) */}
        {!loading && step > TOTAL_STEPS && (
          <section className="max-w-4xl mx-auto mt-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">Analysis for <span className="bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">example.com</span></h2>
              <p className="mt-2 text-slate-500">Here's your comprehensive AI SEO report.</p>
              <button onClick={() => setStep(1)} className="mt-6 text-green-600 font-semibold text-sm">‹ Start a New Analysis</button>
            </div>
            <div className="mb-8 border-b border-slate-200">
              <nav className="-mb-px flex space-x-2 sm:space-x-4 justify-center" aria-label="Tabs">
                <button className="border-b-2 border-green-700 text-green-700 bg-green-50 rounded-t px-4 py-2 font-semibold">AI SEO Summary</button>
                <button className="text-slate-600 px-4 py-2 font-semibold">Technical SEO</button>
                <button className="text-slate-600 px-4 py-2 font-semibold">Sales Scenarios</button>
              </nav>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200/80">
              <h3 className="font-bold text-lg mb-2 text-slate-800">AI Summary (Dummy)</h3>
              <p className="text-slate-600">Gemini: This is a dummy summary for Gemini.<br/>Claude: This is a dummy summary for Claude.<br/>ChatGPT: This is a dummy summary for ChatGPT.</p>
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

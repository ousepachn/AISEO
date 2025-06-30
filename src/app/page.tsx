"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { db } from "./firebase";
import { doc, onSnapshot } from "firebase/firestore";

const TOTAL_STEPS = 4;

const FormattedText = ({ text }: { text: string | undefined }) => {
  if (!text) {
    return null;
  }

  // This regex splits the text by the bold markdown (**text**), keeping the delimiter.
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          // It's a bold part, render it as a strong tag.
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        // It's a regular part.
        return part;
      })}
    </>
  );
};

const StatusIndicator = ({ value }: { value: boolean }) => (
  <span className={`inline-block w-3 h-3 rounded-full mr-2 align-middle ${value ? 'bg-green-500' : 'bg-red-500'}`}></span>
);

const ScoreIndicator = ({ score }: { score?: number }) => {
  if (typeof score !== 'number') return null;
  let color = 'bg-red-500';
  if (score >= 90) color = 'bg-green-500';
  else if (score >= 50) color = 'bg-yellow-400';
  return <span className={`inline-block w-3 h-3 rounded-full mr-1 align-middle ${color}`}></span>;
};

// Utility: Extract section text from markdown
function extractSections(text: string) {
  if (!text) return {};
  const sections: Record<string, string> = {};
  const regex = /##+\s*SECTION\s*\d+:?\s*([A-Z\s]+)/g;
  let match;
  let lastIndex = 0;
  let lastTitle = '';
  while ((match = regex.exec(text)) !== null) {
    if (lastTitle) {
      sections[lastTitle] = text.slice(lastIndex, match.index).trim();
    }
    lastTitle = match[1].trim();
    lastIndex = regex.lastIndex;
  }
  if (lastTitle) {
    sections[lastTitle] = text.slice(lastIndex).trim();
  }
  return sections;
}

// Utility: Get summary and risk color
function getSummaryAndRisk(text: string) {
  if (!text) return { summary: '', risk: 'gray' };
  const firstSentence = text.split(/[.!?]/)[0];
  const lower = text.toLowerCase();
  if (lower.includes('no knowledge') || lower.includes('unknown') || lower.includes('not applicable') || lower.includes('cannot provide')) {
    return { summary: firstSentence, risk: 'red' };
  }
  if (lower.includes('limited') || lower.includes('not sufficient') || lower.includes('partial')) {
    return { summary: firstSentence, risk: 'yellow' };
  }
  if (lower.includes('comprehensive') || lower.includes('confident') || lower.includes('strong') || lower.includes('well-known')) {
    return { summary: firstSentence, risk: 'green' };
  }
  return { summary: firstSentence, risk: 'yellow' };
}

// Traffic light icon
function TrafficLight({ risk }: { risk: string }) {
  const color = risk === 'red' ? 'bg-red-500' : risk === 'yellow' ? 'bg-yellow-400' : risk === 'green' ? 'bg-green-500' : 'bg-slate-300';
  return <span className={`inline-block w-3 h-3 rounded-full mr-2 align-middle ${color}`}></span>;
}

export default function Home() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [reportId, setReportId] = useState<string | null>(null);

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
            websiteUrl: formattedUrl,
            enabledServices: ['gemini', 'claude', 'chatgpt'],
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to analyze website');
        }

        const data = await response.json();
        setReportId(data.reportId);
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

  useEffect(() => {
    if (!reportId) return;

    const unsub = onSnapshot(doc(db, "reports", reportId), (doc) => {
      const data = doc.data();
      if (data) {
        setResults(data);
      }
    });

    return () => unsub();
  }, [reportId]);

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
                    setReportId(null);
                    setStep(1);
                  }} 
                  className="mt-6 text-green-600 hover:text-green-700 font-semibold text-sm"
                >
                  ‹ Start a New Analysis
                </button>
              </div>

              {/* Results Display */}
              <div className="grid gap-8">
                {/* AI Analysis */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                  <h3 className="text-2xl font-bold mb-6 text-slate-900">AI Analysis</h3>
                  <div className="mb-4 text-sm text-slate-600">
                    Models analyzed: {Object.keys(results.aiAnalysis || {}).join(', ')}
                  </div>
                  {/* Section-based layout */}
                  {(() => {
                    // Gather all section titles from all models
                    const allSections = new Set<string>();
                    Object.values(results.aiAnalysis || {}).forEach((analysis: any) => {
                      const sections = extractSections(analysis?.companyAnalysis?.text || '');
                      Object.keys(sections).forEach((title) => allSections.add(title));
                    });
                    const sectionTitles = Array.from(allSections);
                    const modelNames = Object.keys(results.aiAnalysis || {});
                    return (
                      <div className="space-y-6">
                        {sectionTitles.map((section) => (
                          <div key={section}>
                            <div className="font-semibold text-slate-800 mb-2 text-base flex items-center">
                              <span className="mr-2">{section.replace(/_/g, ' ').replace(/\s+/g, ' ').trim()}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {modelNames.map((model) => {
                                const analysis = results.aiAnalysis[model];
                                const sections = extractSections(analysis?.companyAnalysis?.text || '');
                                const sectionText = sections[section] || '';
                                const { summary, risk } = getSummaryAndRisk(sectionText);
                                return (
                                  <div key={model} className="border border-slate-200 rounded-xl p-4 flex flex-col items-start bg-slate-50">
                                    <div className="flex items-center mb-1">
                                      <TrafficLight risk={risk} />
                                      <span className="font-semibold capitalize text-slate-700">{model}</span>
                                    </div>
                                    <div className="text-sm text-slate-700" title={sectionText} style={{overflowWrap:'anywhere'}}>
                                      {summary || <span className="text-slate-400">No data</span>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* SEO Analysis */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                  <h3 className="text-2xl font-bold mb-6 text-slate-900">SEO Analysis</h3>
                  <div className="mb-4 text-sm text-slate-600">
                    Models analyzed: {Object.keys(results.aiAnalysis || {}).join(', ')}
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    {Object.entries(results.aiAnalysis || {}).map(([model, analysis]: [string, any]) => (
                      <div key={model} className="border border-slate-200 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-lg capitalize">{model}</h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            analysis?.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : analysis?.status === 'error'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {analysis?.status || 'processing...'}
                          </span>
                        </div>
                        {analysis?.status === 'completed' ? (
                          <div className="text-sm text-slate-600 whitespace-pre-wrap">
                            <FormattedText text={analysis?.seoAnalysis?.text} />
                          </div>
                        ) : analysis?.status === 'error' ? (
                          <div className="text-sm text-red-600">
                            Error: {analysis?.error || 'Unknown error occurred'}
                          </div>
                        ) : (
                          <div className="text-sm text-slate-500">
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                              Analyzing with {model}...
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Website Structure Analysis */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                  <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-4">
                    <h3 className="text-2xl font-bold text-slate-900 mb-2 md:mb-0">Website Structure Analysis</h3>
                    {results.websiteStructure?.timestamp && (
                      <span className="text-slate-400 text-sm md:text-base md:ml-4">Last run: {new Date(results.websiteStructure.timestamp.seconds * 1000).toLocaleString()}</span>
                    )}
                  </div>
                  {results.websiteStructure ? (
                    <>
                      {/* Recommendations - highlighted and moved up */}
                      {results.websiteStructure.recommendations && results.websiteStructure.recommendations.length > 0 && (
                        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
                          <div className="font-semibold text-yellow-800 mb-1">Recommendations</div>
                          <ul className="list-disc ml-6 text-slate-800">
                            {results.websiteStructure.recommendations.map((rec: string, i: number) => (
                              <li key={i}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-slate-700 border-separate border-spacing-y-2">
                          <tbody>
                            <tr>
                              <td className="font-semibold py-2 pr-4">Image Alt Tags</td>
                              <td><StatusIndicator value={results.websiteStructure.imageAltsGood} /></td>
                              <td className="text-slate-500">{results.websiteStructure.imageAltsGood ? 'All images have alt tags' : 'Some images missing alt tags'}</td>
                            </tr>
                            <tr>
                              <td className="font-semibold py-2 pr-4">robots.txt Found</td>
                              <td><StatusIndicator value={results.websiteStructure.robotsTxtFound} /></td>
                              <td className="text-slate-500">{results.websiteStructure.robotsTxtFound ? 'Present' : 'Missing'}</td>
                            </tr>
                            <tr>
                              <td className="font-semibold py-2 pr-4">sitemap.xml Found</td>
                              <td><StatusIndicator value={results.websiteStructure.sitemapXmlFound} /></td>
                              <td className="text-slate-500">{results.websiteStructure.sitemapXmlFound ? 'Present' : 'Missing'}</td>
                            </tr>
                            <tr>
                              <td className="font-semibold py-2 pr-4">H1 Tags Found</td>
                              <td><StatusIndicator value={results.websiteStructure.h1TagsFound} /></td>
                              <td className="text-slate-500">{results.websiteStructure.h1TagsFound ? 'Present' : 'Missing'}</td>
                            </tr>
                            <tr>
                              <td className="font-semibold py-2 pr-4">Title Tag</td>
                              <td colSpan={2} className="text-slate-900">{results.websiteStructure.titleTag || <span className="text-slate-400">None</span>}</td>
                            </tr>
                            <tr>
                              <td className="font-semibold py-2 pr-4">Meta Description</td>
                              <td colSpan={2} className={results.websiteStructure.metaDescription ? "text-slate-900" : "text-red-500 font-semibold"}>
                                {results.websiteStructure.metaDescription || 'None'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-400">No website structure data available.</div>
                  )}
                </div>

                {/* PageSpeed Analysis */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                  <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-4">
                    <h3 className="text-2xl font-bold text-slate-900 mb-2 md:mb-0">PageSpeed Analysis</h3>
                    {results.pageSpeed?.timestamp && (
                      <span className="text-slate-400 text-sm md:text-base md:ml-4">Last run: {new Date(results.pageSpeed.timestamp.seconds * 1000).toLocaleString()}</span>
                    )}
                  </div>
                  {results.pageSpeed && (results.pageSpeed.desktop || results.pageSpeed.mobile) ? (
                    <div className="grid md:grid-cols-2 gap-8">
                      {/* Desktop Card */}
                      <div className="border border-slate-200 rounded-xl p-6 bg-slate-50">
                        <div className="flex items-center mb-4">
                          <span className="font-semibold text-lg mr-2">Desktop</span>
                          <ScoreIndicator score={results.pageSpeed.desktop?.score} />
                          <span className="ml-2 text-slate-500 text-sm">Score: {results.pageSpeed.desktop?.score ?? 'N/A'}</span>
                        </div>
                        <div className="text-sm text-slate-700 space-y-1">
                          <div><span className="font-medium">Fetch Time:</span> {results.pageSpeed.desktop?.fetchTime || 'N/A'}</div>
                          <div><span className="font-medium">First Contentful Paint:</span> {results.pageSpeed.desktop?.metrics?.firstContentfulPaint || 'N/A'}</div>
                          <div><span className="font-medium">Largest Contentful Paint:</span> {results.pageSpeed.desktop?.metrics?.largestContentfulPaint || 'N/A'}</div>
                          <div><span className="font-medium">Total Blocking Time:</span> {results.pageSpeed.desktop?.metrics?.totalBlockingTime || 'N/A'}</div>
                          <div><span className="font-medium">Speed Index:</span> {results.pageSpeed.desktop?.metrics?.speedIndex || 'N/A'}</div>
                          <div><span className="font-medium">Cumulative Layout Shift:</span> {results.pageSpeed.desktop?.metrics?.cumulativeLayoutShift || 'N/A'}</div>
                        </div>
                      </div>
                      {/* Mobile Card */}
                      <div className="border border-slate-200 rounded-xl p-6 bg-slate-50">
                        <div className="flex items-center mb-4">
                          <span className="font-semibold text-lg mr-2">Mobile</span>
                          <ScoreIndicator score={results.pageSpeed.mobile?.score} />
                          <span className="ml-2 text-slate-500 text-sm">Score: {results.pageSpeed.mobile?.score ?? 'N/A'}</span>
                        </div>
                        <div className="text-sm text-slate-700 space-y-1">
                          <div><span className="font-medium">Fetch Time:</span> {results.pageSpeed.mobile?.fetchTime || 'N/A'}</div>
                          <div><span className="font-medium">First Contentful Paint:</span> {results.pageSpeed.mobile?.metrics?.firstContentfulPaint || 'N/A'}</div>
                          <div><span className="font-medium">Largest Contentful Paint:</span> {results.pageSpeed.mobile?.metrics?.largestContentfulPaint || 'N/A'}</div>
                          <div><span className="font-medium">Total Blocking Time:</span> {results.pageSpeed.mobile?.metrics?.totalBlockingTime || 'N/A'}</div>
                          <div><span className="font-medium">Speed Index:</span> {results.pageSpeed.mobile?.metrics?.speedIndex || 'N/A'}</div>
                          <div><span className="font-medium">Cumulative Layout Shift:</span> {results.pageSpeed.mobile?.metrics?.cumulativeLayoutShift || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400">No PageSpeed data available.</div>
                  )}
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

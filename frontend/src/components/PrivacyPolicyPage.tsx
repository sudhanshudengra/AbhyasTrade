import React from 'react';
import { ArrowLeft, Shield, Lock, Eye, RefreshCw, Mail } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-obsidian-950 text-slate-200 font-sans p-6 sm:p-12 selection:bg-brand-blue/30 selection:text-white">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm text-brand-cyan hover:text-emerald-400 font-semibold mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to AbhyasTrade Terminal</span>
        </a>

        <div className="bg-obsidian-900 border border-obsidian-700/80 rounded-3xl p-8 sm:p-12 shadow-2xl space-y-8">
          {/* Header */}
          <div className="border-b border-obsidian-800 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/15 text-brand-cyan text-xs font-bold mb-3 border border-brand-blue/30">
              <Shield className="w-3.5 h-3.5" />
              <span>Legal & Privacy Compliance</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Privacy Policy for AbhyasTrade
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {/* Section 1: Overview */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-emerald-400" />
              1. Overview & Purpose
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              AbhyasTrade (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is an educational, virtual paper trading platform simulating Indian Equity Markets (NSE). We take your privacy seriously and are committed to protecting any information you share with us. This Privacy Policy outlines what information we collect, how it is used, and how it is protected.
            </p>
          </div>

          {/* Section 2: Information We Collect */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-brand-cyan" />
              2. Information We Collect
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              When you sign in using Google OAuth, we only collect the standard, basic profile information provided by Google:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-1.5 pl-2">
              <li><strong>Your Email Address:</strong> Used exclusively to uniquely identify your trading account and portfolio.</li>
              <li><strong>Your Full Name & Avatar URL:</strong> Used solely to personalize your profile header inside the application.</li>
              <li><strong>Your Google User ID:</strong> Used to associate your simulated positions, orders, and virtual balance with your account.</li>
            </ul>
            <p className="text-xs text-slate-400 bg-obsidian-950 p-3 rounded-xl border border-obsidian-800">
              We do not request, access, or store your Google password, contacts, Google Drive files, or any sensitive private data.
            </p>
          </div>

          {/* Section 3: How We Use Your Information */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-amber-400" />
              3. How We Use Your Data
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              All data collected is used strictly for core application functionality:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-1 pl-2">
              <li>To maintain and synchronize your private virtual paper trading portfolio.</li>
              <li>To persist your order history, position ledger, and simulated profit/loss.</li>
              <li>To authenticate your session securely across devices.</li>
            </ul>
            <p className="text-sm text-slate-300 leading-relaxed mt-2">
              We <strong>never sell, rent, monetize, or disclose</strong> your personal information or email address to any third parties or advertisers.
            </p>
          </div>

          {/* Section 4: Data Storage & Security */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white">4. Data Storage & Security</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Your data is stored securely using Supabase PostgreSQL databases with industry-standard encryption in transit (HTTPS/TLS) and encryption at rest. Authentication tokens are managed with secure cryptographic standards.
            </p>
          </div>

          {/* Section 5: Data Deletion Rights */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white">5. Your Rights & Data Deletion</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              You have full rights over your data. You may request complete deletion of your account, email address, portfolio, and trade history at any time by contacting our developer support team.
            </p>
          </div>

          {/* Section 6: Contact */}
          <div className="border-t border-obsidian-800 pt-6 space-y-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-emerald-400" />
              6. Contact Support
            </h2>
            <p className="text-sm text-slate-300">
              For any questions, concerns, or data deletion requests regarding this Privacy Policy, please email:
            </p>
            <a
              href="mailto:sudhanshudengra.tdc@gmail.com"
              className="inline-block text-brand-cyan hover:underline font-mono text-sm font-semibold"
            >
              sudhanshudengra.tdc@gmail.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

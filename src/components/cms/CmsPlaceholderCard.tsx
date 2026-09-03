import React from 'react';
import Link from 'next/link';

interface CmsPlaceholderCardProps {
  title: string;
  description: string;
  targetPhase: string;
}

export function CmsPlaceholderCard({ title, description, targetPhase }: CmsPlaceholderCardProps) {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm space-y-4 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-600 font-bold mb-2">
          ⚙️
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-slate-500 max-w-md mx-auto text-sm">{description}</p>
        
        <div className="inline-block px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-full">
          Status: {targetPhase} (Planned)
        </div>

        <div className="pt-4">
          <Link
            href="/cms"
            className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            ← Kembali ke Dashboard CMS
          </Link>
        </div>
      </div>
    </div>
  );
}

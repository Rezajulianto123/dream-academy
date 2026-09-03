import React from 'react';
import { CmsShellLayout } from '@/components/cms/CmsShellLayout';

export const metadata = {
  title: 'CMS Dashboard | Dream Academy',
  description: 'Portal Manajerial Konten & Kursus Dream Academy',
};

export default function CmsDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CmsShellLayout>{children}</CmsShellLayout>;
}

import { LayoutDashboard, FileText, Plus, CreditCard, AlertCircle, Shield, Wallet } from 'lucide-react';

export const NAVIGATION_CONFIG = {
  client: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: FileText, label: 'Invoices', path: '/invoices' },
    { icon: Plus, label: 'Create Invoice', path: '/invoices/new', isPrimaryCTA: true },
    { icon: Wallet, label: 'Wallet', path: '/wallet' },
    { icon: CreditCard, label: 'Payments', path: '/payments' },
    { icon: AlertCircle, label: 'Disputes', path: '/disputes' },
  ],
  freelancer: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: FileText, label: 'My Work', path: '/invoices' },
    { icon: Wallet, label: 'Wallet', path: '/wallet' },
    { icon: CreditCard, label: 'Payments', path: '/payments' },
    { icon: Shield, label: 'Disputes', path: '/disputes' },
  ]
};

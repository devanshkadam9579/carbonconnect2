import React from 'react';
import { motion } from 'motion/react';
import { Leaf, User, LayoutDashboard, ShoppingCart, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { APP_LOGO_URL } from '@/src/constants';

interface LayoutProps {
  children: React.ReactNode;
  role: 'admin' | 'farmer' | 'buyer' | null;
  onLogout: () => void;
  activeTab?: 'dashboard' | 'onboarding';
  onTabChange?: (tab: 'dashboard' | 'onboarding') => void;
}

export default function Layout({ children, role, onLogout, activeTab, onTabChange }: LayoutProps) {
  const isFarmerOnboarding = role === 'farmer' && activeTab === 'onboarding';

  return (
    <div className={`min-h-screen bg-[#F5F5F5] text-[#141414] font-sans ${isFarmerOnboarding ? '' : 'pb-20 md:pb-0'}`}>
      {!isFarmerOnboarding && (
        <nav className="bg-white border-b border-[#141414]/10 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center shadow-sm">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight hidden sm:inline">CarbonConnect</span>
          </div>

          {role && (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-600/10 rounded-full">
                <User className="w-4 h-4 text-green-700" />
                <span className="text-xs font-medium uppercase tracking-wider text-green-700">
                  {role}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={onLogout} className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          )}
        </nav>
      )}

      <main className={`${isFarmerOnboarding ? '' : 'max-w-7xl mx-auto p-4 md:p-6'}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={isFarmerOnboarding ? 'h-screen' : ''}
        >
          {children}
        </motion.div>
      </main>

      {/* Bottom Navigation for Farmers */}
      {role === 'farmer' && onTabChange && !isFarmerOnboarding && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-around items-center z-50">
          <button 
            onClick={() => onTabChange('dashboard')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-green-600' : 'text-gray-400'}`}
          >
            <LayoutDashboard className="w-6 h-6" />
            <span className="text-[10px] font-bold">Dashboard</span>
          </button>
          <button 
            onClick={() => onTabChange('onboarding')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'onboarding' ? 'text-green-600' : 'text-gray-400'}`}
          >
            <Leaf className="w-6 h-6" />
            <span className="text-[10px] font-bold">New Farm</span>
          </button>
          <button 
            onClick={onLogout}
            className="flex flex-col items-center gap-1 text-gray-400"
          >
            <LogOut className="w-6 h-6" />
            <span className="text-[10px] font-bold">Logout</span>
          </button>
        </div>
      )}

    </div>
  );
}

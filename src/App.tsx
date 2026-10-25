import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext.js';
import { TopMarketBar } from './components/TopMarketBar.js';
import { AppHeader } from './components/AppHeader.js';
import { AppSidebar } from './components/AppSidebar.js';
import { DynamicBackground } from './components/DynamicBackground.js';
import { AuthModal } from './components/AuthModal.js';
import { DatabaseModal } from './components/DatabaseModal.js';
import { AddFundsModal } from './components/AddFundsModal.js';
import { OverviewPage } from './pages/OverviewPage.js';
import { LiveMarketTickerPage } from './pages/LiveMarketTickerPage.js';
import { StockExplorerPage } from './pages/StockExplorerPage.js';
import { StockDetailPage } from './pages/StockDetailPage.js';
import { AIResearchPage } from './pages/AIResearchPage.js';
import { PaperTradingPage } from './pages/PaperTradingPage.js';
import { HoldingsPage } from './pages/HoldingsPage.js';
import { WatchlistsPage } from './pages/WatchlistsPage.js';
import { TradingJournalPage } from './pages/TradingJournalPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { PriceAlertsPage } from './pages/PriceAlertsPage.js';
import { NotificationsModal } from './components/NotificationsModal.js';
import { AlertToastBanner } from './components/AlertToastBanner.js';

function MainTerminal() {
  const {
    user,
    authModalOpen,
    authModalTab,
    setAuthModalOpen,
    setAuthModalTab,
    dbModalOpen,
    setDbModalOpen,
    addFundsModalOpen,
    setAddFundsModalOpen,
    loginAsDemoUser,
  } = useApp();

  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string>('RELIANCE');
  const [aiTargetSymbol, setAiTargetSymbol] = useState<string>('RELIANCE');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleOpenChart = (symbol: string) => {
    setSelectedStockSymbol(symbol);
    setCurrentTab('detail');
  };

  const handleOpenAI = (symbol: string) => {
    setAiTargetSymbol(symbol);
    setCurrentTab('ai-research');
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 overflow-x-hidden">
      {/* Dynamic Animated Ambient Background */}
      <DynamicBackground />

      {/* Left Sidebar Navigation */}
      <AppSidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Layout Viewport shifted right for desktop sidebar */}
      <div className="lg:pl-64 flex flex-col flex-1 min-h-screen transition-all duration-300">
        {/* Top Real-time Index Bar */}
        <TopMarketBar />

        {/* Spacious Top Action Header */}
        <AppHeader
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenNotifications={() => setNotificationsOpen(true)}
        />

        {/* Guest Welcome Banner if logged out */}
        {!user && (
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white px-4 py-2.5 text-xs shadow-md shrink-0 z-20">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-bold">Welcome to TradeNova!</span>
                <span className="opacity-90">Sign in to add wallet funds and sync real-time alerts.</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loginAsDemoUser()}
                  className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg font-semibold text-xs transition-colors"
                >
                  Instant Demo Mode
                </button>
                <button
                  onClick={() => {
                    setAuthModalTab('signin');
                    setAuthModalOpen(true);
                  }}
                  className="px-3 py-1 bg-white text-slate-900 hover:bg-slate-100 rounded-lg font-bold text-xs transition-colors shadow-xs"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthModalTab('signup');
                    setAuthModalOpen(true);
                  }}
                  className="px-3 py-1 bg-slate-900/40 hover:bg-slate-900/60 text-white rounded-lg font-bold text-xs transition-colors border border-white/20"
                >
                  Create Account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Real-time Alert Toast Notification Banner */}
        <AlertToastBanner
          onOpenChart={handleOpenChart}
          onOpenAlerts={() => setCurrentTab('alerts')}
        />

        {/* Main Terminal Viewport */}
        <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {currentTab === 'overview' && (
            <OverviewPage
              onOpenExplorer={() => setCurrentTab('explorer')}
              onOpenChart={handleOpenChart}
              onOpenAI={handleOpenAI}
              onOpenPaperTrading={() => setCurrentTab('papertrading')}
              onOpenHoldings={() => setCurrentTab('holdings')}
            />
          )}

          {currentTab === 'live-ticker' && (
            <LiveMarketTickerPage />
          )}

          {currentTab === 'explorer' && (
            <StockExplorerPage
              onOpenChart={handleOpenChart}
              onOpenAI={handleOpenAI}
            />
          )}

          {currentTab === 'alerts' && (
            <PriceAlertsPage
              onOpenChart={handleOpenChart}
              onOpenTrade={() => setCurrentTab('papertrading')}
            />
          )}

          {currentTab === 'detail' && (
            <StockDetailPage
              symbol={selectedStockSymbol}
              onBack={() => setCurrentTab('explorer')}
              onOpenAI={handleOpenAI}
            />
          )}

          {currentTab === 'ai-research' && (
            <AIResearchPage
              initialSymbol={aiTargetSymbol}
              onSelectStock={handleOpenChart}
            />
          )}

          {currentTab === 'papertrading' && (
            <PaperTradingPage
              onOpenExplorer={() => setCurrentTab('explorer')}
            />
          )}

          {currentTab === 'holdings' && (
            <HoldingsPage
              onOpenExplorer={() => setCurrentTab('explorer')}
              onOpenChart={handleOpenChart}
            />
          )}

          {currentTab === 'watchlists' && (
            <WatchlistsPage
              onOpenChart={handleOpenChart}
              onOpenExplorer={() => setCurrentTab('explorer')}
            />
          )}

          {currentTab === 'journal' && (
            <TradingJournalPage />
          )}

          {currentTab === 'settings' && (
            <SettingsPage />
          )}
        </main>

        {/* Regulatory & Risk Transparency Footer */}
        <footer className="relative z-10 border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md py-6 px-6 mt-auto text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-900 dark:text-white">TradeNova</span>
              <span aria-hidden="true">&bull;</span>
              <span>Indian Equity Terminal &amp; Real-Time Market Depth</span>
              <span aria-hidden="true">&bull;</span>
              <span>330+ NSE/BSE Equities</span>
            </div>

            <div className="flex items-center gap-4 text-[11px]">
              <button
                onClick={() => setDbModalOpen(true)}
                className="hover:text-emerald-500 transition-colors font-medium text-slate-600 dark:text-slate-300"
              >
                Database Config
              </button>
              <button onClick={() => setCurrentTab('journal')} className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Trading Journal
              </button>
              <button onClick={() => setCurrentTab('settings')} className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Groww Data Feeds
              </button>
              <span className="tabular-nums">Timezone: Asia/Kolkata (IST)</span>
            </div>
          </div>

          <div className="max-w-7xl mx-auto mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 text-center sm:text-left leading-relaxed">
            Disclaimer: TradeNova is a market research and simulated paper trading terminal. Virtual funds do not represent real money. Market data feeds reflect official Groww exchange API endpoints and high-frequency normalization algorithms.
          </div>
        </footer>
      </div>

      {/* Notifications Drawer */}
      <NotificationsModal
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authModalTab}
      />

      {/* Database Connection & MongoDB Diagnostics Modal */}
      <DatabaseModal
        isOpen={dbModalOpen}
        onClose={() => setDbModalOpen(false)}
      />

      {/* Add Funds / Deposit Modal */}
      <AddFundsModal
        isOpen={addFundsModalOpen}
        onClose={() => setAddFundsModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainTerminal />
    </AppProvider>
  );
}

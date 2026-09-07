import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useMarketData } from './hooks/useMarketData';
import { usePortfolio } from './hooks/usePortfolio';
import { setApiUserId } from './lib/api';
import { Header } from './components/Header';
import { Watchlist } from './components/Watchlist';
import { TradingChart } from './components/TradingChart';
import { PositionsDesk } from './components/PositionsDesk';
import { OrderBook } from './components/OrderBook';
import { PortfolioSummary } from './components/PortfolioSummary';
import { OrderModal } from './components/OrderModal';
import { ChargesCalculatorModal } from './components/ChargesCalculatorModal';
import { BottomNav, MobileTab } from './components/BottomNav';
import { LoginPage } from './components/LoginPage';
import { OrderSide } from './lib/types';
import { Layers, FileText, PieChart, ChevronUp, ChevronDown, GripHorizontal } from 'lucide-react';

export const App: React.FC = () => {
  // Auth Hook
  const { userProfile, userId, loading, signInWithGoogle, signOut } = useAuth();

  // Set active user ID in API client whenever auth changes
  useEffect(() => {
    if (userId) {
      setApiUserId(userId);
    }
  }, [userId]);

  // Handle Logout & return to login screen
  const handleSignOut = async () => {
    await signOut();
  };

  // Market Data Hook
  const {
    watchlists,
    activeWatchlistId,
    setActiveWatchlistId,
    renameWatchlist,
    stocks,
    selectedSymbol,
    setSelectedSymbol,
    selectedStock,
    flashMap,
    isConnected,
    addSymbol,
    removeSymbol,
  } = useMarketData();

  // Portfolio Hook
  const {
    portfolio,
    positions,
    orders,
    trades,
    placeOrder,
    cancelOrder,
    exitPosition,
    squareoffAllMis,
    resetPortfolio,
    refreshAll,
  } = usePortfolio();

  // Refresh user portfolio whenever userId changes
  useEffect(() => {
    if (userProfile) {
      refreshAll();
    }
  }, [userId, userProfile, refreshAll]);

  // State
  const [mobileTab, setMobileTab] = useState<MobileTab>('WATCHLIST');
  const [desktopDeskTab, setDesktopDeskTab] = useState<'POSITIONS' | 'ORDERS' | 'ANALYTICS'>('POSITIONS');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);
  const [orderModalSide, setOrderModalSide] = useState<OrderSide>('BUY');
  const [isChargesCalcOpen, setIsChargesCalcOpen] = useState<boolean>(false);

  // Collapsible Watchlist Sidebar State
  const [isWatchlistCollapsed, setIsWatchlistCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('abhyastrade_watchlist_collapsed') === 'true';
  });

  const handleToggleWatchlistCollapse = () => {
    setIsWatchlistCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('abhyastrade_watchlist_collapsed', next.toString());
      return next;
    });
  };

  // Adjustable Resizable Desk State
  const [deskHeight, setDeskHeight] = useState<number>(() => {
    const saved = localStorage.getItem('abhyastrade_desk_height');
    return saved ? Math.max(140, Math.min(600, parseInt(saved, 10))) : 260;
  });
  const [isDeskCollapsed, setIsDeskCollapsed] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Drag listener for resizable desk
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const headerHeight = 60;
      const availableHeight = window.innerHeight - headerHeight;
      const newHeight = window.innerHeight - e.clientY;
      const clampedHeight = Math.max(140, Math.min(availableHeight - 180, newHeight));
      setDeskHeight(clampedHeight);
      localStorage.setItem('abhyastrade_desk_height', clampedHeight.toString());
      if (isDeskCollapsed) setIsDeskCollapsed(false);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isDeskCollapsed]);

  // Sync URL Path with Authentication State (/ vs /login)
  useEffect(() => {
    if (loading) return;
    if (!userProfile) {
      if (window.location.pathname !== '/login') {
        window.history.replaceState(null, '', '/login');
      }
    } else {
      if (window.location.pathname === '/login' || window.location.hash) {
        window.history.replaceState(null, '', '/');
      }
    }
  }, [userProfile, loading]);

  // Loading auth session check
  if (loading) {
    return (
      <div className="min-h-screen w-screen bg-obsidian-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold tracking-wider text-slate-300">Initializing AbhyasTrade Terminal...</span>
        </div>
      </div>
    );
  }

  // Pure Google OAuth gated authentication: only authenticated Google accounts can access
  if (!userProfile) {
    return <LoginPage onSignInWithGoogle={signInWithGoogle} />;
  }

  const handleOpenOrderModal = (symbol: string, side: OrderSide) => {
    setSelectedSymbol(symbol);
    setOrderModalSide(side);
    setIsOrderModalOpen(true);
  };

  const openPositionsCount = positions.filter((p) => p.quantity !== 0).length;
  const pendingOrdersCount = orders.filter((o) => o.status === 'PENDING').length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-obsidian-900 text-slate-100">
      {/* Top Header */}
      <Header
        portfolio={portfolio}
        onResetPortfolio={resetPortfolio}
        onOpenChargesCalc={() => setIsChargesCalcOpen(true)}
        isConnected={isConnected}
        userProfile={userProfile}
        onSignInWithGoogle={signInWithGoogle}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop View (>= 1024px) */}
        <div className="hidden lg:flex w-full h-full overflow-hidden">
          {/* Left Column: Watchlist (Collapsible) */}
          <div
            className={`shrink-0 h-full border-r border-obsidian-700/80 transition-all duration-300 ease-in-out overflow-hidden ${
              isWatchlistCollapsed ? 'w-0 border-none' : 'w-80 xl:w-96'
            }`}
          >
            <div className="w-80 xl:w-96 h-full">
              <Watchlist
                watchlists={watchlists}
                activeWatchlistId={activeWatchlistId}
                onSelectWatchlist={setActiveWatchlistId}
                onRenameWatchlist={renameWatchlist}
                stocks={stocks}
                selectedSymbol={selectedSymbol}
                onSelectSymbol={setSelectedSymbol}
                onOpenOrderModal={handleOpenOrderModal}
                flashMap={flashMap}
                onAddSymbol={addSymbol}
                onRemoveSymbol={removeSymbol}
                onToggleCollapse={handleToggleWatchlistCollapse}
                isCollapsed={isWatchlistCollapsed}
              />
            </div>
          </div>

          {/* Right Area: Chart (Top) & Resizable Tabbed Desk (Bottom) */}
          <div className="flex-1 flex flex-col h-full overflow-hidden relative select-none">
            {/* Floating Expand Watchlist Button (when sidebar is collapsed on desktop) */}
            {isWatchlistCollapsed && (
              <button
                onClick={handleToggleWatchlistCollapse}
                className="absolute left-3 top-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-obsidian-800/95 hover:bg-obsidian-700 border border-obsidian-600/90 text-slate-200 hover:text-white shadow-2xl text-xs font-bold backdrop-blur-md transition-all active:scale-95 group animate-in fade-in zoom-in-95"
                title="Expand Watchlist"
              >
                <Layers className="w-4 h-4 text-brand-cyan group-hover:scale-110 transition-transform" />
                <span>Watchlist</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-brand-blue/30 text-brand-cyan font-extrabold border border-brand-blue/40">
                  {stocks.length}
                </span>
              </button>
            )}

            {/* Upper: TradingView Lightweight Chart */}
            <div
              className="w-full overflow-hidden"
              style={{
                height: isDeskCollapsed ? 'calc(100% - 40px)' : `calc(100% - ${deskHeight}px)`,
              }}
            >
              <TradingChart
                stock={selectedStock}
                onOpenOrderModal={handleOpenOrderModal}
              />
            </div>

            {/* Splitter / Resizer Drag Bar */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              className={`h-2 w-full bg-obsidian-950 hover:bg-brand-blue/40 border-y border-obsidian-800 cursor-row-resize flex items-center justify-center group transition-colors shrink-0 z-20 ${
                isDragging ? 'bg-brand-blue/60' : ''
              }`}
              title="Drag up/down to adjust panel height"
            >
              <div className="w-12 h-1 bg-obsidian-700 group-hover:bg-brand-cyan rounded-full transition-colors flex items-center justify-center">
                <GripHorizontal className="w-3 h-3 text-slate-400 group-hover:text-brand-cyan opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Lower: Tabbed Positions & Order Book Desk */}
            <div
              className="w-full flex flex-col bg-obsidian-900 overflow-hidden shrink-0"
              style={{
                height: isDeskCollapsed ? '38px' : `${deskHeight}px`,
              }}
            >
              {/* Desk Tab Switcher & Collapse Control */}
              <div className="bg-obsidian-800/90 border-b border-obsidian-700/80 px-3 py-1.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setDesktopDeskTab('POSITIONS');
                      if (isDeskCollapsed) setIsDeskCollapsed(false);
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                      desktopDeskTab === 'POSITIONS' && !isDeskCollapsed
                        ? 'bg-brand-blue text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-obsidian-700/50'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Positions</span>
                    {openPositionsCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500 text-obsidian-950 font-extrabold">
                        {openPositionsCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setDesktopDeskTab('ORDERS');
                      if (isDeskCollapsed) setIsDeskCollapsed(false);
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                      desktopDeskTab === 'ORDERS' && !isDeskCollapsed
                        ? 'bg-brand-blue text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-obsidian-700/50'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Orders</span>
                    {pendingOrdersCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-obsidian-950 font-extrabold">
                        {pendingOrdersCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setDesktopDeskTab('ANALYTICS');
                      if (isDeskCollapsed) setIsDeskCollapsed(false);
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                      desktopDeskTab === 'ANALYTICS' && !isDeskCollapsed
                        ? 'bg-brand-blue text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-obsidian-700/50'
                    }`}
                  >
                    <PieChart className="w-3.5 h-3.5" />
                    <span>Analytics</span>
                  </button>
                </div>

                {/* Desk Size & Collapse / Expand Controls */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-mono hidden xl:inline">
                    {Math.round(deskHeight)}px
                  </span>
                  <button
                    onClick={() => setIsDeskCollapsed(!isDeskCollapsed)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-obsidian-700/80 transition flex items-center gap-1 text-xs font-semibold"
                    title={isDeskCollapsed ? 'Expand Bottom Desk' : 'Minimize Bottom Desk to Maximize Chart'}
                  >
                    {isDeskCollapsed ? (
                      <>
                        <span className="text-[10px] text-brand-cyan">Expand</span>
                        <ChevronUp className="w-4 h-4 text-brand-cyan" />
                      </>
                    ) : (
                      <>
                        <span className="text-[10px]">Minimize</span>
                        <ChevronDown className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Tab Panel Content (Hidden if collapsed) */}
              {!isDeskCollapsed && (
                <div className="flex-1 overflow-hidden">
                  {desktopDeskTab === 'POSITIONS' && (
                    <PositionsDesk
                      positions={positions}
                      onExitPosition={exitPosition}
                      onSquareoffAllMis={squareoffAllMis}
                      onRefresh={refreshAll}
                    />
                  )}
                  {desktopDeskTab === 'ORDERS' && (
                    <OrderBook
                      orders={orders}
                      trades={trades}
                      onCancelOrder={cancelOrder}
                    />
                  )}
                  {desktopDeskTab === 'ANALYTICS' && (
                    <PortfolioSummary
                      portfolio={portfolio}
                      trades={trades}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile View (< 1024px) */}
        <div className="flex lg:hidden flex-1 flex-col h-full pb-16 overflow-hidden">
          {mobileTab === 'WATCHLIST' && (
            <Watchlist
              watchlists={watchlists}
              activeWatchlistId={activeWatchlistId}
              onSelectWatchlist={setActiveWatchlistId}
              onRenameWatchlist={renameWatchlist}
              stocks={stocks}
              selectedSymbol={selectedSymbol}
              onSelectSymbol={(sym) => {
                setSelectedSymbol(sym);
                setMobileTab('CHART');
              }}
              onOpenOrderModal={handleOpenOrderModal}
              flashMap={flashMap}
              onAddSymbol={addSymbol}
              onRemoveSymbol={removeSymbol}
            />
          )}

          {mobileTab === 'CHART' && (
            <TradingChart
              stock={selectedStock}
              onOpenOrderModal={handleOpenOrderModal}
            />
          )}

          {mobileTab === 'POSITIONS' && (
            <PositionsDesk
              positions={positions}
              onExitPosition={exitPosition}
              onSquareoffAllMis={squareoffAllMis}
              onRefresh={refreshAll}
            />
          )}

          {mobileTab === 'ORDERS' && (
            <OrderBook
              orders={orders}
              trades={trades}
              onCancelOrder={cancelOrder}
            />
          )}

          {mobileTab === 'ANALYTICS' && (
            <PortfolioSummary
              portfolio={portfolio}
              trades={trades}
            />
          )}
        </div>
      </div>

      {/* Mobile Bottom Tab Navigation */}
      <BottomNav
        activeTab={mobileTab}
        onChangeTab={setMobileTab}
        openPositionsCount={openPositionsCount}
        pendingOrdersCount={pendingOrdersCount}
      />

      {/* Order Ticket Modal / Drawer - Destroyed completely on close */}
      {isOrderModalOpen && selectedStock && (
        <OrderModal
          key={`order-modal-${selectedStock.symbol}`}
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          stock={selectedStock}
          initialSide={orderModalSide}
          availableMargin={portfolio?.available_margin ?? 1000000}
          onPlaceOrder={placeOrder}
        />
      )}

      {/* Brokerage & Regulatory Charges Calculator Modal - Destroyed completely on close */}
      {isChargesCalcOpen && (
        <ChargesCalculatorModal
          key="charges-calculator-modal"
          isOpen={isChargesCalcOpen}
          onClose={() => setIsChargesCalcOpen(false)}
          defaultSymbol={selectedStock?.symbol || 'RELIANCE'}
          defaultPrice={selectedStock?.ltp || 3000}
        />
      )}
    </div>
  );
};

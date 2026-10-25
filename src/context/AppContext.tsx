import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserProfile,
  PaperAccount,
  ProviderDiagnostic,
  AppNotification,
  PriceAlertItem,
  DatabaseDiagnostic,
  DepositItem,
} from '../types.js';

export interface AlertToastData {
  alertId?: string;
  symbol: string;
  condition: string;
  threshold: number;
  triggeredPrice: number;
  message: string;
}

interface AppContextType {
  user: UserProfile | null;
  token: string | null;
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  paperAccount: PaperAccount | null;
  providerStatus: ProviderDiagnostic | null;
  dbStatus: DatabaseDiagnostic | null;
  notifications: AppNotification[];
  unreadNotifsCount: number;
  alerts: PriceAlertItem[];
  alertToast: AlertToastData | null;
  deposits: DepositItem[];
  authModalOpen: boolean;
  authModalTab: 'signin' | 'signup';
  dbModalOpen: boolean;
  addFundsModalOpen: boolean;
  backgroundActive: boolean;
  setAuthModalOpen: (open: boolean) => void;
  setAuthModalTab: (tab: 'signin' | 'signup') => void;
  setDbModalOpen: (open: boolean) => void;
  setAddFundsModalOpen: (open: boolean) => void;
  toggleBackground: () => void;
  dismissAlertToast: () => void;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setAccentColor: (color: string) => void;
  refreshPaperAccount: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshAlerts: () => Promise<void>;
  refreshProviderStatus: () => Promise<void>;
  refreshDbStatus: () => Promise<void>;
  refreshDeposits: () => Promise<void>;
  depositFunds: (
    amount: number,
    method: 'CARD' | 'UPI' | 'NET_BANKING',
    details: any
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  connectMongoDb: (
    uri: string,
    persistToEnv?: boolean
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  loginAsDemoUser: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('tradenova_token'));
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('tradenova_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [theme, setThemeState] = useState<'dark' | 'light' | 'system'>(() => {
    return (localStorage.getItem('tradenova_theme') as any) || 'dark';
  });
  const [accentColor, setAccentColorState] = useState<string>(() => {
    return localStorage.getItem('tradenova_accent') || '#10B981';
  });

  const [paperAccount, setPaperAccount] = useState<PaperAccount | null>(null);
  const [providerStatus, setProviderStatus] = useState<ProviderDiagnostic | null>(null);
  const [dbStatus, setDbStatus] = useState<DatabaseDiagnostic | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [alerts, setAlerts] = useState<PriceAlertItem[]>([]);
  const [deposits, setDeposits] = useState<DepositItem[]>([]);
  const [alertToast, setAlertToast] = useState<AlertToastData | null>(null);

  // Modals & Modern UI States
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup'>('signin');
  const [dbModalOpen, setDbModalOpen] = useState(false);
  const [addFundsModalOpen, setAddFundsModalOpen] = useState(false);
  const [backgroundActive, setBackgroundActive] = useState<boolean>(() => {
    const saved = localStorage.getItem('tradenova_bg_active');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleBackground = () => {
    setBackgroundActive((prev) => {
      const next = !prev;
      localStorage.setItem('tradenova_bg_active', String(next));
      return next;
    });
  };

  // Apply Theme to documentElement
  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('tradenova_theme', theme);
  }, [theme]);

  // Apply Accent color
  useEffect(() => {
    document.documentElement.style.setProperty('--color-accent', accentColor);
    localStorage.setItem('tradenova_accent', accentColor);
  }, [accentColor]);

  // Initial Load: check session or load demo user
  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Session expired');
        })
        .then((data) => {
          setUser(data.user);
          localStorage.setItem('tradenova_user', JSON.stringify(data.user));
        })
        .catch(() => {
          loginAsDemoUser();
        });
    } else {
      loginAsDemoUser();
    }

    refreshProviderStatus();
    refreshDbStatus();
  }, []);

  useEffect(() => {
    if (token) {
      refreshPaperAccount();
      refreshNotifications();
      refreshAlerts();
      refreshDeposits();
    }
  }, [token]);

  // Real-Time Price Alert SSE Stream connection
  useEffect(() => {
    if (!token) return;

    let eventSource: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    try {
      eventSource = new EventSource(`/api/alerts/stream?token=${encodeURIComponent(token)}`);

      eventSource.addEventListener('alert_triggered', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setAlertToast(data);
          refreshNotifications();
          refreshAlerts();
        } catch (err) {}
      });

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
      };
    } catch (e) {}

    // 8s backup poll
    pollInterval = setInterval(() => {
      refreshNotifications();
      refreshAlerts();
      refreshDeposits();
    }, 8000);

    return () => {
      if (eventSource) eventSource.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [token]);

  const login = (newToken: string, newUser: UserProfile) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('tradenova_token', newToken);
    localStorage.setItem('tradenova_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setPaperAccount(null);
    setNotifications([]);
    setAlerts([]);
    setDeposits([]);
    localStorage.removeItem('tradenova_token');
    localStorage.removeItem('tradenova_user');
  };

  const loginAsDemoUser = async () => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'trader@tradenova.in', password: 'tradenova2026' }),
      });
      if (res.ok) {
        const data = await res.json();
        login(data.token, data.user);
      }
    } catch (e) {}
  };

  const setTheme = (t: 'dark' | 'light' | 'system') => {
    setThemeState(t);
    if (token) {
      fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ theme: t }),
      }).catch(() => {});
    }
  };

  const setAccentColor = (c: string) => {
    setAccentColorState(c);
    if (token) {
      fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ accentColor: c }),
      }).catch(() => {});
    }
  };

  const refreshPaperAccount = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/paper/account', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPaperAccount(data.account);
      }
    } catch (e) {}
  };

  const refreshNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {}
  };

  const refreshAlerts = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/alerts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (e) {}
  };

  const refreshDeposits = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/paper/deposits', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDeposits(data.deposits || []);
      }
    } catch (e) {}
  };

  const depositFunds = async (
    amount: number,
    method: 'CARD' | 'UPI' | 'NET_BANKING',
    details: any
  ) => {
    if (!token) return { success: false, error: 'Please sign in to add funds.' };
    try {
      const res = await fetch('/api/paper/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount, paymentMethod: method, details }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to deposit funds');
      }
      await refreshPaperAccount();
      await refreshNotifications();
      await refreshDeposits();
      return { success: true, message: data.message };
    } catch (e: any) {
      return { success: false, error: e.message || 'Deposit failed' };
    }
  };

  const refreshProviderStatus = async () => {
    try {
      const res = await fetch('/api/market/data-status');
      if (res.ok) {
        const data = await res.json();
        setProviderStatus(data);
      }
    } catch (e) {}
  };

  const refreshDbStatus = async () => {
    try {
      const res = await fetch('/api/system/db-status');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch (e) {}
  };

  const connectMongoDb = async (uri: string, persistToEnv: boolean = true) => {
    try {
      const res = await fetch('/api/system/connect-mongodb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mongoUri: uri, persistToEnv }),
      });
      const data = await res.json();
      await refreshDbStatus();
      if (token) {
        await refreshAlerts();
        await refreshPaperAccount();
        await refreshDeposits();
      }
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Connection request failed' };
    }
  };

  const dismissAlertToast = () => {
    setAlertToast(null);
  };

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        theme,
        accentColor,
        paperAccount,
        providerStatus,
        dbStatus,
        notifications,
        unreadNotifsCount,
        alerts,
        alertToast,
        deposits,
        authModalOpen,
        authModalTab,
        dbModalOpen,
        addFundsModalOpen,
        backgroundActive,
        setAuthModalOpen,
        setAuthModalTab,
        setDbModalOpen,
        setAddFundsModalOpen,
        toggleBackground,
        dismissAlertToast,
        login,
        logout,
        setTheme,
        setAccentColor,
        refreshPaperAccount,
        refreshNotifications,
        refreshAlerts,
        refreshProviderStatus,
        refreshDbStatus,
        refreshDeposits,
        depositFunds,
        connectMongoDb,
        loginAsDemoUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

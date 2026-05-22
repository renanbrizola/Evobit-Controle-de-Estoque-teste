import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Movements from './pages/Movements';
import Products from './pages/Products';

import Inventory from './pages/Inventory';
import Providers from './pages/Providers';
import Categories from './pages/Categories';
import History from './pages/History';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import UpdatePassword from './pages/UpdatePassword';
import TeamSettings from './pages/TeamSettings';
// import ReloadPrompt from './components/ReloadPrompt';
import Modules from './pages/Modules';
import CompanySettings from './pages/CompanySettings';
import AccessDenied from './pages/AccessDenied';
import Admin from './pages/Admin';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Loader2 } from 'lucide-react';
import LicenseGuard from './components/shared/LicenseGuard';
import { SecurityProvider } from './contexts/SecurityContext'; // Connect SecurityProvider
import { LanguageProvider } from './contexts/LanguageContext';
import { ModuleProvider } from './contexts/ModuleContext';
import ModuleGuard from './components/shared/ModuleGuard';
import Sales from './pages/Sales';
import Orders from './pages/Orders'; // Import Orders
import Purchases from './pages/Purchases';
import Finance from './pages/Finance';
import Customers from './pages/Customers'; // Import Customers
import LockScreen from './components/auth/LockScreen'; // Connect LockScreen
import GeneralDashboard from './pages/GeneralDashboard'; // New General Dashboard
import SalesDashboard from './pages/SalesDashboard';
import PurchasesDashboard from './pages/PurchasesDashboard';
import FinanceDashboard from './pages/FinanceDashboard';
import Reports from './pages/Reports';
import SectionErrorBoundary from './components/shared/SectionErrorBoundary';
import OfflineIndicator from './components/shared/OfflineIndicator';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-brand-primary">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (user.status === 'pending' || user.status === 'blocked') {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
};

const AdminRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user || user.role !== 'admin') {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
};

function App() {
  React.useEffect(() => {
    let intervalId = null;

    const initSync = async () => {
      try {
        const { getDatabase } = await import('./db/database');
        const { syncAll } = await import('./db/sync');
        const db = await getDatabase();

        // Initial sync
        await syncAll(db);

        // Periodic sync
        intervalId = setInterval(() => syncAll(db), 60000);
      } catch (err) {
        console.error("Failed to init sync:", err);
      }
    };
    initSync();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <Router>
      <Toaster position="top-center" richColors theme="system" closeButton />
      <OfflineIndicator />
      <AuthProvider>
        <ModuleProvider> {/* Module Context Added */}
          <LanguageProvider>
            <ThemeProvider>
              <SecurityProvider>
                <LockScreen />
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/update-password" element={<UpdatePassword />} />
                  <Route path="/access-denied" element={<AccessDenied />} />

                  {/* License Guard Wrapper */}
                  <Route element={<LicenseGuard><Outlet /></LicenseGuard>}>
                    <Route element={<AdminRoute />}>
                      <Route path="/admin" element={<Admin />} />
                    </Route>

                    <Route element={<ProtectedRoute />}>
                      {/* Module Selection (Lobby) */}
                      <Route path="/modules" element={<Modules />} />

                      {/* Redirect root to modules */}
                      <Route path="/" element={<Navigate to="/modules" replace />} />

                      {/* --- STANDALONE WINDOWS --- */}
                      <Route path="/standalone/reports/:tab" element={<SectionErrorBoundary section="standalone-reports"><Reports standalone={true} /></SectionErrorBoundary>} />
                      <Route path="/standalone/reports" element={<Navigate to="/standalone/reports/overview" replace />} />

                      {/* Main App Layout */}
                      <Route path="/app" element={<Layout />}>
                        <Route index element={<Navigate to="/app/visao-geral" replace />} />

                        {/* GENERAL OVERVIEW (HUB) */}
                        <Route path="visao-geral" element={<GeneralDashboard />} />

                        {/* ANALYTICS DASHBOARD */}
                        <Route path="dashboard" element={<Dashboard />} />

                        {/* ESTOQUE MODULE */}
                        <Route element={<ModuleGuard requiredModule="inventory" />}>
                          <Route path="estoque" element={<SectionErrorBoundary section="inventory"><Inventory /></SectionErrorBoundary>} />
                          <Route path="movimentacoes" element={<SectionErrorBoundary section="movements"><Movements /></SectionErrorBoundary>} />
                          <Route path="produtos" element={<SectionErrorBoundary section="products"><Products /></SectionErrorBoundary>} />

                          <Route path="fornecedores" element={<SectionErrorBoundary section="providers"><Providers /></SectionErrorBoundary>} />
                          <Route path="categorias" element={<SectionErrorBoundary section="categories"><Categories /></SectionErrorBoundary>} />
                          <Route path="historico" element={<SectionErrorBoundary section="history"><History /></SectionErrorBoundary>} />
                          <Route path="relatorios" element={<SectionErrorBoundary section="reports"><Reports /></SectionErrorBoundary>} />
                        </Route>

                        {/* VENDAS MODULE */}
                        <Route element={<ModuleGuard requiredModule="sales" />}>
                          <Route path="dashboard-vendas" element={<SectionErrorBoundary section="sales-dashboard"><SalesDashboard /></SectionErrorBoundary>} />
                          <Route path="pedidos" element={<SectionErrorBoundary section="orders"><Orders /></SectionErrorBoundary>} />
                          <Route path="vendas" element={<SectionErrorBoundary section="sales"><Sales /></SectionErrorBoundary>} />
                          <Route path="clientes" element={<SectionErrorBoundary section="customers"><Customers /></SectionErrorBoundary>} />
                        </Route>

                        {/* COMPRAS MODULE */}
                        <Route element={<ModuleGuard requiredModule="purchases" />}>
                          <Route path="dashboard-compras" element={<SectionErrorBoundary section="purchases-dashboard"><PurchasesDashboard /></SectionErrorBoundary>} />
                          <Route path="compras" element={<SectionErrorBoundary section="purchases"><Purchases /></SectionErrorBoundary>} />
                        </Route>

                        {/* FINANCE MODULE */}
                        <Route element={<ModuleGuard requiredModule="finance" />}>
                          <Route path="dashboard-financeiro" element={<SectionErrorBoundary section="finance-dashboard"><FinanceDashboard /></SectionErrorBoundary>} />
                          <Route path="financeiro" element={<SectionErrorBoundary section="finance"><Finance /></SectionErrorBoundary>} />
                        </Route>

                        <Route path="configuracoes" element={<CompanySettings />} />
                      </Route>
                    </Route>
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </SecurityProvider>
            </ThemeProvider>
          </LanguageProvider>
        </ModuleProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

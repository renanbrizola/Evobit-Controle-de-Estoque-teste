import React, { useState, useRef, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useTheme } from '../contexts/ThemeContext';
import { useSecurity } from '../contexts/SecurityContext';
import { useLanguage } from '../contexts/LanguageContext';
import { backupService } from '../services/backup';
import { Save, Store, Palette, Globe, Check, Users, Shield, Download, Upload, Lock, KeyRound, Clock, DollarSign, Database, Building2 } from 'lucide-react';
import TeamSettings from './TeamSettings';
import LicenseSettings from './LicenseSettings';
import { toast } from 'sonner';
import clsx from 'clsx';

const CompanySettings = () => {
    const { companyName, currency, updateSettings } = useTheme();
    const { updatePin, hasPin, updateTimeout, timeoutSettings } = useSecurity();
    const { language, setLanguage, t } = useLanguage();
    const [selectedLanguage, setSelectedLanguage] = useState(language);
    const [selectedCurrency, setSelectedCurrency] = useState(currency);
    const [activeTab, setActiveTab] = useState('company');
    const fileInputRef = useRef(null);

    // Sync language and currency when context changes (for re-selection after save)
    useEffect(() => {
        setSelectedLanguage(language);
    }, [language]);

    useEffect(() => {
        setSelectedCurrency(currency);
    }, [currency]);

    // Company Settings State
    const [name, setName] = useState(companyName);
    const [loading, setLoading] = useState(false);

    // Security State
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');

    const currencyOptions = ['BRL', 'USD', 'EUR', 'GBP', 'PEN', 'ARS', 'CLP', 'COP', 'MXN'];

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setLoading(true);
        setLanguage(selectedLanguage); // Apply language change only here
        await updateSettings(name, selectedCurrency);
        setLoading(false);
        toast.success(t('common', 'success'));
    };

    const handleExportBackup = async () => {
        await backupService.exportData();
    };

    const handleImportBackup = (e) => {
        const file = e.target.files[0];
        if (file) {
            toast.promise(backupService.importData(file), {
                loading: t('common', 'loading'),
                success: t('common', 'success'),
                error: (err) => `${t('common', 'error')}: ${err.message}`
            });
        }
        e.target.value = null; // Reset input
    };

    const handleSavePin = async () => {
        if (newPin.length !== 4) {
            toast.error(t('lockScreen', 'enterPin'));
            return;
        }
        if (newPin !== confirmPin) {
            toast.error(t('updatePassword', 'mismatch'));
            return;
        }
        await updatePin(newPin);
        toast.success(t('common', 'toasts.pinUpdated'));
        setNewPin('');
        setConfirmPin('');
    };

    const handleRemovePin = async () => {
        await updatePin(null);
        toast.success(t('common', 'success'));
    };

    // DEFINE TABS
    const tabs = [
        { id: 'company', label: t('settings', 'companyTab') || 'Dados da Empresa', icon: Building2 },
        { id: 'team', label: t('team', 'title') || 'Equipe', icon: Users },
        { id: 'security', label: t('settings', 'security') || 'Segurança', icon: Lock },
        { id: 'license', label: 'Licença & Atualizações', icon: Shield },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-white dark:bg-brand-dark/5 rounded-2xl shadow-sm border border-gray-100 dark:border-brand-light/10">
                    <Store size={32} className="text-brand-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-serif font-bold text-brand-primary">{t('settings', 'title')}</h1>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                            activeTab === tab.id
                                ? "bg-white text-brand-primary shadow-sm"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                        )}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'company' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-left-4 duration-300">
                        {/* Visual Identity */}
                        <Card className="p-6 md:p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Palette size={120} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <Palette size={20} className="text-brand-primary" />
                                {t('settings', 'visualIdentity')}
                            </h2>
                            <form onSubmit={handleSaveSettings} className="space-y-8">
                                <div>
                                    <Input
                                        label={t('settings', 'companyName')}
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        icon={Globe}
                                        placeholder="Ex: Evobit App"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('settings', 'language')}</label>
                                    <Select
                                        value={selectedLanguage}
                                        onChange={(e) => setSelectedLanguage(e.target.value)}
                                    >
                                        <option value="pt">Português (Brasil)</option>
                                        <option value="en">English (US)</option>
                                        <option value="es">Español (LATAM)</option>
                                    </Select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                        <DollarSign size={16} className="text-brand-primary" />
                                        {t('settings', 'currency')}
                                    </label>
                                    <Select
                                        value={selectedCurrency}
                                        onChange={(e) => setSelectedCurrency(e.target.value)}
                                    >
                                        {currencyOptions.map(code => (
                                            <option key={code} value={code}>{t('settings', `currencies.${code}`)}</option>
                                        ))}
                                    </Select>
                                </div>
                                <div className="pt-4">
                                    <Button className="w-full md:w-auto" disabled={loading}>
                                        <Save size={18} className="mr-2" />
                                        {t('settings', 'save')}
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                )}

                {activeTab === 'team' && (
                    <div className="animate-in slide-in-from-right-4 duration-300">
                        <TeamSettings />
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-right-4 duration-300">
                        {/* Data Backup */}
                        <Card className="p-6 md:p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Store size={120} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <Store size={20} className="text-brand-primary" />
                                {t('settings', 'backup')}
                            </h2>
                            <div className="space-y-6">
                                <p className="text-sm text-gray-500">
                                    {t('settings', 'backupDescription')}
                                </p>

                                <div className="grid grid-cols-1 gap-4">
                                    <Button onClick={handleExportBackup} variant="secondary" className="justify-start">
                                        <Download size={20} className="mr-2" />
                                        {t('settings', 'exportBackup')}
                                    </Button>

                                    <div className="relative">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleImportBackup}
                                            accept=".json"
                                            className="hidden"
                                        />
                                        <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full justify-start border-dashed border-2 border-gray-300 dark:border-brand-light/20 hover:border-brand-primary hover:bg-brand-primary/5 text-gray-500 dark:text-gray-400 hover:text-brand-dark dark:hover:text-brand-light">
                                            <Upload size={20} className="mr-2" />
                                            {t('settings', 'importBackup')}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* App Security */}
                        <Card className="p-6 md:p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Lock size={120} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <Lock size={20} className="text-brand-primary" />
                                {t('settings', 'security')}
                            </h2>

                            <div className="space-y-6">
                                {/* Auto Lock */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                        <Clock size={16} /> {t('settings', 'autoLock')}
                                    </label>
                                    <Select
                                        value={timeoutSettings || ''}
                                        onChange={(e) => updateTimeout(e.target.value)}
                                    >
                                        <option value="">{t('settings', 'disabled') || 'Disabled'}</option>
                                        <option value="1">1 {t('settings', 'minutes')}</option>
                                        <option value="5">5 {t('settings', 'minutes')}</option>
                                        <option value="15">15 {t('settings', 'minutes')}</option>
                                        <option value="30">30 {t('settings', 'minutes')}</option>
                                    </Select>
                                </div>

                                <hr className="border-brand-light/10" />

                                {/* PIN Settings */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <KeyRound size={16} /> {t('settings', 'changePin')}
                                    </h3>

                                    {hasPin ? (
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500">
                                                    <Check size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-emerald-500 text-sm">PIN {t('admin', 'status.active')}</p>
                                                    <p className="text-xs text-emerald-400">{t('lockScreen', 'locked')}</p>
                                                </div>
                                            </div>
                                            <Button size="sm" variant="danger" onClick={handleRemovePin}>
                                                {t('common', 'delete')}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <Input
                                                placeholder={t('lockScreen', 'enterPin')}
                                                maxLength={4}
                                                type="password"
                                                inputMode="numeric"
                                                value={newPin}
                                                onChange={(e) => setNewPin(e.target.value)}
                                            />
                                            <Input
                                                placeholder={t('auth', 'confirmPassword')}
                                                maxLength={4}
                                                type="password"
                                                inputMode="numeric"
                                                value={confirmPin}
                                                onChange={(e) => setConfirmPin(e.target.value)}
                                            />
                                            <Button onClick={handleSavePin} className="w-full" disabled={!newPin || !confirmPin}>
                                                {t('settings', 'changePin')}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'license' && <LicenseSettings />}
            </div>
        </div>
    );
};

export default CompanySettings;

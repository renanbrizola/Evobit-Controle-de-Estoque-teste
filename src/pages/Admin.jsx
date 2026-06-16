import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/Button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Check, X, Shield, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';

const Admin = () => {
    const { t } = useLanguage();
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchProfiles = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProfiles(data || []);
        } catch (error) {
            console.error('Erro ao buscar perfis:', error);
            toast.error(t('admin', 'fetchError'));
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            toast.success(t('admin', newStatus === 'active' ? 'userApproved' : 'userBlocked'));
            fetchProfiles(); // Refresh list
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            toast.error(t('admin', 'updateError'));
        }
    };

    const filteredProfiles = profiles.filter(profile =>
        profile.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800 hover:bg-green-200';
            case 'blocked': return 'bg-red-100 text-red-800 hover:bg-red-200';
            default: return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'active': return t('admin', 'status.active');
            case 'blocked': return t('admin', 'status.blocked');
            default: return t('admin', 'status.pending');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">{t('admin', 'totalUsers')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{profiles.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">{t('admin', 'status.pending')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">
                                {profiles.filter(p => p.status === 'pending').length}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">{t('admin', 'status.active')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {profiles.filter(p => p.status === 'active').length}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <CardTitle>{t('admin', 'usersAndLicenses')}</CardTitle>
                                <CardDescription>{t('admin', 'approveOrBlock')}</CardDescription>
                            </div>
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder={t('common', 'searchPlaceholder')}
                                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="animate-spin text-brand-primary" size={32} />
                            </div>
                        ) : filteredProfiles.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">{t('common', 'noResults')}</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-600 font-medium">
                                        <tr>
                                            <th className="px-4 py-3 rounded-tl-lg">Email</th>
                                            <th className="px-4 py-3">{t('admin', 'columns.date')}</th>
                                            <th className="px-4 py-3">{t('admin', 'columns.role')}</th>
                                            <th className="px-4 py-3">{t('admin', 'columns.status')}</th>
                                            <th className="px-4 py-3 text-right rounded-tr-lg">{t('common', 'actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredProfiles.map((profile) => (
                                            <tr key={profile.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{profile.email}</td>
                                                <td className="px-4 py-3 text-gray-500">
                                                    {new Date(profile.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {profile.role === 'admin' ? (
                                                        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-none">
                                                            <Shield size={12} className="mr-1" /> {t('admin', 'roles.admin')}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-gray-600">{t('admin', 'roles.user')}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge className={`${getStatusColor(profile.status)} border-none shadow-none`}>
                                                        {getStatusLabel(profile.status)}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-right flex justify-end gap-2">
                                                    {profile.status === 'pending' && (
                                                        <Button
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700 text-white h-8 px-3"
                                                            onClick={() => handleUpdateStatus(profile.id, 'active')}
                                                        >
                                                            <Check size={14} className="mr-1" /> {t('admin', 'approve')}
                                                        </Button>
                                                    )}
                                                    {profile.status === 'active' && profile.role !== 'admin' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-red-600 hover:bg-red-50 border-red-200 h-8 px-3"
                                                            onClick={() => handleUpdateStatus(profile.id, 'blocked')}
                                                        >
                                                            <X size={14} className="mr-1" /> {t('admin', 'block')}
                                                        </Button>
                                                    )}
                                                    {profile.status === 'blocked' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-green-600 hover:bg-green-50 border-green-200 h-8 px-3"
                                                            onClick={() => handleUpdateStatus(profile.id, 'active')}
                                                        >
                                                            <Check size={14} className="mr-1" /> {t('admin', 'reactivate')}
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
        </div>
    );
};

export default Admin;

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Users, UserPlus, Trash2, Mail, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';

const TeamSettings = () => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviting, setInviting] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await api.teams.list();
            setMembers(data);
        } catch (error) {
            console.error(error);
            toast.error(t('team', 'loadError'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        (async () => {
            await loadData();
        })();
    }, [loadData]);

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!inviteEmail) return;

        try {
            setInviting(true);
            await api.teams.invite(inviteEmail);
            toast.success(t('team', 'inviteSuccess'));
            setInviteEmail('');
            loadData();
        } catch (error) {
            console.error(error);
            if (error.code === '23505') {
                toast.error(t('team', 'alreadyMember'));
            } else {
                toast.error(t('team', 'inviteError'));
            }
        } finally {
            setInviting(false);
        }
    };

    const handleRemove = async (id) => {
        if (!confirm(t('team', 'confirmRemove'))) return;

        try {
            await api.teams.remove(id);
            toast.success(t('team', 'removeSuccess'));
            loadData();
        } catch (error) {
            console.error(error);
            toast.error(t('team', 'removeError'));
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-2xl font-bold text-brand-primary">{t('team', 'title')}</h2>
                <p className="text-gray-500 dark:text-brand-dark/60 text-sm">{t('team', 'subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Invite Card */}
                <Card className="h-fit">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <UserPlus size={20} className="text-brand-primary" />
                        {t('team', 'inviteTitle')}
                    </h3>
                    <p className="text-sm text-gray-400 mb-6">
                        {t('team', 'inviteDesc')}
                    </p>

                    <form onSubmit={handleInvite} className="space-y-4">
                        <Input
                            label={t('team', 'emailLabel')}
                            type="email"
                            placeholder="funcionario@email.com"
                            icon={Mail}
                            value={inviteEmail}
                            onChange={e => setInviteEmail(e.target.value)}
                            required
                        />
                        <Button className="w-full" disabled={inviting}>
                            {inviting ? <Loader2 className="animate-spin mr-2" /> : t('team', 'addButton')}
                        </Button>
                    </form>
                </Card>

                {/* Team List Card */}
                <Card>
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Users size={20} className="text-brand-primary" />
                        {t('team', 'membersTitle')}
                    </h3>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="animate-spin text-brand-primary" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Owner (You) */}
                            <div className="flex items-center justify-between p-3 bg-brand-primary/5 rounded-lg border border-brand-primary/10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-full">
                                        <Shield size={16} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-brand-dark dark:text-brand-light">{t('team', 'you')}</p>
                                        <p className="text-xs text-brand-primary">{user?.email}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Members */}
                            {members.length === 0 ? (
                                <p className="text-center text-gray-400 py-4 text-sm">
                                    {t('team', 'noMembers')}
                                </p>
                            ) : (
                                members.map(member => (
                                    <div key={member.id} className="flex items-center justify-between p-3 bg-white dark:bg-brand-dark/5 rounded-lg border border-gray-100 dark:border-brand-light/10 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-gray-100 dark:bg-brand-dark/10 text-gray-500 rounded-full">
                                                <Users size={16} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-brand-dark dark:text-brand-light">
                                                    {member.member_id ? t('team', 'active') : t('team', 'pending')}
                                                </p>
                                                <p className="text-xs text-gray-500">{member.member_email}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemove(member.id)}
                                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Remover Membro"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default TeamSettings;

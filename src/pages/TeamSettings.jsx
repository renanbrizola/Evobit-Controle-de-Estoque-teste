import React, { useState, useEffect } from 'react';
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

    useEffect(() => {
        loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps restritas de proposito (fetch-on-mount/por-filtro; padrao legado auditado)
    }, []);

    const loadData = async () => {
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
    };

    // Plano gratuito: até 2 membros. Acima disso, o dono contrata membros
    // adicionais (o banco é a fonte da verdade; aqui é só o atalho de UX).
    const MEMBER_LIMIT = 2;

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!inviteEmail) return;

        if (members.length >= MEMBER_LIMIT) {
            toast.error(t('team', 'memberLimitReached'));
            return;
        }

        const email = inviteEmail;
        try {
            setInviting(true);
            // 1. INSERT (rápido). Já reflete na lista e libera o form.
            const member = await api.teams.invite(email);
            setMembers(prev => [...prev, member]);
            setInviteEmail('');
            toast.success(t('team', 'inviteSuccess'));

            // 2. E-mail em background: não bloqueia a UI. Toast de follow-up.
            api.teams.sendInviteEmail(email)
                .then((res) => {
                    if (res.emailSent) toast.success(t('team', 'inviteEmailSent'));
                    else if (res.alreadyRegistered) toast.info(t('team', 'inviteExistingAccount'));
                    else toast.warning(t('team', 'inviteEmailNotSent'));
                })
                .catch(() => toast.warning(t('team', 'inviteEmailNotSent')));
        } catch (error) {
            console.error(error);
            if (error.inviteBlock === 'owner') {
                toast.error(t('team', 'inviteBlockedOwner'));
            } else if (error.inviteBlock === 'member_elsewhere') {
                toast.error(t('team', 'inviteBlockedMemberElsewhere'));
            } else if (error.code === '23505') {
                toast.error(t('team', 'alreadyMember'));
            } else if (/limite|limit/i.test(error.message || '')) {
                // Trigger de limite de membros (regra de negócio no banco)
                toast.error(t('team', 'memberLimitReached'));
            } else {
                toast.error(t('team', 'inviteError'));
            }
        } finally {
            setInviting(false);
        }
    };

    // Permissões liberadas pelo dono (novo membro começa somente leitura)
    const PERMISSION_OPTIONS = [
        { key: 'inventory_write', labelKey: 'permInventory' },
        { key: 'technical_sheet_write', labelKey: 'permTechnicalSheet' },
        { key: 'can_delete', labelKey: 'permDelete' },
    ];

    const handleTogglePermission = async (member, key) => {
        const updated = { ...(member.permissions || {}), [key]: !(member.permissions?.[key]) };
        // Otimista: reflete na hora; desfaz recarregando se o servidor recusar
        setMembers(prev => prev.map(m => (m.id === member.id ? { ...m, permissions: updated } : m)));
        try {
            await api.teams.updatePermissions(member.id, updated);
            toast.success(t('team', 'permissionsUpdated'));
        } catch (error) {
            console.error(error);
            toast.error(t('team', 'permissionsError'));
            loadData();
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
                                    <div key={member.id} className="p-3 bg-white dark:bg-brand-dark/5 rounded-lg border border-gray-100 dark:border-brand-light/10 shadow-sm">
                                        <div className="flex items-center justify-between">
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

                                        {/* Permissões do membro (dono libera aqui; padrão = somente leitura) */}
                                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-brand-light/10">
                                            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">{t('team', 'permissionsTitle')}</p>
                                            <div className="flex flex-wrap gap-x-4 gap-y-2">
                                                {PERMISSION_OPTIONS.map(opt => (
                                                    <label key={opt.key} className="flex items-center gap-2 text-sm text-brand-dark dark:text-brand-light cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            className="accent-brand-primary w-4 h-4"
                                                            checked={member.permissions?.[opt.key] === true}
                                                            onChange={() => handleTogglePermission(member, opt.key)}
                                                        />
                                                        {t('team', opt.labelKey)}
                                                    </label>
                                                ))}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-2">{t('team', 'readOnlyHint')}</p>
                                        </div>
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

import React, { useEffect, useState } from "react";
import { fetchUsers, inviteUser, User } from "../api";
import { UserPlus, Mail, Shield, ShieldCheck, MoreVertical, Search, Zap } from "lucide-react";

const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("viewer");

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const data = await fetchUsers();
            setUsers(data);
        } catch (err) {
            console.error("Failed to load users:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await inviteUser(inviteEmail, inviteRole);
            setInviteEmail("");
            setShowInvite(false);
            loadUsers();
        } catch (err) {
            alert("Failed to invite user");
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-end bg-slate-900/40 backdrop-blur p-8 rounded-[40px] border border-slate-800/60 shadow-xl shadow-slate-950/20">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tighter">Identity Management</h1>
                    </div>
                    <p className="text-slate-400 font-medium max-w-md">Control access to your organization's IoT data and device controls.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setShowInvite(true)}
                        className="flex items-center gap-2 bg-gradient-to-tr from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white px-8 py-4 rounded-3xl font-black transition-all shadow-xl shadow-indigo-600/20 active:scale-95 text-lg"
                    >
                        <UserPlus className="w-6 h-6" />
                        <span>Invite Member</span>
                    </button>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                    type="text"
                    placeholder="Search users by name, email or role..."
                    className="w-full bg-slate-900/60 border border-slate-800/60 rounded-3xl pl-14 pr-6 py-6 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium"
                />
            </div>

            <div className="bg-slate-900/40 backdrop-blur-md rounded-[40px] border border-slate-800/60 overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-800/80 bg-slate-800/20">
                            <th className="px-8 py-6 text-xs font-black uppercase text-slate-500 tracking-[0.2em]">Member</th>
                            <th className="px-8 py-6 text-xs font-black uppercase text-slate-500 tracking-[0.2em]">Email Address</th>
                            <th className="px-8 py-6 text-xs font-black uppercase text-slate-500 tracking-[0.2em]">Role</th>
                            <th className="px-8 py-6 text-xs font-black uppercase text-slate-500 tracking-[0.2em]">Joined</th>
                            <th className="px-8 py-6 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                        {loading ? (
                            [1, 2, 3].map(i => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={5} className="px-8 py-8"><div className="h-4 bg-slate-800/60 rounded-full w-full opacity-50"></div></td>
                                </tr>
                            ))
                        ) : (
                            users.map((user) => (
                                <tr key={user.id} className="group hover:bg-slate-800/30 transition-all">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-700 to-slate-800 flex items-center justify-center text-white font-black text-lg shadow-inner group-hover:from-indigo-600 group-hover:to-cyan-600 transition-all duration-500">
                                                {user.email[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-white font-bold text-lg">{user.email.split('@')[0]}</div>
                                                <div className="text-slate-500 text-xs font-medium uppercase tracking-widest">{user.role}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-slate-400 group-hover:text-cyan-400 transition-colors">
                                            <Mail className="w-4 h-4" />
                                            <span>{user.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`px-4 py-2 rounded-xl text-xs font-black tracking-widest uppercase flex items-center gap-2 w-fit ${user.role === 'admin' ? "bg-indigo-500/10 text-indigo-400" : "bg-slate-800 text-slate-400"
                                            }`}>
                                            {user.role === 'admin' && <Shield className="w-3.5 h-3.5" />}
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-slate-500 font-medium">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button className="p-3 text-slate-600 hover:text-white hover:bg-slate-700/50 rounded-2xl transition-all active:scale-95">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showInvite && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-500">
                    <div className="bg-slate-900 border border-slate-800/60 w-full max-w-xl rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-500 scale-100">
                        <div className="flex flex-col items-center mb-8 text-center space-y-3">
                            <div className="w-16 h-16 bg-indigo-600/20 rounded-3xl flex items-center justify-center text-indigo-400 mb-2">
                                <Zap className="w-8 h-8 fill-current" />
                            </div>
                            <h2 className="text-3xl font-black text-white tracking-tighter">Invite Collaborator</h2>
                            <p className="text-slate-400 font-medium max-w-xs text-sm">Send an invitation to join your organization's IoT monitoring fleet.</p>
                        </div>

                        <form onSubmit={handleInvite} className="space-y-6">
                            <div className="group">
                                <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-4 px-1 group-focus-within:text-indigo-400 transition-colors">Recipient Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                                    <input
                                        autoFocus
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        className="w-full bg-slate-800/40 border-2 border-slate-800 rounded-3xl pl-16 pr-6 py-6 text-white focus:outline-none focus:border-indigo-600/50 focus:bg-slate-800/80 transition-all font-bold text-lg"
                                        placeholder="colleague@company.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {['admin', 'manager', 'viewer'].map((role) => (
                                    <button
                                        key={role}
                                        type="button"
                                        onClick={() => setInviteRole(role)}
                                        className={`px-4 py-8 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${inviteRole === role
                                                ? "border-indigo-600 bg-indigo-600/10 text-white shadow-lg shadow-indigo-600/10 scale-[1.02]"
                                                : "border-slate-800 bg-slate-800/20 text-slate-500 hover:border-slate-700 hover:text-slate-300"
                                            }`}
                                    >
                                        <Shield className={`w-8 h-8 ${inviteRole === role ? "text-indigo-400" : "text-slate-600"}`} />
                                        <span className="text-xs font-black uppercase tracking-widest">{role}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowInvite(false)}
                                    className="flex-1 px-8 py-6 rounded-3xl border-2 border-slate-800 text-slate-500 font-black uppercase tracking-widest hover:bg-slate-800 hover:text-white transition-all text-sm"
                                >
                                    Dismiss
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] px-8 py-6 rounded-3xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-black uppercase tracking-widest hover:from-indigo-500 hover:to-cyan-500 transition-all shadow-xl shadow-indigo-600/30 text-sm active:scale-95"
                                >
                                    Send Invitation
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersPage;

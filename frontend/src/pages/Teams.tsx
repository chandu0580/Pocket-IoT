import React, { useEffect, useState } from "react";
import { fetchTeams, createTeam, Team } from "../api";
import { Users, Plus, Shield, ArrowRight } from "lucide-react";

const Teams: React.FC = () => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newTeamName, setNewTeamName] = useState("");

    useEffect(() => {
        loadTeams();
    }, []);

    const loadTeams = async () => {
        try {
            const data = await fetchTeams();
            setTeams(data);
        } catch (err) {
            console.error("Failed to load teams:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createTeam(newTeamName);
            setNewTeamName("");
            setShowCreate(false);
            loadTeams();
        } catch (err) {
            alert("Failed to create team");
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Fleet Teams</h1>
                    <p className="text-slate-400 mt-1 font-medium">Segment your IoT fleet by operational teams.</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    <span>Create Team</span>
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-slate-800/40 rounded-3xl border border-slate-700/50" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teams.map((team) => (
                        <div
                            key={team.id}
                            className="group p-6 bg-slate-900/40 backdrop-blur border border-slate-800/60 rounded-3xl hover:border-indigo-500/40 transition-all hover:bg-slate-800/40"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                    <Users className="w-6 h-6" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-2 py-1 bg-slate-800/60 rounded-md">
                                    ID: {team.id}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-1">{team.name}</h3>
                            <div className="flex items-center gap-4 text-sm text-slate-400 mb-6">
                                <div className="flex items-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5" />
                                    <span>{team.member_count || 0} Members</span>
                                </div>
                            </div>

                            <button className="w-full flex items-center justify-between p-3 bg-slate-800/40 hover:bg-indigo-600 rounded-2xl text-sm font-bold text-slate-300 hover:text-white transition-all">
                                <span>Manage Team</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                        <h2 className="text-2xl font-bold text-white mb-6">Create New Team</h2>
                        <form onSubmit={handleCreate} className="space-y-6">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Team Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={newTeamName}
                                    onChange={(e) => setNewTeamName(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                    placeholder="e.g. SF Maintenance Crew"
                                    required
                                />
                            </div>
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreate(false)}
                                    className="flex-1 px-6 py-4 rounded-2xl border border-slate-800 text-slate-400 font-bold hover:bg-slate-800 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Teams;

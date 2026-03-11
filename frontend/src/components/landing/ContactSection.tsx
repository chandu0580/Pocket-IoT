import React, { useState } from 'react';
import { Phone, Mail, Linkedin, Globe, User } from 'lucide-react';

const CONTACT = {
    name: 'Chandu Yadav S',
    phone: '8431446252',
    email: 'yadav.chandu.545655@gmail.com',
    linkedin: 'https://linkedin.com/in/chanduyadav023',
    portfolio: 'https://chandu-yadav023.vercel.app/',
};

interface LinkRowProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    href?: string;
    external?: boolean;
}

const LinkRow: React.FC<LinkRowProps> = ({ icon, label, value, href, external }) => {
    const content = (
        <div className="flex items-center gap-3 group/row">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 group-hover/row:bg-indigo-500/20 transition-colors">
                {icon}
            </div>
            <div className="text-left">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{label}</div>
                <div className="text-sm font-semibold text-slate-200 group-hover/row:text-white transition-colors break-all">{value}</div>
            </div>
        </div>
    );

    if (href) {
        return (
            <a
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                className="block p-3 rounded-xl hover:bg-white/5 transition-all duration-200"
            >
                {content}
            </a>
        );
    }

    return <div className="p-3">{content}</div>;
};

// ─── External button ─────────────────────────────────────────────────────────
interface ExtLinkProps {
    href: string;
    icon: React.ReactNode;
    label: string;
    gradient: string;
    glow: string;
}

const ExtLink: React.FC<ExtLinkProps> = ({ href, icon, label, gradient, glow }) => (
    <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm text-white
      bg-gradient-to-r ${gradient} ${glow} hover:scale-105 transition-all duration-300`}
    >
        {icon}
        {label}
    </a>
);

// ─── Main component ───────────────────────────────────────────────────────────
const ContactSection: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <section id="contact" className="py-24 px-6 border-t border-white/5 bg-gradient-to-b from-gray-900 to-black relative z-10">
            {/* Subtle background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-700/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="max-w-2xl mx-auto relative">
                {/* Section label */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">
                        About the Developer
                    </div>
                    <h2 className="text-4xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        Get in Touch
                    </h2>
                    <p className="text-slate-500 mt-3 text-sm">
                        Built and maintained by a full-stack developer passionate about real-time systems and IoT.
                    </p>
                </div>

                {!isOpen ? (
                    <div className="flex justify-center mt-8">
                        <button
                            onClick={() => setIsOpen(true)}
                            className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg text-white transition-all bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:shadow-[0_0_20px_rgba(99,102,241,0.6)] hover:scale-105"
                        >
                            <Mail className="w-5 h-5" />
                            Contact Developer
                        </button>
                    </div>
                ) : (
                    <div className="relative bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl shadow-[0_0_40px_rgba(99,102,241,0.1)] overflow-hidden
        hover:scale-[1.01] hover:shadow-[0_0_60px_rgba(99,102,241,0.2)] transition-all duration-300 animate-in fade-in zoom-in duration-300">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-white/10"
                        >
                            &times;
                        </button>
                        {/* Card header */}
                        <div className="px-8 pt-8 pb-6 border-b border-white/5 flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                                <User className="w-7 h-7 text-indigo-300" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight">{CONTACT.name}</h3>
                                <p className="text-sm text-indigo-400 font-semibold">Full-Stack Developer · PocketIoT Creator</p>
                            </div>
                        </div>

                        {/* Contact rows */}
                        <div className="px-5 py-4 space-y-1">
                            <LinkRow
                                icon={<Phone className="w-4 h-4" />}
                                label="Phone"
                                value={CONTACT.phone}
                                href={`tel:${CONTACT.phone}`}
                            />
                            <LinkRow
                                icon={<Mail className="w-4 h-4" />}
                                label="Email"
                                value={CONTACT.email}
                                href={`mailto:${CONTACT.email}`}
                            />
                            <LinkRow
                                icon={<Linkedin className="w-4 h-4" />}
                                label="LinkedIn"
                                value="linkedin.com/in/chanduyadav023"
                                href={CONTACT.linkedin}
                                external
                            />
                            <LinkRow
                                icon={<Globe className="w-4 h-4" />}
                                label="Portfolio"
                                value="chandu-yadav023.vercel.app"
                                href={CONTACT.portfolio}
                                external
                            />
                        </div>

                        {/* CTA buttons */}
                        <div className="px-8 pb-8 pt-4 flex flex-col sm:flex-row gap-3">
                            <ExtLink
                                href={CONTACT.linkedin}
                                icon={<Linkedin className="w-4 h-4" />}
                                label="Connect on LinkedIn"
                                gradient="from-blue-600 to-blue-500"
                                glow="shadow-[0_0_20px_rgba(59,130,246,0.35)] hover:shadow-[0_0_30px_rgba(59,130,246,0.55)]"
                            />
                            <ExtLink
                                href={CONTACT.portfolio}
                                icon={<Globe className="w-4 h-4" />}
                                label="View Portfolio"
                                gradient="from-indigo-600 to-purple-600"
                                glow="shadow-[0_0_20px_rgba(99,102,241,0.35)] hover:shadow-[0_0_30px_rgba(99,102,241,0.55)]"
                            />
                            <ExtLink
                                href={`mailto:${CONTACT.email}`}
                                icon={<Mail className="w-4 h-4" />}
                                label="Send Email"
                                gradient="from-emerald-600 to-teal-600"
                                glow="shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:shadow-[0_0_30px_rgba(16,185,129,0.55)]"
                            />
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

export default ContactSection;

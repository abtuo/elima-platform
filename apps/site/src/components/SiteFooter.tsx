import Image from "next/image";
import Link from "next/link";
import { Mail, Headphones, Phone, Sparkles, Users, GraduationCap, BookOpen } from "lucide-react";
import { Reveal } from "./Reveal";
import { IconBadge } from "./IconBadge";
import { FEATURE_MODULES } from "@/lib/feature-modules";
import { platformLoginUrl, revisionUrl, revisionPlayStoreUrl } from "@/lib/urls";
export function SiteFooter() { return (        <footer className="pb-10 pt-2 text-sm text-slate-600">
          <Reveal>
            <div className="mt-2 rounded-[28px] border border-slate-200/70 bg-white/70 p-6 shadow-sm backdrop-blur md:p-10">
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[1.2fr_2fr_1fr_1fr]">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Image src="/logo.png" alt="Logo Elima" width={30} height={30} className="rounded-full" />
                    <p className="text-base font-bold text-[var(--accent)]">Elima</p>
                  </div>
                  <p className="text-sm text-slate-600">Plateforme de gestion scolaire intelligente.</p>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2">
                      <Mail size={16} className="text-[var(--primary)]" />
                      <a className="hover:text-slate-900" href="mailto:contact@elima.africa">
                        contact@elima.africa
                      </a>
                    </p>
                    <p className="flex items-center gap-2">
                      <Headphones size={16} className="text-[var(--primary)]" />
                      <a className="hover:text-slate-900" href="mailto:support@elima.africa">
                        support@elima.africa
                      </a>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone size={16} className="text-[var(--primary)]" />
                      <a className="hover:text-slate-900" href="https://wa.me/33656802188" target="_blank" rel="noopener noreferrer">
                        +33 6 56 80 21 88
                      </a>
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-3 font-semibold text-[var(--accent)]">Modules inclus</p>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {FEATURE_MODULES.map((mod) => (
                      <li key={mod.title} className="flex items-center gap-3">
                        <IconBadge icon={mod.icon} size="sm" />
                        <span className="flex flex-wrap items-center gap-2">
                          {mod.title}
                          {mod.ai ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-700">
                              <Sparkles size={9} />
                              IA
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="mb-3 font-semibold text-[var(--accent)]">Portails utilisateur</p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                      <IconBadge icon={Users} size="sm" /> Direction
                    </li>
                    <li className="flex items-center gap-3">
                      <IconBadge icon={GraduationCap} size="sm" /> Enseignants
                    </li>
                    <li className="flex items-center gap-3">
                      <IconBadge icon={Users} size="sm" /> Parents
                    </li>
                    <li className="flex items-center gap-3">
                      <IconBadge icon={BookOpen} size="sm" /> Élèves
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="mb-3 font-semibold text-[var(--accent)]">Liens utiles</p>
                  <ul className="space-y-2">
                    <li>
                      <Link className="hover:text-slate-900" href="/tarifs">
                        Tarifs
                      </Link>
                    </li>
                    <li>
                      <Link className="hover:text-slate-900" href={platformLoginUrl}>
                        Connexion
                      </Link>
                    </li>
                    <li>
                      <Link className="hover:text-slate-900" href="/#roles">
                        Pour les écoles
                      </Link>
                    </li>
                    <li>
                      <Link className="hover:text-slate-900" href="/contact">
                        Centre d'aide
                      </Link>
                    </li>
                    <li>
                      <Link className="hover:text-slate-900" href="/contact">
                        Contact
                      </Link>
                    </li>
                    <li><Link href="/#produit">Fonctionnalités</Link></li>
                    <li><Link href="/#revision">Elima Révision</Link></li>
                    <li><a href={revisionUrl}>Essayer sur le web</a></li>
                    {revisionPlayStoreUrl && <li><a href={revisionPlayStoreUrl}>Télécharger l’app</a></li>}
                    <li><a href={`${revisionUrl}/legal/terms`}>CGU Révision</a></li>
                    <li><a href={`${revisionUrl}/legal/account-deletion`}>Suppression de compte Révision</a></li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 border-t border-slate-200/70 pt-6 md:flex-row md:items-center md:justify-between">
                <p className="text-xs text-slate-500">© {new Date().getFullYear()} Elima. Tous droits réservés.</p>
                <div className="flex flex-wrap gap-3 text-xs">
                  <a href={`${revisionUrl}/legal/privacy`}>Confidentialité Révision</a>
                  <Link className="text-slate-500 hover:text-slate-900" href="/cgv">
                    CGV
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </footer>); }

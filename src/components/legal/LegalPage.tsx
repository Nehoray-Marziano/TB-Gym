import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import StudioLogo from "@/components/StudioLogo";
import { legalDetails } from "@/lib/legal";
import LegalLinks from "./LegalLinks";
import "./legal.css";

export type LegalSection = { id: string; title: string; content: ReactNode };

export function LegalContact() {
  return (
    <address className="studio-legal-contact">
      <span>{legalDetails.contactName}</span>
      <a href={`tel:${legalDetails.contactPhoneHref}`}><bdi>{legalDetails.contactPhone}</bdi></a>
      <a href={`mailto:${legalDetails.contactEmail}`}><bdi>{legalDetails.contactEmail}</bdi></a>
    </address>
  );
}

export default function LegalPage({ title, introduction, sections }: {
  title: string;
  introduction: string;
  sections: LegalSection[];
}) {
  return (
    <main className="studio-legal-page" id="legal-top">
      <div className="studio-legal-container">
        <header className="studio-legal-header">
          <Link href="/" className="studio-legal-back" prefetch={false}>
            <ArrowRight aria-hidden="true" size={18} /> חזרה לאפליקציה
          </Link>
          <span aria-hidden="true"><StudioLogo className="h-10 w-10 bg-[var(--studio-ink)]" /></span>
        </header>

        <div className="studio-legal-intro">
          <p className="studio-legal-brand">סטודיו טליה</p>
          <h1>{title}</h1>
          <p>{introduction}</p>
          <p className="studio-legal-date">עודכן לאחרונה: <time dateTime={legalDetails.updatedAt}>{legalDetails.updatedAtLabel}</time></p>
        </div>

        <article className="studio-legal-document" aria-label={title}>
          {sections.map(section => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
              <h2 id={`${section.id}-title`}>{section.title}</h2>
              {section.content}
            </section>
          ))}
        </article>

        <footer className="studio-legal-footer">
          <a href="#legal-top">חזרה לראש המסמך</a>
          <LegalLinks />
        </footer>
      </div>
    </main>
  );
}

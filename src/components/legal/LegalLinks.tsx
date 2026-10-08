import Link from "next/link";
import "./legal-links.css";

export default function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="מידע משפטי" className={`studio-legal-links ${className}`}>
      <Link href="/privacy" prefetch={false}>מדיניות פרטיות</Link>
      <span aria-hidden="true">·</span>
      <Link href="/terms" prefetch={false}>תנאי שימוש</Link>
    </nav>
  );
}

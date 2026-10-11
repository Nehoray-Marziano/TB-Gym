export function bookingMessage(message: string | undefined) {
    if (!message) return "משהו השתבש בתהליך. נסי שוב בעוד רגע.";
    const lower = message.toLowerCase();
    if (lower.includes("too late") || lower.includes("10 hour")) {
        return "ניתן לבטל ללא חיוב עד 10 שעות לפני תחילת האימון.";
    }
    if (lower.includes("not found") || lower.includes("already cancel")) {
        return "לא נמצאה הרשמה פעילה לאימון זה, או שהאימון כבר בוטל.";
    }
    if (lower.includes("auth") || lower.includes("login")) {
        return "כדי לבטל או להירשם, יש להתחבר מחדש למערכת.";
    }
    if (lower.includes("already start")) {
        return "לא ניתן לבטל אימון שכבר החל.";
    }
    if (lower.includes("already book") || lower.includes("כבר רשומה")) {
        return "את כבר רשומה לאימון הזה.";
    }
    if (lower.includes("full") || lower.includes("מלא")) {
        return "האימון מלא, לא נותרו מקומות פנויים.";
    }
    if (lower.includes("no ticket") || lower.includes("אין כרטיס")) {
        return "אין לך כרטיסיות זמינות להרשמה.";
    }
    if (/^[\u0590-\u05FF\s!?.]+$/.test(message)) return message;
    return "לא הצלחנו להשלים את הפעולה כרגע. נסי שוב בעוד רגע.";
}

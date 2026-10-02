import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env.stress.local', override: true, quiet: true });
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !secretKey) {
  console.error('Missing Supabase credentials!');
  process.exit(1);
}

const admin = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Authentic Israeli female trainee profiles
const TRAINEES_META = [
  { name: 'שרה כהן', phone: '050-234-5678', age: 26, tier: 3, tierName: 'premium', tickets: 10 },
  { name: 'נועה לוי', phone: '052-345-6789', age: 29, tier: 2, tierName: 'standard', tickets: 6 },
  { name: 'מיה גולדשטיין', phone: '054-456-7890', age: 24, tier: 2, tierName: 'standard', tickets: 7 },
  { name: 'שירה אברהם', phone: '050-567-8901', age: 31, tier: 3, tierName: 'premium', tickets: 11 },
  { name: 'מיכל בן דוד', phone: '053-678-9012', age: 28, tier: 2, tierName: 'standard', tickets: 5 },
  { name: 'יעל פרידמן', phone: '054-789-0123', age: 27, tier: 1, tierName: 'basic', tickets: 3 },
  { name: 'תמר כץ', phone: '052-890-1234', age: 33, tier: 3, tierName: 'premium', tickets: 9 },
  { name: 'עדי מזרחי', phone: '050-901-2345', age: 25, tier: 2, tierName: 'standard', tickets: 8 },
  { name: 'עמית שני', phone: '053-012-3456', age: 30, tier: 1, tierName: 'basic', tickets: 4 },
  { name: 'רוני דהן', phone: '054-123-4567', age: 23, tier: 2, tierName: 'standard', tickets: 6 },
  { name: 'דנה שפירא', phone: '052-234-5678', age: 35, tier: 3, tierName: 'premium', tickets: 12 },
  { name: 'הילה אשכנזי', phone: '050-345-6789', age: 28, tier: 2, tierName: 'standard', tickets: 7 },
  { name: 'מאיה ברק', phone: '054-456-7891', age: 26, tier: 1, tierName: 'basic', tickets: 2 },
  { name: 'עדן סולומון', phone: '053-567-8902', age: 22, tier: 3, tierName: 'premium', tickets: 10 },
  { name: 'שחר גולן', phone: '052-678-9013', age: 32, tier: 2, tierName: 'standard', tickets: 5 },
  { name: 'לירון אלבז', phone: '050-789-0124', age: 27, tier: 2, tierName: 'standard', tickets: 8 },
  { name: 'גל נבון', phone: '054-890-1235', age: 30, tier: 1, tierName: 'basic', tickets: 3 },
  { name: 'ענבר רוזן', phone: '053-901-2346', age: 29, tier: 3, tierName: 'premium', tickets: 11 },
  { name: 'טל מלכה', phone: '052-012-3457', age: 24, tier: 2, tierName: 'standard', tickets: 6 },
  { name: 'יובל חדד', phone: '050-123-4568', age: 28, tier: 1, tierName: 'basic', tickets: 4 },
  { name: 'אוראל ביטון', phone: '054-234-5679', age: 25, tier: 2, tierName: 'standard', tickets: 7 },
  { name: 'שובל מור', phone: '053-345-6780', age: 31, tier: 3, tierName: 'premium', tickets: 9 },
  { name: 'הגר לביא', phone: '052-456-7892', age: 27, tier: 2, tierName: 'standard', tickets: 5 },
  { name: 'רותם שטרן', phone: '050-567-8903', age: 34, tier: 1, tierName: 'basic', tickets: 3 },
  { name: 'אביב קפלן', phone: '054-678-9014', age: 26, tier: 3, tierName: 'premium', tickets: 12 },
  { name: 'שני אוחיון', phone: '053-789-0125', age: 23, tier: 2, tierName: 'standard', tickets: 6 },
  { name: 'קרן דורון', phone: '052-890-1236', age: 36, tier: 1, tierName: 'basic', tickets: 4 },
  { name: 'מורן ארגוב', phone: '050-901-2347', age: 30, tier: 2, tierName: 'standard', tickets: 7 },
  { name: 'נופר צור', phone: '054-012-3458', age: 28, tier: 3, tierName: 'premium', tickets: 10 },
  { name: 'ליאן שמש', phone: '052-123-4569', age: 25, tier: 2, tierName: 'standard', tickets: 8 },
];

async function enrichPlatform() {
  console.log('========================================================');
  console.log('  ENRICHING PLATFORM WITH DATA: USERS, FUNDS & SESSIONS  ');
  console.log('========================================================');

  // 1. Fetch current profiles
  const { data: profiles, error: pErr } = await admin.from('profiles').select('*');
  if (pErr) throw pErr;
  console.log(`Found ${profiles.length} profiles in database.`);

  const dummyTrainees = profiles
    .filter(p => p.email && p.email.startsWith('dummy_trainee_'))
    .sort((a, b) => a.email.localeCompare(b.email));

  const elsaProfile = profiles.find(p => p.email === 'elsasebagh@gmail.com');
  const taliaProfile = profiles.find(p => p.email === 'bartaltalia@gmail.com');
  const nehorayProfile = profiles.find(p => p.email === 'nehoraymarziano@gmail.com');
  const dummyAdmins = profiles.filter(p => p.email && p.email.startsWith('dummy_admin_'));

  // Expiry date for subscriptions and tickets: 45 days into the future (mid November 2026)
  const expiryDate = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString();
  const startedAt = new Date('2026-10-01T00:00:00Z').toISOString();

  console.log('\n--- 1. Updating Trainee Profiles & Granting Subscriptions/Tickets ---');

  // Update dummy trainees
  const allTraineeProfiles = [];

  for (let i = 0; i < dummyTrainees.length; i++) {
    const profile = dummyTrainees[i];
    const meta = TRAINEES_META[i % TRAINEES_META.length];

    // Update profile
    await admin.from('profiles').update({
      full_name: meta.name,
      phone: meta.phone,
      age: meta.age,
      onboarding_completed: true,
      updated_at: new Date().toISOString()
    }).eq('id', profile.id);

    // Update health declaration
    await admin.from('health_declarations').upsert({
      id: profile.id,
      is_healthy: true,
      medical_conditions: null,
      updated_at: new Date().toISOString()
    });

    // Update or insert subscription
    await admin.from('user_subscriptions').delete().eq('user_id', profile.id);
    await admin.from('user_subscriptions').insert({
      user_id: profile.id,
      tier_id: meta.tier,
      started_at: startedAt,
      expires_at: expiryDate,
      is_active: true
    });

    // Refresh tickets: remove unused old tickets and grant fresh tickets
    await admin.from('user_tickets').delete().eq('user_id', profile.id).is('used_at', null);

    const freshTickets = Array.from({ length: meta.tickets }, () => ({
      user_id: profile.id,
      source: 'subscription',
      expires_at: expiryDate,
      used_at: null,
      used_for_session: null
    }));
    await admin.from('user_tickets').insert(freshTickets);

    // Update user_credits balance
    await admin.from('user_credits').upsert({
      user_id: profile.id,
      balance: meta.tickets,
      updated_at: new Date().toISOString()
    });

    allTraineeProfiles.push({ id: profile.id, name: meta.name, email: profile.email, phone: meta.phone });
  }

  console.log(`Updated ${dummyTrainees.length} dummy trainees with Hebrew names, active subscriptions & tickets.`);

  // Update Elsa Sebagh
  if (elsaProfile) {
    await admin.from('profiles').update({
      full_name: 'אלסה סבג',
      phone: '054-555-1212',
      age: 27,
      role: 'trainee',
      onboarding_completed: true,
      updated_at: new Date().toISOString()
    }).eq('id', elsaProfile.id);

    await admin.from('health_declarations').upsert({
      id: elsaProfile.id,
      is_healthy: true,
      medical_conditions: null,
      updated_at: new Date().toISOString()
    });

    await admin.from('user_subscriptions').delete().eq('user_id', elsaProfile.id);
    await admin.from('user_subscriptions').insert({
      user_id: elsaProfile.id,
      tier_id: 3, // Premium (12 sessions)
      started_at: startedAt,
      expires_at: expiryDate,
      is_active: true
    });

    await admin.from('user_tickets').delete().eq('user_id', elsaProfile.id).is('used_at', null);
    const elsaTickets = Array.from({ length: 11 }, () => ({
      user_id: elsaProfile.id,
      source: 'subscription',
      expires_at: expiryDate,
      used_at: null,
      used_for_session: null
    }));
    await admin.from('user_tickets').insert(elsaTickets);

    await admin.from('user_credits').upsert({
      user_id: elsaProfile.id,
      balance: 11,
      updated_at: new Date().toISOString()
    });

    allTraineeProfiles.unshift({ id: elsaProfile.id, name: 'אלסה סבג', email: elsaProfile.email, phone: '054-555-1212' });
    console.log('Enriched Elsa Sebagh profile with Premium subscription and 11 available tickets.');
  }

  // Update Admin Profiles
  if (taliaProfile) {
    await admin.from('profiles').update({
      full_name: 'טליה ברטל',
      phone: '050-888-9999',
      age: 29,
      role: 'administrator',
      onboarding_completed: true
    }).eq('id', taliaProfile.id);

    await admin.from('user_tickets').delete().eq('user_id', taliaProfile.id).is('used_at', null);
    await admin.from('user_tickets').insert(
      Array.from({ length: 10 }, () => ({
        user_id: taliaProfile.id,
        source: 'admin',
        expires_at: expiryDate
      }))
    );
    await admin.from('user_credits').upsert({ user_id: taliaProfile.id, balance: 10 });
    console.log('Enriched Talia Bartal (admin) profile.');
  }

  if (nehorayProfile) {
    await admin.from('profiles').update({
      full_name: 'נהוראי מרציאנו',
      phone: '053-429-6069',
      age: 28,
      role: 'administrator',
      onboarding_completed: true
    }).eq('id', nehorayProfile.id);

    await admin.from('user_tickets').delete().eq('user_id', nehorayProfile.id).is('used_at', null);
    await admin.from('user_tickets').insert(
      Array.from({ length: 10 }, () => ({
        user_id: nehorayProfile.id,
        source: 'admin',
        expires_at: expiryDate
      }))
    );
    await admin.from('user_credits').upsert({ user_id: nehorayProfile.id, balance: 10 });
    console.log('Enriched Nehoray Marziano (admin) profile.');
  }

  for (let d = 0; d < dummyAdmins.length; d++) {
    const adminP = dummyAdmins[d];
    const name = d === 0 ? 'מיה רוזנברג - ניהול סטודיו' : 'שירה כרמי - ניהול סטודיו';
    await admin.from('profiles').update({
      full_name: name,
      phone: `054-999-000${d + 1}`,
      role: 'administrator',
      onboarding_completed: true
    }).eq('id', adminP.id);
  }

  console.log('\n--- 2. Cleaning up obsolete stress test sessions ---');
  const { data: obsoleteSessions } = await admin.from('gym_sessions')
    .select('id, title')
    .or("title.ilike.%[טסט עומסים]%,title.ilike.%test%,title.ilike.%Closed Session%,title.ilike.%Valid Cancel%");

  if (obsoleteSessions && obsoleteSessions.length > 0) {
    const obsIds = obsoleteSessions.map(s => s.id);
    await admin.from('bookings').delete().in('session_id', obsIds);
    await admin.from('gym_sessions').delete().in('id', obsIds);
    console.log(`Deleted ${obsIds.length} obsolete test sessions.`);
  }

  console.log('\n--- 3. Creating Extensive Boutique Schedule (Available Sessions) ---');

  // We are creating sessions spanning from today (Friday Oct 2, 2026) through Sunday Oct 18, 2026 (17 days)
  // Plus past sessions from Sept 25 to Oct 1, 2026 for rich past history!

  const sessionsToCreate = [];

  // Helper to format ISO strings in UTC given year, month (1-based), day, hour, min
  function createSessionObj(title, description, year, month, day, startH, startM, durationMin = 60, maxCapacity = 6) {
    // Note: Israeli Daylight Time in October is UTC+3
    // E.g., 08:30 Israel time is 05:30 UTC
    const israelOffsetHours = 3;
    const startUtc = new Date(Date.UTC(year, month - 1, day, startH - israelOffsetHours, startM, 0));
    const endUtc = new Date(startUtc.getTime() + durationMin * 60 * 1000);
    return {
      title,
      description,
      start_time: startUtc.toISOString(),
      end_time: endUtc.toISOString(),
      max_capacity: maxCapacity
    };
  }

  // A. Past Sessions (Sept 26 - Oct 1, 2026) for attendance history
  sessionsToCreate.push(
    createSessionObj('אימון כוח פתיחת שבוע', 'חיזוק כללי ועיצוב עם דגש על פלג גוף תחתון', 2026, 9, 27, 8, 15, 60, 6),
    createSessionObj('פילאטיס מזרן ועיצוב', 'עבודה על שרירי ליבה, גמישות ויציבה נכונה', 2026, 9, 27, 18, 0, 60, 6),
    createSessionObj('אימון פונקציונלי ו-HIIT', 'אינטרוולים עצימים לשריפת שומן וסיבולת לב-ריאה', 2026, 9, 28, 7, 30, 60, 6),
    createSessionObj('אימון ישבן וירכיים', 'מיקוד בעבודת התנגדות לחיטוב שרירי הישבן והרגליים', 2026, 9, 29, 18, 45, 60, 6),
    createSessionObj('אימון Full Body שורף', 'אימון שלם לכל הגוף המשלב משקולות וגומיות', 2026, 9, 30, 8, 30, 60, 6),
    createSessionObj('יוגה ויניאסה זרימה', 'שחרור עומסים, נשימה מודעת והארכת שרירים', 2026, 10, 1, 19, 0, 60, 6)
  );

  // B. Available Sessions (Oct 2 - Oct 18, 2026)
  // Friday Oct 2 (Today)
  sessionsToCreate.push(
    createSessionObj('אימון שישי בבוקר עוצמתי', 'אימון כוח וחיטוב אנרגטי לפתיחת סוף השבוע בסטודיו', 2026, 10, 2, 8, 30, 60, 6),
    createSessionObj('פילאטיס מזרן וגמישות', 'עבודה מדויקת על שרירים מייצבים והארכת שרירים', 2026, 10, 2, 9, 45, 60, 6),
    createSessionObj('אימון כוח קבוצתי', 'חיזוק ממוקד לכל הגוף באווירה בוטיקית אינטימית', 2026, 10, 2, 11, 0, 60, 6)
  );

  // Saturday Oct 3 (Motzei Shabbat)
  sessionsToCreate.push(
    createSessionObj('פילאטיס סוף שבוע & Core', 'אימון ליבה, יציבה ונשימה לפני תחילת השבוע', 2026, 10, 3, 19, 30, 60, 6)
  );

  // Sunday Oct 4
  sessionsToCreate.push(
    createSessionObj('אימון בוקר פונקציונלי', 'פתיחת שבוע אנרגטית עם תרגילי כוח ותנועה מטאבולית', 2026, 10, 4, 7, 0, 60, 6),
    createSessionObj('אימון כוח וחיטוב (Strength & Tone)', 'האימון המוביל של טליה: שילוב משקולות, ליבה ועיצוב', 2026, 10, 4, 8, 15, 60, 6),
    createSessionObj('חיטוב ישבן ובטן (Glutes & Abs)', 'עבודה ממוקדת על שרירי הבטן, המותניים ושרירי הישבן', 2026, 10, 4, 18, 0, 60, 6),
    createSessionObj('יוגה ויניאסה זרימה', 'זרימה נשימתית, פתיחת מפרקים וגמישות לסיום היום', 2026, 10, 4, 19, 15, 60, 6)
  );

  // Monday Oct 5
  sessionsToCreate.push(
    createSessionObj('אימון HIIT & Core', 'אינטרוולים עצימים, קצב גבוה וחיזוק שרירי הבטן', 2026, 10, 5, 7, 30, 60, 6),
    createSessionObj('פילאטיס מזרן עיצוב דינמי', 'פילאטיס בקצב זורם לחיטוב שרירים ארוכים ויציבה', 2026, 10, 5, 9, 0, 60, 6),
    createSessionObj('אימון כוח פלג גוף עליון וליבה', 'עיצוב זרועות, גב, כתפיים וחיזוק מרכז הגוף', 2026, 10, 5, 17, 30, 60, 6),
    createSessionObj('אימון Full Body שורף', 'אימון שלם לכל הגוף עם משקולות ואלמנטים פונקציונליים', 2026, 10, 5, 18, 45, 60, 6)
  );

  // Tuesday Oct 6
  sessionsToCreate.push(
    createSessionObj('אימון כוח רגליים וישבן', 'חיטוב פלג גוף תחתון עם התנגדות מותאמת אישית', 2026, 10, 6, 7, 0, 60, 6),
    createSessionObj('תנועה, מתיחות ונשימה (Mobility Flow)', 'פתיחת טווחי תנועה, שחרור מפרקים והורדת מתחים', 2026, 10, 6, 8, 15, 60, 6),
    createSessionObj('אימון פונקציונלי ממוקד כוח', 'עבודה על כוח פונקציונלי יומיומי בקבוצה קטנה ומדויקת', 2026, 10, 6, 18, 0, 60, 6),
    createSessionObj('פילאטיס מזרן וחיזוק הליבה', 'תרגילים עמוקים לשרירי רצפת האגן והבטן העמוקה', 2026, 10, 6, 19, 15, 60, 6)
  );

  // Wednesday Oct 7
  sessionsToCreate.push(
    createSessionObj('Morning Tone & Sculpt', 'אימון בוקר קצבי לעיצוב והעלאת הדופק', 2026, 10, 7, 7, 30, 60, 6),
    createSessionObj('אימון כוח וסיבולת שריר', 'עבודה פרוגרסיבית להעלאת מסת שריר רזה וחיטוב', 2026, 10, 7, 9, 0, 60, 6),
    createSessionObj('אימון ישבן וירכיים (Lower Body Burn)', 'תרגילים ממוקדים בישיבה ובעמידה עם גומיות התנגדות', 2026, 10, 7, 18, 0, 60, 6),
    createSessionObj('יוגה רגיעה ושחרור', 'תנוחות מרגיעות, מתיחות עמוקות והרפיה מודרכת', 2026, 10, 7, 19, 15, 60, 6)
  );

  // Thursday Oct 8
  sessionsToCreate.push(
    createSessionObj('אימון בוקר מטאבולי', 'האצת קצב חילוף החומרים עם תרגילים מורכבים', 2026, 10, 8, 7, 0, 60, 6),
    createSessionObj('אימון Full Body לעיצוב וחיטוב', 'אימון שלם ומאוזן לכל קבוצות השרירים', 2026, 10, 8, 8, 15, 60, 6),
    createSessionObj('אימון כוח קבוצתי מתקדם', 'עבודה בעצימות גבוהה עם ציוד בוטיק', 2026, 10, 8, 17, 30, 60, 6),
    createSessionObj('פילאטיס מזרן סגירת שבוע', 'אימון מדויק לסיום השבוע בתחושת קלילות ויציבה', 2026, 10, 8, 18, 45, 60, 6)
  );

  // Friday Oct 9
  sessionsToCreate.push(
    createSessionObj('אימון שישי בבוקר עוצמתי', 'אנרגיות שיא ומוזיקה מקפיצה לפתיחת סופ״ש', 2026, 10, 9, 8, 30, 60, 6),
    createSessionObj('פילאטיס מזרן וגמישות', 'עבודה על שרירים מאורכים ומתיחות עמוקות', 2026, 10, 9, 9, 45, 60, 6),
    createSessionObj('אימון כוח Weekend Warmup', 'הכנה מושלמת לסוף השבוע בקבוצה קטנה ומגובשת', 2026, 10, 9, 11, 0, 60, 6)
  );

  // Saturday Oct 10
  sessionsToCreate.push(
    createSessionObj('פילאטיס סוף שבוע & Core', 'התחברות לגוף וחיזוק הליבה במוצאי שבת', 2026, 10, 10, 19, 30, 60, 6)
  );

  // Sunday Oct 11
  sessionsToCreate.push(
    createSessionObj('אימון בוקר פונקציונלי', 'התחלה חזקה לשבוע חדש בסטודיו', 2026, 10, 11, 7, 0, 60, 6),
    createSessionObj('אימון כוח וחיטוב (Strength & Tone)', 'עבודה על טכניקה, התנגדות ועיצוב', 2026, 10, 11, 8, 15, 60, 6),
    createSessionObj('חיטוב ישבן ובטן (Glutes & Abs)', 'עבודה מדויקת על אזורי המטרה', 2026, 10, 11, 18, 0, 60, 6),
    createSessionObj('יוגה ויניאסה זרימה', 'זרימה נעימה ושחרור מתחים', 2026, 10, 11, 19, 15, 60, 6)
  );

  // Monday Oct 12
  sessionsToCreate.push(
    createSessionObj('אימון HIIT & Core', 'אימון דופק וחיזוק מרכז הגוף', 2026, 10, 12, 7, 30, 60, 6),
    createSessionObj('פילאטיס מזרן עיצוב דינמי', 'עבודה על יציבה נכונה ונשימה', 2026, 10, 12, 9, 0, 60, 6),
    createSessionObj('אימון Full Body שורף', 'חיזוק כל שרירי הגוף בשיטה ייחודית', 2026, 10, 12, 18, 30, 60, 6)
  );

  // Tuesday Oct 13
  sessionsToCreate.push(
    createSessionObj('אימון כוח רגליים וישבן', 'חיטוב ועבודה עם משקולות וגומיות', 2026, 10, 13, 7, 0, 60, 6),
    createSessionObj('תנועה, מתיחות ונשימה (Mobility Flow)', 'גמישות ומודעות גופנית', 2026, 10, 13, 8, 15, 60, 6),
    createSessionObj('פילאטיס מזרן וחיזוק הליבה', 'אימון יציבה ורצפת אגן', 2026, 10, 13, 19, 0, 60, 6)
  );

  // Wednesday Oct 14
  sessionsToCreate.push(
    createSessionObj('Morning Tone & Sculpt', 'אימון בוקר קצבי', 2026, 10, 14, 7, 30, 60, 6),
    createSessionObj('אימון ישבן וירכיים (Lower Body Burn)', 'מיקוד שרירי תחתון', 2026, 10, 14, 18, 0, 60, 6)
  );

  // Thursday Oct 15
  sessionsToCreate.push(
    createSessionObj('אימון Full Body לעיצוב וחיטוב', 'אימון מקיף לקראת סופ״ש', 2026, 10, 15, 8, 15, 60, 6),
    createSessionObj('פילאטיס מזרן סגירת שבוע', 'סגירת שבוע נינוחה ומדויקת', 2026, 10, 15, 18, 30, 60, 6)
  );

  // Friday Oct 16
  sessionsToCreate.push(
    createSessionObj('אימון שישי בבוקר עוצמתי', 'בוקר שישי בסטודיו טליה', 2026, 10, 16, 8, 30, 60, 6),
    createSessionObj('פילאטיס מזרן וגמישות', 'מתיחות וחיטוב עדין', 2026, 10, 16, 9, 45, 60, 6)
  );

  // Saturday Oct 17
  sessionsToCreate.push(
    createSessionObj('פילאטיס סוף שבוע & Core', 'מוצאי שבת באווירה רגועה', 2026, 10, 17, 19, 30, 60, 6)
  );

  // Sunday Oct 18
  sessionsToCreate.push(
    createSessionObj('אימון בוקר פונקציונלי', 'פתיחת שבוע במלוא האנרגיה', 2026, 10, 18, 7, 0, 60, 6),
    createSessionObj('אימון כוח וחיטוב (Strength & Tone)', 'אימון הדגל של הסטודיו', 2026, 10, 18, 8, 15, 60, 6)
  );

  console.log(`Inserting ${sessionsToCreate.length} sessions into gym_sessions...`);
  const { data: insertedSessions, error: sessErr } = await admin
    .from('gym_sessions')
    .insert(sessionsToCreate)
    .select('id, title, start_time, max_capacity');

  if (sessErr) throw sessErr;
  console.log(`Successfully created ${insertedSessions.length} sessions.`);

  console.log('\n--- 4. Creating Realistic Bookings & Enrollments ---');

  // Let's create realistic bookings for several sessions:
  // - Friday Oct 2 (11:00): 4 trainees enrolled (2 spots left)
  // - Saturday Oct 3 (19:30): 3 trainees enrolled (3 spots left)
  // - Sunday Oct 4 (08:15): 6 trainees enrolled (FULL! - includes Elsa Sebagh so her dashboard has an upcoming workout!)
  // - Sunday Oct 4 (18:00): 4 trainees enrolled (2 spots left)
  // - Monday Oct 5 (07:30): 3 trainees enrolled
  // - Monday Oct 5 (18:45): 5 trainees enrolled (1 spot left!)
  // - Tuesday Oct 6 (07:00): 2 trainees enrolled
  // - Wednesday Oct 7 (18:00): 3 trainees enrolled
  // - Thursday Oct 8 (08:15): 4 trainees enrolled
  // - Plus some past bookings on past sessions!

  const bookingsToInsert = [];
  const ticketsToUpdate = [];

  // Sort inserted sessions by start_time
  const sortedSessions = [...insertedSessions].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  // Find the signature Sunday Oct 4 08:15 class
  const sundayMorningClass = sortedSessions.find(s =>
    s.title.includes('כוח וחיטוב') && s.start_time.includes('2026-10-04')
  );

  // Enroll Elsa into Sunday Morning class!
  if (elsaProfile && sundayMorningClass) {
    bookingsToInsert.push({
      user_id: elsaProfile.id,
      session_id: sundayMorningClass.id,
      status: 'confirmed',
      created_at: new Date().toISOString()
    });

    // Mark one of Elsa's tickets as used
    const { data: elsaAvailTicket } = await admin.from('user_tickets')
      .select('id')
      .eq('user_id', elsaProfile.id)
      .is('used_at', null)
      .limit(1)
      .single();

    if (elsaAvailTicket) {
      ticketsToUpdate.push({
        id: elsaAvailTicket.id,
        used_at: new Date().toISOString(),
        used_for_session: sundayMorningClass.id
      });
    }
  }

  // Define enrollment scenarios for sessions
  const enrollmentScenarios = [
    { matcher: s => s.start_time.includes('2026-10-02T08:00') || (s.title.includes('קבוצתי') && s.start_time.includes('2026-10-02')), count: 4 },
    { matcher: s => s.title.includes('סוף שבוע') && s.start_time.includes('2026-10-03'), count: 3 },
    { matcher: s => s.id === sundayMorningClass?.id, count: 5 }, // + Elsa = 6 (FULL!)
    { matcher: s => s.title.includes('חיטוב ישבן ובטן') && s.start_time.includes('2026-10-04'), count: 4 },
    { matcher: s => s.title.includes('HIIT & Core') && s.start_time.includes('2026-10-05'), count: 3 },
    { matcher: s => s.title.includes('Full Body שורף') && s.start_time.includes('2026-10-05'), count: 5 },
    { matcher: s => s.title.includes('רגליים וישבן') && s.start_time.includes('2026-10-06'), count: 2 },
    { matcher: s => s.title.includes('Lower Body Burn') && s.start_time.includes('2026-10-07'), count: 3 },
    { matcher: s => s.title.includes('Full Body לעיצוב') && s.start_time.includes('2026-10-08'), count: 4 },
    // Past sessions
    { matcher: s => s.start_time < new Date().toISOString(), count: 4 }
  ];

  let traineeIndex = 0;

  for (const session of sortedSessions) {
    const scenario = enrollmentScenarios.find(sc => sc.matcher(session));
    if (!scenario) continue;

    for (let c = 0; c < scenario.count; c++) {
      const trainee = allTraineeProfiles[traineeIndex % allTraineeProfiles.length];
      traineeIndex++;

      // Avoid double booking in same session
      if (bookingsToInsert.some(b => b.user_id === trainee.id && b.session_id === session.id)) {
        continue;
      }

      bookingsToInsert.push({
        user_id: trainee.id,
        session_id: session.id,
        status: 'confirmed',
        created_at: new Date(Date.now() - (scenario.count - c) * 3600000).toISOString()
      });

      // Find available ticket for this trainee
      const { data: ticket } = await admin.from('user_tickets')
        .select('id')
        .eq('user_id', trainee.id)
        .is('used_at', null)
        .limit(1)
        .single();

      if (ticket) {
        ticketsToUpdate.push({
          id: ticket.id,
          used_at: new Date().toISOString(),
          used_for_session: session.id
        });
      }
    }
  }

  console.log(`Inserting ${bookingsToInsert.length} bookings...`);
  const { error: bookErr } = await admin.from('bookings').upsert(bookingsToInsert, { onConflict: 'user_id,session_id' });
  if (bookErr) console.warn('Booking upsert notice:', bookErr.message);

  console.log(`Updating ${ticketsToUpdate.length} used tickets for accounting consistency...`);
  for (const t of ticketsToUpdate) {
    await admin.from('user_tickets').update({
      used_at: t.used_at,
      used_for_session: t.used_for_session
    }).eq('id', t.id);
  }

  // Update credits balance for all trainees based on their actual available tickets count
  console.log('\n--- 5. Synchronizing Credit Balances ---');
  for (const p of allTraineeProfiles) {
    const { count } = await admin.from('user_tickets')
      .select('id', { count: 'exact' })
      .eq('user_id', p.id)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString());

    await admin.from('user_credits').upsert({
      user_id: p.id,
      balance: count || 0,
      updated_at: new Date().toISOString()
    });
  }

  console.log('\n========================================================');
  console.log('  PLATFORM DATA ENRICHMENT COMPLETED SUCCESSFULLY! 🎉  ');
  console.log('========================================================');
}

enrichPlatform().catch(err => {
  console.error('Enrichment failed:', err);
  process.exit(1);
});

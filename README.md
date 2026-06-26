# TrailHub

פלטפורמה לטיולים מודרכים בישראל — Next.js + Prisma + PostgreSQL + NextAuth

## התקנה

### 1. דרישות
- Node.js 18+
- PostgreSQL 14+ (או Docker)

### 2. הפעלת PostgreSQL עם Docker
```bash
docker compose up -d
```

### 3. משתני סביבה
```bash
cp .env.example .env
# ערוך את .env:
# AUTH_SECRET: הרץ `openssl rand -base64 32` והעתק את הפלט
```

### 4. מיגרציה ו-Seed
```bash
npm run db:migrate   # יוצר טבלאות
npm run db:seed      # מאכלס נתוני פיתוח
```

### 5. הרצה
```bash
npm run dev
```

פתח http://localhost:3000

## חשבונות לפיתוח (אחרי seed)

| תפקיד | אימייל | סיסמה |
|--------|--------|--------|
| מדריך | roei@trailhub.co.il | password123 |
| משתמש | user@trailhub.co.il | password123 |

## מבנה הפרויקט

```
src/
├── app/
│   ├── api/auth/       # NextAuth + register endpoints
│   ├── auth/           # Login & register pages
│   └── page.tsx        # Home
├── auth.ts             # NextAuth config
├── middleware.ts       # Route protection
└── lib/
    └── prisma.ts       # Prisma client singleton

prisma/
├── schema.prisma       # DB schema
└── seed.ts             # Dev seed data

wireframes/             # HTML mockups (open in browser)
```

## סקריפטים

| פקודה | תיאור |
|-------|--------|
| `npm run dev` | שרת פיתוח |
| `npm run db:migrate` | הרץ מיגרציות |
| `npm run db:push` | Push ישיר לסכמה (ללא מיגרציה) |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Seed נתוני פיתוח |

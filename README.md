# ContaGT SaaS — Contabilidad Fiscal Automatizada para Guatemala

Plataforma SaaS completa para gestión contable en Guatemala. Automatiza la importación de facturas FEL (DTE), genera Libro de Compras y Ventas, calcula IVA/ISR/retenciones, y exporta reportes listos para la SAT.

---

## 🚀 Características Principales

### 📄 Gestión FEL (Factura Electrónica en Línea)
- **Carga masiva**: Arrastra y suelta archivos XML o ZIP con facturas FEL
- **Parseo robusto**: Soporta FACT, FCAM, FPEQ, FESP, NCRE, NDEB, NABN, RECI, RDON
- **Detección automática**: Encoding UTF-8 / ISO-8859-1, UUID, certificación SAT
- **Validación**: Duplicados por UUID, facturas anuladas, montos altos

### 🧠 Motor de Clasificación Inteligente
- **Prioridad**: NIT Exacto → Nombre Exacto → Palabra Clave → Default
- **Catálogo SAT**: 100+ códigos de cuenta para agencia de publicidad (BIEN/SERVICIO/COMBUSTIBLE)
- **Deducibilidad**: Marca automáticamente gastos no deducibles para el giro publicidad
- **Facturas mezcladas**: Detecta facturas con múltiples giros dispares en una sola factura
- **Reglas personalizables**: Por empresa o globales, con prioridad y monto mínimo

### 💰 Cálculo Fiscal Automático (Guatemala)
- **IVA 12%**: Crédito fiscal, retención 15% si agente retenedor, umbral Q2,500
- **Factura Especial (FESP)**: Retiene IVA 100% + ISR 5% sobre base gravable
- **Pequeño Contribuyente**: IVA no genera crédito fiscal
- **Notas de Crédito/Débito**: IVA reverso, ajustes automáticos
- **Resumen IVA Mensual**: Débito vs Crédito, saldo a pagar o arrastrar

### 📚 Libros Contables Listos para SAT
- **Libro de Compras**: CSV/Excel/PDF con formato oficial, resumen por código SAT
- **Libro de Ventas**: Gravado/Exento/IVA Débito, alertas monto > Q50,000
- **Asientos contables**: Partida doble automática (Gasto, IVA Crédito, Retenciones, Proveedores)
- **Exportación**: Excel con fórmulas, colores condicionales, totales; PDF imprimible

### 🏦 Conciliación Bancaria
- Carga CSV de estados de cuenta (Banrural, BAC, G&T, Industrial, Agromercantil, Promerica)
- Matching automático por monto exacto, referencia, NIT, fecha
- Interfaz manual para conciliar/ignorar pendientes

### 🏢 Multi-empresa + RBAC
- **Dueño**: Admin total, configuración, cierre períodos
- **Contador**: Carga FEL, asientos, libros, reglas, reportes
- **Auditor**: Solo lectura, audit log, exportación
- Cada empresa: catálogo cuentas, reglas, períodos, régimen fiscal (General/Pequeño/Exento), agente retenedor

### 🔐 Seguridad y Auditoría
- NextAuth (credentials + Google OAuth)
- Hash bcryptjs (12 rounds)
- Audit log inmutable: CREATE/UPDATE/DELETE/CLOSE/EXPORT/LOGIN
- Protección CSRF, sesiones JWT 30 días

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 16 (App Router) + React 19 |
| DB | SQLite (dev) / PostgreSQL (prod) via Prisma ORM |
| Auth | NextAuth v4 (credentials + Google) |
| Estilos | CSS Variables + diseño profesional (sin Tailwind runtime) |
| PDF/Excel | jsPDF + autotable, ExcelJS, SheetJS (xlsx) |
| XML Parser | fast-xml-parser (server), DOMParser (client) |
| CSV | PapaParse |
| ZIP | JSZip |

---

## 📦 Instalación y Desarrollo Local

### Requisitos
- Node.js 20+
- npm / pnpm / yarn

### 1. Clonar y configurar
```bash
git clone <repo-url>
cd contagt-saas
cp .env.example .env
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Base de datos
```bash
# Genera Prisma Client
npm run db:generate

# Crea tablas en SQLite (dev.db)
npm run db:push

# Ejecuta seed (usuarios demo, catálogo SAT, reglas, empresas, FELs demo)
npm run db:seed
```

### 4. Desarrollo
```bash
npm run dev
# Abre http://localhost:3000
```

### Usuarios demo (tras seed)
| Email | Contraseña | Rol |
|-------|------------|-----|
| admin@contagt.gt | ContaGT2025! | Super Admin |
| contador@demo.gt | ContaGT2025! | Contador |
| auditor@demo.gt | ContaGT2025! | Auditor |

---

## 🗃️ Estructura del Proyecto

```
contagt-saas/
├── prisma/
│   ├── schema.prisma      # Modelos: User, Empresa, FelDocumento, JournalEntry, AccountChart, ClassificationRule, AuditLog, Periodo
│   └── seed.ts            # Seed completo: usuarios, empresa demo, 100+ cuentas, 20 reglas, 6 FELs demo, asientos, audit log
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/      # NextAuth config
│   │   ├── fel/upload/              # POST XML/ZIP → parse + clasificar + guardar + impuestos
│   │   ├── fel/upload/route.ts
│   │   ├── libros/compras/          # GET Libro Compras (JSON/CSV/HTML-PDF)
│   │   ├── libros/ventas/           # GET Libro Ventas (JSON/CSV/XLSX)
│   │   ├── asientos/                # CRUD asientos contables
│   │   ├── reglas/                  # CRUD reglas clasificación
│   │   ├── export/excel/            # Excel profesional (colores, fórmulas, resumen)
│   │   └── libros/compras/pdf/      # HTML para PDF/impresión
│   ├── dashboard/
│   │   ├── fel/                     # Carga FEL (drag-drop, ZIP, demo, tabla, modal detalle)
│   │   ├── compras/                 # Libro Compras (filtros, tabs, resumen, export)
│   │   ├── ventas/                  # Libro Ventas (filtros, export CSV/XLSX/PDF)
│   │   ├── conciliacion/            # Conciliación bancaria (CSV, auto-match, manual)
│   │   ├── reglas/                  # Motor de reglas (tabs, tester, CRUD modal)
│   │   ├── empresas/                # Multi-empresa (cards, modal, RBAC info)
│   │   ├── reportes/                # Balance, Resultados, Flujo, IVA, ISR, Retenciones
│   │   └── layout.tsx               # Sidebar, empresa selector, período, usuario
│   ├── login/page.tsx               # Login (credentials + Google, demo badge)
│   ├── register/page.tsx            # Registro
│   ├── layout.tsx                   # SessionProvider, fonts, metadata
│   ├── globals.css                  # Design system: variables, componentes, utilidades
│   └── page.tsx                     # Redirect → /login
├── lib/
│   ├── auth.ts                      # NextAuth options (PrismaAdapter, callbacks, JWT)
│   ├── db.ts                        # Prisma singleton
│   ├── fel-parser.ts                # Parse XML FEL → objetos tipados (server)
│   ├── sat-categorizer.ts           # 18 códigos SAT, categorizeProduct, checkMixedInvoice
│   ├── rules-engine.ts              # Prioridad NIT→Nombre→Keyword→Default, asientos
│   └── tax-calculator.ts            # IVA 12%, ISR 5% FESP, retenciones, Pequeño Contribuyente
├── components/
│   └── OnboardingTutorial.tsx       # Tutorial interactivo paso a paso
├── middleware.ts                    # Protección rutas /dashboard, /api, RBAC básico
├── .env.example                     # Variables de entorno template
├── package.json                     # Scripts: dev, build, start, db:*, lint
└── README.md                        # Este archivo
```

---

## 🔌 APIs Principales

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth handlers |
| `/api/fel/upload` | POST | Multipart: `files[]` (XML/ZIP), `empresaId` → Procesa, clasifica, guarda, impuestos |
| `/api/fel/upload` | GET | Info API: tipos soportados, encodings |
| `/api/libros/compras` | GET | `?format=json|csv|html&mes=7&año=2025` → Libro Compras |
| `/api/libros/ventas` | GET | `?format=json|csv|xlsx&mes=7&año=2025` → Libro Ventas |
| `/api/export/excel` | GET | `?format=xlsx` → Excel profesional (colores, fórmulas, resumen) |
| `/api/libros/compras/pdf` | GET | `?format=pdf&mes=7&año=2025` → HTML para PDF/impresión |
| `/api/asientos` | GET/POST | CRUD asientos contables (balance validation, audit log) |
| `/api/reglas` | GET/POST/PUT/DELETE | CRUD reglas clasificación (globales + por empresa) |

---

## 📊 Flujo de Trabajo Típico

1. **Login** → Dashboard → Selecciona empresa y período
2. **Cargar FEL** → Arrastra XML/ZIP → Sistema parsea, clasifica, calcula impuestos, guarda
3. **Revisar** → Libro de Compras → Filtra mezcladas, no deducibles, alertas ISR → Edita cuenta si necesario
3. **Conciliar** → Conciliación → Carga CSV banco → Auto-match → Manual match/ignore
4. **Generar** → Libro Compras/Ventas → Exporta Excel (colores, fórmulas) / PDF (imprimir)
5. **Reportes** → Balance General, Estado Resultados, IVA Mensual, ISR Trimestral
6. **Cerrar Período** → Períodos → Cerrar mes (bloquea asientos)

---

## 🚀 Despliegue a Producción

### Opción A: Vercel + PostgreSQL (Neon/Supabase/Railway)
1. Conecta repo a Vercel
2. Agrega `DATABASE_URL` (PostgreSQL) + `NEXTAUTH_SECRET` + `NEXTAUTH_URL` + OAuth vars
3. Deploy → Vercel ejecuta `prisma generate` + `prisma db push` en build
4. Configura dominio personalizado

### Opción B: Docker + VPS (DigitalOcean/Hetzner/AWS)
```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN npx prisma db push
EXPOSE 3000
CMD ["npm", "start"]
```
```bash
docker build -t contagt .
docker run -d -p 3000:3000 --env-file .env contagt
```
Usa Nginx reverse proxy + SSL (Let's Encrypt) + PM2/process manager.

### Variables de entorno producción (obligatorias)
```env
DATABASE_URL="postgresql://user:pass@host:5432/contagt?schema=public"
NEXTAUTH_URL="https://tudominio.com"
NEXTAUTH_SECRET="clave-super-secreta-min-32-chars-cambiala"
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="xxx"
```

---

## 📋 Checklist Pre-Producción

- [ ] `NEXTAUTH_SECRET` único y seguro (32+ chars)
- [ ] `DATABASE_URL` PostgreSQL con SSL
- [ ] `NEXTAUTH_URL` = dominio real (HTTPS)
- [ ] Google OAuth configurado (Authorized redirect: `https://tudominio.com/api/auth/callback/google`)
- [ ] Seed ejecutado en prod (o migración manual de catálogo cuentas/reglas)
- [ ] Backup automático DB configurado
- [ ] Logs y monitoreo (Vercel Analytics, Sentry, etc.)
- [ ] Tests E2E críticos (login, carga FEL, libro compras, export)

---

## 📚 Referencias Normativas (Guatemala)

- **Decreto 27-92**: Ley del IVA (12%)
- **Decreto 10-2012**: Ley ISR (régimen general/opcional, pagos trimestrales)
- **Decreto 10-2012 Art. 43**: Retención IVA 15% agentes retenedores (umbral Q2,500)
- **Resolución SAT**: Factura Especial (FESP) - retención IVA 100% + ISR 5%
- **Pequeño Contribuyente**: Límite Q150,000/año, sin crédito IVA
- **Libros Electrónicos**: Formato CSV/Excel oficial SAT para presentación

---

## 🤝 Contribuir

1. Fork → Feature branch (`git checkout -b feature/nueva-funcion`)
2. Commit convencional (`feat:`, `fix:`, `docs:`, `refactor:`)
3. PR con descripción y capturas si es UI
4. Code review → Merge

---

## 📄 Licencia

MIT — Libre para uso comercial, modificación y distribución. Ver `LICENSE`.

---

## 🙋 Soporte

- **Issues**: Bugs, features, preguntas
- **Discussions**: Ideas, ayuda, showcase
- **Email**: soporte@contagt.gt (si aplica)

---

**Hecho con ❤️ para contadores y empresas de Guatemala** 🇬🇹
# Document Approval Workflow API

API sederhana untuk sistem approval dokumen yang dibuat dengan NestJS dan TypeScript. Project ini adalah submission untuk technical test intern backend developer.

## Tentang Project

Aplikasi ini adalah REST API yang memungkinkan user untuk membuat dokumen, submit untuk approval, dan approver bisa approve atau reject dokumen tersebut. Sistemnya pakai role-based access control dengan 3 role: User, Approver, dan Admin.

### Alur Workflow Dokumen
```
User buat dokumen (DRAFT) 
    ↓
User submit dokumen (PENDING)
    ↓
Approver review dokumen
    ↓
Approve/Reject
    ↓
Status jadi APPROVED atau REJECTED
```

## Teknologi yang Dipakai

- **NestJS** - Framework backend
- **TypeScript** - Programming language
- **PostgreSQL** - Database
- **TypeORM** - ORM untuk database
- **JWT** - Untuk authentication
- **bcrypt** - Untuk hash password
- **Jest** - Testing framework

## Kenapa Pakai Layered Architecture?

Saya pakai **Layered Architecture** karena:

1. **Gampang dipahami** - Setiap layer punya tugasnya masing-masing yang jelas
2. **Mudah di-maintain** - Kalau ada bug atau mau update, tinggal cari di layer yang sesuai
3. **Cocok buat project kecil-menengah** - Ga terlalu ribet tapi tetap terstruktur rapi
4. **Recommended sama NestJS** - Dokumentasi NestJS juga pake pattern ini

### Struktur Layernya:
```
Controller (Terima request dari user)
    ↓
Service (Business logic & validasi)
    ↓
Repository (Akses database via TypeORM)
    ↓
Entity (Model database)
```

Contoh flow: User login → AuthController → AuthService (validasi) → UsersService (cek database) → return JWT token

## Database Schema

### Tabel Users
- id (UUID)
- email (unique)
- password (hashed)
- name
- role (user/approver/admin)

### Tabel Documents
- id (UUID)
- title
- content
- status (draft/pending/approved/rejected)
- creator_id (foreign key ke users)

### Tabel Approvals
- id (UUID)
- document_id (foreign key ke documents)
- approver_id (foreign key ke users)
- action (approved/rejected)
- comment

### Relasi Antar Tabel
```
Users ──< Documents
  │
  └──< Approvals ──< Documents
```

- 1 User bisa punya banyak Documents
- 1 Document bisa punya banyak Approvals
- 1 User (sebagai approver) bisa approve banyak Documents

## Cara Install & Jalankan

### 1. Clone Repository
```bash
git clone https://github.com/SeptianSamdani/auth-api-typescript.git
cd auth-api-typescript
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Database

Pakai Docker (lebih praktis):
```bash
docker run --name postgres-approval \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=approval_db \
  -p 5432:5432 \
  -d postgres:14
```

Atau install PostgreSQL manual di laptop/PC.

### 4. Setup Environment Variables
```bash
cp .env.example .env
```

Edit file `.env` sesuai konfigurasi database:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=approval_db

JWT_SECRET=rahasia-jwt-ganti-ini-ya
JWT_EXPIRATION=24h

PORT=3000
```

### 5. Jalankan Migration
```bash
npm run migration:run
```

### 6. Jalankan Aplikasi
```bash
npm run start:dev
```

Server jalan di: `http://localhost:3000`

## Testing API dengan Postman

### Import Postman Collection

1. Buka Postman
2. Klik **Import**
3. Pilih file `postman_collection.json`
4. Collection "Document Approval API" akan muncul

### Cara Pakai Collection

1. **Jalankan "Register User"** dulu - Otomatis save token ke variable
2. **Test endpoint lainnya** - Token udah auto-apply di header
3. **Untuk test approval**, jalanin "Register Approver" dulu

### Flow Testing yang Disarankan

1. Register User → dapat token user
2. Create Document → dapat document ID
3. Get All Documents → lihat list dokumen
4. Submit for Approval → status jadi PENDING
5. Register Approver → dapat token approver
6. Approve Document → status jadi APPROVED

## API Endpoints

### Authentication

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/auth/register` | ❌ | Daftar user baru |
| POST | `/auth/login` | ❌ | Login & dapat token |
| GET | `/auth/profile` | ✅ | Lihat profile sendiri |

### Documents

| Method | Endpoint | Auth | Role | Deskripsi |
|--------|----------|------|------|-----------|
| POST | `/documents` | ✅ | All | Buat dokumen baru |
| GET | `/documents` | ✅ | All | Lihat semua dokumen |
| GET | `/documents/my-documents` | ✅ | All | Lihat dokumen saya |
| GET | `/documents/:id` | ✅ | All | Lihat detail dokumen |
| PATCH | `/documents/:id` | ✅ | Owner/Admin | Update dokumen |
| DELETE | `/documents/:id` | ✅ | Owner/Admin | Hapus dokumen |
| POST | `/documents/:id/submit` | ✅ | Owner | Submit untuk approval |

### Approvals

| Method | Endpoint | Auth | Role | Deskripsi |
|--------|----------|------|------|-----------|
| POST | `/approvals/documents/:id` | ✅ | Approver/Admin | Approve/reject dokumen |
| GET | `/approvals` | ✅ | All | Lihat semua approval |
| GET | `/approvals/my-approvals` | ✅ | Approver/Admin | Lihat approval saya |
| GET | `/approvals/documents/:id` | ✅ | All | Lihat approval per dokumen |
| GET | `/approvals/stats` | ✅ | Approver/Admin | Statistik approval saya |
| GET | `/approvals/stats/all` | ✅ | Admin | Statistik semua approval |

### Users (Admin Only)

| Method | Endpoint | Auth | Role | Deskripsi |
|--------|----------|------|------|-----------|
| GET | `/users` | ✅ | Admin | Lihat semua user |
| POST | `/users` | ✅ | Admin | Buat user baru |
| GET | `/users/:id` | ✅ | All | Lihat detail user |
| PATCH | `/users/:id` | ✅ | Owner/Admin | Update user |
| DELETE | `/users/:id` | ✅ | Admin | Hapus user |

## Contoh Request & Response

### Register

**Request:**
```bash
POST /auth/register
{
  "email": "budi@example.com",
  "password": "password123",
  "name": "Budi Santoso"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "budi@example.com",
    "name": "Budi Santoso",
    "role": "user"
  }
}
```

### Create Document

**Request:**
```bash
POST /documents
Authorization: Bearer <token>

{
  "title": "Proposal Aplikasi Mobile",
  "content": "Proposal untuk membuat aplikasi mobile..."
}
```

**Response:**
```json
{
  "id": "document-uuid",
  "title": "Proposal Aplikasi Mobile",
  "content": "Proposal untuk membuat aplikasi mobile...",
  "status": "draft",
  "creatorId": "user-uuid",
  "createdAt": "2024-02-03T10:00:00.000Z"
}
```

### Approve Document

**Request:**
```bash
POST /approvals/documents/:documentId
Authorization: Bearer <approver-token>

{
  "action": "approved",
  "comment": "Proposal bagus, disetujui!"
}
```

**Response:**
```json
{
  "id": "approval-uuid",
  "documentId": "document-uuid",
  "approverId": "approver-uuid",
  "action": "approved",
  "comment": "Proposal bagus, disetujui!",
  "createdAt": "2024-02-03T11:00:00.000Z"
}
```

## Role & Permission

### User (role: user)
- Buat dokumen
- Edit/hapus dokumen sendiri
- Submit dokumen untuk approval
- Lihat dokumen & approval

### Approver (role: approver)
- Semua permission User
- Approve/reject dokumen orang lain
- Lihat statistik approval sendiri

### Admin (role: admin)
- Semua permission Approver
- Manage semua user
- Edit/hapus semua dokumen
- Lihat statistik semua approval

## Business Rules

1. **User ga bisa approve dokumen sendiri** - Harus orang lain yang approve
2. **Dokumen DRAFT bisa diedit** - Bebas edit sebelum submit
3. **Dokumen PENDING ga bisa diedit** - Lagi dalam proses approval
4. **Dokumen APPROVED ga bisa diedit** - Udah final (kecuali admin)
5. **Dokumen REJECTED bisa diedit lagi** - Bisa revisi dan submit ulang
6. **Satu approver cuma bisa approve sekali** - Ga bisa double approve

## Testing

### Run E2E Tests
```bash
npm run test:e2e
```

### Run Unit Tests
```bash
npm run test
```

### Test Coverage
```bash
npm run test:cov
```

E2E tests mencakup:
- Authentication (register, login, JWT validation)
- Document CRUD operations
- Approval workflow
- Role-based access control

## Struktur Folder Project
```
src/
├── auth/                   # Module authentication
│   ├── decorators/        # Custom decorators (CurrentUser, Roles)
│   ├── dto/              # Data transfer objects
│   ├── guards/           # Auth guards (JWT, Roles)
│   ├── strategies/       # Passport strategies
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
│
├── users/                 # Module users
│   ├── dto/
│   ├── entities/
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
│
├── documents/            # Module documents
│   ├── dto/
│   ├── entities/
│   ├── documents.controller.ts
│   ├── documents.service.ts
│   └── documents.module.ts
│
├── approvals/           # Module approvals
│   ├── dto/
│   ├── entities/
│   ├── approvals.controller.ts
│   ├── approvals.service.ts
│   └── approvals.module.ts
│
├── common/              # Shared resources
│   └── enums/          # Enums (roles, status)
│
├── database/           # Database config
│   ├── data-source.ts
│   └── migrations/
│
├── app.module.ts      # Root module
└── main.ts           # Entry point
```

## Kesulitan yang Dialami & Solusinya

### 1. Circular Dependency

**Problem:** DocumentsModule butuh ApprovalsService, ApprovalsModule butuh DocumentsService

**Solusi:** Export service di module, import module yang dibutuhkan

### 2. Validation DTO

**Problem:** Awalnya validasi masih bisa di-bypass

**Solusi:** Pakai `ValidationPipe` di `main.ts` dengan config `whitelist: true`

### 3. JWT Token Testing

**Problem:** Susah test endpoint yang butuh auth

**Solusi:** Bikin collection variable di Postman, auto-save token pas register/login

## Yang Bisa Dikembangkan Lagi

- [ ] Pagination untuk list documents & approvals
- [ ] Upload file attachment di dokumen
- [ ] Email notification pas dokumen di-approve/reject
- [ ] Dashboard statistik dengan chart
- [ ] Export dokumen ke PDF
- [ ] Multi-level approval (butuh 2-3 approver)
- [ ] Audit log untuk tracking perubahan
- [ ] Soft delete untuk dokumen

## Referensi Belajar

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)
- [JWT.io](https://jwt.io/)

## Author

**Septian Samdani**

Dibuat sebagai submission technical test untuk posisi **Intern Backend Developer (TypeScript)**

---

**Catatan:** Ini adalah project untuk keperluan technical test. Untuk production perlu ditambahkan security features seperti rate limiting, input sanitization, dan environment-specific configs.
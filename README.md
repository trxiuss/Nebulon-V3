# Nebulon V3

**A modern project showcase, content management, and administration platform.**

Nebulon V3 is a web application designed to showcase projects and products, organize content into categories, present team information, and manage the platform through a centralized administration dashboard.

Built with Next.js and React, the application is designed for deployment on Cloudflare Pages. It uses Cloudflare D1 for relational data storage and Cloudflare KV for key-value storage and rate-limiting support.

The platform combines a public-facing experience with administrative tools for managing content, users, roles, permissions, and application settings.

---

## 🌐 Live Demo

| Resource | Link |
|---|---|
| Public application | [Open live application](https://nebulon-v3-a44.pages.dev/) |
| Administration panel | [Open administration panel](https://nebulon-v3-a44.pages.dev/login) |

### Demo credentials

| Field | Value |
|---|---|
| Username | `test` |
| Password | `test1234` |

> **Note:** These credentials are provided for evaluation of the demo environment only. Do not reuse them for real accounts or production deployments. Disable or rotate demo credentials when they are no longer needed.

---

## 📌 Project Overview

The application brings together a public project showcase and a protected administration dashboard.

Visitors can browse projects, explore categories, view team information, and access contact details. Authorized administrators can manage the platform's content, users, roles, permissions, and configuration through the dashboard.

### Project objectives

- Deliver a modern and maintainable web application.
- Allow content to be managed without directly editing source code.
- Implement role-based access control.
- Provide secure session handling and API authorization.
- Use Cloudflare services for application deployment and supporting infrastructure.
- Support Turkish and English content.

---

## ✨ Features

### 🌍 Public-facing experience

- **Project and product catalogue:** Present entries with titles, descriptions, images, technology tags, pricing labels, and configurable action links.
- **Category browsing:** Organize entries into categories and provide category-based navigation.
- **Search and sorting interfaces:** Help visitors find and explore content.
- **Team page:** Display team members, roles, profile images, and social links.
- **Contact section:** Show configurable contact information and links.
- **Bilingual content:** Support Turkish and English content.
- **Responsive interface:** Adapt the user interface to different screen sizes.
- **SEO support:** Include page metadata, sitemap, and robots configuration.

### 🛠️ Administration dashboard

The protected dashboard provides management interfaces for:

- Projects and product entries
- Categories
- Team members
- Contact content
- Footer and social icons
- User accounts
- Roles and permissions
- General application settings
- Audit records
- Authentication logs

### 🔐 Security and access control

- Role-based access control (RBAC).
- Resource-level permissions for viewing, creating, editing, and deleting content.
- Protected dashboard routes and API endpoints.
- HTTP-only session cookies.
- Password derivation using PBKDF2 with SHA-256.
- Session signing using HMAC-SHA-256.
- AES-GCM encryption for supported sensitive settings.
- Authentication event logging.
- Cloudflare KV-based rate-limiting support.
- Cloudflare Turnstile integration.
- Security-related HTTP response headers.
- Database safeguards for the final system administrator and built-in system roles.

### 🔌 Integrations

- **Cloudflare D1:** Relational database.
- **Cloudflare KV:** Key-value storage and rate-limit data.
- **Cloudflare Turnstile:** Optional bot and abuse protection.
- **DeepL API:** Optional translation integration.

---

## 💻 Technology Stack

| Technology | Purpose |
|---|---|
| Next.js 15 | Web application framework and routing |
| React 19 | User interface |
| JavaScript | Application development |
| CSS | Styling and layout |
| Cloudflare D1 | Database |
| Cloudflare Pages | Application hosting and deployment |
| Cloudflare KV | Key-value storage |
| Web Crypto API | Cryptographic operations |
| DeepL API | Optional translation integration |
| Cloudflare Turnstile | Bot protection |
| Sharp | Image processing |

---

## 📁 Project Structure

```text
Nebulon-V3/
│
├── public/
│   └── assets/                 # Logos, images, icons and backgrounds
│
├── src/
│   ├── app/
│   │   ├── api/                # Server-side API route handlers
│   │   ├── dashboard/          # Administration dashboard pages
│   │   ├── login/              # Administration login page
│   │   ├── projects/           # Public project catalogue
│   │   ├── team/               # Public team page
│   │   └── contact/            # Public contact page
│   │
│   ├── components/
│   │   ├── dashboard/          # Dashboard components
│   │   └── public/             # Public-facing components
│   │
│   ├── context/                # React context providers
│   ├── lib/                    # Authentication, database and utilities
│   ├── routes/                 # Page client components
│   └── styles/                 # Global styles and design variables
│
├── schema.sql                  # D1 database schema
├── wrangler.toml               # Cloudflare configuration
├── next.config.mjs
└── package.json
```

---

## ⚙️ Getting Started

### Prerequisites

- Node.js (a current LTS release is recommended).
- npm.
- A Cloudflare account.
- A Cloudflare D1 database for deployment.
- A Cloudflare KV namespace for rate-limiting support.

### 1. Clone the repository

```bash
git clone https://github.com/trxiuss/Nebulon-V3
cd Nebulon-V3
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables and bindings

The application expects database bindings and sensitive configuration to be provided by its runtime environment.

| Variable / Binding | Description |
|---|---|
| `DB` | Cloudflare D1 database binding |
| `SESSION_SECRET` | Secret used to sign and verify sessions |
| `ENCRYPTION_KEY` | Key used to encrypt supported sensitive settings |
| `ADMIN_INITIAL_PASSWORD` | Initial administrator password during first-time setup |
| `RATE_LIMIT_KV` | Cloudflare KV binding for rate-limit data |

Use strong, unique values for `SESSION_SECRET` and `ENCRYPTION_KEY`.

Do not commit secrets, credentials, or private environment files to the repository. Configure production values through Cloudflare environment variables and secrets.

Cloudflare resource bindings are defined in `wrangler.toml`. Replace the database and KV identifiers with resources from your own Cloudflare account before deploying your instance.

### 4. Initialize the database

The repository includes `schema.sql`, which defines the D1 tables and indexes.

To apply the schema to the configured remote D1 database:

```bash
npm run db:migrate:remote
```

Review the schema and migration behavior before applying changes to an existing database.

### 5. Run the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

> **Note:** The application uses Cloudflare runtime bindings. A standard Next.js development server may not provide the same runtime environment as Cloudflare Pages. Use the Cloudflare preview workflow for an environment closer to deployment.

### 6. Run a Cloudflare Pages preview

```bash
npm run preview
```

### 7. Deploy to Cloudflare Pages

```bash
npm run deploy
```

Before deployment, configure the required D1 and KV bindings and all necessary environment variables and secrets in your Cloudflare Pages project.

---

## 👤 Initial Administrator Setup

When the database contains no users, the application creates an initial administrator account.

The default username is:

```text
admin
```

The initial password can be set through `ADMIN_INITIAL_PASSWORD`.

If this variable is not configured, the current source code falls back to `admin123`.

> **Security warning:** Set `ADMIN_INITIAL_PASSWORD` to a strong, unique value before initializing a production deployment. Do not rely on the fallback password in a public environment.

The initial administrator account is separate from the demo account listed in the Live Demo section.

---

## 🗄️ Database Design

The application uses a relational database structure on Cloudflare D1.

| Table | Responsibility |
|---|---|
| `users` | User accounts and password information |
| `roles` | Role definitions and permissions |
| `categories` | Category information |
| `products` | Project and product content |
| `team` | Team member information |
| `contact_section` | Contact content |
| `footer_icons` | Footer links and icons |
| `settings` | Application settings |
| `audit_logs` | Administrative activity records |
| `auth_logs` | Authentication event records |

Foreign-key relationships, indexes, and database triggers help maintain data integrity and protect critical system records.

---

## 🔗 API Structure

Server-side API operations are implemented through Next.js Route Handlers.

The main API groups include:

| Endpoint | Description |
|---|---|
| `/api/auth/*` | Login, logout, and session operations |
| `/api/products/*` | Project and product management |
| `/api/categories/*` | Category operations |
| `/api/team/*` | Team management |
| `/api/contact/*` | Contact content management |
| `/api/users/*` | User administration |
| `/api/roles/*` | Role and permission management |
| `/api/settings` | Application settings |
| `/api/audit/*` | Audit records |
| `/api/auth-logs/*` | Authentication logs |
| `/api/translate` | Translation operations |
| `/api/stats` | Dashboard statistics |
| `/api/account` | Account operations |
| `/api/footer-icons/*` | Footer icon management |

Authentication and permission checks for administrative operations are performed on the server. The user interface should not be treated as the security boundary.

---

## 🛡️ Security Considerations

The application includes several security-oriented mechanisms:

- Password security and session verification.
- Role-based access control.
- Encryption for supported sensitive settings.
- API authorization checks.
- Rate-limiting support.
- Authentication event logging.
- Administrative activity auditing.
- Cloudflare Turnstile integration.

Before using the application with real users or sensitive data, review its configuration, run appropriate security tests, and consider an independent security assessment.

The presence of security controls in the source code does not mean that the application has undergone an independent security audit or that a particular deployment is guaranteed to be secure.

---

## 🧰 Available NPM Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the development server |
| `npm run build` | Builds the Next.js application |
| `npm run start` | Starts the production server |
| `npm run lint` | Runs the configured lint command |
| `npm run pages:build` | Builds the application for Cloudflare Pages |
| `npm run preview` | Runs a local Cloudflare Pages preview |
| `npm run deploy` | Builds and deploys to Cloudflare Pages |
| `npm run db:migrate:remote` | Applies the schema to the remote D1 database |

---

## 🚀 Potential Future Improvements

Possible areas for future development include:

- Automated tests for API endpoints and critical user flows.
- More comprehensive authorization tests.
- Improved CI/CD workflows.
- More detailed API documentation.
- Accessibility improvements and testing.
- Application monitoring and error reporting.
- Database backup procedures.
- Additional localization and content-management capabilities.

---

## 🎓 Technical and Academic Evaluation

The project brings together several areas of modern web application development and provides opportunities to examine its architecture and implementation.

The following areas may be useful starting points for academics, software developers, and technical reviewers:

**1. Application Architecture**

Review the Next.js App Router structure, React components, API route handlers, and shared utility modules.

**2. Database Design**

Review `schema.sql` and the database access layer in `src/lib/db.js`.

**3. Authentication and Authorization**

Review `src/lib/permissions.js`, `src/lib/auth.js`, and protected dashboard and API routes.

**4. Security Implementation**

Examine session management, password security, encryption, rate limiting, and authentication logging.

**5. Deployment Architecture**

Review `wrangler.toml` and the Cloudflare Pages scripts defined in `package.json`.

**6. User Experience**

Explore the live application, project catalogue, category navigation, team and contact pages, and administration dashboard using the demo account.

---

## 🤝 Contributing

Suggestions, bug reports, and contributions are welcome through GitHub issues.

For substantial changes, opening an issue before implementation is recommended so the proposed approach can be discussed.

When submitting a pull request:

- Clearly describe the changes.
- Preserve the existing application architecture where appropriate.
- Never include secrets or personal data in commits.
- Document configuration changes.

---

<div align="center">

**This project was developed specifically at the request of Nebulon Project.**

</div>

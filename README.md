# 🚀 Prostgles UI

**PostgreSQL Admin Tool & Internal Tool Builder**

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Try_Now-blue?style=for-the-badge)](https://playground.prostgles.com/)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)](https://hub.docker.com/r/prostgles/ui)
[![GitHub Repo stars](https://img.shields.io/github/stars/prostgles/ui?style=for-the-badge&logo=github)](https://github.com/prostgles/ui/stargazers)

**Quick Links:** [🌐 Live Demo](https://playground.prostgles.com/) • [📚 Documentation](https://prostgles.com/docs) • [💬 Community](https://github.com/prostgles/ui/discussions) • [🐛 Issues](https://github.com/prostgles/ui/issues) • [🔒 Security](SECURITY.md)

Prostgles UI is a PostgreSQL administration tool that combines database management with real-time dashboards and application building capabilities. It provides a web-based interface for SQL editing, data visualization, and rapid internal tool development.

---

## ✨ Overview

Prostgles UI extends traditional PostgreSQL administration by integrating:

- **Database Administration**: Full-featured SQL editor with schema management
- **Real-time Dashboards**: Live data visualization with automatic updates
- **Application Building**: TypeScript API generation for rapid development
- **Access Control**: Granular role-based permissions system

The tool is designed for development teams, database administrators, and organizations that need both database management and data visualization capabilities in a single platform.

---

## 🌟 Features

### 💻 SQL Editor
- Context-aware autocomplete with PostgreSQL schema integration
- Real-time query execution with streaming results
- **LISTEN/NOTIFY support** with live notification display
- Syntax highlighting and error detection
- Query history and favorites management
- Visual query builder for complex operations

### 📊 Data Visualization
- Interactive dashboards with drag-and-drop interface
- Time series charts with aggregation functions
- Geospatial visualization with PostGIS integration
- Cross-filtering between multiple chart components
- Real-time data synchronization via WebSocket connections

### 🗄️ Database Management
- Visual schema editor with diff capabilities
- Data import/export (CSV, JSON, GeoJSON formats)
- Backup and restore operations with cloud storage support
- User and role management interface
- Database performance monitoring

### 🛠️ Development Tools
- **Auto-generated TypeScript API** with full type safety from database schema
- React hooks for frontend integration
- Server-side TypeScript functions with hot reload
- **File upload and media management** with local/S3 storage
- LISTEN/NOTIFY support for real-time features
- **WebSocket-based real-time API** with automatic reconnection

### 📁 File Management
- **Integrated file storage** with local or Amazon S3 backends
- **Automatic file table creation** with metadata tracking
- **Reference-based access control** through related tables
- **Media preview and management** interface
- **Signed URL generation** for secure file access

### 🔐 Access Control
- Row-level security configuration
- Column-level permissions
- Table and schema access controls
- User authentication with external provider support
- Audit logging for compliance requirements

### 🔄 Real-time Features
- **PostgreSQL LISTEN/NOTIFY integration** for instant notifications
- **Live data synchronization** across all connected clients
- **Real-time dashboard updates** without page refresh
- **WebSocket-based subscriptions** with automatic reconnection
- **Hot reload** for schema changes and configuration updates

---

## 🚀 Installation

### Docker Compose (Recommended)

```bash
git clone https://github.com/prostgles/ui.git
cd ui
docker compose up
```

Access the application at [localhost:3004](http://localhost:3004).

### Custom Configuration

```bash
# Custom port and binding address
PRGL_DOCKER_IP=0.0.0.0 PRGL_DOCKER_PORT=8080 docker compose up
```

### Existing PostgreSQL Instance

```bash
docker build -t prostgles .
docker run -d -p 127.0.0.1:3004:3004 \
  -e POSTGRES_HOST=your-db-host \
  -e POSTGRES_PORT=5432 \
  -e POSTGRES_DB=your-database \
  -e POSTGRES_USER=your-username \
  -e POSTGRES_PASSWORD=your-password \
  prostgles
```

---

## 🏗️ Development Setup

### Prerequisites

- Node.js (v16+)
- PostgreSQL (v12+)
- PostGIS extension (recommended for geospatial features)

### Local Development

1. **Database Setup**
   ```bash
   sudo su - postgres
   createuser --superuser your_user
   psql -c "alter user your_user with encrypted password 'your_password'"
   createdb your_db -O your_user
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Start Development Server**
   ```bash
   ./start.sh
   ```

Application available at [localhost:3004](http://localhost:3004).

### 🧪 Testing

```bash
# Ensure development server is running
cd e2e && npm run test-local
```

---

## ⚙️ Architecture

Prostgles UI consists of:

- **Client**: React application with TypeScript
- **Server**: Node.js backend with Express
- **Database**: PostgreSQL with optional PostGIS extension
- **Real-time**: WebSocket connections for live data updates
- **API**: Auto-generated TypeScript definitions from database schema

The system uses PostgreSQL's LISTEN/NOTIFY for real-time synchronization and generates type-safe APIs based on your database schema.

---

## 🆚 Comparison with Other Tools

| Feature | Prostgles UI | pgAdmin | DBeaver | DataGrip |
|---------|--------------|---------|---------|----------|
| Real-time Dashboards | ✅ | ❌ | ❌ | ❌ |
| Visual Query Builder | ✅ | ⚠️ Basic | ⚠️ Basic | ✅ |
| PostGIS Integration | ✅ Native | ⚠️ Limited | ⚠️ Limited | ⚠️ Limited |
| Role-based Access Control | ✅ Granular | ⚠️ Basic | ❌ | ❌ |
| TypeScript API Generation | ✅ | ❌ | ❌ | ❌ |
| Real-time Data Sync | ✅ | ❌ | ❌ | ❌ |
| LISTEN/NOTIFY Support | ✅ Native | ⚠️ Limited | ❌ | ❌ |
| File Management | ✅ Integrated | ❌ | ❌ | ❌ |
| Web-based Interface | ✅ | ✅ | ❌ | ❌ |
| License | AGPL v3 | PostgreSQL | Apache 2.0 | Commercial |

---

## 🎯 Use Cases

### 📈 Business Intelligence
Transform PostgreSQL databases into interactive dashboards for data analysis and reporting.

### 🛠️ Internal Tools Development
Build admin panels, data entry forms, and operational dashboards with minimal coding.

### 🗺️ Geospatial Applications
Leverage PostGIS for location-based analytics and spatial data visualization.

### 👥 Team Collaboration
Share live dashboards and manage database access across development teams.

### 🔧 Database Administration
Perform standard DBA tasks with additional visualization and real-time monitoring capabilities.

---

## ⭐ Star History

<a href="https://star-history.com/#prostgles/ui&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=prostgles/ui&type=Date&theme=dark" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=prostgles/ui&type=Date" />
  </picture>
</a>

---

## 🤝 Contributing

Contributions are welcome. Please read the contributing guidelines before submitting pull requests.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/feature-name`
3. Commit changes: `git commit -m 'Add feature description'`
4. Push to branch: `git push origin feature/feature-name`
5. Submit a pull request

---

## 📸 Screenshots

<p align="center">
  <img src="https://prostgles.com/static/images/screenshot_crypto.png" alt="Prostgles UI Dashboard" width="100%"/>
</p>

[View additional screenshots](https://prostgles.com/ui)

---

**Quick Links:** [🌐 Live Demo](https://playground.prostgles.com/) • [📚 Documentation](https://prostgles.com/docs) • [💬 Community](https://github.com/prostgles/ui/discussions) • [🐛 Issues](https://github.com/prostgles/ui/issues) • [🔒 Security](SECURITY.md)

Licensed under the [GNU Affero General Public License v3.0](LICENSE).

# Documentation

Welcome to the Git-2-Jira-Dev-Pulse documentation!

## Getting Started

- **[README.md](../README.md)** - Project overview and quick start
- **[MCP_SETUP.md](../MCP_SETUP.md)** - MCP server configuration guide
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - How to contribute to this project

## Technical Documentation

### [ARCHITECTURE.md](ARCHITECTURE.md)
Comprehensive architecture documentation covering:
- System overview and component diagram
- Backend services (FolderScanner, GitAnalyzer, TicketSuggester, JiraClient)
- Frontend structure (React + PatternFly)
- CLI and MCP server architecture
- Data flow examples
- Security and performance considerations

### [API.md](API.md)
Complete API reference for the FastAPI backend:
- Health check endpoint
- Repository scanning
- Git analysis
- Ticket suggestions
- Ticket creation (single and batch)
- Error responses and rate limiting
- Testing examples with curl, httpie, and Python

### [DEPLOYMENT.md](DEPLOYMENT.md)
Production deployment guide:
- Local development setup
- Production deployment with Nginx
- Docker and Docker Compose
- Systemd service configuration
- Environment configuration
- Security best practices
- Monitoring and logging
- Backup and recovery
- Scaling strategies

### [TODO.md](TODO.md)
Project roadmap and task tracking:
- High priority features and bugs
- Medium and low priority enhancements
- Technical debt items
- Research areas
- Completed items

## Video Tutorials

See the **[videos/](../videos/)** directory for complete video tutorial scripts and recording guides:

1. **Setup and Installation** - Clone, install dependencies, verify setup
2. **Configuring Jira Credentials** - Get API token, configure .env file
3. **Using the Web UI** - Complete walkthrough of the React interface
4. **Using the CLI** - Command-line interface for power users
5. **MCP Integration** - Claude Code integration with Model Context Protocol

Each video includes:
- Detailed scripts with timestamps
- Visual annotation guidelines
- Recording tips and best practices
- Post-production checklists

## Additional Resources

### For Users
- **Quick Start**: See main [README.md](../README.md)
- **MCP Setup**: See [MCP_SETUP.md](../MCP_SETUP.md)
- **Video Tutorials**: See [videos/README.md](../videos/README.md)
- **API Usage**: See [API.md](API.md)

### For Developers
- **Contributing**: See [CONTRIBUTING.md](../CONTRIBUTING.md)
- **Architecture**: See [ARCHITECTURE.md](ARCHITECTURE.md)
- **Deployment**: See [DEPLOYMENT.md](DEPLOYMENT.md)
- **TODO List**: See [TODO.md](TODO.md)

### For Operators
- **Deployment**: See [DEPLOYMENT.md](DEPLOYMENT.md)
- **MCP Setup**: See [MCP_SETUP.md](../MCP_SETUP.md)
- **Health Monitoring**: See API health endpoint in [API.md](API.md)

## Documentation Structure

```
docs/
├── README.md           # This file - documentation index
├── API.md              # Complete API reference
├── ARCHITECTURE.md     # System architecture and design
├── DEPLOYMENT.md       # Production deployment guide
└── TODO.md             # Project roadmap and tasks

Root directory:
├── README.md           # Project overview and quick start
├── CONTRIBUTING.md     # Contribution guidelines
└── MCP_SETUP.md        # MCP server setup guide

videos/
├── README.md                                    # Video production guide
├── 01-setup-and-installation-script.md         # Video 1 script
├── 02-configuring-jira-credentials-script.md   # Video 2 script
├── 03-using-web-ui-script.md                   # Video 3 script
├── 04-using-cli-script.md                      # Video 4 script
└── 05-mcp-integration-script.md                # Video 5 script
```

## Need Help?

- **Issues**: [GitHub Issues](https://github.com/rhpds/git-2-jira-dev-pulse/issues)
- **Discussions**: [GitHub Discussions](https://github.com/rhpds/git-2-jira-dev-pulse/discussions)
- **Slack**: #rhdp-dev-tools (Red Hat internal)

## Contributing to Docs

Found a typo or want to improve the documentation? See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on:
- Documentation style
- Markdown formatting
- Code examples
- Screenshots and diagrams

All documentation contributions are welcome!

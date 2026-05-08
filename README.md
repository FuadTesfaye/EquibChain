# EqubChain

The world's oldest savings system. Rebuilt for the internet.

A decentralized rotating savings protocol on Solana powered by AI reputation and trustless execution.

## 🌟 Overview

EqubChain brings the traditional rotating savings and credit association (ROSCA) model to the blockchain, enabling communities worldwide to participate in trustless, automated savings circles. Our AI-powered reputation system ensures fairness while maintaining the cultural significance of these community financial instruments.

### Key Features

- **Trustless Execution**: On-chain escrow with automated disbursements
- **AI-Powered Reputation**: Advanced scoring algorithms prevent abuse and build trust
- **Global Accessibility**: Borderless Solana technology for instant worldwide participation
- **Smart Contract Automation**: Automated cycle completion and payouts
- **Fraud Detection**: Real-time monitoring and member slashing for defaults
- **Cinematic UI**: Modern web interface with Three.js visualizations

## 🏗️ Architecture

### Smart Contract Layer
- **Anchor Program**: Rust-based Solana program with comprehensive account management
- **PDA-Based Security**: Program Derived Addresses for secure account derivation
- **Event System**: Comprehensive event emission for real-time tracking
- **Security Invariants**: Built-in protections against common attack vectors

### AI Agent Infrastructure
- **Scoring Agent**: Wallet analytics and reputation calculation
- **Pool Manager**: Automated cycle completion and health monitoring
- **Fraud Detection**: Pattern analysis and risk assessment
- **x402 Mock Server**: Payment-gated API endpoints with signature verification

### Frontend Application
- **Next.js 15**: Modern React framework with App Router
- **Three.js Visualizations**: Interactive 3D pool flow and network activity
- **Wallet Integration**: Multi-wallet support (Phantom, Solflare, Backpack)
- **Real-time Updates**: React Query for optimistic UI updates

### SDK Layer
- **Typed Clients**: Full TypeScript support with type-safe interactions
- **PDA Helpers**: Utilities for account derivation and validation
- **Event Listeners**: Real-time event handling and callbacks
- **Error Handling**: Comprehensive error types and recovery patterns

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Solana CLI
- Anchor CLI

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/equbchain.git
cd equbchain

# Install dependencies
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test
```

### Local Development

```bash
# Start Solana validator
solana-test-validator

# Deploy program
pnpm deploy:program

# Start AI agents
pnpm dev:agent

# Start frontend
pnpm dev:web
```

## 📁 Project Structure

```
equbchain/
├── apps/
│   ├── web/                 # Next.js frontend application
│   └── agent/               # AI agents and x402 server
├── programs/
│   └── equbchain/          # Solana smart contract
└── packages/
    ├── sdk/                 # TypeScript SDK
    ├── types/               # Shared type definitions
    ├── config/              # Configuration utilities
    └── ui/                  # Component library
```

## 🧪 Smart Contract

### Program ID
```
EqubChain11111111111111111111111111111111111111111
```

### Key Instructions

- `initialize_pool`: Create a new rotating savings pool
- `join_pool`: Join an existing pool as a member
- `contribute`: Contribute funds to the pool escrow
- `disburse`: Disburse funds to the current recipient
- `update_member_score`: Update AI reputation score for a member
- `slash_defaulter`: Slash funds from a defaulting member
- `pause_pool`: Pause pool operations (emergency)
- `resume_pool`: Resume paused pool operations
- `emergency_close`: Emergency pool closure with fund recovery

### Account Structures

- **Pool**: Main pool configuration and state
- **Member**: Individual member data and contribution history
- **Contribution**: Individual contribution records
- **Payout**: Disbursement records and recipients

## 🤖 AI Agents

### Scoring Agent
Analyzes wallet history and on-chain behavior to calculate reputation scores:
- Transaction history analysis
- DeFi protocol participation
- NFT and gaming activity weighting
- Time-based activity patterns
- Community contribution metrics

### Pool Manager Agent
Automates pool lifecycle management:
- Cycle completion detection
- Health monitoring and alerts
- Automatic disbursement processing
- Pool cleanup and optimization

### Fraud Detection Agent
Monitors for suspicious patterns and behavior:
- Rapid join/leave patterns
- Concentrated wallet activity
- Transaction timing anomalies
- Cross-pool correlation analysis

## 🌐 Frontend Application

### Pages
- **Homepage**: Cinematic landing with Three.js visualizations
- **Pool Discovery**: Browse and filter available pools
- **Pool Details**: In-depth pool information and member management
- **Dashboard**: Personal pool management and activity tracking

### Components
- **Hero Scene**: 3D animated homepage visualization
- **Network Globe**: Global activity visualization
- **Pool Flow**: Interactive pool lifecycle visualization
- **Glass UI**: Modern glassmorphism design system

### Wallet Support
- Phantom
- Solflare
- Backpack
- Glow
- Any Solana-compatible wallet

## 📊 Testing

### Smart Contract Tests
```bash
# Run program tests
pnpm test:program

# Run specific test file
pnpm test:program --grep "Pool Management"
```

### SDK Tests
```bash
# Run SDK tests
pnpm test:sdk
```

### Frontend Tests
```bash
# Run frontend tests
pnpm test:web

# Run E2E tests
pnpm test:e2e
```

## 🔧 Configuration

### Environment Variables

```bash
# Solana Configuration
SOLANA_RPC_URL=http://localhost:8899
SOLANA_CLUSTER=devnet

# Program Configuration
PROGRAM_ID=EqubChain11111111111111111111111111111111111111111
USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# AI Agent Configuration
AGENT_PORT=3002
X402_SERVER_PORT=3001
SCORING_API_KEY=your_scoring_api_key

# Frontend Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📚 Documentation

### Smart Contract Documentation
- [Account Structures](./docs/accounts.md)
- [Instruction Reference](./docs/instructions.md)
- [Event System](./docs/events.md)
- [Security Model](./docs/security.md)

### SDK Documentation
- [Getting Started](./packages/sdk/README.md)
- [API Reference](./packages/sdk/docs/api.md)
- [Examples](./packages/sdk/examples/)

### Frontend Documentation
- [Component Library](./packages/ui/README.md)
- [Development Guide](./apps/web/README.md)
- [Deployment Guide](./docs/deployment.md)

## 🚀 Deployment

### Program Deployment
```bash
# Build program
pnpm build:program

# Deploy to devnet
pnpm deploy:devnet

# Deploy to mainnet
pnpm deploy:mainnet
```

### Frontend Deployment
```bash
# Build frontend
pnpm build:web

# Deploy to Vercel
vercel --prod

# Deploy to Netlify
netlify deploy --prod --dir=apps/web/dist
```

### AI Agent Deployment
```bash
# Build agents
pnpm build:agent

# Deploy to Railway
railway up

# Deploy to Render
render deploy
```

## 🔒 Security

### Audits
- Smart contract audit by [Audit Firm]
- Penetration testing by [Security Team]
- Formal verification using [Verification Tool]

### Security Measures
- Multi-signature admin controls
- Emergency pause mechanisms
- Slashing for malicious behavior
- Rate limiting on sensitive operations
- Comprehensive input validation

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Style
- TypeScript for all new code
- Follow Biome linting rules
- Write comprehensive tests
- Document public APIs
- Use conventional commits

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- Solana Foundation for the amazing blockchain infrastructure
- Anchor framework for secure smart contract development
- The global ROSCA community for inspiration and guidance
- All contributors and early users

## 📞 Support

- **Documentation**: [docs.equbchain.com](https://docs.equbchain.com)
- **Discord**: [discord.gg/equbchain](https://discord.gg/equbchain)
- **Twitter**: [@EqubChain](https://twitter.com/equbchain)
- **Email**: [support@equbchain.com](mailto:support@equbchain.com)

## 🗺 Roadmap

### Phase 1: Foundation ✅
- [x] Smart contract development
- [x] SDK implementation
- [x] Basic frontend
- [x] AI agent infrastructure

### Phase 2: Enhancement ✅
- [x] Three.js visualizations
- [x] Advanced UI components
- [x] Pool discovery and management
- [x] Comprehensive testing

### Phase 3: Expansion 🚧
- [ ] Mobile applications
- [ ] Advanced analytics
- [ ] Cross-chain support
- [ ] Governance mechanisms

### Phase 4: Ecosystem 🔮
- [ ] DeFi integrations
- [ ] NFT utilities
- [ ] DAO governance
- [ ] Global expansion

---

**Built with ❤️ by the EqubChain team**

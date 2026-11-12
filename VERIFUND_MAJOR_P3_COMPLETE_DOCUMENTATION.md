# VeriFund: AI-Audited Decentralized Crowdfunding & Milestone Governance Platform
## Complete Master Architecture & Technical Specification Document (`major_p3`)

---

## 1. Executive Summary

**VeriFund** is a decentralized, transparent, and AI-governed crowdfunding ecosystem engineered to eliminate financial fraud, fund diversion, and lack of accountability in philanthropic and non-governmental organization (NGO) operations.

In conventional crowdfunding systems (such as GoFundMe or traditional bank transfers), donors give money upfront with zero guarantees regarding fund utilization. NGOs can inflate bills, divert capital, or fail to execute projects without consequence. 

**VeriFund solves this end-to-end through a 4-pillar multi-disciplinary architecture:**
1. **Blockchain Milestone Escrow**: Donations are locked in Ethereum smart contracts and released in tranches only when quantifiable milestones are completed.
2. **Dual-Engine Financial Fraud Detection**: Evaluates transaction velocity, channel risk, and amount deviations in real time using a balanced **Random Forest** classifier ($ROC\text{-}AUC = 0.9421$) and a **PyTorch Deep Multi-Layer Perceptron (MLP)** with **Focal Loss** and **Autoencoder** anomaly detection.
3. **NLP Social Impact Analyser**: Parses unstructured NGO execution reports using **spaCy** to extract real beneficiary counts, budget utilization metrics, and outcome sentiment, assigning an objective Social Impact Score ($0\text{--}10$).
4. **Decentralized Cryptographic Storage (IPFS)**: Milestone invoices, expense receipts, and proof media are content-addressed using **SHA-256 multihash CIDs**, preventing retroactive data tampering.

---

## 2. Complete Technology Stack Matrix

| Layer | Technology | Version / Spec | Purpose in `major_p3` |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | React.js | 18.x (Vite) | Responsive donor, NGO, and admin interactive dashboard |
| **Styling & Icons** | Vanilla CSS + Lucide Icons | Custom glassmorphism | Premium financial UI with dark/light themes |
| **Web3 Client** | Ethers.js | v6.17.0 | MetaMask wallet connection, smart contract RPC calls, and event listeners |
| **Backend API** | Node.js + Express.js | 20.x / 4.19.x (ESM) | RESTful API gateway, authentication middleware, and orchestration |
| **Database** | MongoDB + Mongoose | 8.3.x | Storage of user profiles, campaigns, audit logs, and IPFS CIDs |
| **Smart Contracts** | Solidity | 0.8.28 | Trustless milestone escrow state machine (`NGOFundManager.sol`) |
| **Local Blockchain** | Hardhat Network | 2.22.x | Local Ethereum EVM running on Chain ID `31337` (`http://127.0.0.1:8545`) |
| **AI 1: Tabular ML** | Scikit-Learn | 1.4+ | 100-Tree Balanced Random Forest trained on 6.36M PaySim transactions |
| **AI 2: Deep Learning** | PyTorch | 2.x | Deep Tabular MLP with Focal Loss ($\gamma=2.0$) & Zero-Day Autoencoder |
| **AI 3: NLP Impact** | spaCy (`en_core_web_sm`) | 3.7+ | Tokenization, entity extraction, lemmatization for impact analysis |
| **Decentralized Storage**| IPFS Mock Gateway | SHA-256 Base58 | Content-Addressable Storage (CAS) for milestone invoices (`Qm...` CIDs) |
| **AI Conversational** | Google Gemini 2.5 Flash | REST API | VeriFund AI Copilot chatbot with live platform context fallback |

---

## 3. End-to-End System Workflow

```
[ DONOR ]                                                              [ NGO ]
   │                                                                      │
   │ 1. Connect MetaMask (Chain ID: 31337)                                │ 2. Create Project + Define Milestones
   │                                                                      │    (e.g., Target: 10 ETH, M1: 5 ETH, M2: 5 ETH)
   ▼                                                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND GATEWAY (PORT 5000)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Registers project in MongoDB.                                             │
│ • Deploys project instance to Solidity Smart Contract (`NGOFundManager.sol`) │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
[ DONOR INITIATES DONATION (e.g., 2.5 ETH) ]
   │
   ├──> [ AI FRAUD DETECTION PIPELINE (Port 5001) ]
   │    • Extracts: [step (hour), type (TRANSFER), amount (log-scaled)]
   │    • Passes through 100-Tree Random Forest + PyTorch Deep MLP
   │    • Returns: Risk Score (e.g., 0.04 -> LOW RISK)
   │
   ▼
[ SMART CONTRACT ESCROW (`NGOFundManager.sol`) ]
   • Funds securely locked in contract address.
   • Emits `DonationReceived(projectId, donor, amount)`.
   • NGO CANNOT withdraw funds yet.
                                  │
                                  ▼
[ NGO EXECUTES MILESTONE 1 ]
   • Uploads invoices, contractor receipts, and proof documents.
   • Invoices hashed via SHA-256 into IPFS CIDs (`Qm...`).
   • Submits Project Execution Report to AI Impact Analyser.
                                  │
                                  ▼
[ AI SOCIAL IMPACT ANALYSER (`impact_analyser.py`) ]
   • spaCy extracts: Beneficiaries (e.g., 1,250), Budget (100%), Sentiment.
   • Computes Impact Score (e.g., 9.2/10 -> HIGH IMPACT).
                                  │
                                  ▼
[ ADMIN COMPLIANCE AUDIT ]
   • Admin reviews verified IPFS proofs + AI Risk Scores + Impact Assessment.
   • Approves milestone release on the smart contract (`releaseMilestone()`).
                                  │
                                  ▼
[ ESCROW PAYOUT ]
   • Smart contract automatically transfers Milestone 1 allocation to NGO wallet!
```

---

## 4. Deep Dive into the Subsystems

### Subsystem A: Smart Contract Escrow Architecture (`NGOFundManager.sol`)
* **State Machine Rules**:
  1. `createProject(address ngo, uint256 targetAmount, string[] titles, uint256[] amounts)`: Enforces that the sum of milestone allocations equals the total target amount (`require(sum == targetAmount)`).
  2. `donate(uint256 projectId) payable`: Locks funds into contract escrow and updates project raised balances.
  3. `releaseMilestone(uint256 projectId, uint256 milestoneIndex)`: Callable only by the verified platform authority (`onlyOwner`). Enforces that funds cannot be released twice (`require(!milestone.released)`) and that raised balance covers the milestone quota.

### Subsystem B: AI Financial Fraud Engine (`ai/`)
* **Dataset Foundation**: PaySim Synthetic Financial Mobile Dataset ($6,362,620$ transactions, $11$ features, extreme $774:1$ class imbalance with $8,213$ actual frauds).
* **Feature Engineering**:
  * `amount`: Subjected to $Log(1 + x)$ transformation followed by `StandardScaler` to handle extreme monetary variance.
  * `type`: One-Hot Encoded across $5$ channels (`TRANSFER`, `CASH_OUT`, `PAYMENT`, `DEBIT`, `CASH_IN`).
  * `step`: Standardized hourly temporal feature capturing burst attacks.
* **Dual-Model Ensemble**:
  1. **Random Forest Classifier**: $100$ estimators with cost-sensitive `class_weight='balanced'`. Calculates Gini Impurity splits. Achieves **$ROC\text{-}AUC = 0.9421$** and **$PR\text{-}AUC = 0.8122$** on unseen holdout sets ($step > 600$).
  2. **PyTorch Deep MLP**: $7 \to 64 \to 32 \to 16 \to 1$ with Batch Normalization, LeakyReLU, and Dropout ($p=0.2$). Uses **Focal Loss** ($\gamma=2.0, \alpha=0.75$) to prevent overwhelming gradient updates from easy negative transactions.
  3. **Reconstruction Autoencoder**: Compresses transaction vectors to a $3$-dimensional bottleneck and checks mean squared reconstruction error to catch zero-day attack patterns.

### Subsystem C: NLP Impact Analyser (`ai/impact_analyser.py`)
* **Information Extraction Protocol**:
  * **Beneficiary Parsing**: Regular expressions combined with dependency tree token parsing (`doc[ent.root.head.i]`) to bind cardinal numbers to keywords (`students`, `children`, `patients`, `families`).
  * **Outcome & Utilization Verification**: Lemmatized keyword dictionaries match actions (`improve`, `build`, `train`, `disburse`, `utilize`).
  * **Scoring Heuristic**: Computes a completeness ratio across $5$ evaluation dimensions and weights it by positive/negative lemma sentiment.

### Subsystem D: IPFS Decentralized Storage (`backend/services/ipfsService.js`)
* Files are uploaded via `multer` as raw buffers.
* Cryptographic hash generation computes the SHA-256 digest and encodes it in standard Base58 formatting:
  $$\text{CID} = \text{"Qm"} + \text{Base58}(\text{SHA-256}(\text{buffer}))$$
* Guarantees that milestone proofs cannot be modified or replaced without invalidating the CID.

---

## 5. Directory Structure of `major_p3`

```
major_p3/
├── ai/                                # Python AI & Machine Learning Microservice
│   ├── data/                          # Dataset folder (paysim.csv ignored by git)
│   ├── models/                        # Serialized model weights & preprocessors
│   │   ├── fraud_detection_model.joblib # Trained 100-Tree Random Forest
│   │   ├── neural_fraud_model.pt      # Trained PyTorch Deep Tabular MLP
│   │   └── neural_preprocessor.joblib # Log1p-StandardScaler pipeline
│   ├── reports/                       # Generated evaluation proofs & charts
│   │   ├── model_comparison_report.md
│   │   ├── model_evaluation_report.md
│   │   └── random_forest_evaluation_dashboard.png # 4-panel proof dashboard
│   ├── ai_server.py                   # Flask REST API (Port 5001)
│   ├── fraud_detector.py              # Multi-engine inference (RF, Neural, Hybrid)
│   ├── generate_evaluation_charts.py  # Standalone chart generation script
│   ├── impact_analyser.py             # spaCy NLP project impact scorer
│   ├── neural_model.py                # PyTorch architecture (DeepFraudMLP, FocalLoss)
│   ├── test_neural_detector.py        # Automated test suite
│   ├── train.py                       # Random Forest training script
│   └── train_neural_net.py            # Neural Network training pipeline
├── backend/                           # Node.js + Express API Gateway (Port 5000)
│   ├── config/                        # Database & environment configurations
│   ├── controllers/                   # Business logic (auth, donation, milestone, chat)
│   ├── middleware/                    # JWT authentication & error handlers
│   ├── models/                        # Mongoose data schemas (User, Project, Transaction, Document)
│   ├── routes/                        # REST endpoint definitions
│   ├── scratch/ipfs_mock_gateway/     # Local content-addressed IPFS storage directory
│   ├── services/                      # Blockchain sync & IPFS hashing service
│   ├── contract_config.json           # Deployed smart contract address & ABI
│   └── server.js                      # Main Express server entrypoint
├── blockchain/                        # Web3 Smart Contracts & Hardhat EVM (Port 8545)
│   ├── contracts/                     # Solidity contract files
│   │   └── NGOFundManager.sol         # Core milestone escrow smart contract
│   ├── scripts/                       # Deployment scripts (`deploy.js`)
│   ├── test/                          # Smart contract automated unit tests
│   └── hardhat.config.js              # Hardhat configuration (Chain ID: 31337)
├── frontend/                          # React + Vite User Interface (Port 5173)
│   ├── src/
│   │   ├── components/                # Reusable UI widgets (ChatbotWidget, Navbar)
│   │   ├── services/                  # Frontend API & Web3 contract connectors (`api.js`)
│   │   ├── App.jsx                    # Core platform dashboard & views
│   │   ├── index.css                  # Modern glassmorphism styling
│   │   └── main.jsx                   # React root mount
│   ├── package.json
│   └── vite.config.js
├── NEURAL_NETWORK_FRAUD_IMPLEMENTATION.md # Mathematical & architectural deep dive
├── NEURAL_NETWORK_PRESENTATION_MASTER_GUIDE.md # Presentation & slide reference guide
├── PROJECT_MASTER_DOCUMENTATION.md    # Platform architecture documentation
└── .gitignore                         # Excludes node_modules, .env, and large CSVs
```

---

## 6. How to Run the Complete Platform (Demo Instructions)

Open **4 separate terminals** in the project directory:

```powershell
# TERMINAL 1: Local Blockchain (Port 8545)
cd blockchain
npx hardhat node
# Deploy contracts (in temporary tab if restarting chain):
# npx hardhat run scripts/deploy.js --network localhost

# TERMINAL 2: AI Microservice (Port 5001)
cd ai
python ai_server.py

# TERMINAL 3: Express Backend Gateway (Port 5000)
cd backend
npm run dev

# TERMINAL 4: React Frontend (Port 5173)
cd frontend
npm run dev
```

### Quick Access Addresses:
* **Frontend Web Application**: `http://localhost:5173`
* **Backend REST Gateway**: `http://localhost:5000/api`
* **Python AI Microservice**: `http://localhost:5001/health`
* **Blockchain EVM RPC**: `http://127.0.0.1:8545` (Chain ID `31337`)
* **Database**: `mongodb://127.0.0.1:27017/major_r`

---

## 7. Viva & Project Defense Key Answers

1. **Why not store everything on the blockchain?**  
   *Ethereum block gas limits and high transaction fees make storing raw PDFs, images, or neural network weights impossible on-chain. VeriFund utilizes an off-chain architecture: IPFS stores raw files, the smart contract stores only the 46-character hash (`ipfsCid`), and the AI runs as an off-chain oracle.*
2. **Why Random Forest alongside a Deep Neural Network?**  
   *Random Forest provides deterministic, explainable tree splits with Gini feature importances required for financial compliance and sub-millisecond latency. The Deep Neural Network with Focal Loss handles complex non-linear interactions and edge-case anomalies.*
3. **How does the system handle class imbalance?**  
   *Because financial fraud represents $< 0.13\%$ of transactions ($774:1$ ratio), standard accuracy is deceptive. We utilized balanced class weights in Random Forest and Focal Loss ($\gamma = 2.0$) in PyTorch, evaluating success using ROC-AUC ($0.9421$) and PR-AUC ($0.8122$).*

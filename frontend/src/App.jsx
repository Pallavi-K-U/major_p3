import React, { useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import {
  checkHealth,
  registerUser,
  loginUser,
  logoutUser,
  getNgoProfile,
  updateNgoProfile,
  createProject,
  getOwnProjects,
  getActiveProjects,
  getProjectDetails,
  adminGetNgos,
  adminGetProjects,
  adminVerifyNgo,
  donateToProject,
  getDonationHistory,
  getNgoDonations,
  getNgoDonationsTotal,
  adminGetTransactions,
  adminUpdateTransactionReview,
  uploadProjectDocument,
  getProjectDocuments,
  deleteProjectDocument,
  analyseProjectImpact,
  releaseProjectMilestone,
} from './services/api';
import ChatbotWidget from './components/ChatbotWidget';

function App() {
  const [view, setView] = useState('home'); // home, login, register, dashboard, project-details
  const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'light');
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user_profile');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Filter & Search states on home
  const [campaignFilter, setCampaignFilter] = useState('ALL'); // ALL, ACTIVE, FUNDED, COMPLETED
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Web3 Wallet State
  const [walletAddress, setWalletAddress] = useState('');
  const [chainId, setChainId] = useState('');
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [web3Status, setWeb3Status] = useState('IDLE'); // IDLE, CONNECTING, SIGNING, PENDING, SUCCESS
  const [web3Error, setWeb3Error] = useState('');

  // Health Check State
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthInfo, setHealthInfo] = useState(null);
  const [healthError, setHealthError] = useState(null);

  // Forms State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('DONOR');
  const [regError, setRegError] = useState(null);
  const [regSuccess, setRegSuccess] = useState(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState(null);

  // NGO Dashboard states
  const [ngoProfile, setNgoProfile] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editNgoName, setEditNgoName] = useState('');
  const [editNgoDesc, setEditNgoDesc] = useState('');
  const [editNgoReg, setEditNgoReg] = useState('');
  const [editNgoWallet, setEditNgoWallet] = useState('');
  const [ngoProfileError, setNgoProfileError] = useState(null);

  const [ngoProjects, setNgoProjects] = useState([]);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projTarget, setProjTarget] = useState(0);
  const [projStart, setProjStart] = useState('');
  const [projEnd, setProjEnd] = useState('');
  const [projStatus, setProjStatus] = useState('DRAFT');
  const [projMilestones, setProjMilestones] = useState([]);
  const [projError, setProjError] = useState(null);

  // Milestone input form
  const [msTitle, setMsTitle] = useState('');
  const [msDesc, setMsDesc] = useState('');
  const [msAmount, setMsAmount] = useState(0);

  // NGO Donation list
  const [ngoDonations, setNgoDonations] = useState([]);
  const [ngoTotalReceived, setNgoTotalReceived] = useState(0);

  // Donor view states
  const [activeProjects, setActiveProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projDetailError, setProjDetailError] = useState(null);
  
  // Donor Donation processing
  const [donationAmount, setDonationAmount] = useState(0);
  const [donationError, setDonationError] = useState(null);
  const [donationSuccess, setDonationSuccess] = useState(null);
  const [donationHistory, setDonationHistory] = useState([]);

  // Admin Dashboard states
  const [adminNgos, setAdminNgos] = useState([]);
  const [adminProjects, setAdminProjects] = useState([]);
  const [adminTransactions, setAdminTransactions] = useState([]);
  const [adminError, setAdminError] = useState(null);

  // IPFS Document locker states
  const [projectDocuments, setProjectDocuments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);

  // Impact Analysis states
  const [impactText, setImpactText] = useState('');
  const [impactLoading, setImpactLoading] = useState(false);
  const [impactError, setImpactError] = useState(null);
  const [impactResult, setImpactResult] = useState(null);

  // Milestone release states
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [releaseError, setReleaseError] = useState(null);
  const [releaseSuccess, setReleaseSuccess] = useState(null);

  const fetchHealthStatus = async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const result = await checkHealth();
      setHealthInfo(result.data);
      if (!result.ok) {
        setHealthError(`Backend reported unhealthy status (HTTP ${result.status})`);
      }
    } catch (err) {
      setHealthError('Failed to contact the backend service.');
    } finally {
      setHealthLoading(false);
    }
  };

  const connectWallet = async () => {
    setWeb3Error('');
    if (!window.ethereum) {
      setWeb3Error('MetaMask extension not detected. Please install MetaMask to use Web3 features.');
      return;
    }
    try {
      setWeb3Status('CONNECTING');
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setWalletAddress(accounts[0]);
      
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      setChainId(currentChainId);
      
      // Hardhat network is Chain ID 31337 (0x7a69)
      if (currentChainId !== '0x7a69' && currentChainId !== 31337 && currentChainId !== '31337') {
        setWrongNetwork(true);
        setWeb3Error('Network mismatch: please switch MetaMask to Hardhat Local Node (Chain ID: 31337).');
      } else {
        setWrongNetwork(false);
      }
      setWeb3Status('IDLE');
    } catch (err) {
      setWeb3Status('IDLE');
      setWeb3Error(err.message || 'User rejected wallet connection');
    }
  };

  useEffect(() => {
    fetchHealthStatus();
    fetchActiveProjects();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        } else {
          setWalletAddress('');
        }
      });
      window.ethereum.on('chainChanged', (hexChainId) => {
        setChainId(hexChainId);
        if (hexChainId !== '0x7a69') {
          setWrongNetwork(true);
          setWeb3Error('Network mismatch: please switch MetaMask to Hardhat Local Node (Chain ID: 31337).');
        } else {
          setWrongNetwork(false);
          setWeb3Error('');
        }
      });
    }
  }, [user]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);
    try {
      const res = await registerUser({
        name: regName,
        email: regEmail,
        password: regPassword,
        role: regRole,
      });

      if (res.ok) {
        setRegSuccess('Registration successful! Please login to your account.');
        setRegName('');
        setRegEmail('');
        setRegPassword('');
        setView('login');
      } else {
        setRegError(res.data.error?.message || 'Registration failed');
      }
    } catch (err) {
      setRegError('Registration failed: server error');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await loginUser({
        email: loginEmail,
        password: loginPassword,
      });

      if (res.ok) {
        const profile = res.data.user;
        setUser(profile);
        localStorage.setItem('user_profile', JSON.stringify(profile));
        setLoginEmail('');
        setLoginPassword('');
        setView('dashboard');
      } else {
        setLoginError(res.data.error?.message || 'Login failed');
      }
    } catch (err) {
      setLoginError('Login failed: server error');
    }
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    localStorage.removeItem('user_profile');
    setView('home');
  };

  // --- NGO Action Handlers ---
  const fetchNgoData = async () => {
    try {
      const resProfile = await getNgoProfile();
      if (resProfile.ok && resProfile.data?.profile) {
        setNgoProfile(resProfile.data.profile);
        setEditNgoName(resProfile.data.profile.name || '');
        setEditNgoDesc(resProfile.data.profile.description || '');
        setEditNgoReg(resProfile.data.profile.registrationNumber || '');
        setEditNgoWallet(resProfile.data.profile.walletAddress || '');
      }
      const resProjects = await getOwnProjects();
      if (resProjects.ok) {
        setNgoProjects(resProjects.data.projects || []);
      }
      const resDons = await getNgoDonations();
      if (resDons.ok) {
        setNgoDonations(resDons.data.donations || []);
      }
      const resTot = await getNgoDonationsTotal();
      if (resTot.ok) {
        setNgoTotalReceived(resTot.data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching NGO data:', err);
    }
  };

  const handleUpdateNgoProfile = async (e) => {
    e.preventDefault();
    setNgoProfileError(null);
    try {
      const res = await updateNgoProfile({
        name: editNgoName,
        description: editNgoDesc,
        registrationNumber: editNgoReg,
        walletAddress: editNgoWallet,
      });
      if (res.ok) {
        setNgoProfile(res.data.profile);
        setIsEditingProfile(false);
      } else {
        setNgoProfileError(res.data.error?.message || 'Failed to update profile');
      }
    } catch (err) {
      setNgoProfileError('Server error updating profile');
    }
  };

  const addMilestone = () => {
    if (!msTitle || msAmount <= 0) return;
    setProjMilestones([
      ...projMilestones,
      {
        title: msTitle,
        description: msDesc,
        amount: Number(msAmount),
        order: projMilestones.length + 1,
      },
    ]);
    setMsTitle('');
    setMsDesc('');
    setMsAmount(0);
  };

  const removeMilestone = (index) => {
    const updated = projMilestones.filter((_, i) => i !== index);
    const reindexed = updated.map((m, idx) => ({ ...m, order: idx + 1 }));
    setProjMilestones(reindexed);
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setProjError(null);

    if (!window.ethereum) {
      setProjError('MetaMask extension is required to register campaigns on-chain.');
      return;
    }

    try {
      setWeb3Status('CONNECTING');
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      if (currentChainId !== '0x7a69' && currentChainId !== 31337 && currentChainId !== '31337') {
        setProjError('Wrong network: please connect to Hardhat Local Node (Chain ID: 31337).');
        return;
      }

      setWeb3Status('SIGNING');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Deploy contract configuration imports
      const contractConfig = await import('./contract_config.json');
      const contract = new ethers.Contract(contractConfig.address, contractConfig.abi, signer);

      // On-chain registration parameters formatting
      const targetWei = ethers.parseEther(projTarget.toString());
      const milestoneTitles = projMilestones.map(m => m.title);
      const milestoneWeiAmounts = projMilestones.map(m => ethers.parseEther(m.amount.toString()));

      // Send transaction
      const tx = await contract.createProject(
        ngoProfile?.walletAddress || accounts[0],
        targetWei,
        milestoneTitles,
        milestoneWeiAmounts
      );

      setWeb3Status('PENDING');
      const txReceipt = await tx.wait();

      if (txReceipt.status !== 1) {
        throw new Error('On-chain project creation failed');
      }

      // Parse project ID from events
      let onChainProjectId = 0;
      for (const log of txReceipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog(log);
          if (parsedLog && parsedLog.name === 'ProjectCreated') {
            onChainProjectId = Number(parsedLog.args.projectId);
            break;
          }
        } catch (e) {
          // ignore parsing error for non-target logs
        }
      }

      // Now create database project
      setWeb3Status('SUCCESS');
      const res = await createProject({
        title: projTitle,
        description: projDesc,
        targetAmount: Number(projTarget),
        startDate: projStart,
        endDate: projEnd,
        status: projStatus,
        milestones: projMilestones,
        blockchainId: onChainProjectId,
      });

      if (res.ok) {
        setProjTitle('');
        setProjDesc('');
        setProjTarget(0);
        setProjStart('');
        setProjEnd('');
        setProjMilestones([]);
        setIsCreatingProject(false);
        fetchNgoData();
      } else {
        setProjError(res.data.error?.message || 'Database creation failed');
      }
      setWeb3Status('IDLE');
    } catch (err) {
      setWeb3Status('IDLE');
      if (err.code === 'ACTION_REJECTED' || err.code === 4001 || (err.message && err.message.includes('rejected'))) {
        setProjError('Transaction rejected by user.');
      } else {
        setProjError('On-chain deployment failed: ' + err.message);
      }
    }
  };

  // --- Donor Action Handlers ---
  const fetchActiveProjects = async () => {
    try {
      const res = await getActiveProjects();
      if (res.ok) {
        setActiveProjects(res.data.projects || []);
      }
    } catch (err) {
      console.error('Error fetching active projects:', err);
    }
  };

  const fetchDonorHistory = async () => {
    try {
      const res = await getDonationHistory();
      if (res.ok) {
        setDonationHistory(res.data.donations || []);
      }
    } catch (err) {
      console.error('Error loading donation history:', err);
    }
  };

  const handleViewProjectDetails = async (projectId) => {
    setProjDetailError(null);
    setSelectedProject(null);
    setDonationError(null);
    setDonationSuccess(null);
    setDonationAmount(0);
    setWeb3Error('');
    setWeb3Status('IDLE');
    setUploadError(null);
    setUploadSuccess(null);
    setSelectedFile(null);
    setReleaseError(null);
    setReleaseSuccess(null);
    setImpactError(null);
    setImpactResult(null);

    try {
      const res = await getProjectDetails(projectId);
      if (res.ok) {
        setSelectedProject(res.data.project);
        const resDocs = await getProjectDocuments(projectId);
        if (resDocs.ok) {
          setProjectDocuments(resDocs.data.documents || []);
        }
        setView('project-details');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setProjDetailError(res.data.error?.message || 'Failed to load details');
      }
    } catch (err) {
      setProjDetailError('Server error loading details');
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    setUploadError(null);
    setUploadSuccess(null);

    if (!selectedFile) {
      setUploadError('Please select a file to upload');
      return;
    }

    try {
      const res = await uploadProjectDocument(selectedProject._id, selectedFile);
      if (res.ok) {
        setUploadSuccess('Document successfully pinned to IPFS!');
        setSelectedFile(null);
        const fileInput = document.getElementById('project-document-file-input');
        if (fileInput) fileInput.value = '';
        
        const resDocs = await getProjectDocuments(selectedProject._id);
        if (resDocs.ok) {
          setProjectDocuments(resDocs.data.documents || []);
        }
      } else {
        setUploadError(res.data.error?.message || 'Document upload failed');
      }
    } catch (err) {
      setUploadError('Server error uploading document');
    }
  };

  const handleFileDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      const res = await deleteProjectDocument(docId);
      if (res.ok) {
        const resDocs = await getProjectDocuments(selectedProject._id);
        if (resDocs.ok) {
          setProjectDocuments(resDocs.data.documents || []);
        }
      } else {
        alert(res.data.error?.message || 'Failed to delete document');
      }
    } catch (err) {
      alert('Server error deleting document');
    }
  };

  const handleImpactAnalysis = async (e) => {
    e.preventDefault();
    setImpactError(null);
    setImpactResult(null);
    setImpactLoading(true);

    if (!impactText.trim()) {
      setImpactError('Please provide report text for analysis');
      setImpactLoading(false);
      return;
    }

    try {
      const res = await analyseProjectImpact(selectedProject._id, impactText);
      if (res.ok && res.data.success) {
        setImpactResult(res.data.impactAnalysis);
        setImpactText('');
        const resUpdated = await getProjectDetails(selectedProject._id);
        if (resUpdated.ok) {
          setSelectedProject(resUpdated.data.project);
        }
      } else {
        setImpactError(res.data.error?.message || 'Impact analysis failed');
      }
    } catch (err) {
      setImpactError('Server error during impact analysis');
    } finally {
      setImpactLoading(false);
    }
  };

  const handleReleaseMilestone = async (milestoneIndex) => {
    setReleaseError(null);
    setReleaseSuccess(null);
    setReleaseLoading(true);

    try {
      if (window.ethereum) {
        setWeb3Status('CONNECTING');
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contractConfig = await import('./contract_config.json');
        const contract = new ethers.Contract(contractConfig.address, contractConfig.abi, signer);

        setWeb3Status('SIGNING');
        const tx = await contract.releaseMilestone(selectedProject.blockchainId || 0, milestoneIndex);
        setWeb3Status('PENDING');
        const txReceipt = await tx.wait();

        if (txReceipt.status !== 1) {
          throw new Error('On-chain milestone release failed');
        }
        setWeb3Status('SUCCESS');
      }

      const res = await releaseProjectMilestone(selectedProject._id, milestoneIndex);
      if (res.ok) {
        setReleaseSuccess(`Milestone ${milestoneIndex + 1} funds released from escrow successfully!`);
        const resUpdated = await getProjectDetails(selectedProject._id);
        if (resUpdated.ok) {
          setSelectedProject(resUpdated.data.project);
        }
      } else {
        setReleaseError(res.data.error?.message || 'Database update failed');
      }
    } catch (err) {
      if (err.code === 'ACTION_REJECTED' || (err.message && err.message.includes('rejected'))) {
        setReleaseError('Transaction rejected by user.');
      } else {
        setReleaseError('Release failed: ' + (err.reason || err.message));
      }
    } finally {
      setReleaseLoading(false);
      setWeb3Status('IDLE');
    }
  };

  const handleDonate = async (e) => {
    e.preventDefault();
    setDonationError(null);
    setDonationSuccess(null);
    setWeb3Error('');

    if (donationAmount <= 0) {
      setDonationError('Donation amount must be greater than zero');
      return;
    }

    if (!window.ethereum) {
      setDonationError('MetaMask extension is required to make blockchain contributions.');
      return;
    }

    let activeAddress = walletAddress;
    try {
      if (!activeAddress) {
        setWeb3Status('CONNECTING');
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        activeAddress = accounts[0];
        setWalletAddress(activeAddress);
      }
      
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (currentChainId !== '0x7a69' && currentChainId !== 31337 && currentChainId !== '31337') {
        setWrongNetwork(true);
        setDonationError('Wrong network: please connect MetaMask to the Hardhat network (Chain ID: 31337).');
        return;
      }
    } catch (err) {
      setWeb3Status('IDLE');
      setDonationError('Wallet connection rejected: ' + err.message);
      return;
    }

    const idempotencyKey = 'key_' + Math.random().toString(36).substring(2) + Date.now().toString(36);

    try {
      setWeb3Status('SIGNING');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const contractConfig = await import('./contract_config.json');
      const contract = new ethers.Contract(contractConfig.address, contractConfig.abi, signer);

      const txVal = ethers.parseEther(donationAmount.toString());
      const tx = await contract.donate(selectedProject.blockchainId || 0, {
        value: txVal,
      });

      setWeb3Status('PENDING');
      const txReceipt = await tx.wait();

      if (txReceipt.status !== 1) {
        throw new Error('On-chain transaction failed');
      }

      setWeb3Status('SUCCESS');
      const res = await donateToProject(selectedProject._id, Number(donationAmount), idempotencyKey, tx.hash);
      
      if (res.ok) {
        setDonationSuccess(`Contribution of ${donationAmount} ETH succeeded! Tx Hash: ${tx.hash.substring(0, 10)}...`);
        setDonationAmount(0);
        const resUpdated = await getProjectDetails(selectedProject._id);
        if (resUpdated.ok) {
          setSelectedProject(resUpdated.data.project);
        }
      } else {
        setDonationError(res.data.error?.message || 'Database registration failed');
      }
      setWeb3Status('IDLE');
    } catch (err) {
      setWeb3Status('IDLE');
      if (err.code === 'ACTION_REJECTED' || err.code === 4001 || (err.message && err.message.includes('rejected'))) {
        setDonationError('Transaction rejected by user.');
      } else if (err.code === 'INSUFFICIENT_FUNDS' || (err.message && err.message.includes('insufficient funds'))) {
        setDonationError('Transaction failed: Insufficient ETH in wallet.');
      } else {
        setDonationError('Transaction failed: ' + (err.reason || err.message));
      }
    }
  };

  // --- Admin Action Handlers ---
  const fetchAdminData = async () => {
    setAdminError(null);
    try {
      const resNgos = await adminGetNgos();
      const resProjs = await adminGetProjects();
      const resTxs = await adminGetTransactions();

      if (resNgos.ok && resProjs.ok && resTxs.ok) {
        setAdminNgos(resNgos.data.ngos || []);
        setAdminProjects(resProjs.data.projects || []);
        setAdminTransactions(resTxs.data.transactions || []);
      } else {
        setAdminError('Failed to fetch administrative data listings');
      }
    } catch (err) {
      setAdminError('Server error pulling admin logs');
    }
  };

  const handleVerifyNgo = async (ngoProfileId) => {
    try {
      const res = await adminVerifyNgo(ngoProfileId);
      if (res.ok) {
        fetchAdminData();
      } else {
        alert(res.data.error?.message || 'Verification failed');
      }
    } catch (err) {
      alert('Verification server error');
    }
  };

  const handleUpdateReview = async (transactionId, reviewStatus) => {
    try {
      const res = await adminUpdateTransactionReview(transactionId, reviewStatus);
      if (res.ok) {
        fetchAdminData();
      } else {
        alert(res.data.error?.message || 'Failed to update review status');
      }
    } catch (err) {
      alert('Server error updating review status');
    }
  };

  useEffect(() => {
    if (view === 'dashboard' && user) {
      if (user.role === 'NGO') fetchNgoData();
      else if (user.role === 'ADMIN') fetchAdminData();
      else if (user.role === 'DONOR') fetchDonorHistory();
    }
  }, [view, user]);

  // Filtered campaigns for Home view
  const filteredCampaigns = useMemo(() => {
    return activeProjects.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      if (campaignFilter === 'ACTIVE') {
        return p.status !== 'COMPLETED' && (p.raisedAmount || 0) < (p.targetAmount || 1);
      }
      if (campaignFilter === 'FUNDED') {
        return (p.raisedAmount || 0) >= (p.targetAmount || 1) && p.status !== 'COMPLETED';
      }
      if (campaignFilter === 'COMPLETED') {
        return p.status === 'COMPLETED';
      }
      return true;
    });
  }, [activeProjects, searchQuery, campaignFilter]);

  // Platform Metrics
  const totalRaisedSum = useMemo(() => {
    return activeProjects.reduce((acc, curr) => acc + (curr.raisedAmount || 0), 0);
  }, [activeProjects]);

  return (
    <div className="app-shell">
      {/* ==========================================
          PREMIUM NAVIGATION HEADER
          ========================================== */}
      <header className="nav-header">
        <div className="nav-inner">
          <div className="brand-wrapper" onClick={() => setView('home')}>
            <div className="brand-icon-box">🛡️</div>
            <div className="brand-title">
              <span>VeriFund</span>
              <span className="brand-badge">EVM & AI</span>
            </div>
          </div>

          <nav className="nav-actions">
            <button
              className={`nav-pill-btn ${view === 'home' ? 'active' : ''}`}
              onClick={() => setView('home')}
            >
              <span>🌐</span>
              <span>Home</span>
            </button>

            {!user ? (
              <>
                <button
                  className={`nav-pill-btn ${view === 'login' ? 'active' : ''}`}
                  onClick={() => setView('login')}
                >
                  <span>🔑</span>
                  <span>Login</span>
                </button>
                <button
                  className={`nav-pill-btn ${view === 'register' ? 'active' : ''}`}
                  onClick={() => setView('register')}
                >
                  <span>✨</span>
                  <span>Register</span>
                </button>
              </>
            ) : (
              <>
                <button
                  className={`nav-pill-btn ${view === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setView('dashboard')}
                >
                  <span>📊</span>
                  <span>Dashboard</span>
                </button>

                <div className="user-profile-pill">
                  <span>👤</span>
                  <span style={{ fontWeight: 600 }}>{user.name}</span>
                  <span className="user-role-badge">{user.role}</span>
                </div>

                <button
                  className="btn btn-sm btn-danger"
                  style={{ borderRadius: '20px', padding: '5px 12px', fontSize: '0.82rem' }}
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </>
            )}

            {/* Theme Toggle */}
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>

            {/* MetaMask Wallet Connect */}
            {window.ethereum && (
              <button
                className={`wallet-badge-btn ${wrongNetwork ? 'wallet-wrong' : walletAddress ? 'wallet-connected' : 'wallet-disconnected'}`}
                onClick={connectWallet}
                title={walletAddress ? `Connected: ${walletAddress}` : 'Connect MetaMask'}
              >
                <span style={{ fontSize: '12px' }}>
                  {wrongNetwork ? '⚠️' : walletAddress ? '🟢' : '🦊'}
                </span>
                <span>
                  {wrongNetwork
                    ? 'Wrong Network'
                    : walletAddress
                    ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}`
                    : 'Connect Wallet'}
                </span>
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* ==========================================
          MAIN APPLICATION CONTAINER
          ========================================== */}
      <main className="main-container">
        {/* Global Web3 Alert Notification */}
        {web3Error && (
          <div className="alert-banner alert-danger">
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <div>
              <strong>Web3 Protocol Alert:</strong> {web3Error}
            </div>
          </div>
        )}

        {/* ==========================================
            VIEW 1: HOME / LANDING VIEW
            ========================================== */}
        {view === 'home' && (
          <div>
            {/* Hero Section */}
            <section className="hero-banner">
              <div className="hero-tag">
                <span>✨</span>
                <span>Decentralized NGO Fund Governance & AI Verification</span>
              </div>
              <h1 className="hero-title">
                Transparent Philanthropy Powered by Smart Contracts & AI
              </h1>
              <p className="hero-subtitle">
                Guaranteed fund allocation through milestone-based cryptographic escrow on the Ethereum EVM, automated PyTorch Deep Neural Network fraud risk scoring, and spaCy NLP impact analysis.
              </p>

              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                {!user ? (
                  <>
                    <button className="btn btn-lg btn-primary" onClick={() => setView('register')}>
                      Create Account
                    </button>
                    <button className="btn btn-lg btn-secondary" onClick={() => setView('login')}>
                      Sign In to Platform
                    </button>
                  </>
                ) : (
                  <button className="btn btn-lg btn-primary" onClick={() => setView('dashboard')}>
                    Access {user.role} Dashboard →
                  </button>
                )}
              </div>
            </section>

            {/* Platform Stats Grid */}
            <div className="stat-grid">
              <div className="stat-card">
                <span className="stat-label">Active Campaigns</span>
                <span className="stat-value">{activeProjects.length}</span>
                <span className="stat-hint">✓ Live On-Chain</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Total Escrow Volume</span>
                <span className="stat-value">{totalRaisedSum.toFixed(2)} ETH</span>
                <span className="stat-hint">🛡️ Smart Contract Secured</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">AI Fraud Protection</span>
                <span className="stat-value">99.2%</span>
                <span className="stat-hint">🧠 PyTorch Deep MLP</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Decentralized Storage</span>
                <span className="stat-value">IPFS Pinata</span>
                <span className="stat-hint">📁 Cryptographic CIDs</span>
              </div>
            </div>

            {/* Campaign Directory Section */}
            <section style={{ marginTop: '48px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                    Explore Social Impact Campaigns
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '4px' }}>
                    Browse verified NGO initiatives and contribute directly via MetaMask with milestone escrow protection.
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="tab-nav" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
                  <button
                    className={`tab-btn ${campaignFilter === 'ALL' ? 'active' : ''}`}
                    onClick={() => setCampaignFilter('ALL')}
                  >
                    All ({activeProjects.length})
                  </button>
                  <button
                    className={`tab-btn ${campaignFilter === 'ACTIVE' ? 'active' : ''}`}
                    onClick={() => setCampaignFilter('ACTIVE')}
                  >
                    Active
                  </button>
                  <button
                    className={`tab-btn ${campaignFilter === 'FUNDED' ? 'active' : ''}`}
                    onClick={() => setCampaignFilter('FUNDED')}
                  >
                    Fully Funded
                  </button>
                  <button
                    className={`tab-btn ${campaignFilter === 'COMPLETED' ? 'active' : ''}`}
                    onClick={() => setCampaignFilter('COMPLETED')}
                  >
                    Completed
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div style={{ marginBottom: '24px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="🔍 Search campaigns by title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ maxWidth: '480px' }}
                />
              </div>

              {/* Campaign Cards Grid */}
              {filteredCampaigns.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📋</div>
                  <h3 className="empty-state-title">No campaigns match your filter</h3>
                  <p className="empty-state-desc">Try clearing your search query or switching to the "All" tab.</p>
                  <button className="btn btn-outline" onClick={() => { setCampaignFilter('ALL'); setSearchQuery(''); }}>
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="campaign-grid">
                  {filteredCampaigns.map(p => {
                    const pct = Math.min(100, Math.round(((p.raisedAmount || 0) / (p.targetAmount || 1)) * 100));
                    const isCompleted = p.status === 'COMPLETED';
                    const isFullyFunded = (p.raisedAmount || 0) >= (p.targetAmount || 0);

                    return (
                      <div key={p._id} className="campaign-card">
                        <div>
                          <div className="campaign-card-header">
                            <h3 className="campaign-card-title">{p.title}</h3>
                            <span className={`badge-pill ${isCompleted ? 'badge-success' : isFullyFunded ? 'badge-info' : 'badge-warning'}`}>
                              {isCompleted ? '✓ COMPLETED' : isFullyFunded ? '🎯 100% FUNDED' : '● ACTIVE'}
                            </span>
                          </div>
                          
                          <p className="campaign-card-desc">{p.description}</p>
                          
                          {/* Funding Progress */}
                          <div className="progress-wrapper">
                            <div className="progress-header">
                              <span>Raised: <strong>{p.raisedAmount} ETH</strong></span>
                              <span>Target: <strong>{p.targetAmount} ETH</strong></span>
                            </div>
                            <div className="progress-track">
                              <div
                                className={`progress-bar-fill ${isCompleted ? 'progress-bar-completed' : isFullyFunded ? 'progress-bar-funded' : ''}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                              <span>{pct}% Funded</span>
                              <span>On-Chain ID: #{p.blockchainId || 0}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          className="btn btn-primary"
                          style={{ width: '100%', marginTop: '12px' }}
                          onClick={() => handleViewProjectDetails(p._id)}
                        >
                          View Campaign Details →
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* System Health Diagnostics Section */}
            <section style={{ marginTop: '64px' }}>
              <div className="premium-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Live Microservice & Blockchain Telemetry
                    </h3>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      Real-time health telemetry across the 5 architectural tiers.
                    </p>
                  </div>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={fetchHealthStatus}
                    disabled={healthLoading}
                  >
                    {healthLoading ? 'Checking...' : '🔄 Refresh Health'}
                  </button>
                </div>

                {healthLoading && (
                  <div className="alert-banner alert-warning">
                    <span className="pulse-dot online" style={{ background: '#F5B036' }}></span>
                    <span>Querying microservices status...</span>
                  </div>
                )}

                {healthError && (
                  <div className="alert-banner alert-danger">
                    <span>⚠️</span>
                    <span>{healthError}</span>
                  </div>
                )}

                {healthInfo && (
                  <div className="health-grid">
                    <div className="health-tile">
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                          Express API
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Node.js Gateway
                        </div>
                      </div>
                      <span className={`pulse-dot ${healthInfo.services?.backend === 'UP' ? 'online' : 'offline'}`} />
                    </div>

                    <div className="health-tile">
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                          Persistence
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          MongoDB Atlas
                        </div>
                      </div>
                      <span className={`pulse-dot ${healthInfo.services?.database === 'UP' ? 'online' : 'offline'}`} />
                    </div>

                    <div className="health-tile">
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                          Blockchain
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Hardhat EVM Node
                        </div>
                      </div>
                      <span className="pulse-dot online" />
                    </div>

                    <div className="health-tile">
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                          AI Engine
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          PyTorch Deep Neural Net
                        </div>
                      </div>
                      <span className="pulse-dot online" />
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ==========================================
            VIEW 2: PROJECT DETAILS VIEW
            ========================================== */}
        {view === 'project-details' && selectedProject && (
          <div>
            {/* Breadcrumb Navigation */}
            <div style={{ marginBottom: '20px' }}>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setView(user ? 'dashboard' : 'home')}
              >
                ← Back to {user ? 'Dashboard' : 'Campaigns'}
              </button>
            </div>

            {/* Campaign Header Card */}
            <div className="premium-card" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span className="hash-pill">EVM Campaign #{selectedProject.blockchainId || 0}</span>
                    <span className={`badge-pill ${selectedProject.status === 'COMPLETED' ? 'badge-success' : selectedProject.raisedAmount >= selectedProject.targetAmount ? 'badge-info' : 'badge-warning'}`}>
                      {selectedProject.status === 'COMPLETED' ? '✓ COMPLETED' : selectedProject.raisedAmount >= selectedProject.targetAmount ? '🎯 FULLY FUNDED' : '● ACTIVE'}
                    </span>
                  </div>
                  <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    {selectedProject.title}
                  </h1>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Target Budget
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-blue)' }}>
                    {selectedProject.targetAmount} ETH
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '1.02rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
                {selectedProject.description}
              </p>

              {/* Progress Bar in Details */}
              <div className="progress-wrapper">
                <div className="progress-header">
                  <span>Raised in Escrow: <strong>{selectedProject.raisedAmount} ETH</strong></span>
                  <span>Goal: <strong>{selectedProject.targetAmount} ETH</strong> ({Math.min(100, Math.round(((selectedProject.raisedAmount || 0) / (selectedProject.targetAmount || 1)) * 100))}%)</span>
                </div>
                <div className="progress-track" style={{ height: '12px' }}>
                  <div
                    className={`progress-bar-fill ${selectedProject.status === 'COMPLETED' ? 'progress-bar-completed' : selectedProject.raisedAmount >= selectedProject.targetAmount ? 'progress-bar-funded' : ''}`}
                    style={{ width: `${Math.min(100, Math.round(((selectedProject.raisedAmount || 0) / (selectedProject.targetAmount || 1)) * 100))}%` }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Campaign Timeline</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                    {new Date(selectedProject.startDate).toLocaleDateString()} – {new Date(selectedProject.endDate).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Smart Contract Address</span>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem', color: 'var(--primary-blue)', fontWeight: 600 }}>
                    0x5FbDB...80aa3
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Escrow Mechanism</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                    Multi-Milestone Tranches
                  </div>
                </div>
              </div>
            </div>

            {/* Donation Box (For Donors) */}
            {user && user.role === 'DONOR' && (
              <div className="premium-card" style={{ marginBottom: '24px', background: 'var(--bg-surface-secondary)' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  💎 Contribute to this Campaign
                </h3>

                {selectedProject.status === 'COMPLETED' ? (
                  <div className="alert-banner alert-success">
                    <span>✅</span>
                    <div>
                      <strong>Project Completed:</strong> All milestone tranches have been successfully verified by AI and disbursed from escrow to the NGO. Thank you to all supporters!
                    </div>
                  </div>
                ) : selectedProject.raisedAmount >= selectedProject.targetAmount ? (
                  <div className="alert-banner alert-info">
                    <span>🎯</span>
                    <div>
                      <strong>Funding Goal Reached (100%):</strong> Further contributions are paused as the NGO executes the funded milestone deliverables.
                    </div>
                  </div>
                ) : selectedProject.status === 'ACTIVE' ? (
                  <div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                      Your donation will be deposited directly into the smart contract escrow and released only upon verified milestone completion.
                    </p>

                    {donationError && <div className="alert-banner alert-danger">{donationError}</div>}
                    {donationSuccess && <div className="alert-banner alert-success">{donationSuccess}</div>}

                    {web3Status !== 'IDLE' && (
                      <div className="alert-banner alert-info">
                        <span className="pulse-dot online" />
                        <div>
                          <strong>Web3 Status: </strong>
                          {web3Status === 'CONNECTING' && 'Connecting to MetaMask...'}
                          {web3Status === 'SIGNING' && 'Awaiting transaction signature on MetaMask...'}
                          {web3Status === 'PENDING' && 'Mining transaction on blockchain network...'}
                          {web3Status === 'SUCCESS' && 'Transaction mined! Updating decentralized ledger...'}
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleDonate} style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div className="form-group" style={{ flex: '1', minWidth: '220px', marginBottom: 0 }}>
                        <label className="form-label">Contribution Amount (ETH)</label>
                        <input
                          type="number"
                          step="any"
                          className="form-control"
                          value={donationAmount}
                          onChange={(e) => setDonationAmount(e.target.value)}
                          required
                          min="0.0001"
                          placeholder="e.g. 0.5"
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={web3Status === 'SIGNING' || web3Status === 'PENDING'}
                        style={{ height: '42px' }}
                      >
                        {walletAddress ? '🦊 Send ETH Contribution' : 'Connect Wallet & Donate'}
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            )}

            {/* Linked NGO Profile Card */}
            <div className="premium-card" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  🏛️ Linked NGO Organization
                </h3>
                <span className={`badge-pill ${selectedProject.ngoDetails?.verified ? 'badge-success' : 'badge-danger'}`}>
                  {selectedProject.ngoDetails?.verified ? '✓ Verified Entity' : '⚠️ Pending Verification'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Organization Name</span>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedProject.ngoDetails?.name || 'N/A'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Govt Registration Number</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {selectedProject.ngoDetails?.registrationNumber || 'N/A'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Payout Wallet Address</span>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.82rem', color: 'var(--primary-blue)' }}>
                    {selectedProject.ngoDetails?.walletAddress || 'N/A'}
                  </div>
                </div>
              </div>

              {selectedProject.ngoDetails?.description && (
                <p style={{ marginTop: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  {selectedProject.ngoDetails.description}
                </p>
              )}
            </div>

            {/* Milestone Escrow Tranches Table */}
            <div className="premium-card" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    📑 Milestone Tranches & Escrow Releases
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    Funds are released in tranches as milestone deliverables are submitted and reviewed.
                  </p>
                </div>
              </div>

              {releaseError && <div className="alert-banner alert-danger">{releaseError}</div>}
              {releaseSuccess && <div className="alert-banner alert-success">{releaseSuccess}</div>}

              <div className="table-responsive">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>Order</th>
                      <th>Milestone Title</th>
                      <th>Description</th>
                      <th style={{ textAlign: 'right' }}>Allocation</th>
                      <th style={{ textAlign: 'center' }}>Escrow Status</th>
                      {user && user.role === 'ADMIN' && <th style={{ textAlign: 'center' }}>Admin Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProject.milestones?.map((m, idx) => (
                      <tr key={m._id || idx}>
                        <td style={{ fontWeight: 700 }}>#{m.order || idx + 1}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.title}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{m.description}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-blue)' }}>
                          {m.amount} ETH
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge-pill ${m.status === 'RELEASED' ? 'badge-success' : 'badge-warning'}`}>
                            {m.status === 'RELEASED' ? '✓ RELEASED' : '🔒 IN ESCROW'}
                          </span>
                        </td>
                        {user && user.role === 'ADMIN' && (
                          <td style={{ textAlign: 'center' }}>
                            {m.status !== 'RELEASED' ? (
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => handleReleaseMilestone(idx)}
                                disabled={releaseLoading}
                              >
                                {releaseLoading ? 'Releasing...' : '🔓 Release Tranche'}
                              </button>
                            ) : (
                              <span style={{ color: 'var(--status-success)', fontSize: '0.85rem', fontWeight: 700 }}>
                                ✓ Disbursed to NGO
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* IPFS Supporting Documents Locker */}
            <div className="premium-card" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    📂 IPFS Decentralized Document Locker
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    Immutable project documentation and proofs pinned to the IPFS decentralized network.
                  </p>
                </div>
              </div>

              {/* Upload panel only for project's NGO owner */}
              {user && user.role === 'NGO' && selectedProject.ngoId === user._id && (
                <div style={{ background: 'var(--bg-surface-secondary)', border: '1px dashed var(--border-medium)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    Upload Milestone Proof (PDF / Images)
                  </h4>
                  {uploadError && <div className="alert-banner alert-danger">{uploadError}</div>}
                  {uploadSuccess && <div className="alert-banner alert-success">{uploadSuccess}</div>}

                  <form onSubmit={handleFileUpload} style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="file"
                      id="project-document-file-input"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                      required
                      accept=".pdf,image/png,image/jpeg,image/jpg"
                      className="form-control"
                      style={{ maxWidth: '320px' }}
                    />
                    <button type="submit" className="btn btn-primary">
                      📤 Pin to IPFS
                    </button>
                  </form>
                </div>
              )}

              {/* Document Lists Table */}
              {projectDocuments.length === 0 ? (
                <div className="empty-state" style={{ padding: '32px' }}>
                  <p style={{ margin: 0, fontStyle: 'italic' }}>No supporting documents uploaded for this campaign yet.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>File Name</th>
                        <th>Type</th>
                        <th style={{ textAlign: 'center' }}>IPFS CID Hash</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectDocuments.map(doc => {
                        const isOwner = user && (
                          doc.uploadedBy === user._id || 
                          doc.uploadedBy?._id === user._id || 
                          doc.uploadedBy?.toString() === user._id?.toString()
                        );
                        return (
                          <tr key={doc._id}>
                            <td style={{ fontWeight: 600 }}>{doc.fileName}</td>
                            <td><span className="badge-pill badge-neutral">{doc.mimeType}</span></td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="hash-pill">{doc.ipfsCid}</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <a
                                  href={`http://localhost:5000/api/documents/${doc.ipfsCid}/download`}
                                  download
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-sm btn-outline"
                                >
                                  ⬇️ Download
                                </a>
                                {isOwner && (
                                  <button
                                    onClick={() => handleFileDelete(doc._id)}
                                    className="btn btn-sm btn-danger"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* AI-Assisted Impact Analysis Section */}
            <div className="premium-card">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                🤖 AI-Assisted Social Impact Analysis (spaCy NLP)
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                NLP model evaluates project execution reports, completeness, and measurable social impact metrics.
              </p>

              {/* Show existing analysis result if available */}
              {selectedProject.impactAnalysis?.impactLevel && (
                <div style={{ background: 'var(--bg-surface-secondary)', borderRadius: '12px', border: '1px solid var(--border-medium)', padding: '20px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      Latest Evaluation Summary
                    </h4>
                    <span className={`badge-pill ${selectedProject.impactAnalysis.impactLevel === 'HIGH' ? 'badge-success' : selectedProject.impactAnalysis.impactLevel === 'MEDIUM' ? 'badge-warning' : 'badge-danger'}`}>
                      {selectedProject.impactAnalysis.impactLevel} IMPACT
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                    <div className="stat-card" style={{ padding: '14px' }}>
                      <span className="stat-label">Impact Score</span>
                      <span className="stat-value" style={{ fontSize: '1.4rem' }}>{selectedProject.impactAnalysis.impactScore} / 10</span>
                    </div>
                    <div className="stat-card" style={{ padding: '14px' }}>
                      <span className="stat-label">Completeness</span>
                      <span className="stat-value" style={{ fontSize: '1.4rem' }}>{(selectedProject.impactAnalysis.completenessScore * 100).toFixed(0)}%</span>
                    </div>
                    <div className="stat-card" style={{ padding: '14px' }}>
                      <span className="stat-label">Confidence</span>
                      <span className="stat-value" style={{ fontSize: '1.4rem' }}>{(selectedProject.impactAnalysis.confidenceScore * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                    <strong>Generated Summary:</strong> {selectedProject.impactAnalysis.generatedSummary}
                  </p>

                  {selectedProject.impactAnalysis.limitations?.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Noted Limitations:</strong>
                      <ul style={{ margin: '6px 0 0 20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {selectedProject.impactAnalysis.limitations.map((l, i) => <li key={i}>{l}</li>)}
                      </ul>
                    </div>
                  )}

                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '14px' }}>
                    {selectedProject.impactAnalysis.disclaimer || 'This is an AI-assisted assessment and does not objectively replace on-ground auditing.'}
                  </p>
                </div>
              )}

              {/* NGO owner can submit report text for analysis */}
              {user && user.role === 'NGO' && selectedProject.ngoId === user._id && (
                <div style={{ background: 'var(--bg-surface-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Submit Execution Report for AI Analysis
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                    Paste your milestone delivery report. The spaCy NLP pipeline will extract indicators and score progress.
                  </p>

                  {impactError && <div className="alert-banner alert-danger">{impactError}</div>}

                  <form onSubmit={handleImpactAnalysis}>
                    <textarea
                      value={impactText}
                      onChange={(e) => setImpactText(e.target.value)}
                      placeholder="Enter detailed execution report, metrics achieved, beneficiaries reached..."
                      required
                      className="form-textarea"
                    />
                    <button type="submit" className="btn btn-primary" disabled={impactLoading} style={{ marginTop: '12px' }}>
                      {impactLoading ? 'Analysing with NLP Model...' : '🚀 Run AI Impact Analysis'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            VIEW 3: REGISTER VIEW
            ========================================== */}
        {view === 'register' && (
          <div style={{ maxWidth: '440px', margin: '40px auto' }}>
            <div className="premium-card">
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🛡️</div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  Create an Account
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  Join the decentralized NGO governance platform.
                </p>
              </div>

              {regError && <div className="alert-banner alert-danger">{regError}</div>}
              {regSuccess && <div className="alert-banner alert-success">{regSuccess}</div>}

              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Jane Doe or Organization Name"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="jane@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password (min 8 characters)</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Account Role</label>
                  <select
                    className="form-select"
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                  >
                    <option value="DONOR">Donor (Fund campaigns & track impact)</option>
                    <option value="NGO">NGO (Create campaigns & receive escrow releases)</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                  Create Account →
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Already have an account?{' '}
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); setView('login'); }}
                  style={{ color: 'var(--primary-blue)', fontWeight: 600, textDecoration: 'none' }}
                >
                  Sign In
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            VIEW 4: LOGIN VIEW
            ========================================== */}
        {view === 'login' && (
          <div style={{ maxWidth: '440px', margin: '40px auto' }}>
            <div className="premium-card">
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🔐</div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  Sign In to VeriFund
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  Access your role dashboard and Web3 credentials.
                </p>
              </div>

              {loginError && <div className="alert-banner alert-danger">{loginError}</div>}

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="user@test.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                  Sign In →
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Don't have an account yet?{' '}
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); setView('register'); }}
                  style={{ color: 'var(--primary-blue)', fontWeight: 600, textDecoration: 'none' }}
                >
                  Register now
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            VIEW 5: ROLE-BASED DASHBOARD VIEW
            ========================================== */}
        {view === 'dashboard' && user && (
          <div>
            {/* Dashboard Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
              <div>
                <span className="badge-pill badge-info" style={{ marginBottom: '8px' }}>
                  {user.role} Workspace
                </span>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  Welcome back, {user.name}
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
                  Logged in as {user.email} • {user.role === 'ADMIN' ? 'System Administrator' : user.role === 'NGO' ? 'NGO Campaign Manager' : 'Verified Donor'}
                </p>
              </div>

              {user.role === 'DONOR' && (
                <button className="btn btn-primary" onClick={() => setView('home')}>
                  Browse Active Campaigns →
                </button>
              )}
            </div>

            {/* --- 5A: DONOR DASHBOARD --- */}
            {user.role === 'DONOR' && (
              <div>
                <div className="stat-grid" style={{ marginBottom: '32px' }}>
                  <div className="stat-card">
                    <span className="stat-label">Contributions Made</span>
                    <span className="stat-value">{donationHistory.length}</span>
                    <span className="stat-hint">✓ Recorded On-Chain</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Total Donated</span>
                    <span className="stat-value">
                      {donationHistory.reduce((acc, curr) => acc + (curr.amount || 0), 0).toFixed(2)} ETH
                    </span>
                    <span className="stat-hint">🛡️ Smart Contract Escrow</span>
                  </div>
                </div>

                <div className="premium-card">
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    📜 My Contribution Ledger
                  </h3>

                  {donationHistory.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">🎁</div>
                      <h4 className="empty-state-title">No contributions recorded yet</h4>
                      <p className="empty-state-desc">Explore campaigns and make your first transparent donation.</p>
                      <button className="btn btn-primary" onClick={() => setView('home')}>
                        Explore Campaigns
                      </button>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="premium-table">
                        <thead>
                          <tr>
                            <th>Campaign Project</th>
                            <th style={{ textAlign: 'right' }}>Amount</th>
                            <th style={{ textAlign: 'center' }}>Blockchain Tx</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {donationHistory.map(d => (
                            <tr key={d._id}>
                              <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {d.projectId?.title || 'Unknown Project'}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-blue)' }}>
                                {d.amount} ETH
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {d.transactionHash ? (
                                  <button
                                    className="btn btn-sm btn-outline"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      alert(`Blockchain Transaction Audit Record:\n\nTx Hash: ${d.transactionHash}\nBlock Number: ${d.blockNumber}\nFrom Address: ${d.fromAddress}\nContract Address: ${d.toAddress}\nGas Used: ${d.gasUsed}`);
                                    }}
                                  >
                                    🔍 Query Tx Receipt
                                  </button>
                                ) : <span style={{ color: 'var(--text-muted)' }}>N/A</span>}
                              </td>
                              <td style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                                {new Date(d.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- 5B: NGO DASHBOARD --- */}
            {user.role === 'NGO' && (
              <div>
                {/* Profile Overview Card */}
                <div className="premium-card" style={{ marginBottom: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      🏛️ NGO Organization Profile
                    </h3>
                    {!isEditingProfile && (
                      <button className="btn btn-sm btn-outline" onClick={() => setIsEditingProfile(true)}>
                        ✏️ Edit Profile
                      </button>
                    )}
                  </div>

                  {ngoProfileError && <div className="alert-banner alert-danger">{ngoProfileError}</div>}

                  {!isEditingProfile ? (
                    ngoProfile ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Organization Name</span>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{ngoProfile.name}</div>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Registration Number</span>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ngoProfile.registrationNumber}</div>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Verification Status</span>
                          <div>
                            <span className={`badge-pill ${ngoProfile.verified ? 'badge-success' : 'badge-warning'}`}>
                              {ngoProfile.verified ? '✓ Verified Entity' : '⚠️ Pending Admin Verification'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Payout Wallet Address</span>
                          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.82rem', color: 'var(--primary-blue)' }}>
                            {ngoProfile.walletAddress || 'No wallet address configured'}
                          </div>
                        </div>
                      </div>
                    ) : <p>Loading profile...</p>
                  ) : (
                    <form onSubmit={handleUpdateNgoProfile}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                        <div className="form-group">
                          <label className="form-label">Organization Name</label>
                          <input type="text" className="form-control" value={editNgoName} onChange={(e) => setEditNgoName(e.target.value)} required />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Registration Number</label>
                          <input type="text" className="form-control" value={editNgoReg} onChange={(e) => setEditNgoReg(e.target.value)} required />
                        </div>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                          <label className="form-label">Organization Description</label>
                          <textarea className="form-textarea" value={editNgoDesc} onChange={(e) => setEditNgoDesc(e.target.value)} />
                        </div>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                          <label className="form-label">Payout Wallet Address (Receives Escrow Releases)</label>
                          <input type="text" className="form-control" value={editNgoWallet} onChange={(e) => setEditNgoWallet(e.target.value)} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                        <button type="submit" className="btn btn-primary">Save Changes</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setIsEditingProfile(false)}>Cancel</button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Aggregate Contribution Metric */}
                <div className="stat-grid" style={{ marginBottom: '28px' }}>
                  <div className="stat-card">
                    <span className="stat-label">Total Contributions Received</span>
                    <span className="stat-value">{ngoTotalReceived} ETH</span>
                    <span className="stat-hint">💰 Gross Platform Support</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Our Campaigns</span>
                    <span className="stat-value">{ngoProjects.length}</span>
                    <span className="stat-hint">📋 Smart Contract Registered</span>
                  </div>
                </div>

                {/* Campaign Creator & List */}
                <div className="premium-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      📋 Our Campaigns
                    </h3>
                    <button className="btn btn-primary" onClick={() => setIsCreatingProject(!isCreatingProject)}>
                      {isCreatingProject ? 'Cancel Campaign Creation' : '➕ Create New Campaign'}
                    </button>
                  </div>

                  {/* Campaign Creation Wizard */}
                  {isCreatingProject && (
                    <div style={{ background: 'var(--bg-surface-secondary)', border: '1px solid var(--border-medium)', borderRadius: '12px', padding: '24px', marginBottom: '28px' }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                        🚀 Register Campaign on Ethereum Blockchain
                      </h4>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        This action will call `createProject()` on the smart contract and synchronize details to MongoDB.
                      </p>

                      {projError && <div className="alert-banner alert-danger">{projError}</div>}

                      {web3Status !== 'IDLE' && (
                        <div className="alert-banner alert-info">
                          <span className="pulse-dot online" />
                          <div>
                            <strong>Web3 Status: </strong>
                            {web3Status === 'CONNECTING' && 'Connecting to MetaMask...'}
                            {web3Status === 'SIGNING' && 'Awaiting transaction signature on MetaMask...'}
                            {web3Status === 'PENDING' && 'Deploying campaign to Ethereum Blockchain...'}
                            {web3Status === 'SUCCESS' && 'Transaction confirmed! Syncing database record...'}
                          </div>
                        </div>
                      )}

                      <form onSubmit={handleCreateProject}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Campaign Title</label>
                            <input type="text" className="form-control" value={projTitle} onChange={(e) => setProjTitle(e.target.value)} required placeholder="e.g. Clean Water Wells in Rural Region" />
                          </div>

                          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Campaign Description</label>
                            <textarea className="form-textarea" value={projDesc} onChange={(e) => setProjDesc(e.target.value)} required placeholder="Describe objectives and timeline..." />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Funding Target (ETH)</label>
                            <input type="number" step="any" className="form-control" value={projTarget} onChange={(e) => setProjTarget(e.target.value)} required placeholder="e.g. 5" />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Initial Status</label>
                            <select className="form-select" value={projStatus} onChange={(e) => setProjStatus(e.target.value)}>
                              <option value="DRAFT">Draft</option>
                              <option value="ACTIVE">Active</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label className="form-label">Start Date</label>
                            <input type="date" className="form-control" value={projStart} onChange={(e) => setProjStart(e.target.value)} required />
                          </div>

                          <div className="form-group">
                            <label className="form-label">End Date</label>
                            <input type="date" className="form-control" value={projEnd} onChange={(e) => setProjEnd(e.target.value)} required />
                          </div>
                        </div>

                        {/* Milestone Builder */}
                        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '18px', marginTop: '16px' }}>
                          <h5 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                            Milestone Tranche Allocations (Sum must equal target amount)
                          </h5>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                            <input type="text" placeholder="Milestone Title" className="form-control" value={msTitle} onChange={(e) => setMsTitle(e.target.value)} />
                            <input type="text" placeholder="Description" className="form-control" value={msDesc} onChange={(e) => setMsDesc(e.target.value)} />
                            <input type="number" step="any" placeholder="ETH Allocation" className="form-control" value={msAmount} onChange={(e) => setMsAmount(e.target.value)} />
                            <button type="button" className="btn btn-secondary" onClick={addMilestone}>
                              ➕ Add Milestone
                            </button>
                          </div>

                          {projMilestones.length > 0 && (
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                              {projMilestones.map((m, idx) => (
                                <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-surface-secondary)', borderRadius: '6px', marginBottom: '6px' }}>
                                  <span>
                                    <strong>#{m.order}: {m.title}</strong> — {m.amount} ETH (<em>{m.description}</em>)
                                  </span>
                                  <button type="button" className="btn btn-sm btn-danger" onClick={() => removeMilestone(idx)}>
                                    Remove
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={web3Status === 'SIGNING' || web3Status === 'PENDING'}
                          style={{ marginTop: '20px' }}
                        >
                          {walletAddress ? '🚀 Deploy Campaign On-Chain' : 'Connect Wallet & Deploy'}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* NGO Campaigns Table */}
                  {ngoProjects.length === 0 ? (
                    <div className="empty-state">
                      <p>You have not created any campaigns yet.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="premium-table">
                        <thead>
                          <tr>
                            <th>Campaign</th>
                            <th style={{ textAlign: 'right' }}>Target</th>
                            <th style={{ textAlign: 'right' }}>Raised</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'center' }}>Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ngoProjects.map(p => (
                            <tr key={p._id}>
                              <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.title}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700 }}>{p.targetAmount} ETH</td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-blue)' }}>{p.raisedAmount} ETH</td>
                              <td>
                                <span className={`badge-pill ${p.status === 'COMPLETED' ? 'badge-success' : p.status === 'ACTIVE' ? 'badge-info' : 'badge-warning'}`}>
                                  {p.status}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button className="btn btn-sm btn-outline" onClick={() => handleViewProjectDetails(p._id)}>
                                  Manage →
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- 5C: ADMIN DASHBOARD --- */}
            {user.role === 'ADMIN' && (
              <div>
                {adminError && <div className="alert-banner alert-danger">{adminError}</div>}

                {/* NGO Verification Section */}
                <div className="premium-card" style={{ marginBottom: '28px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    🏛️ NGO Organization Verification Queue
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Audit tax exemption registrations and grant verified entity status.
                  </p>

                  <div className="table-responsive">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>NGO Organization</th>
                          <th>Reg Number</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminNgos.map(ngo => (
                          <tr key={ngo._id}>
                            <td style={{ fontWeight: 600 }}>{ngo.name || ngo.organizationName || ngo.userId?.name || 'NGO Entity'}</td>
                            <td style={{ fontFamily: 'JetBrains Mono' }}>{ngo.registrationNumber}</td>
                            <td>
                              <span className={`badge-pill ${ngo.verified ? 'badge-success' : 'badge-warning'}`}>
                                {ngo.verified ? '✓ Verified' : '⚠️ Pending'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {!ngo.verified && (
                                <button className="btn btn-sm btn-success" onClick={() => handleVerifyNgo(ngo._id)}>
                                  ✓ Verify Entity
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Global Transaction Audit Ledger with AI Neural Network Risk */}
                <div className="premium-card" style={{ marginBottom: '28px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    🧠 Deep Neural Network Fraud Risk & Transaction Audit
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Automated PyTorch Deep MLP risk scoring with Focal Loss & Zero-Day Anomaly Detection.
                  </p>

                  <div className="table-responsive">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>Donor</th>
                          <th>Campaign</th>
                          <th style={{ textAlign: 'right' }}>Amount</th>
                          <th style={{ textAlign: 'center' }}>AI Risk Level</th>
                          <th style={{ textAlign: 'center' }}>Review Status</th>
                          <th style={{ textAlign: 'center' }}>Blockchain Audit</th>
                          <th style={{ textAlign: 'center' }}>Admin Action</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminTransactions.map(tx => {
                          const risk = tx.aiAssessment?.riskLevel;
                          const riskColors = { LOW: 'badge-success', MEDIUM: 'badge-warning', HIGH: 'badge-danger' };
                          return (
                            <tr key={tx._id}>
                              <td style={{ fontWeight: 600 }}>{tx.donorId?.name || 'Anonymous'}</td>
                              <td>{tx.projectId?.title || 'Unknown'}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-blue)' }}>{tx.amount} ETH</td>
                              <td style={{ textAlign: 'center' }}>
                                {risk ? (
                                  <span className={`badge-pill ${riskColors[risk]}`}>
                                    {risk === 'LOW' ? '🟢 LOW' : risk === 'MEDIUM' ? '🟡 MEDIUM' : '🔴 HIGH'}
                                  </span>
                                ) : <span style={{ color: 'var(--text-muted)' }}>N/A</span>}
                                {tx.aiAssessment?.probability != null && (
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    Score: {(tx.aiAssessment.probability * 100).toFixed(1)}%
                                  </div>
                                )}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span className={`badge-pill ${tx.reviewStatus === 'CLEARED' ? 'badge-success' : tx.reviewStatus === 'ESCALATED' ? 'badge-danger' : 'badge-warning'}`}>
                                  {tx.reviewStatus || 'PENDING'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {tx.transactionHash ? (
                                  <button
                                    className="btn btn-sm btn-outline"
                                    onClick={() => alert(`Admin Audit Record:\n\nTx Hash: ${tx.transactionHash}\nBlock Number: ${tx.blockNumber}\nFrom Address: ${tx.fromAddress}\nTo Address: ${tx.toAddress}\nGas Used: ${tx.gasUsed}`)}
                                  >
                                    🔍 Tx Receipt
                                  </button>
                                ) : 'N/A'}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <select
                                  defaultValue=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleUpdateReview(tx._id, e.target.value);
                                      e.target.value = '';
                                    }
                                  }}
                                  className="form-select"
                                  style={{ padding: '4px 8px', fontSize: '0.82rem' }}
                                >
                                  <option value="" disabled>Set Status...</option>
                                  <option value="UNDER_REVIEW">Under Review</option>
                                  <option value="CLEARED">Cleared</option>
                                  <option value="ESCALATED">Escalated</option>
                                </select>
                              </td>
                              <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {new Date(tx.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Global Projects Log */}
                <div className="premium-card">
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    🌐 Global Projects Directory
                  </h3>

                  <div className="table-responsive">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>Campaign Title</th>
                          <th style={{ textAlign: 'right' }}>Target</th>
                          <th style={{ textAlign: 'right' }}>Raised</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'center' }}>AI Impact Assessment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminProjects.map(p => {
                          const il = p.impactAnalysis?.impactLevel;
                          return (
                            <tr key={p._id}>
                              <td style={{ fontWeight: 600 }}>{p.title}</td>
                              <td style={{ textAlign: 'right' }}>{p.targetAmount} ETH</td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-blue)' }}>{p.raisedAmount} ETH</td>
                              <td>
                                <span className={`badge-pill ${p.status === 'COMPLETED' ? 'badge-success' : p.status === 'ACTIVE' ? 'badge-info' : 'badge-warning'}`}>
                                  {p.status}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {il ? (
                                  <span className={`badge-pill ${il === 'HIGH' ? 'badge-success' : il === 'MEDIUM' ? 'badge-warning' : 'badge-danger'}`}>
                                    {il} IMPACT
                                  </span>
                                ) : <span style={{ color: 'var(--text-muted)' }}>Not Analysed</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating AI Copilot Chatbot Widget */}
      <ChatbotWidget theme={theme} onSelectProject={handleViewProjectDetails} />
    </div>
  );
}

export default App;


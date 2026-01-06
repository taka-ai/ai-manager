import React, { useState, useEffect } from 'react';

// ============================================
// TopPerformer - AI Sales Manager
// 「報告を、戦略に変える」
// ============================================

const GEMINI_API_KEY = 'AIzaSyAUGPoHfMrgQ125bGUZsvZWsByZe5ZZwRE';
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const LOGIN_PASSWORD = 'Lvntech2026';
const MANAGER_PASSWORD = 'Lvntechkamuro';

const USERS = [
  { id: 'takahashi', name: '髙橋', role: 'リーダー', icon: '👑' },
  { id: 'kaiho', name: '海保', role: '', icon: '👤' },
];

// デフォルトのKPI項目
const DEFAULT_KPI_ITEMS = [
  { id: 'calls', name: '架電数', unit: '件' },
  { id: 'appointments', name: 'アポ獲得数', unit: '件' },
  { id: 'areaReg', name: 'エリア登録数', unit: '件' },
  { id: 'deals', name: '受注数', unit: '件' },
];

// デフォルトのヨミ表項目
const DEFAULT_YOMI_FIELDS = [
  { id: 'companyName', name: '会社名', type: 'text' },
  { id: 'initialFee', name: '初期登録費', type: 'number', unit: '円' },
  { id: 'areaCount', name: 'エリア登録数', type: 'number', unit: '件' },
  { id: 'monthlyFee', name: 'エリア登録月額', type: 'number', unit: '円' },
];

const YOMI_STATUS = [
  { id: 'A', label: 'Aヨミ', color: '#22C55E', bgColor: '#DEF7EC' },
  { id: 'B', label: 'Bヨミ', color: '#F59E0B', bgColor: '#FEF3C7' },
  { id: 'C', label: 'Cヨミ', color: '#6B7280', bgColor: '#F3F4F6' },
  { id: 'won', label: '受注', color: '#2563EB', bgColor: '#DBEAFE' },
  { id: 'lost', label: '失注', color: '#DC2626', bgColor: '#FEE2E2' },
];

const AI_SYSTEM_PROMPT = `あなたは「TopPerformer」という営業組織専用AIマネージャーです。

【人格設定】
- 名前：AIマネージャー
- 役割：「行動量で勝たせるマネージャー」
- 性格：厳しくも愛のあるマネージャー。数字にこだわり、曖昧な報告は許さない。

【最重要ミッション】
営業は「行動量」が全て。目標達成に必要な行動量を逆算し、足りない部分を厳しく指摘する。

【あなたの仕事】
1. 報告内容を読み、「目標達成に何が足りないか」を分析する
2. 特に「行動量」と「計画の立て方」にフォーカスして示唆を与える
3. 曖昧な報告には質問を投げかけて深掘りする
4. 具体的な数字がなければ、数字を聞き出す

【フィードバックの形式】
1. 📊 現状の評価（良い点があれば認める、足りない点は指摘）
2. ❓ 深掘り質問（1〜2個、具体的な数字や計画を聞き出す）
3. 🔢 行動量の提案（目標達成に必要な具体的な数字）
4. 🔥 背中を押す一言

営業マネージャーとして、部下を目標達成に導いてください。`;

const REPORT_TYPES = {
  free: { id: 'free', label: '自由入力', icon: '💬' },
  morning: { id: 'morning', label: '朝の日報', icon: '🌅' },
  evening: { id: 'evening', label: '夕方の日報', icon: '🌆' },
  weekly: { id: 'weekly', label: '週報', icon: '📅' },
  monthly: { id: 'monthly', label: '月報', icon: '📊' },
};

const getCurrentYearMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getPast12Months = () => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `${d.getFullYear()}年${d.getMonth() + 1}月` });
  }
  return months;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const isOverdue = (dateStr) => {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return target < today;
};

const getDaysUntil = (dateStr) => {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  return diff;
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [currentUserId, setCurrentUserId] = useState('takahashi');
  const [showUserSelect, setShowUserSelect] = useState(false);
  const [viewMode, setViewMode] = useState('sales');
  const [selectedReportType, setSelectedReportType] = useState('free');
  const [reportContent, setReportContent] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reportHistory, setReportHistory] = useState([]);
  const [managerPassword, setManagerPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showActualModal, setShowActualModal] = useState(false);
  const [showYomiModal, setShowYomiModal] = useState(false);
  const [showYomiSettingsModal, setShowYomiSettingsModal] = useState(false);
  
  const [kpiItems, setKpiItems] = useState(DEFAULT_KPI_ITEMS);
  const [budgets, setBudgets] = useState({
    takahashi: { calls: 100, appointments: 20, areaReg: 10, deals: 5 },
    kaiho: { calls: 80, appointments: 15, areaReg: 8, deals: 4 },
  });
  const [actuals, setActuals] = useState({
    takahashi: { calls: 0, appointments: 0, areaReg: 0, deals: 0 },
    kaiho: { calls: 0, appointments: 0, areaReg: 0, deals: 0 },
  });
  
  const [yomiFields, setYomiFields] = useState(DEFAULT_YOMI_FIELDS);
  const [yomiData, setYomiData] = useState({});
  const [selectedYomiMonth, setSelectedYomiMonth] = useState(getCurrentYearMonth());
  const [editingYomi, setEditingYomi] = useState(null);
  const [editingYomiFields, setEditingYomiFields] = useState([]);
  const [editingKpiItems, setEditingKpiItems] = useState([]);
  const [editingBudget, setEditingBudget] = useState({});

  const currentUser = USERS.find(u => u.id === currentUserId) || USERS[0];
  const currentBudget = budgets[currentUserId] || {};
  const currentActual = actuals[currentUserId] || {};
  const currentYomiList = yomiData[selectedYomiMonth]?.[currentUserId] || [];

  // 期日超過の案件を取得
  const getOverdueYomis = (userId) => {
    const month = getCurrentYearMonth();
    const list = yomiData[month]?.[userId] || [];
    return list.filter(y => y.closingDate && isOverdue(y.closingDate) && !['won', 'lost'].includes(y.status));
  };

  // 全ユーザーの期日超過案件
  const getAllOverdueYomis = () => {
    const overdues = [];
    USERS.forEach(user => {
      getOverdueYomis(user.id).forEach(y => {
        overdues.push({ ...y, userName: user.name, userIcon: user.icon });
      });
    });
    return overdues;
  };

  useEffect(() => {
    const loggedIn = sessionStorage.getItem('topperformer_logged_in');
    if (loggedIn === 'true') setIsLoggedIn(true);
  }, []);

  useEffect(() => {
    const savedHistory = localStorage.getItem('topperformer_history');
    const savedBudgets = localStorage.getItem('topperformer_budgets');
    const savedActuals = localStorage.getItem('topperformer_actuals');
    const savedKpiItems = localStorage.getItem('topperformer_kpi_items');
    const savedYomiData = localStorage.getItem('topperformer_yomi_data');
    const savedYomiFields = localStorage.getItem('topperformer_yomi_fields');
    if (savedHistory) setReportHistory(JSON.parse(savedHistory));
    if (savedBudgets) setBudgets(JSON.parse(savedBudgets));
    if (savedActuals) setActuals(JSON.parse(savedActuals));
    if (savedKpiItems) setKpiItems(JSON.parse(savedKpiItems));
    if (savedYomiData) setYomiData(JSON.parse(savedYomiData));
    if (savedYomiFields) setYomiFields(JSON.parse(savedYomiFields));
  }, []);

  useEffect(() => { localStorage.setItem('topperformer_history', JSON.stringify(reportHistory)); }, [reportHistory]);
  useEffect(() => { localStorage.setItem('topperformer_budgets', JSON.stringify(budgets)); }, [budgets]);
  useEffect(() => { localStorage.setItem('topperformer_actuals', JSON.stringify(actuals)); }, [actuals]);
  useEffect(() => { localStorage.setItem('topperformer_kpi_items', JSON.stringify(kpiItems)); }, [kpiItems]);
  useEffect(() => { localStorage.setItem('topperformer_yomi_data', JSON.stringify(yomiData)); }, [yomiData]);
  useEffect(() => { localStorage.setItem('topperformer_yomi_fields', JSON.stringify(yomiFields)); }, [yomiFields]);

  const handleLogin = () => {
    if (loginPassword === LOGIN_PASSWORD) {
      setIsLoggedIn(true);
      sessionStorage.setItem('topperformer_logged_in', 'true');
      setLoginError('');
    } else {
      setLoginError('パスワードが正しくありません');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem('topperformer_logged_in');
  };

  const handleUserChange = (userId) => {
    setCurrentUserId(userId);
    setShowUserSelect(false);
  };

  const handleReportTypeChange = (typeId) => { 
    setSelectedReportType(typeId); 
    setReportContent(''); 
  };

  const extractAndUpdateActuals = (content) => {
    const newActuals = { ...currentActual };
    let updated = false;
    kpiItems.forEach(item => {
      const patterns = [
        new RegExp(`${item.name}[：:]*\\s*(\\d+)`, 'i'),
        new RegExp(`${item.name.replace('数', '')}[：:]*\\s*(\\d+)`, 'i'),
      ];
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          newActuals[item.id] = (newActuals[item.id] || 0) + parseInt(match[1]);
          updated = true;
          break;
        }
      }
    });
    if (updated) setActuals(prev => ({ ...prev, [currentUserId]: newActuals }));
  };

  const handleSubmitReport = async () => {
    if (!reportContent.trim()) return;
    setIsLoading(true); setAiResponse('');
    
    let budgetInfo = `\n\n【${currentUser.name}さんの現在の状況】`;
    kpiItems.forEach(item => {
      const target = currentBudget[item.id] || 0;
      const actual = currentActual[item.id] || 0;
      budgetInfo += `\n・${item.name}目標: ${target}${item.unit} / 実績: ${actual}${item.unit}`;
    });
    
    if (currentYomiList.length > 0) {
      budgetInfo += `\n\n【現在のヨミ表】`;
      currentYomiList.forEach(yomi => {
        const status = YOMI_STATUS.find(s => s.id === yomi.status);
        const daysUntil = getDaysUntil(yomi.closingDate);
        let dateInfo = '';
        if (daysUntil !== null) {
          dateInfo = daysUntil < 0 ? `（${Math.abs(daysUntil)}日超過）` : daysUntil === 0 ? '（本日）' : `（残${daysUntil}日）`;
        }
        budgetInfo += `\n・${yomi.companyName || '未入力'}: ${status?.label || '未設定'} ${dateInfo}`;
      });
    }
    
    try {
      const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${GEMINI_API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: `${AI_SYSTEM_PROMPT}${budgetInfo}\n\n【${currentUser.name}さんからの報告】\n${reportContent}` }] }], 
          generationConfig: { temperature: 0.8, maxOutputTokens: 1024 } 
        })
      });
      const data = await response.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const aiText = data.candidates[0].content.parts[0].text;
        setAiResponse(aiText);
        extractAndUpdateActuals(reportContent);
        setReportHistory(prev => [{ id: Date.now(), user: currentUser.name, userId: currentUserId, type: selectedReportType, content: reportContent, aiResponse: aiText, timestamp: new Date().toISOString() }, ...prev].slice(0, 50));
      } else if (data.error) {
        setAiResponse(`エラー: ${data.error.message}`);
      } else { 
        setAiResponse('エラー: AIからの応答を取得できませんでした。'); 
      }
    } catch (error) { setAiResponse(`エラー: ${error.message}`); }
    finally { setIsLoading(false); }
  };

  const openBudgetModal = () => {
    setEditingKpiItems([...kpiItems]);
    setEditingBudget({ ...currentBudget });
    setShowBudgetModal(true);
  };

  const addKpiItem = () => setEditingKpiItems([...editingKpiItems, { id: `custom_${Date.now()}`, name: '', unit: '件' }]);
  const removeKpiItem = (index) => setEditingKpiItems(editingKpiItems.filter((_, i) => i !== index));
  const updateKpiItem = (index, field, value) => {
    const newItems = [...editingKpiItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setEditingKpiItems(newItems);
  };
  const updateBudgetValue = (itemId, value) => setEditingBudget({ ...editingBudget, [itemId]: parseInt(value) || 0 });
  const saveBudget = () => {
    const validItems = editingKpiItems.filter(item => item.name.trim() !== '');
    setKpiItems(validItems);
    setBudgets(prev => ({ ...prev, [currentUserId]: { ...editingBudget } }));
    setShowBudgetModal(false);
  };

  const openActualModal = () => setShowActualModal(true);
  const updateActualValue = (itemId, value) => setActuals(prev => ({ ...prev, [currentUserId]: { ...prev[currentUserId], [itemId]: parseInt(value) || 0 } }));
  const resetActuals = () => {
    if (window.confirm('今月の実績をリセットしますか？')) {
      const resetValues = {};
      kpiItems.forEach(item => { resetValues[item.id] = 0; });
      setActuals(prev => ({ ...prev, [currentUserId]: resetValues }));
    }
  };

  const openYomiModal = (yomi = null) => {
    if (yomi) {
      setEditingYomi({ ...yomi });
    } else {
      const newYomi = { id: Date.now(), status: 'C', closingDate: '' };
      yomiFields.forEach(f => { newYomi[f.id] = f.type === 'number' ? 0 : ''; });
      newYomi.totalAmount = 0;
      setEditingYomi(newYomi);
    }
    setShowYomiModal(true);
  };

  const updateYomiField = (fieldId, value) => {
    const updated = { ...editingYomi, [fieldId]: value };
    if (fieldId === 'monthlyFee' || fieldId === 'areaCount') {
      const monthlyFee = fieldId === 'monthlyFee' ? parseInt(value) || 0 : parseInt(editingYomi.monthlyFee) || 0;
      updated.totalAmount = monthlyFee * 12;
    }
    setEditingYomi(updated);
  };

  const saveYomi = () => {
    const month = getCurrentYearMonth();
    setYomiData(prev => {
      const monthData = prev[month] || {};
      const userList = monthData[currentUserId] || [];
      const existingIndex = userList.findIndex(y => y.id === editingYomi.id);
      let newList = existingIndex >= 0 ? [...userList] : [...userList, editingYomi];
      if (existingIndex >= 0) newList[existingIndex] = editingYomi;
      return { ...prev, [month]: { ...monthData, [currentUserId]: newList } };
    });
    setShowYomiModal(false);
    setEditingYomi(null);
  };

  const deleteYomi = (yomiId) => {
    if (!window.confirm('この案件を削除しますか？')) return;
    setYomiData(prev => {
      const monthData = prev[selectedYomiMonth] || {};
      const userList = monthData[currentUserId] || [];
      return { ...prev, [selectedYomiMonth]: { ...monthData, [currentUserId]: userList.filter(y => y.id !== yomiId) } };
    });
  };

  const openYomiSettingsModal = () => {
    setEditingYomiFields([...yomiFields]);
    setShowYomiSettingsModal(true);
  };

  const addYomiField = () => setEditingYomiFields([...editingYomiFields, { id: `custom_${Date.now()}`, name: '', type: 'text', unit: '' }]);
  const removeYomiField = (index) => setEditingYomiFields(editingYomiFields.filter((_, i) => i !== index));
  const updateYomiFieldSetting = (index, field, value) => {
    const newFields = [...editingYomiFields];
    newFields[index] = { ...newFields[index], [field]: value };
    setEditingYomiFields(newFields);
  };
  const saveYomiSettings = () => {
    setYomiFields(editingYomiFields.filter(f => f.name.trim() !== ''));
    setShowYomiSettingsModal(false);
  };

  const handleManagerAccess = () => { 
    if (viewMode === 'manager') setViewMode('sales'); 
    else setShowPasswordModal(true); 
  };
  
  const verifyManagerPassword = () => { 
    if (managerPassword === MANAGER_PASSWORD) { 
      setViewMode('manager'); 
      setShowPasswordModal(false); 
      setManagerPassword(''); 
    } else alert('パスワードが正しくありません'); 
  };
  
  const handleShare = () => { 
    navigator.clipboard.writeText(`【${REPORT_TYPES[selectedReportType].label}】\n${reportContent}\n\n【AIマネージャーからのフィードバック】\n${aiResponse}`); 
    alert('クリップボードにコピーしました！'); 
  };
  
  const calculateProgress = (current, target) => target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const generateOptions = (current, max = 200) => {
    const options = [];
    for (let i = 0; i <= max; i++) options.push(i);
    if (current > max) options.push(current);
    return options;
  };

  const getYomiSummary = () => {
    const list = yomiData[selectedYomiMonth]?.[currentUserId] || [];
    const summary = { A: 0, B: 0, C: 0, won: 0, lost: 0, totalAmount: 0, wonAmount: 0 };
    list.forEach(y => {
      if (y.status) summary[y.status] = (summary[y.status] || 0) + 1;
      summary.totalAmount += y.totalAmount || 0;
      if (y.status === 'won') summary.wonAmount += y.totalAmount || 0;
    });
    return summary;
  };

  // チームデータ（管理者ビュー用）
  const getTeamData = () => {
    const month = getCurrentYearMonth();
    return USERS.map(user => {
      const budget = budgets[user.id] || {};
      const actual = actuals[user.id] || {};
      const yomis = yomiData[month]?.[user.id] || [];
      const areaRegRate = budget.areaReg > 0 ? Math.round((actual.areaReg / budget.areaReg) * 100) : 0;
      const dealsRate = budget.deals > 0 ? Math.round((actual.deals / budget.deals) * 100) : 0;
      let status = 'good';
      if (dealsRate < 50) status = 'critical';
      else if (dealsRate < 80) status = 'warning';
      return { ...user, actual, budget, areaRegRate, dealsRate, status, yomis, overdueCount: getOverdueYomis(user.id).length };
    });
  };

  const styles = {
    loginContainer: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', fontFamily: "'Noto Sans JP', sans-serif" },
    loginBox: { backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', maxWidth: '400px', width: '90%', textAlign: 'center' },
    loginTitle: { fontSize: '24px', fontWeight: '700', color: '#1E293B', marginBottom: '8px' },
    loginSubtitle: { fontSize: '14px', color: '#64748B', marginBottom: '32px' },
    loginInput: { width: '100%', padding: '14px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '16px', marginBottom: '16px', outline: 'none', boxSizing: 'border-box' },
    loginButton: { width: '100%', padding: '14px', border: 'none', borderRadius: '8px', backgroundColor: '#2563EB', color: 'white', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
    loginError: { color: '#DC2626', fontSize: '14px', marginBottom: '16px' },
    container: { minHeight: '100vh', backgroundColor: '#F8FAFC', fontFamily: "'Noto Sans JP', sans-serif" },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', backgroundColor: 'white', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 100, flexWrap: 'wrap', gap: '8px' },
    logo: { display: 'flex', alignItems: 'center', gap: '12px' },
    logoText: { display: 'flex', flexDirection: 'column' },
    logoTitle: { fontSize: '18px', fontWeight: '700', color: '#1E293B' },
    logoSubtitle: { fontSize: '11px', color: '#64748B' },
    headerRight: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
    logoutButton: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: 'white', color: '#64748B', fontSize: '13px', cursor: 'pointer' },
    shareButton: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: '#2563EB', cursor: 'pointer' },
    viewToggle: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: 'white', color: '#64748B', fontSize: '13px', fontWeight: '500', cursor: 'pointer' },
    viewToggleActive: { backgroundColor: '#EFF6FF', borderColor: '#2563EB', color: '#2563EB' },
    main: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
    salesLayout: { display: 'grid', gridTemplateColumns: '380px 1fr', gap: '24px' },
    leftColumn: { display: 'flex', flexDirection: 'column', gap: '20px' },
    rightColumn: { display: 'flex', flexDirection: 'column', gap: '20px' },
    card: { backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #F1F5F9' },
    cardTitle: { fontSize: '15px', fontWeight: '600', color: '#334155' },
    userBadge: { display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#EFF6FF', borderRadius: '20px', fontSize: '13px', fontWeight: '500', color: '#2563EB', cursor: 'pointer' },
    userDropdown: { position: 'absolute', top: '100%', right: 0, marginTop: '4px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid #E2E8F0', overflow: 'hidden', zIndex: 50 },
    userOption: { padding: '10px 16px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' },
    userOptionActive: { backgroundColor: '#EFF6FF' },
    kpiList: { padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '14px' },
    kpiItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
    kpiHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    kpiLabel: { fontSize: '13px', color: '#475569' },
    kpiValues: { display: 'flex', alignItems: 'center', gap: '4px' },
    kpiActual: { fontWeight: '600', color: '#1E293B', fontSize: '14px' },
    kpiTarget: { fontWeight: '400', color: '#94A3B8', fontSize: '13px' },
    progressBar: { height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: '3px', transition: 'width 0.3s ease' },
    budgetActions: { display: 'flex', gap: '6px', padding: '10px 20px', borderTop: '1px solid #F1F5F9', flexWrap: 'wrap' },
    budgetButton: { flex: 1, padding: '6px', border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: 'white', fontSize: '11px', cursor: 'pointer', color: '#64748B', minWidth: '60px' },
    // ヨミ表
    yomiHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #F1F5F9', flexWrap: 'wrap', gap: '8px' },
    yomiTitle: { fontSize: '15px', fontWeight: '600', color: '#334155' },
    yomiMonthSelect: { padding: '4px 8px', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '12px', backgroundColor: 'white' },
    yomiSummary: { display: 'flex', gap: '8px', padding: '10px 20px', backgroundColor: '#F8FAFC', flexWrap: 'wrap' },
    yomiSummaryItem: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' },
    yomiList: { padding: '10px 20px', maxHeight: '200px', overflowY: 'auto' },
    yomiEmpty: { color: '#94A3B8', fontSize: '13px', textAlign: 'center', padding: '20px 0' },
    yomiRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F1F5F9', gap: '8px', flexWrap: 'wrap' },
    yomiCompany: { fontSize: '13px', fontWeight: '500', color: '#334155', minWidth: '100px' },
    yomiAmount: { fontSize: '12px', color: '#64748B' },
    yomiDate: { fontSize: '11px', padding: '2px 6px', borderRadius: '4px' },
    yomiDateNormal: { backgroundColor: '#F3F4F6', color: '#6B7280' },
    yomiDateSoon: { backgroundColor: '#FEF3C7', color: '#92400E' },
    yomiDateOverdue: { backgroundColor: '#FEE2E2', color: '#DC2626' },
    yomiStatus: { padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '500' },
    yomiActions: { display: 'flex', gap: '4px' },
    yomiEditBtn: { padding: '3px 6px', border: 'none', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#2563EB', fontSize: '10px', cursor: 'pointer' },
    yomiDeleteBtn: { padding: '3px 6px', border: 'none', borderRadius: '4px', backgroundColor: '#FEE2E2', color: '#DC2626', fontSize: '10px', cursor: 'pointer' },
    yomiFooter: { display: 'flex', gap: '8px', padding: '10px 20px', borderTop: '1px solid #F1F5F9' },
    yomiAddBtn: { flex: 1, padding: '8px', border: '1px dashed #E2E8F0', borderRadius: '8px', backgroundColor: 'transparent', color: '#64748B', fontSize: '12px', cursor: 'pointer' },
    yomiSettingsBtn: { padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: 'white', color: '#64748B', fontSize: '12px', cursor: 'pointer' },
    // 通知
    alertBox: { margin: '0 20px 10px', padding: '10px 14px', backgroundColor: '#FEE2E2', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' },
    alertIcon: { fontSize: '16px' },
    alertText: { fontSize: '12px', color: '#DC2626', fontWeight: '500' },
    // 履歴
    historyList: { padding: '14px 20px', maxHeight: '120px', overflowY: 'auto' },
    emptyHistory: { color: '#94A3B8', fontSize: '13px', textAlign: 'center', padding: '16px 0' },
    historyItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #F1F5F9' },
    historyIcon: { fontSize: '16px' },
    historyContent: { display: 'flex', flexDirection: 'column', gap: '2px' },
    historyType: { fontSize: '12px', fontWeight: '500', color: '#334155' },
    historyDate: { fontSize: '10px', color: '#94A3B8' },
    // AI応答
    aiHeader: { display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 20px', borderBottom: '1px solid #F1F5F9' },
    aiDot: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22C55E' },
    aiTitle: { fontSize: '15px', fontWeight: '600', color: '#334155' },
    aiResponseArea: { padding: '16px 20px', minHeight: '160px' },
    loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '120px', color: '#64748B', gap: '10px' },
    loadingSpinner: { width: '28px', height: '28px', border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 1s linear infinite' },
    aiResponseText: { fontSize: '14px', lineHeight: '1.6', color: '#334155', whiteSpace: 'pre-wrap' },
    aiPlaceholder: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '120px', color: '#94A3B8', textAlign: 'center', gap: '10px', fontSize: '13px' },
    // レポート入力
    reportTabs: { display: 'flex', padding: '10px 14px', gap: '6px', borderBottom: '1px solid #F1F5F9', overflowX: 'auto' },
    reportTab: { padding: '6px 12px', border: 'none', borderRadius: '16px', backgroundColor: 'transparent', color: '#64748B', fontSize: '12px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap' },
    reportTabActive: { backgroundColor: '#2563EB', color: 'white' },
    inputContainer: { padding: '14px 20px' },
    textarea: { width: '100%', minHeight: '100px', padding: '12px', border: '1px solid #E2E8F0', borderRadius: '10px', fontSize: '14px', lineHeight: '1.5', color: '#334155', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
    inputFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderTop: '1px solid #F1F5F9', backgroundColor: '#FAFBFC', flexWrap: 'wrap', gap: '8px' },
    footerText: { fontSize: '11px', color: '#94A3B8' },
    submitButton: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: 'none', borderRadius: '8px', backgroundColor: '#2563EB', color: 'white', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
    // 管理者
    managerLayout: { display: 'flex', flexDirection: 'column', gap: '20px' },
    managerCard: { backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '20px', overflowX: 'auto' },
    managerTitle: { fontSize: '16px', fontWeight: '600', color: '#1E293B', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' },
    tableContainer: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', minWidth: '900px' },
    th: { padding: '10px 8px', backgroundColor: '#F8FAFC', fontSize: '11px', fontWeight: '600', color: '#64748B', textAlign: 'left', borderBottom: '1px solid #E2E8F0' },
    td: { padding: '12px 8px', fontSize: '13px', color: '#334155', borderBottom: '1px solid #F1F5F9' },
    statusBadge: { display: 'inline-block', padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '500' },
    overdueAlert: { backgroundColor: '#FEE2E2', color: '#DC2626', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', marginLeft: '4px' },
    // 担当者別ヨミ表
    yomiSection: { marginTop: '16px' },
    yomiUserHeader: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0', borderBottom: '1px solid #E2E8F0', marginBottom: '8px' },
    yomiUserName: { fontSize: '14px', fontWeight: '600', color: '#334155' },
    yomiTable: { width: '100%', borderCollapse: 'collapse', marginBottom: '16px' },
    yomiTh: { padding: '8px', backgroundColor: '#F8FAFC', fontSize: '11px', fontWeight: '600', color: '#64748B', textAlign: 'left' },
    yomiTd: { padding: '8px', fontSize: '12px', color: '#334155', borderBottom: '1px solid #F1F5F9' },
    // モーダル
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
    modal: { backgroundColor: 'white', borderRadius: '16px', padding: '24px', maxWidth: '500px', width: '100%', maxHeight: '80vh', overflowY: 'auto' },
    modalTitle: { fontSize: '18px', fontWeight: '600', color: '#1E293B', marginBottom: '16px' },
    modalText: { fontSize: '14px', color: '#64748B', marginBottom: '16px' },
    modalInput: { width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
    modalSelect: { width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: 'white' },
    modalLabel: { fontSize: '13px', color: '#64748B', marginBottom: '4px', display: 'block' },
    modalButtons: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' },
    modalCancel: { padding: '10px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: 'white', color: '#64748B', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
    modalConfirm: { padding: '10px 16px', border: 'none', borderRadius: '8px', backgroundColor: '#2563EB', color: 'white', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
    addButton: { padding: '8px 16px', border: '1px dashed #E2E8F0', borderRadius: '8px', backgroundColor: 'transparent', color: '#64748B', fontSize: '13px', cursor: 'pointer', width: '100%', marginTop: '8px' },
    removeButton: { padding: '6px 8px', border: 'none', borderRadius: '6px', backgroundColor: '#FEE2E2', color: '#DC2626', fontSize: '11px', cursor: 'pointer' },
    kpiEditRow: { display: 'grid', gridTemplateColumns: '1fr 60px 80px 32px', gap: '8px', alignItems: 'center', marginBottom: '8px' },
    fieldEditRow: { display: 'grid', gridTemplateColumns: '1fr 70px 50px 32px', gap: '8px', alignItems: 'center', marginBottom: '8px' },
    formGroup: { marginBottom: '14px' },
  };

  if (!isLoggedIn) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none" style={{margin: '0 auto 24px', display: 'block'}}><rect width="32" height="32" rx="8" fill="#2563EB"/><path d="M8 12h16M8 16h12M8 20h14M22 20l4-4-4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <h1 style={styles.loginTitle}>TopPerformer</h1>
          <p style={styles.loginSubtitle}>営業組織専用AIマネージャー</p>
          {loginError && <p style={styles.loginError}>{loginError}</p>}
          <input type="password" style={styles.loginInput} placeholder="パスワード" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
          <button style={styles.loginButton} onClick={handleLogin}>ログイン</button>
        </div>
      </div>
    );
  }

  const yomiSummary = getYomiSummary();
  const isCurrentMonth = selectedYomiMonth === getCurrentYearMonth();
  const overdueYomis = getOverdueYomis(currentUserId);
  const allOverdueYomis = getAllOverdueYomis();

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logo}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#2563EB"/><path d="M8 12h16M8 16h12M8 20h14M22 20l4-4-4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <div style={styles.logoText}><span style={styles.logoTitle}>TopPerformer</span><span style={styles.logoSubtitle}>AI Sales Manager</span></div>
        </div>
        <div style={styles.headerRight}>
          <button style={styles.logoutButton} onClick={handleLogout}>ログアウト</button>
          <button style={styles.shareButton} onClick={handleShare} disabled={!aiResponse}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg></button>
          <button style={{...styles.viewToggle, ...(viewMode === 'sales' ? styles.viewToggleActive : {})}} onClick={() => setViewMode('sales')}>営業担当</button>
          <button style={{...styles.viewToggle, ...(viewMode === 'manager' ? styles.viewToggleActive : {})}} onClick={handleManagerAccess}>管理者</button>
        </div>
      </header>

      <main style={styles.main}>
        {viewMode === 'sales' ? (
          <div style={{...styles.salesLayout, gridTemplateColumns: window.innerWidth <= 900 ? '1fr' : '360px 1fr'}}>
            <div style={styles.leftColumn}>
              {/* 期日超過通知 */}
              {overdueYomis.length > 0 && (
                <div style={styles.alertBox}>
                  <span style={styles.alertIcon}>⚠️</span>
                  <span style={styles.alertText}>期日超過の案件が{overdueYomis.length}件あります</span>
                </div>
              )}

              {/* 進捗状況 */}
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <span style={styles.cardTitle}>📊 進捗状況</span>
                  <div style={{position: 'relative'}}>
                    <div style={styles.userBadge} onClick={() => setShowUserSelect(!showUserSelect)}>
                      {currentUser.icon} {currentUser.name} ▼
                    </div>
                    {showUserSelect && (
                      <div style={styles.userDropdown}>
                        {USERS.map(user => (
                          <div key={user.id} style={{...styles.userOption, ...(user.id === currentUserId ? styles.userOptionActive : {})}} onClick={() => handleUserChange(user.id)}>
                            {user.icon} {user.name}{user.role && ` (${user.role})`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div style={styles.kpiList}>
                  {kpiItems.map(item => {
                    const target = currentBudget[item.id] || 0;
                    const actual = currentActual[item.id] || 0;
                    const progress = calculateProgress(actual, target);
                    return (
                      <div key={item.id} style={styles.kpiItem}>
                        <div style={styles.kpiHeader}>
                          <span style={styles.kpiLabel}>{item.name}</span>
                          <div style={styles.kpiValues}>
                            <span style={styles.kpiActual}>{actual}</span>
                            <span style={styles.kpiTarget}>/ {target}{item.unit}</span>
                          </div>
                        </div>
                        <div style={styles.progressBar}>
                          <div style={{...styles.progressFill, width: `${progress}%`, backgroundColor: progress >= 100 ? '#22C55E' : progress >= 80 ? '#84CC16' : '#2563EB'}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={styles.budgetActions}>
                  <button style={styles.budgetButton} onClick={openBudgetModal}>🎯 予算</button>
                  <button style={styles.budgetButton} onClick={openActualModal}>✏️ 実績</button>
                  <button style={styles.budgetButton} onClick={resetActuals}>🔄 リセット</button>
                </div>
              </div>

              {/* ヨミ表 */}
              <div style={styles.card}>
                <div style={styles.yomiHeader}>
                  <span style={styles.yomiTitle}>📋 ヨミ表</span>
                  <select style={styles.yomiMonthSelect} value={selectedYomiMonth} onChange={(e) => setSelectedYomiMonth(e.target.value)}>
                    {getPast12Months().map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div style={styles.yomiSummary}>
                  {YOMI_STATUS.slice(0, 3).map(s => (
                    <div key={s.id} style={styles.yomiSummaryItem}>
                      <span style={{...styles.yomiStatus, backgroundColor: s.bgColor, color: s.color}}>{s.label}</span>
                      <span>{yomiSummary[s.id] || 0}</span>
                    </div>
                  ))}
                  <div style={styles.yomiSummaryItem}>
                    <span style={{fontWeight: '600', fontSize: '11px'}}>受注:</span>
                    <span style={{fontSize: '11px'}}>{yomiSummary.wonAmount.toLocaleString()}円</span>
                  </div>
                </div>
                <div style={styles.yomiList}>
                  {currentYomiList.length === 0 ? (
                    <p style={styles.yomiEmpty}>案件がありません</p>
                  ) : (
                    currentYomiList.map(yomi => {
                      const status = YOMI_STATUS.find(s => s.id === yomi.status);
                      const daysUntil = getDaysUntil(yomi.closingDate);
                      const overdue = isOverdue(yomi.closingDate) && !['won', 'lost'].includes(yomi.status);
                      let dateStyle = styles.yomiDateNormal;
                      if (overdue) dateStyle = styles.yomiDateOverdue;
                      else if (daysUntil !== null && daysUntil <= 3 && daysUntil >= 0) dateStyle = styles.yomiDateSoon;
                      return (
                        <div key={yomi.id} style={styles.yomiRow}>
                          <span style={styles.yomiCompany}>{yomi.companyName || '未入力'}</span>
                          <span style={styles.yomiAmount}>{(yomi.totalAmount || 0).toLocaleString()}円</span>
                          {yomi.closingDate && (
                            <span style={{...styles.yomiDate, ...dateStyle}}>
                              {formatDate(yomi.closingDate)}
                              {overdue && ' 超過'}
                            </span>
                          )}
                          <span style={{...styles.yomiStatus, backgroundColor: status?.bgColor, color: status?.color}}>{status?.label}</span>
                          {isCurrentMonth && (
                            <div style={styles.yomiActions}>
                              <button style={styles.yomiEditBtn} onClick={() => openYomiModal(yomi)}>編集</button>
                              <button style={styles.yomiDeleteBtn} onClick={() => deleteYomi(yomi.id)}>削除</button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                {isCurrentMonth && (
                  <div style={styles.yomiFooter}>
                    <button style={styles.yomiAddBtn} onClick={() => openYomiModal()}>+ 案件追加</button>
                    <button style={styles.yomiSettingsBtn} onClick={openYomiSettingsModal}>⚙️</button>
                  </div>
                )}
              </div>

              {/* 履歴 */}
              <div style={styles.card}>
                <div style={styles.cardHeader}><span style={styles.cardTitle}>📝 最近のレポート</span></div>
                <div style={styles.historyList}>
                  {reportHistory.filter(r => r.userId === currentUserId).length === 0 ? (
                    <p style={styles.emptyHistory}>履歴がありません</p>
                  ) : (
                    reportHistory.filter(r => r.userId === currentUserId).slice(0, 4).map(report => (
                      <div key={report.id} style={styles.historyItem}>
                        <span style={styles.historyIcon}>{REPORT_TYPES[report.type]?.icon || '📝'}</span>
                        <div style={styles.historyContent}>
                          <span style={styles.historyType}>{REPORT_TYPES[report.type]?.label}</span>
                          <span style={styles.historyDate}>{new Date(report.timestamp).toLocaleDateString('ja-JP')}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div style={styles.rightColumn}>
              {/* AI応答 */}
              <div style={styles.card}>
                <div style={styles.aiHeader}><span style={styles.aiDot}></span><span style={styles.aiTitle}>AIマネージャー</span></div>
                <div style={styles.aiResponseArea}>
                  {isLoading ? (
                    <div style={styles.loadingContainer}><div style={styles.loadingSpinner}></div><p>分析中...</p></div>
                  ) : aiResponse ? (
                    <div style={styles.aiResponseText}>{aiResponse}</div>
                  ) : (
                    <div style={styles.aiPlaceholder}><p>レポートを提出するとフィードバックします</p></div>
                  )}
                </div>
              </div>

              {/* レポート入力 */}
              <div style={styles.card}>
                <div style={styles.reportTabs}>
                  {Object.values(REPORT_TYPES).map(type => (
                    <button key={type.id} style={{...styles.reportTab, ...(selectedReportType === type.id ? styles.reportTabActive : {})}} onClick={() => handleReportTypeChange(type.id)}>{type.label}</button>
                  ))}
                </div>
                <div style={styles.inputContainer}>
                  <textarea style={styles.textarea} value={reportContent} onChange={(e) => setReportContent(e.target.value)} placeholder="自由に報告・相談を入力してください" />
                </div>
                <div style={styles.inputFooter}>
                  <p style={styles.footerText}>行動量と計画を分析します</p>
                  <button style={styles.submitButton} onClick={handleSubmitReport} disabled={isLoading}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                    提出
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.managerLayout}>
            {/* 期日超過通知 */}
            {allOverdueYomis.length > 0 && (
              <div style={{...styles.alertBox, margin: 0}}>
                <span style={styles.alertIcon}>⚠️</span>
                <span style={styles.alertText}>
                  期日超過の案件: {allOverdueYomis.map(y => `${y.userName}/${y.companyName}`).join(', ')}
                </span>
              </div>
            )}

            {/* チーム状況 */}
            <div style={styles.managerCard}>
              <h2 style={styles.managerTitle}>👥 チーム状況</h2>
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>メンバー</th>
                      <th style={styles.th}>架電数</th>
                      <th style={styles.th}>アポ獲得</th>
                      <th style={styles.th}>エリア登録予算</th>
                      <th style={styles.th}>エリア登録実績</th>
                      <th style={styles.th}>エリア達成率</th>
                      <th style={styles.th}>受注予算</th>
                      <th style={styles.th}>受注実績</th>
                      <th style={styles.th}>受注達成率</th>
                      <th style={styles.th}>状態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getTeamData().map(member => (
                      <tr key={member.id}>
                        <td style={styles.td}>
                          {member.icon} {member.name}
                          {member.overdueCount > 0 && <span style={styles.overdueAlert}>⚠️{member.overdueCount}</span>}
                        </td>
                        <td style={styles.td}>{member.actual.calls || 0}/{member.budget.calls || 0}</td>
                        <td style={styles.td}>{member.actual.appointments || 0}/{member.budget.appointments || 0}</td>
                        <td style={styles.td}>{member.budget.areaReg || 0}件</td>
                        <td style={styles.td}>{member.actual.areaReg || 0}件</td>
                        <td style={styles.td}>{member.areaRegRate}%</td>
                        <td style={styles.td}>{member.budget.deals || 0}件</td>
                        <td style={styles.td}>{member.actual.deals || 0}件</td>
                        <td style={styles.td}>{member.dealsRate}%</td>
                        <td style={styles.td}>
                          <span style={{...styles.statusBadge, backgroundColor: member.status === 'good' ? '#DEF7EC' : member.status === 'warning' ? '#FEF3C7' : '#FEE2E2', color: member.status === 'good' ? '#03543F' : member.status === 'warning' ? '#92400E' : '#991B1B'}}>
                            {member.status === 'good' ? '良好' : member.status === 'warning' ? '要注意' : '要対応'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 担当者別ヨミ表 */}
            <div style={styles.managerCard}>
              <h2 style={styles.managerTitle}>📋 担当者別ヨミ表</h2>
              {USERS.map(user => {
                const userYomis = yomiData[getCurrentYearMonth()]?.[user.id] || [];
                return (
                  <div key={user.id} style={styles.yomiSection}>
                    <div style={styles.yomiUserHeader}>
                      <span>{user.icon}</span>
                      <span style={styles.yomiUserName}>{user.name}</span>
                      <span style={{fontSize: '12px', color: '#64748B'}}>（{userYomis.length}件）</span>
                    </div>
                    {userYomis.length === 0 ? (
                      <p style={{...styles.emptyHistory, padding: '10px 0'}}>案件なし</p>
                    ) : (
                      <table style={styles.yomiTable}>
                        <thead>
                          <tr>
                            <th style={styles.yomiTh}>会社名</th>
                            <th style={styles.yomiTh}>受注金額</th>
                            <th style={styles.yomiTh}>クロージング日</th>
                            <th style={styles.yomiTh}>ステータス</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userYomis.map(yomi => {
                            const status = YOMI_STATUS.find(s => s.id === yomi.status);
                            const overdue = isOverdue(yomi.closingDate) && !['won', 'lost'].includes(yomi.status);
                            return (
                              <tr key={yomi.id}>
                                <td style={styles.yomiTd}>{yomi.companyName || '-'}</td>
                                <td style={styles.yomiTd}>{(yomi.totalAmount || 0).toLocaleString()}円</td>
                                <td style={styles.yomiTd}>
                                  {yomi.closingDate ? formatDate(yomi.closingDate) : '-'}
                                  {overdue && <span style={styles.overdueAlert}>超過</span>}
                                </td>
                                <td style={styles.yomiTd}>
                                  <span style={{...styles.statusBadge, backgroundColor: status?.bgColor, color: status?.color}}>{status?.label}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* 管理者パスワードモーダル */}
      {showPasswordModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>管理者パスワード</h3>
            <input type="password" style={styles.modalInput} placeholder="パスワード" value={managerPassword} onChange={(e) => setManagerPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && verifyManagerPassword()} />
            <div style={styles.modalButtons}>
              <button style={styles.modalCancel} onClick={() => { setShowPasswordModal(false); setManagerPassword(''); }}>キャンセル</button>
              <button style={styles.modalConfirm} onClick={verifyManagerPassword}>ログイン</button>
            </div>
          </div>
        </div>
      )}

      {/* 予算設定モーダル */}
      {showBudgetModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>🎯 予算設定</h3>
            {editingKpiItems.map((item, index) => (
              <div key={item.id} style={styles.kpiEditRow}>
                <input type="text" style={styles.modalInput} placeholder="項目名" value={item.name} onChange={(e) => updateKpiItem(index, 'name', e.target.value)} />
                <input type="text" style={styles.modalInput} placeholder="単位" value={item.unit} onChange={(e) => updateKpiItem(index, 'unit', e.target.value)} />
                <input type="number" style={styles.modalInput} placeholder="目標" value={editingBudget[item.id] || ''} onChange={(e) => updateBudgetValue(item.id, e.target.value)} />
                <button style={styles.removeButton} onClick={() => removeKpiItem(index)}>✕</button>
              </div>
            ))}
            <button style={styles.addButton} onClick={addKpiItem}>+ 項目追加</button>
            <div style={styles.modalButtons}>
              <button style={styles.modalCancel} onClick={() => setShowBudgetModal(false)}>キャンセル</button>
              <button style={styles.modalConfirm} onClick={saveBudget}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 実績修正モーダル */}
      {showActualModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>✏️ 実績修正</h3>
            {kpiItems.map(item => (
              <div key={item.id} style={styles.formGroup}>
                <label style={styles.modalLabel}>{item.name}（{item.unit}）</label>
                <select style={styles.modalSelect} value={currentActual[item.id] || 0} onChange={(e) => updateActualValue(item.id, e.target.value)}>
                  {generateOptions(currentActual[item.id] || 0).map(num => <option key={num} value={num}>{num}</option>)}
                </select>
              </div>
            ))}
            <div style={styles.modalButtons}>
              <button style={styles.modalCancel} onClick={() => setShowActualModal(false)}>閉じる</button>
            </div>
          </div>
        </div>
      )}

      {/* ヨミ表入力モーダル */}
      {showYomiModal && editingYomi && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>📋 案件入力</h3>
            {yomiFields.map(field => (
              <div key={field.id} style={styles.formGroup}>
                <label style={styles.modalLabel}>{field.name}{field.unit && `（${field.unit}）`}</label>
                <input type={field.type === 'number' ? 'number' : 'text'} style={styles.modalInput} value={editingYomi[field.id] || ''} onChange={(e) => updateYomiField(field.id, e.target.value)} />
              </div>
            ))}
            <div style={styles.formGroup}>
              <label style={styles.modalLabel}>受注金額（自動計算: 月額×12）</label>
              <input type="text" style={styles.modalInput} value={`${(editingYomi.totalAmount || 0).toLocaleString()}円`} readOnly />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.modalLabel}>クロージング予定日</label>
              <input type="date" style={styles.modalInput} value={editingYomi.closingDate || ''} onChange={(e) => setEditingYomi({...editingYomi, closingDate: e.target.value})} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.modalLabel}>ステータス</label>
              <select style={styles.modalSelect} value={editingYomi.status || 'C'} onChange={(e) => setEditingYomi({...editingYomi, status: e.target.value})}>
                {YOMI_STATUS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div style={styles.modalButtons}>
              <button style={styles.modalCancel} onClick={() => { setShowYomiModal(false); setEditingYomi(null); }}>キャンセル</button>
              <button style={styles.modalConfirm} onClick={saveYomi}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* ヨミ表設定モーダル */}
      {showYomiSettingsModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>⚙️ ヨミ表項目設定</h3>
            {editingYomiFields.map((field, index) => (
              <div key={field.id} style={styles.fieldEditRow}>
                <input type="text" style={styles.modalInput} placeholder="項目名" value={field.name} onChange={(e) => updateYomiFieldSetting(index, 'name', e.target.value)} />
                <select style={styles.modalSelect} value={field.type} onChange={(e) => updateYomiFieldSetting(index, 'type', e.target.value)}>
                  <option value="text">テキスト</option>
                  <option value="number">数値</option>
                </select>
                <input type="text" style={styles.modalInput} placeholder="単位" value={field.unit || ''} onChange={(e) => updateYomiFieldSetting(index, 'unit', e.target.value)} />
                <button style={styles.removeButton} onClick={() => removeYomiField(index)}>✕</button>
              </div>
            ))}
            <button style={styles.addButton} onClick={addYomiField}>+ 項目追加</button>
            <div style={styles.modalButtons}>
              <button style={styles.modalCancel} onClick={() => setShowYomiSettingsModal(false)}>キャンセル</button>
              <button style={styles.modalConfirm} onClick={saveYomiSettings}>保存</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

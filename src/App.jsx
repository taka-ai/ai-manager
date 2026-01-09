import React, { useState, useEffect } from 'react';

const GEMINI_API_KEY = 'AIzaSyAUGPoHfMrgQ125bGUZsvZWsByZe5ZZwRE';
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const LOGIN_PASSWORD = 'Lvntech2026';
const MANAGER_PASSWORD = 'Lvntechkamuro';

const USERS = [
  { id: 'takahashi', name: '髙橋', role: 'リーダー', icon: '👑' },
  { id: 'kaiho', name: '海保', role: '', icon: '👤' },
];

const DEFAULT_KPI_SETTINGS = {
  monthlyBudget: 1680000, avgOrderPrice: 10000, conversionRate: 0.30, appointmentRate: 0.15,
  monthlyWorkDays: 20, holidayDays: 5, dailyCallTime: 420, timePerCall: 20,
};

const calculateKPI = (s) => {
  const targetAreas = Math.ceil(s.monthlyBudget / s.avgOrderPrice / 12);
  const targetDeals = targetAreas;
  const requiredMeetings = Math.ceil(targetDeals / s.conversionRate);
  const requiredCalls = Math.ceil(requiredMeetings / s.appointmentRate);
  const callableDays = s.monthlyWorkDays - s.holidayDays;
  const dailyRequiredCalls = Math.ceil(requiredCalls / callableDays);
  const maxDailyCalls = Math.floor(s.dailyCallTime / s.timePerCall);
  return { targetAreas, targetDeals, requiredMeetings, requiredCalls, callableDays, dailyRequiredCalls, maxDailyCalls, isAchievable: dailyRequiredCalls <= maxDailyCalls };
};

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

const extractDataFromReport = (content) => {
  const extracted = { calls: null, meetings: null, deals: null, yomis: [] };
  
  const callMatch = content.match(/架電[：:\s]*(\d+)|(\d+)[件回].*架電|TEL[：:\s]*(\d+)|コール[：:\s]*(\d+)/i);
  if (callMatch) extracted.calls = parseInt(callMatch[1] || callMatch[2] || callMatch[3] || callMatch[4]);
  
  const meetingMatch = content.match(/商談[：:\s]*(\d+)|(\d+)[件回].*商談|アポ[：:\s]*(\d+)|面談[：:\s]*(\d+)/i);
  if (meetingMatch) extracted.meetings = parseInt(meetingMatch[1] || meetingMatch[2] || meetingMatch[3] || meetingMatch[4]);
  
  const dealMatch = content.match(/受注[：:\s]*(\d+)|(\d+)[件回].*受注|成約[：:\s]*(\d+)|契約[：:\s]*(\d+)/i);
  if (dealMatch) extracted.deals = parseInt(dealMatch[1] || dealMatch[2] || dealMatch[3] || dealMatch[4]);
  
  const regex1 = /([ぁ-んァ-ヶー一-龠a-zA-Z0-9]+(?:会社|株式会社|有限会社|㈱|㈲|不動産|ホーム|ハウス|建設|工務店|企画|産業|商事)?)[：:\s、,→]+([ABC])ヨミ/gi;
  let match;
  while ((match = regex1.exec(content)) !== null) {
    if (match[1].length >= 2) extracted.yomis.push({ companyName: match[1], status: match[2].toUpperCase() });
  }
  
  const regex2 = /([ぁ-んァ-ヶー一-龠a-zA-Z0-9]+(?:会社|株式会社|有限会社|㈱|㈲|不動産|ホーム|ハウス|建設|工務店|企画|産業|商事)?)[：:\s、,→]*(受注|失注)/gi;
  while ((match = regex2.exec(content)) !== null) {
    if (match[1].length >= 2 && !extracted.yomis.find(y => y.companyName === match[1])) {
      extracted.yomis.push({ companyName: match[1], status: match[2] === '受注' ? 'won' : 'lost' });
    }
  }
  
  return extracted;
};

const createAIPrompt = (user, kpiSettings, kpiCalc, actuals, yomis) => {
  const progress = { calls: actuals.calls || 0, meetings: actuals.meetings || 0, deals: actuals.deals || 0 };
  const callsRate = kpiCalc.requiredCalls > 0 ? Math.round((progress.calls / kpiCalc.requiredCalls) * 100) : 0;
  const meetingsRate = kpiCalc.requiredMeetings > 0 ? Math.round((progress.meetings / kpiCalc.requiredMeetings) * 100) : 0;
  const dealsRate = kpiCalc.targetDeals > 0 ? Math.round((progress.deals / kpiCalc.targetDeals) * 100) : 0;
  const yomiSummary = yomis.reduce((acc, y) => { acc[y.status] = (acc[y.status] || 0) + 1; acc.totalAmount = (acc.totalAmount || 0) + (y.totalAmount || 0); return acc; }, {});

  return `あなたは「TopPerformer」の厳格なAI営業マネージャーです。

【絶対的な行動原則】
あなたは「勝たせるマネージャー」であり、決して甘い指導は行いません。
営業は「行動量」が全てであり、目標未達の原因は必ず「行動量不足」か「率の問題」のどちらかです。

【${user.name}さんのKPI設定】
■月間目標
・月間受注予算: ${kpiSettings.monthlyBudget.toLocaleString()}円
・目標受注数: ${kpiCalc.targetDeals}件
・必要商談数: ${kpiCalc.requiredMeetings}件（受注率${(kpiSettings.conversionRate * 100).toFixed(0)}%）
・必要架電数: ${kpiCalc.requiredCalls}件（アポ率${(kpiSettings.appointmentRate * 100).toFixed(0)}%）

■日次目標
・1日あたり必要架電数: ${kpiCalc.dailyRequiredCalls}件
・1日最大架電可能数: ${kpiCalc.maxDailyCalls}件

【現在の進捗】
・架電数: ${progress.calls}件 / ${kpiCalc.requiredCalls}件（${callsRate}%）
・商談数: ${progress.meetings}件 / ${kpiCalc.requiredMeetings}件（${meetingsRate}%）
・受注数: ${progress.deals}件 / ${kpiCalc.targetDeals}件（${dealsRate}%）

【ヨミ表状況】
・Aヨミ: ${yomiSummary.A || 0}件 / Bヨミ: ${yomiSummary.B || 0}件 / Cヨミ: ${yomiSummary.C || 0}件
・受注済: ${yomiSummary.won || 0}件

【フィードバックの原則】
1. 📊 数値で現状を評価
2. ❓ 厳しく深掘りする質問（1〜2個）
3. 🔢 具体的な数字で指示
4. 🔥 言い訳を許さない

営業マネージャーとして、${user.name}を目標達成に導いてください。`;
};

const REPORT_TYPES = {
  morning: { id: 'morning', label: '朝の日報', icon: '🌅' },
  evening: { id: 'evening', label: '夕方の日報', icon: '🌆' },
  weekly: { id: 'weekly', label: '週報', icon: '📅' },
  free: { id: 'free', label: 'AIへ相談', icon: '💬' },
};

const getCurrentYearMonth = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; };
const getPast12Months = () => { const months = []; const now = new Date(); for (let i = 0; i < 12; i++) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `${d.getFullYear()}年${d.getMonth() + 1}月` }); } return months; };
const formatDate = (dateStr) => { if (!dateStr) return '-'; const d = new Date(dateStr); return `${d.getMonth() + 1}/${d.getDate()}`; };
const isOverdue = (dateStr) => { if (!dateStr) return false; const today = new Date(); today.setHours(0, 0, 0, 0); return new Date(dateStr) < today; };
const getDaysUntil = (dateStr) => { if (!dateStr) return null; const today = new Date(); today.setHours(0, 0, 0, 0); return Math.ceil((new Date(dateStr) - today) / (1000 * 60 * 60 * 24)); };

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [currentUserId, setCurrentUserId] = useState('takahashi');
  const [showUserSelect, setShowUserSelect] = useState(false);
  const [viewMode, setViewMode] = useState('sales');
  const [selectedReportType, setSelectedReportType] = useState('morning');
  const [reportContent, setReportContent] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reportHistory, setReportHistory] = useState([]);
  const [managerPassword, setManagerPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showKpiSettingsModal, setShowKpiSettingsModal] = useState(false);
  const [showActualModal, setShowActualModal] = useState(false);
  const [showYomiModal, setShowYomiModal] = useState(false);
  const [showYomiSettingsModal, setShowYomiSettingsModal] = useState(false);
  const [managerAnalysis, setManagerAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showExtractConfirmModal, setShowExtractConfirmModal] = useState(false);
  const [extractedData, setExtractedData] = useState({ calls: null, meetings: null, deals: null, yomis: [] });
  const [pendingReportContent, setPendingReportContent] = useState('');
  
  const [kpiSettings, setKpiSettings] = useState({ takahashi: { ...DEFAULT_KPI_SETTINGS }, kaiho: { ...DEFAULT_KPI_SETTINGS, monthlyBudget: 1200000 } });
  const [actuals, setActuals] = useState({ takahashi: { calls: 0, meetings: 0, deals: 0 }, kaiho: { calls: 0, meetings: 0, deals: 0 } });
  const [editingKpiSettings, setEditingKpiSettings] = useState({ ...DEFAULT_KPI_SETTINGS });
  const [yomiFields, setYomiFields] = useState(DEFAULT_YOMI_FIELDS);
  const [yomiData, setYomiData] = useState({});
  const [selectedYomiMonth, setSelectedYomiMonth] = useState(getCurrentYearMonth());
  const [editingYomi, setEditingYomi] = useState(null);
  const [editingYomiFields, setEditingYomiFields] = useState([]);

  const currentUser = USERS.find(u => u.id === currentUserId) || USERS[0];
  const currentKpiSettings = kpiSettings[currentUserId] || DEFAULT_KPI_SETTINGS;
  const currentKpiCalc = calculateKPI(currentKpiSettings);
  const currentActual = actuals[currentUserId] || { calls: 0, meetings: 0, deals: 0 };
  const currentYomiList = yomiData[selectedYomiMonth]?.[currentUserId] || [];

  const getOverdueYomis = (userId) => (yomiData[getCurrentYearMonth()]?.[userId] || []).filter(y => y.closingDate && isOverdue(y.closingDate) && !['won', 'lost'].includes(y.status));
  const getAllOverdueYomis = () => { const overdues = []; USERS.forEach(user => getOverdueYomis(user.id).forEach(y => overdues.push({ ...y, userName: user.name }))); return overdues; };

  useEffect(() => { if (sessionStorage.getItem('topperformer_logged_in') === 'true') setIsLoggedIn(true); }, []);
  useEffect(() => { const saved = localStorage.getItem('topperformer_data_v2'); if (saved) { const data = JSON.parse(saved); if (data.kpiSettings) setKpiSettings(data.kpiSettings); if (data.actuals) setActuals(data.actuals); if (data.yomiData) setYomiData(data.yomiData); if (data.yomiFields) setYomiFields(data.yomiFields); if (data.reportHistory) setReportHistory(data.reportHistory); } }, []);
  useEffect(() => { localStorage.setItem('topperformer_data_v2', JSON.stringify({ kpiSettings, actuals, yomiData, yomiFields, reportHistory })); }, [kpiSettings, actuals, yomiData, yomiFields, reportHistory]);

  const handleLogin = () => { if (loginPassword === LOGIN_PASSWORD) { setIsLoggedIn(true); sessionStorage.setItem('topperformer_logged_in', 'true'); setLoginError(''); } else { setLoginError('パスワードが正しくありません'); } };
  const handleLogout = () => { setIsLoggedIn(false); sessionStorage.removeItem('topperformer_logged_in'); };
  const handleUserChange = (userId) => { setCurrentUserId(userId); setShowUserSelect(false); };

  const handleSubmitReport = () => {
    if (!reportContent.trim()) return;
    const extracted = extractDataFromReport(reportContent);
    if (extracted.calls !== null || extracted.meetings !== null || extracted.deals !== null || extracted.yomis.length > 0) {
      setExtractedData(extracted);
      setPendingReportContent(reportContent);
      setShowExtractConfirmModal(true);
    } else {
      submitToAI(reportContent);
    }
  };

  const confirmExtractedData = async () => {
    const newActual = { ...currentActual };
    if (extractedData.calls !== null) newActual.calls = (newActual.calls || 0) + extractedData.calls;
    if (extractedData.meetings !== null) newActual.meetings = (newActual.meetings || 0) + extractedData.meetings;
    if (extractedData.deals !== null) newActual.deals = (newActual.deals || 0) + extractedData.deals;
    setActuals(prev => ({ ...prev, [currentUserId]: newActual }));
    
    if (extractedData.yomis.length > 0) {
      const month = getCurrentYearMonth();
      setYomiData(prev => {
        const monthData = prev[month] || {};
        const userList = [...(monthData[currentUserId] || [])];
        extractedData.yomis.forEach(newYomi => {
          const existingIndex = userList.findIndex(y => y.companyName === newYomi.companyName);
          if (existingIndex >= 0) { userList[existingIndex] = { ...userList[existingIndex], ...newYomi }; }
          else { userList.push({ id: Date.now() + Math.random(), companyName: newYomi.companyName, status: newYomi.status, monthlyFee: 0, totalAmount: 0, initialFee: 0, areaCount: 0, closingDate: '' }); }
        });
        return { ...prev, [month]: { ...monthData, [currentUserId]: userList } };
      });
    }
    setShowExtractConfirmModal(false);
    await submitToAI(pendingReportContent);
  };

  const submitToAI = async (content) => {
    setIsLoading(true); setAiResponse('');
    const systemPrompt = createAIPrompt(currentUser, currentKpiSettings, currentKpiCalc, currentActual, currentYomiList);
    try {
      const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: `${systemPrompt}\n\n【${currentUser.name}からの報告】\n${content}` }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 1500 } }) });
      const data = await response.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) { const aiText = data.candidates[0].content.parts[0].text; setAiResponse(aiText); setReportHistory(prev => [{ id: Date.now(), user: currentUser.name, userId: currentUserId, type: selectedReportType, content, aiResponse: aiText, timestamp: new Date().toISOString() }, ...prev].slice(0, 50)); setReportContent(''); }
      else { setAiResponse('エラー: AIからの応答を取得できませんでした。'); }
    } catch (error) { setAiResponse(`エラー: ${error.message}`); }
    finally { setIsLoading(false); }
  };

  const skipExtractAndSubmit = () => { setShowExtractConfirmModal(false); submitToAI(pendingReportContent); };

  const runManagerAnalysis = async () => {
    setIsAnalyzing(true); setManagerAnalysis('');
    const teamData = USERS.map(user => ({ ...user, kpiSettings: kpiSettings[user.id] || DEFAULT_KPI_SETTINGS, kpiCalc: calculateKPI(kpiSettings[user.id] || DEFAULT_KPI_SETTINGS), actual: actuals[user.id] || { calls: 0, meetings: 0, deals: 0 } }));
    const prompt = `チームデータを分析してボトルネックと改善施策を提示:\n${teamData.map(m => `${m.name}: 架電${m.actual.calls}/${m.kpiCalc.requiredCalls}, 商談${m.actual.meetings}/${m.kpiCalc.requiredMeetings}, 受注${m.actual.deals}/${m.kpiCalc.targetDeals}`).join('\n')}`;
    try {
      const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 2000 } }) });
      const data = await response.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) setManagerAnalysis(data.candidates[0].content.parts[0].text);
    } catch (error) { setManagerAnalysis(`エラー: ${error.message}`); }
    finally { setIsAnalyzing(false); }
  };

  const openKpiSettingsModal = () => { setEditingKpiSettings({ ...currentKpiSettings }); setShowKpiSettingsModal(true); };
  const saveKpiSettings = () => { setKpiSettings(prev => ({ ...prev, [currentUserId]: { ...editingKpiSettings } })); setShowKpiSettingsModal(false); };
  const openActualModal = () => setShowActualModal(true);
  const updateActualValue = (field, value) => { setActuals(prev => ({ ...prev, [currentUserId]: { ...prev[currentUserId], [field]: parseInt(value) || 0 } })); };
  const resetActuals = () => { if (window.confirm('今月の実績をリセットしますか？')) setActuals(prev => ({ ...prev, [currentUserId]: { calls: 0, meetings: 0, deals: 0 } })); };

  const openYomiModal = (yomi = null) => {
    if (yomi) { setEditingYomi({ ...yomi }); }
    else { const newYomi = { id: Date.now(), status: 'C', closingDate: '' }; yomiFields.forEach(f => { newYomi[f.id] = f.type === 'number' ? 0 : ''; }); newYomi.totalAmount = 0; setEditingYomi(newYomi); }
    setShowYomiModal(true);
  };
  const updateYomiField = (fieldId, value) => { const updated = { ...editingYomi, [fieldId]: value }; if (fieldId === 'monthlyFee') updated.totalAmount = (parseInt(value) || 0) * 12; setEditingYomi(updated); };
  const saveYomi = () => { const month = getCurrentYearMonth(); setYomiData(prev => { const monthData = prev[month] || {}; const userList = monthData[currentUserId] || []; const existingIndex = userList.findIndex(y => y.id === editingYomi.id); let newList = existingIndex >= 0 ? [...userList] : [...userList, editingYomi]; if (existingIndex >= 0) newList[existingIndex] = editingYomi; return { ...prev, [month]: { ...monthData, [currentUserId]: newList } }; }); setShowYomiModal(false); setEditingYomi(null); };
  const deleteYomi = (yomiId) => { if (!window.confirm('削除しますか？')) return; setYomiData(prev => { const monthData = prev[selectedYomiMonth] || {}; const userList = monthData[currentUserId] || []; return { ...prev, [selectedYomiMonth]: { ...monthData, [currentUserId]: userList.filter(y => y.id !== yomiId) } }; }); };
  const openYomiSettingsModal = () => { setEditingYomiFields([...yomiFields]); setShowYomiSettingsModal(true); };

  const handleManagerAccess = () => { if (viewMode === 'manager') setViewMode('sales'); else setShowPasswordModal(true); };
  const verifyManagerPassword = () => { if (managerPassword === MANAGER_PASSWORD) { setViewMode('manager'); setShowPasswordModal(false); setManagerPassword(''); } else alert('パスワードが正しくありません'); };
  const calculateProgress = (current, target) => target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const generateOptions = (max = 500) => [...Array(max + 1)].map((_, i) => i);
  const getYomiSummary = () => (yomiData[selectedYomiMonth]?.[currentUserId] || []).reduce((acc, y) => { acc[y.status] = (acc[y.status] || 0) + 1; acc.totalAmount = (acc.totalAmount || 0) + (y.totalAmount || 0); return acc; }, { A: 0, B: 0, C: 0, won: 0, lost: 0, totalAmount: 0 });
  const getTeamData = () => USERS.map(user => { const settings = kpiSettings[user.id] || DEFAULT_KPI_SETTINGS; const calc = calculateKPI(settings); const actual = actuals[user.id] || { calls: 0, meetings: 0, deals: 0 }; const dealsRate = calc.targetDeals > 0 ? Math.round((actual.deals / calc.targetDeals) * 100) : 0; let status = 'good'; if (dealsRate < 50) status = 'critical'; else if (dealsRate < 80) status = 'warning'; return { ...user, kpiSettings: settings, kpiCalc: calc, actual, dealsRate, status, overdueCount: getOverdueYomis(user.id).length }; });

  const styles = {
    loginContainer: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', fontFamily: "'Noto Sans JP', sans-serif" },
    loginBox: { backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', maxWidth: '400px', width: '90%', textAlign: 'center' },
    loginTitle: { fontSize: '24px', fontWeight: '700', color: '#1E293B', marginBottom: '8px' },
    loginSubtitle: { fontSize: '14px', color: '#64748B', marginBottom: '32px' },
    loginInput: { width: '100%', padding: '14px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '16px', marginBottom: '16px', outline: 'none', boxSizing: 'border-box' },
    loginButton: { width: '100%', padding: '14px', border: 'none', borderRadius: '8px', backgroundColor: '#2563EB', color: 'white', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
    loginError: { color: '#DC2626', fontSize: '14px', marginBottom: '16px' },
    container: { minHeight: '100vh', backgroundColor: '#F8FAFC', fontFamily: "'Noto Sans JP', sans-serif" },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', backgroundColor: 'white', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 100, flexWrap: 'wrap', gap: '8px' },
    logo: { display: 'flex', alignItems: 'center', gap: '10px' },
    logoTitle: { fontSize: '16px', fontWeight: '700', color: '#1E293B' },
    headerRight: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' },
    logoutButton: { padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: 'white', color: '#64748B', fontSize: '12px', cursor: 'pointer' },
    viewToggle: { padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: 'white', color: '#64748B', fontSize: '12px', fontWeight: '500', cursor: 'pointer' },
    viewToggleActive: { backgroundColor: '#EFF6FF', borderColor: '#2563EB', color: '#2563EB' },
    main: { padding: '16px', maxWidth: '1400px', margin: '0 auto' },
    salesLayout: { display: 'grid', gridTemplateColumns: '340px 1fr', gap: '16px' },
    leftColumn: { display: 'flex', flexDirection: 'column', gap: '12px' },
    rightColumn: { display: 'flex', flexDirection: 'column', gap: '12px' },
    card: { backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #F1F5F9' },
    cardTitle: { fontSize: '14px', fontWeight: '600', color: '#334155' },
    userBadge: { display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', backgroundColor: '#EFF6FF', borderRadius: '12px', fontSize: '12px', fontWeight: '500', color: '#2563EB', cursor: 'pointer' },
    userDropdown: { position: 'absolute', top: '100%', right: 0, marginTop: '4px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid #E2E8F0', overflow: 'hidden', zIndex: 50 },
    userOption: { padding: '8px 12px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
    userOptionActive: { backgroundColor: '#EFF6FF' },
    kpiSection: { padding: '12px 16px' },
    kpiTitle: { fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '8px', textTransform: 'uppercase' },
    kpiGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
    kpiBox: { padding: '8px', backgroundColor: '#F8FAFC', borderRadius: '6px' },
    kpiBoxLabel: { fontSize: '10px', color: '#64748B' },
    kpiBoxValue: { fontSize: '16px', fontWeight: '700', color: '#1E293B' },
    kpiBoxTarget: { fontSize: '10px', color: '#94A3B8' },
    progressSection: { padding: '12px 16px', borderTop: '1px solid #F1F5F9' },
    progressItem: { marginBottom: '10px' },
    progressHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' },
    progressLabel: { fontSize: '12px', color: '#475569' },
    progressValue: { fontSize: '12px', fontWeight: '600', color: '#1E293B' },
    progressBar: { height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: '3px', transition: 'width 0.3s' },
    actions: { display: 'flex', gap: '6px', padding: '10px 16px', borderTop: '1px solid #F1F5F9' },
    actionBtn: { flex: 1, padding: '6px', border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: 'white', fontSize: '10px', cursor: 'pointer', color: '#64748B' },
    yomiHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #F1F5F9' },
    yomiMonthSelect: { padding: '4px 8px', border: '1px solid #E2E8F0', borderRadius: '4px', fontSize: '11px' },
    yomiSummary: { display: 'flex', gap: '6px', padding: '8px 16px', backgroundColor: '#F8FAFC', flexWrap: 'wrap' },
    yomiSummaryItem: { display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px' },
    yomiList: { padding: '8px 16px', maxHeight: '160px', overflowY: 'auto' },
    yomiEmpty: { color: '#94A3B8', fontSize: '12px', textAlign: 'center', padding: '16px 0' },
    yomiRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F1F5F9', gap: '6px', flexWrap: 'wrap' },
    yomiCompany: { fontSize: '12px', fontWeight: '500', color: '#334155', minWidth: '80px' },
    yomiAmount: { fontSize: '11px', color: '#64748B' },
    yomiDate: { fontSize: '10px', padding: '2px 4px', borderRadius: '3px' },
    yomiDateNormal: { backgroundColor: '#F3F4F6', color: '#6B7280' },
    yomiDateSoon: { backgroundColor: '#FEF3C7', color: '#92400E' },
    yomiDateOverdue: { backgroundColor: '#FEE2E2', color: '#DC2626' },
    yomiStatus: { padding: '2px 6px', borderRadius: '8px', fontSize: '9px', fontWeight: '500' },
    yomiActions: { display: 'flex', gap: '3px' },
    yomiBtn: { padding: '2px 5px', border: 'none', borderRadius: '3px', fontSize: '9px', cursor: 'pointer' },
    yomiFooter: { display: 'flex', gap: '6px', padding: '8px 16px', borderTop: '1px solid #F1F5F9' },
    yomiAddBtn: { flex: 1, padding: '6px', border: '1px dashed #E2E8F0', borderRadius: '6px', backgroundColor: 'transparent', color: '#64748B', fontSize: '11px', cursor: 'pointer' },
    alertBox: { margin: '0 0 12px', padding: '8px 12px', backgroundColor: '#FEE2E2', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#DC2626' },
    aiHeader: { display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 16px', borderBottom: '1px solid #F1F5F9' },
    aiDot: { width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22C55E' },
    aiTitle: { fontSize: '14px', fontWeight: '600', color: '#334155' },
    aiResponseArea: { padding: '14px 16px', minHeight: '140px', maxHeight: '300px', overflowY: 'auto' },
    loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100px', color: '#64748B', gap: '8px' },
    loadingSpinner: { width: '24px', height: '24px', border: '2px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 1s linear infinite' },
    aiResponseText: { fontSize: '13px', lineHeight: '1.6', color: '#334155', whiteSpace: 'pre-wrap' },
    aiPlaceholder: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', color: '#94A3B8', fontSize: '12px' },
    reportTabs: { display: 'flex', padding: '8px 12px', gap: '4px', borderBottom: '1px solid #F1F5F9', overflowX: 'auto' },
    reportTab: { padding: '5px 10px', border: 'none', borderRadius: '12px', backgroundColor: 'transparent', color: '#64748B', fontSize: '11px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap' },
    reportTabActive: { backgroundColor: '#2563EB', color: 'white' },
    inputContainer: { padding: '12px 16px' },
    textarea: { width: '100%', minHeight: '80px', padding: '10px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', lineHeight: '1.5', color: '#334155', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
    inputFooter: { display: 'flex', justifyContent: 'flex-end', padding: '8px 16px', borderTop: '1px solid #F1F5F9', backgroundColor: '#FAFBFC' },
    submitButton: { display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', border: 'none', borderRadius: '6px', backgroundColor: '#2563EB', color: 'white', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
    managerLayout: { display: 'flex', flexDirection: 'column', gap: '16px' },
    managerCard: { backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px', overflowX: 'auto' },
    managerTitle: { fontSize: '14px', fontWeight: '600', color: '#1E293B', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' },
    table: { width: '100%', borderCollapse: 'collapse', minWidth: '600px', fontSize: '12px' },
    th: { padding: '8px 6px', backgroundColor: '#F8FAFC', fontWeight: '600', color: '#64748B', textAlign: 'left', borderBottom: '1px solid #E2E8F0' },
    td: { padding: '10px 6px', color: '#334155', borderBottom: '1px solid #F1F5F9' },
    statusBadge: { display: 'inline-block', padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: '500' },
    overdueAlert: { backgroundColor: '#FEE2E2', color: '#DC2626', padding: '1px 4px', borderRadius: '3px', fontSize: '9px', marginLeft: '3px' },
    analysisBtn: { padding: '8px 16px', border: 'none', borderRadius: '6px', backgroundColor: '#2563EB', color: 'white', fontSize: '12px', fontWeight: '600', cursor: 'pointer', marginBottom: '12px' },
    analysisArea: { padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' },
    modal: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', maxWidth: '450px', width: '100%', maxHeight: '85vh', overflowY: 'auto' },
    modalTitle: { fontSize: '16px', fontWeight: '600', color: '#1E293B', marginBottom: '12px' },
    modalText: { fontSize: '12px', color: '#64748B', marginBottom: '12px' },
    modalInput: { width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' },
    modalSelect: { width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', backgroundColor: 'white' },
    modalLabel: { fontSize: '11px', color: '#64748B', marginBottom: '3px', display: 'block' },
    modalButtons: { display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' },
    modalCancel: { padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: 'white', color: '#64748B', fontSize: '12px', cursor: 'pointer' },
    modalConfirm: { padding: '8px 12px', border: 'none', borderRadius: '6px', backgroundColor: '#2563EB', color: 'white', fontSize: '12px', cursor: 'pointer' },
    formGroup: { marginBottom: '12px' },
    formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
    kpiSettingSection: { marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' },
    kpiSettingTitle: { fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '8px' },
    extractItem: { padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '6px', marginBottom: '8px' },
    extractLabel: { fontSize: '11px', color: '#64748B', marginBottom: '4px' },
    extractValue: { fontSize: '14px', fontWeight: '600', color: '#1E293B' },
    extractInput: { width: '80px', padding: '4px 8px', border: '1px solid #E2E8F0', borderRadius: '4px', fontSize: '13px', marginLeft: '8px' },
    yomiExtractRow: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', backgroundColor: '#F8FAFC', borderRadius: '6px', marginBottom: '6px' },
  };

  if (!isLoggedIn) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <svg width="40" height="40" viewBox="0 0 32 32" fill="none" style={{margin: '0 auto 20px', display: 'block'}}><rect width="32" height="32" rx="8" fill="#2563EB"/><path d="M8 12h16M8 16h12M8 20h14M22 20l4-4-4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <h1 style={styles.loginTitle}>TopPerformer</h1>
          <p style={styles.loginSubtitle}>KPI逆算型 営業マネジメントAI</p>
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
  const callsProgress = calculateProgress(currentActual.calls, currentKpiCalc.requiredCalls);
  const meetingsProgress = calculateProgress(currentActual.meetings, currentKpiCalc.requiredMeetings);
  const dealsProgress = calculateProgress(currentActual.deals, currentKpiCalc.targetDeals);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logo}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#2563EB"/><path d="M8 12h16M8 16h12M8 20h14M22 20l4-4-4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span style={styles.logoTitle}>TopPerformer</span>
        </div>
        <div style={styles.headerRight}>
          <button style={styles.logoutButton} onClick={handleLogout}>ログアウト</button>
          <button style={{...styles.viewToggle, ...(viewMode === 'sales' ? styles.viewToggleActive : {})}} onClick={() => setViewMode('sales')}>営業</button>
          <button style={{...styles.viewToggle, ...(viewMode === 'manager' ? styles.viewToggleActive : {})}} onClick={handleManagerAccess}>管理者</button>
        </div>
      </header>

      <main style={styles.main}>
        {viewMode === 'sales' ? (
          <div style={{...styles.salesLayout, gridTemplateColumns: window.innerWidth <= 900 ? '1fr' : '340px 1fr'}}>
            <div style={styles.leftColumn}>
              {overdueYomis.length > 0 && <div style={styles.alertBox}>⚠️ 期日超過 {overdueYomis.length}件</div>}
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <span style={styles.cardTitle}>📊 KPI逆算</span>
                  <div style={{position: 'relative'}}>
                    <div style={styles.userBadge} onClick={() => setShowUserSelect(!showUserSelect)}>{currentUser.icon} {currentUser.name} ▼</div>
                    {showUserSelect && <div style={styles.userDropdown}>{USERS.map(user => <div key={user.id} style={{...styles.userOption, ...(user.id === currentUserId ? styles.userOptionActive : {})}} onClick={() => handleUserChange(user.id)}>{user.icon} {user.name}</div>)}</div>}
                  </div>
                </div>
                <div style={styles.kpiSection}>
                  <div style={styles.kpiTitle}>月間目標（逆算）</div>
                  <div style={styles.kpiGrid}>
                    <div style={styles.kpiBox}><div style={styles.kpiBoxLabel}>必要架電数</div><div style={styles.kpiBoxValue}>{currentKpiCalc.requiredCalls}</div><div style={styles.kpiBoxTarget}>件/月</div></div>
                    <div style={styles.kpiBox}><div style={styles.kpiBoxLabel}>必要商談数</div><div style={styles.kpiBoxValue}>{currentKpiCalc.requiredMeetings}</div><div style={styles.kpiBoxTarget}>件/月</div></div>
                    <div style={styles.kpiBox}><div style={styles.kpiBoxLabel}>目標受注数</div><div style={styles.kpiBoxValue}>{currentKpiCalc.targetDeals}</div><div style={styles.kpiBoxTarget}>件/月</div></div>
                    <div style={styles.kpiBox}><div style={styles.kpiBoxLabel}>1日架電目標</div><div style={styles.kpiBoxValue}>{currentKpiCalc.dailyRequiredCalls}</div><div style={styles.kpiBoxTarget}>件/日</div></div>
                  </div>
                </div>
                <div style={styles.progressSection}>
                  <div style={styles.kpiTitle}>今月の進捗</div>
                  <div style={styles.progressItem}><div style={styles.progressHeader}><span style={styles.progressLabel}>架電数</span><span style={styles.progressValue}>{currentActual.calls} / {currentKpiCalc.requiredCalls}（{Math.round(callsProgress)}%）</span></div><div style={styles.progressBar}><div style={{...styles.progressFill, width: `${callsProgress}%`, backgroundColor: callsProgress >= 80 ? '#22C55E' : callsProgress >= 50 ? '#F59E0B' : '#DC2626'}}/></div></div>
                  <div style={styles.progressItem}><div style={styles.progressHeader}><span style={styles.progressLabel}>商談数</span><span style={styles.progressValue}>{currentActual.meetings} / {currentKpiCalc.requiredMeetings}（{Math.round(meetingsProgress)}%）</span></div><div style={styles.progressBar}><div style={{...styles.progressFill, width: `${meetingsProgress}%`, backgroundColor: meetingsProgress >= 80 ? '#22C55E' : meetingsProgress >= 50 ? '#F59E0B' : '#DC2626'}}/></div></div>
                  <div style={styles.progressItem}><div style={styles.progressHeader}><span style={styles.progressLabel}>受注数</span><span style={styles.progressValue}>{currentActual.deals} / {currentKpiCalc.targetDeals}（{Math.round(dealsProgress)}%）</span></div><div style={styles.progressBar}><div style={{...styles.progressFill, width: `${dealsProgress}%`, backgroundColor: dealsProgress >= 80 ? '#22C55E' : dealsProgress >= 50 ? '#F59E0B' : '#DC2626'}}/></div></div>
                </div>
                <div style={styles.actions}>
                  <button style={styles.actionBtn} onClick={openKpiSettingsModal}>⚙️ KPI設定</button>
                  <button style={styles.actionBtn} onClick={openActualModal}>✏️ 実績修正</button>
                  <button style={styles.actionBtn} onClick={resetActuals}>🔄 リセット</button>
                </div>
              </div>
              <div style={styles.card}>
                <div style={styles.yomiHeader}><span style={styles.cardTitle}>📋 ヨミ表</span><select style={styles.yomiMonthSelect} value={selectedYomiMonth} onChange={(e) => setSelectedYomiMonth(e.target.value)}>{getPast12Months().map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
                <div style={styles.yomiSummary}>{YOMI_STATUS.slice(0, 3).map(s => <div key={s.id} style={styles.yomiSummaryItem}><span style={{...styles.yomiStatus, backgroundColor: s.bgColor, color: s.color}}>{s.label}</span><span>{yomiSummary[s.id] || 0}</span></div>)}</div>
                <div style={styles.yomiList}>
                  {currentYomiList.length === 0 ? <p style={styles.yomiEmpty}>案件なし</p> : currentYomiList.map(yomi => {
                    const status = YOMI_STATUS.find(s => s.id === yomi.status);
                    const daysUntil = getDaysUntil(yomi.closingDate);
                    const overdue = isOverdue(yomi.closingDate) && !['won', 'lost'].includes(yomi.status);
                    let dateStyle = styles.yomiDateNormal;
                    if (overdue) dateStyle = styles.yomiDateOverdue;
                    else if (daysUntil !== null && daysUntil <= 3 && daysUntil >= 0) dateStyle = styles.yomiDateSoon;
                    return (
                      <div key={yomi.id} style={styles.yomiRow}>
                        <span style={styles.yomiCompany}>{yomi.companyName || '-'}</span>
                        <span style={styles.yomiAmount}>{(yomi.totalAmount || 0).toLocaleString()}円</span>
                        {yomi.closingDate && <span style={{...styles.yomiDate, ...dateStyle}}>{formatDate(yomi.closingDate)}</span>}
                        <span style={{...styles.yomiStatus, backgroundColor: status?.bgColor, color: status?.color}}>{status?.label}</span>
                        {isCurrentMonth && <div style={styles.yomiActions}><button style={{...styles.yomiBtn, backgroundColor: '#EFF6FF', color: '#2563EB'}} onClick={() => openYomiModal(yomi)}>編集</button><button style={{...styles.yomiBtn, backgroundColor: '#FEE2E2', color: '#DC2626'}} onClick={() => deleteYomi(yomi.id)}>削除</button></div>}
                      </div>
                    );
                  })}
                </div>
                {isCurrentMonth && <div style={styles.yomiFooter}><button style={styles.yomiAddBtn} onClick={() => openYomiModal()}>+ 案件追加</button><button style={{...styles.yomiAddBtn, flex: 'none', padding: '6px 10px'}} onClick={openYomiSettingsModal}>⚙️</button></div>}
              </div>
            </div>
            <div style={styles.rightColumn}>
              <div style={styles.card}>
                <div style={styles.aiHeader}><span style={styles.aiDot}></span><span style={styles.aiTitle}>AIマネージャー</span></div>
                <div style={styles.aiResponseArea}>
                  {isLoading ? <div style={styles.loadingContainer}><div style={styles.loadingSpinner}></div><p style={{fontSize: '12px'}}>分析中...</p></div> : aiResponse ? <div style={styles.aiResponseText}>{aiResponse}</div> : <div style={styles.aiPlaceholder}>報告を提出するとフィードバックします</div>}
                </div>
              </div>
              <div style={styles.card}>
                <div style={styles.reportTabs}>{Object.values(REPORT_TYPES).map(type => <button key={type.id} style={{...styles.reportTab, ...(selectedReportType === type.id ? styles.reportTabActive : {})}} onClick={() => setSelectedReportType(type.id)}>{type.label}</button>)}</div>
                <div style={styles.inputContainer}><textarea style={styles.textarea} value={reportContent} onChange={(e) => setReportContent(e.target.value)} placeholder="今日の架電数、商談数、商談結果、ヨミ、課題などを報告してください" /></div>
                <div style={styles.inputFooter}><button style={styles.submitButton} onClick={handleSubmitReport} disabled={isLoading}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>提出</button></div>
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.managerLayout}>
            {allOverdueYomis.length > 0 && <div style={styles.alertBox}>⚠️ 期日超過: {allOverdueYomis.map(y => `${y.userName}/${y.companyName}`).join(', ')}</div>}
            <div style={styles.managerCard}>
              <h2 style={styles.managerTitle}>👥 チーム状況</h2>
              <table style={styles.table}>
                <thead><tr><th style={styles.th}>メンバー</th><th style={styles.th}>架電</th><th style={styles.th}>商談</th><th style={styles.th}>受注</th><th style={styles.th}>状態</th></tr></thead>
                <tbody>{getTeamData().map(m => <tr key={m.id}><td style={styles.td}>{m.icon} {m.name}{m.overdueCount > 0 && <span style={styles.overdueAlert}>⚠️{m.overdueCount}</span>}</td><td style={styles.td}>{m.actual.calls}/{m.kpiCalc.requiredCalls}</td><td style={styles.td}>{m.actual.meetings}/{m.kpiCalc.requiredMeetings}</td><td style={styles.td}>{m.actual.deals}/{m.kpiCalc.targetDeals}</td><td style={styles.td}><span style={{...styles.statusBadge, backgroundColor: m.status === 'good' ? '#DEF7EC' : m.status === 'warning' ? '#FEF3C7' : '#FEE2E2', color: m.status === 'good' ? '#03543F' : m.status === 'warning' ? '#92400E' : '#991B1B'}}>{m.status === 'good' ? '良好' : m.status === 'warning' ? '要注意' : '要対応'}</span></td></tr>)}</tbody>
              </table>
            </div>
            <div style={styles.managerCard}>
              <h2 style={styles.managerTitle}>🔍 ボトルネック分析</h2>
              <button style={styles.analysisBtn} onClick={runManagerAnalysis} disabled={isAnalyzing}>{isAnalyzing ? '分析中...' : 'AIでチームを分析'}</button>
              {managerAnalysis && <div style={styles.analysisArea}>{managerAnalysis}</div>}
            </div>
          </div>
        )}
      </main>

      {showExtractConfirmModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>📝 報告内容の確認</h3>
            <p style={styles.modalText}>報告から以下のデータを検出しました。確認・修正して登録してください。</p>
            {(extractedData.calls !== null || extractedData.meetings !== null || extractedData.deals !== null) && (
              <div style={{marginBottom: '16px'}}>
                <div style={styles.kpiSettingTitle}>実績（加算）</div>
                {extractedData.calls !== null && <div style={styles.extractItem}><div style={styles.extractLabel}>架電数</div><div style={{display: 'flex', alignItems: 'center'}}><span style={styles.extractValue}>+</span><input type="number" style={styles.extractInput} value={extractedData.calls} onChange={(e) => setExtractedData({...extractedData, calls: parseInt(e.target.value) || 0})} /><span style={{marginLeft: '4px', fontSize: '12px'}}>件</span></div></div>}
                {extractedData.meetings !== null && <div style={styles.extractItem}><div style={styles.extractLabel}>商談数</div><div style={{display: 'flex', alignItems: 'center'}}><span style={styles.extractValue}>+</span><input type="number" style={styles.extractInput} value={extractedData.meetings} onChange={(e) => setExtractedData({...extractedData, meetings: parseInt(e.target.value) || 0})} /><span style={{marginLeft: '4px', fontSize: '12px'}}>件</span></div></div>}
                {extractedData.deals !== null && <div style={styles.extractItem}><div style={styles.extractLabel}>受注数</div><div style={{display: 'flex', alignItems: 'center'}}><span style={styles.extractValue}>+</span><input type="number" style={styles.extractInput} value={extractedData.deals} onChange={(e) => setExtractedData({...extractedData, deals: parseInt(e.target.value) || 0})} /><span style={{marginLeft: '4px', fontSize: '12px'}}>件</span></div></div>}
              </div>
            )}
            {extractedData.yomis.length > 0 && (
              <div>
                <div style={styles.kpiSettingTitle}>ヨミ表（追加/更新）</div>
                {extractedData.yomis.map((yomi, index) => (
                  <div key={index} style={styles.yomiExtractRow}>
                    <input type="text" style={{...styles.modalInput, flex: 1}} value={yomi.companyName} onChange={(e) => { const newYomis = [...extractedData.yomis]; newYomis[index] = {...newYomis[index], companyName: e.target.value}; setExtractedData({...extractedData, yomis: newYomis}); }} />
                    <select style={{...styles.modalSelect, width: '90px'}} value={yomi.status} onChange={(e) => { const newYomis = [...extractedData.yomis]; newYomis[index] = {...newYomis[index], status: e.target.value}; setExtractedData({...extractedData, yomis: newYomis}); }}>{YOMI_STATUS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
                    <button style={{padding: '4px 8px', border: 'none', borderRadius: '4px', backgroundColor: '#FEE2E2', color: '#DC2626', fontSize: '11px', cursor: 'pointer'}} onClick={() => setExtractedData({...extractedData, yomis: extractedData.yomis.filter((_, i) => i !== index)})}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div style={styles.modalButtons}><button style={styles.modalCancel} onClick={skipExtractAndSubmit}>スキップ</button><button style={styles.modalConfirm} onClick={confirmExtractedData}>登録して提出</button></div>
          </div>
        </div>
      )}

      {showPasswordModal && <div style={styles.modalOverlay}><div style={styles.modal}><h3 style={styles.modalTitle}>管理者パスワード</h3><input type="password" style={styles.modalInput} placeholder="パスワード" value={managerPassword} onChange={(e) => setManagerPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && verifyManagerPassword()} /><div style={styles.modalButtons}><button style={styles.modalCancel} onClick={() => setShowPasswordModal(false)}>キャンセル</button><button style={styles.modalConfirm} onClick={verifyManagerPassword}>ログイン</button></div></div></div>}

      {showKpiSettingsModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>⚙️ {currentUser.name}のKPI設定</h3>
            <div style={styles.kpiSettingSection}><div style={styles.kpiSettingTitle}>①営業KPI</div><div style={styles.formGroup}><label style={styles.modalLabel}>月間受注予算（円）</label><input type="number" style={styles.modalInput} value={editingKpiSettings.monthlyBudget} onChange={(e) => setEditingKpiSettings({...editingKpiSettings, monthlyBudget: parseInt(e.target.value) || 0})} /></div><div style={styles.formRow}><div style={styles.formGroup}><label style={styles.modalLabel}>平均受注単価（円）</label><input type="number" style={styles.modalInput} value={editingKpiSettings.avgOrderPrice} onChange={(e) => setEditingKpiSettings({...editingKpiSettings, avgOrderPrice: parseInt(e.target.value) || 0})} /></div><div style={styles.formGroup}><label style={styles.modalLabel}>受注率（%）</label><input type="number" style={styles.modalInput} value={editingKpiSettings.conversionRate * 100} onChange={(e) => setEditingKpiSettings({...editingKpiSettings, conversionRate: (parseFloat(e.target.value) || 0) / 100})} /></div></div><div style={styles.formGroup}><label style={styles.modalLabel}>アポ率（%）</label><input type="number" style={styles.modalInput} value={editingKpiSettings.appointmentRate * 100} onChange={(e) => setEditingKpiSettings({...editingKpiSettings, appointmentRate: (parseFloat(e.target.value) || 0) / 100})} /></div></div>
            <div style={styles.kpiSettingSection}><div style={styles.kpiSettingTitle}>②架電可能日数</div><div style={styles.formRow}><div style={styles.formGroup}><label style={styles.modalLabel}>月内営業日数</label><input type="number" style={styles.modalInput} value={editingKpiSettings.monthlyWorkDays} onChange={(e) => setEditingKpiSettings({...editingKpiSettings, monthlyWorkDays: parseInt(e.target.value) || 0})} /></div><div style={styles.formGroup}><label style={styles.modalLabel}>定休日数</label><input type="number" style={styles.modalInput} value={editingKpiSettings.holidayDays} onChange={(e) => setEditingKpiSettings({...editingKpiSettings, holidayDays: parseInt(e.target.value) || 0})} /></div></div></div>
            <div style={styles.kpiSettingSection}><div style={styles.kpiSettingTitle}>③日次KPI</div><div style={styles.formRow}><div style={styles.formGroup}><label style={styles.modalLabel}>1日架電可能時間（分）</label><input type="number" style={styles.modalInput} value={editingKpiSettings.dailyCallTime} onChange={(e) => setEditingKpiSettings({...editingKpiSettings, dailyCallTime: parseInt(e.target.value) || 0})} /></div><div style={styles.formGroup}><label style={styles.modalLabel}>1架電あたり時間（分）</label><input type="number" style={styles.modalInput} value={editingKpiSettings.timePerCall} onChange={(e) => setEditingKpiSettings({...editingKpiSettings, timePerCall: parseInt(e.target.value) || 0})} /></div></div></div>
            <div style={{padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '6px', fontSize: '11px'}}><strong>計算結果:</strong> 必要架電数: {calculateKPI(editingKpiSettings).requiredCalls}件/月 / 1日: {calculateKPI(editingKpiSettings).dailyRequiredCalls}件</div>
            <div style={styles.modalButtons}><button style={styles.modalCancel} onClick={() => setShowKpiSettingsModal(false)}>キャンセル</button><button style={styles.modalConfirm} onClick={saveKpiSettings}>保存</button></div>
          </div>
        </div>
      )}

      {showActualModal && <div style={styles.modalOverlay}><div style={styles.modal}><h3 style={styles.modalTitle}>✏️ 実績修正</h3><div style={styles.formGroup}><label style={styles.modalLabel}>架電数</label><select style={styles.modalSelect} value={currentActual.calls} onChange={(e) => updateActualValue('calls', e.target.value)}>{generateOptions().map(n => <option key={n} value={n}>{n}</option>)}</select></div><div style={styles.formGroup}><label style={styles.modalLabel}>商談数</label><select style={styles.modalSelect} value={currentActual.meetings} onChange={(e) => updateActualValue('meetings', e.target.value)}>{generateOptions(100).map(n => <option key={n} value={n}>{n}</option>)}</select></div><div style={styles.formGroup}><label style={styles.modalLabel}>受注数</label><select style={styles.modalSelect} value={currentActual.deals} onChange={(e) => updateActualValue('deals', e.target.value)}>{generateOptions(50).map(n => <option key={n} value={n}>{n}</option>)}</select></div><div style={styles.modalButtons}><button style={styles.modalCancel} onClick={() => setShowActualModal(false)}>閉じる</button></div></div></div>}

      {showYomiModal && editingYomi && <div style={styles.modalOverlay}><div style={styles.modal}><h3 style={styles.modalTitle}>📋 案件入力</h3>{yomiFields.map(field => <div key={field.id} style={styles.formGroup}><label style={styles.modalLabel}>{field.name}</label><input type={field.type === 'number' ? 'number' : 'text'} style={styles.modalInput} value={editingYomi[field.id] || ''} onChange={(e) => updateYomiField(field.id, e.target.value)} /></div>)}<div style={styles.formGroup}><label style={styles.modalLabel}>受注金額（月額×12）</label><input type="text" style={styles.modalInput} value={`${(editingYomi.totalAmount || 0).toLocaleString()}円`} readOnly /></div><div style={styles.formGroup}><label style={styles.modalLabel}>クロージング予定日</label><input type="date" style={styles.modalInput} value={editingYomi.closingDate || ''} onChange={(e) => setEditingYomi({...editingYomi, closingDate: e.target.value})} /></div><div style={styles.formGroup}><label style={styles.modalLabel}>ステータス</label><select style={styles.modalSelect} value={editingYomi.status || 'C'} onChange={(e) => setEditingYomi({...editingYomi, status: e.target.value})}>{YOMI_STATUS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div><div style={styles.modalButtons}><button style={styles.modalCancel} onClick={() => setShowYomiModal(false)}>キャンセル</button><button style={styles.modalConfirm} onClick={saveYomi}>保存</button></div></div></div>}

      {showYomiSettingsModal && <div style={styles.modalOverlay}><div style={styles.modal}><h3 style={styles.modalTitle}>⚙️ ヨミ表項目設定</h3>{editingYomiFields.map((field, index) => <div key={field.id} style={{display: 'grid', gridTemplateColumns: '1fr 70px 50px 30px', gap: '6px', marginBottom: '8px'}}><input type="text" style={styles.modalInput} placeholder="項目名" value={field.name} onChange={(e) => { const newFields = [...editingYomiFields]; newFields[index] = {...newFields[index], name: e.target.value}; setEditingYomiFields(newFields); }} /><select style={styles.modalSelect} value={field.type} onChange={(e) => { const newFields = [...editingYomiFields]; newFields[index] = {...newFields[index], type: e.target.value}; setEditingYomiFields(newFields); }}><option value="text">文字</option><option value="number">数値</option></select><input type="text" style={styles.modalInput} placeholder="単位" value={field.unit || ''} onChange={(e) => { const newFields = [...editingYomiFields]; newFields[index] = {...newFields[index], unit: e.target.value}; setEditingYomiFields(newFields); }} /><button style={{padding: '4px', border: 'none', borderRadius: '4px', backgroundColor: '#FEE2E2', color: '#DC2626', cursor: 'pointer'}} onClick={() => setEditingYomiFields(editingYomiFields.filter((_, i) => i !== index))}>✕</button></div>)}<button style={{width: '100%', padding: '6px', border: '1px dashed #E2E8F0', borderRadius: '6px', backgroundColor: 'transparent', color: '#64748B', fontSize: '11px', cursor: 'pointer', marginTop: '8px'}} onClick={() => setEditingYomiFields([...editingYomiFields, { id: `custom_${Date.now()}`, name: '', type: 'text', unit: '' }])}>+ 項目追加</button><div style={styles.modalButtons}><button style={styles.modalCancel} onClick={() => setShowYomiSettingsModal(false)}>キャンセル</button><button style={styles.modalConfirm} onClick={() => { setYomiFields(editingYomiFields.filter(f => f.name.trim())); setShowYomiSettingsModal(false); }}>保存</button></div></div></div>}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

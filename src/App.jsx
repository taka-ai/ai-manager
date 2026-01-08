import React, { useState, useEffect } from 'react';

// ============================================
// TopPerformer - AI Sales Manager
// 「報告を、戦略に変える」
// KPI逆算設計 + 厳格マネジメント
// ============================================

const GEMINI_API_KEY = 'AIzaSyAUGPoHfMrgQ125bGUZsvZWsByZe5ZZwRE';
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const LOGIN_PASSWORD = 'Lvntech2026';
const MANAGER_PASSWORD = 'Lvntechkamuro';

const USERS = [
  { id: 'takahashi', name: '髙橋', role: 'リーダー', icon: '👑' },
  { id: 'kaiho', name: '海保', role: '', icon: '👤' },
];

// デフォルトKPI設定（逆算設計）
const DEFAULT_KPI_SETTINGS = {
  // ①営業KPI
  monthlyBudget: 1680000,        // 月間受注予算(円/月)
  avgOrderPrice: 10000,          // 平均受注単価(円)
  conversionRate: 0.30,          // 受注率(商談→受注)
  appointmentRate: 0.15,         // アポ率(架電→商談)
  // ②架電可能日数
  monthlyWorkDays: 20,           // 月内営業日数
  holidayDays: 5,                // 不動産会社定休日(火・水)
  // ③日次KPI
  dailyCallTime: 420,            // 1日架電可能時間(分)
  timePerCall: 20,               // 1架電あたり時間(分)
};

// KPIを計算する関数
const calculateKPI = (settings) => {
  const s = settings;
  // 月次
  const targetAreas = Math.ceil(s.monthlyBudget / s.avgOrderPrice / 12);
  const targetDeals = targetAreas;
  const requiredMeetings = Math.ceil(targetDeals / s.conversionRate);
  const requiredCalls = Math.ceil(requiredMeetings / s.appointmentRate);
  // 架電可能日数
  const callableDays = s.monthlyWorkDays - s.holidayDays;
  // 日次
  const dailyRequiredCalls = Math.ceil(requiredCalls / callableDays);
  const maxDailyCalls = Math.floor(s.dailyCallTime / s.timePerCall);
  const isAchievable = dailyRequiredCalls <= maxDailyCalls;
  
  return {
    targetAreas,
    targetDeals,
    requiredMeetings,
    requiredCalls,
    callableDays,
    dailyRequiredCalls,
    maxDailyCalls,
    isAchievable,
    // 週次換算
    weeklyRequiredCalls: Math.ceil(requiredCalls / 4),
    weeklyRequiredMeetings: Math.ceil(requiredMeetings / 4),
    weeklyRequiredDeals: Math.ceil(targetDeals / 4),
  };
};

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

// 厳格なAIマネージャープロンプト
const createAIPrompt = (user, kpiSettings, kpiCalc, actuals, yomis) => {
  const progress = {
    calls: actuals.calls || 0,
    meetings: actuals.meetings || 0,
    deals: actuals.deals || 0,
    areas: actuals.areas || 0,
  };
  
  const callsRate = kpiCalc.requiredCalls > 0 ? Math.round((progress.calls / kpiCalc.requiredCalls) * 100) : 0;
  const meetingsRate = kpiCalc.requiredMeetings > 0 ? Math.round((progress.meetings / kpiCalc.requiredMeetings) * 100) : 0;
  const dealsRate = kpiCalc.targetDeals > 0 ? Math.round((progress.deals / kpiCalc.targetDeals) * 100) : 0;
  
  const yomiSummary = yomis.reduce((acc, y) => {
    acc[y.status] = (acc[y.status] || 0) + 1;
    acc.totalAmount = (acc.totalAmount || 0) + (y.totalAmount || 0);
    return acc;
  }, {});

  return `あなたは「TopPerformer」の厳格なAI営業マネージャーです。

【絶対的な行動原則】
あなたは「勝たせるマネージャー」であり、決して甘い指導は行いません。
営業は「行動量」が全てであり、目標未達の原因は必ず「行動量不足」か「率の問題」のどちらかです。
「物理的に達成不可能」「設計の問題」という言い訳は、KPI設計が破綻している場合以外は認めません。

【KPI逆算設計の理解】
このKPIは「予算→受注→商談→アポイント→架電→稼働時間」の流れで、ゴールから逆算して設計されています。
感覚的な努力ではなく、数値と構造で管理される再現性のあるプロセスです。

【${user.name}さんのKPI設定】
■月間目標
・月間受注予算: ${kpiSettings.monthlyBudget.toLocaleString()}円
・目標受注数: ${kpiCalc.targetDeals}件
・必要商談数: ${kpiCalc.requiredMeetings}件（受注率${(kpiSettings.conversionRate * 100).toFixed(0)}%で逆算）
・必要架電数: ${kpiCalc.requiredCalls}件（アポ率${(kpiSettings.appointmentRate * 100).toFixed(0)}%で逆算）

■日次目標
・架電可能日数: ${kpiCalc.callableDays}日/月
・1日あたり必要架電数: ${kpiCalc.dailyRequiredCalls}件
・1日最大架電可能数: ${kpiCalc.maxDailyCalls}件（${kpiSettings.dailyCallTime}分÷${kpiSettings.timePerCall}分/件）
・物理的達成可否: ${kpiCalc.isAchievable ? '達成可能' : '⚠️設計見直し必要'}

【現在の進捗】
・架電数: ${progress.calls}件 / ${kpiCalc.requiredCalls}件（${callsRate}%）
・商談数: ${progress.meetings}件 / ${kpiCalc.requiredMeetings}件（${meetingsRate}%）
・受注数: ${progress.deals}件 / ${kpiCalc.targetDeals}件（${dealsRate}%）

【ヨミ表状況】
・Aヨミ: ${yomiSummary.A || 0}件
・Bヨミ: ${yomiSummary.B || 0}件
・Cヨミ: ${yomiSummary.C || 0}件
・受注済: ${yomiSummary.won || 0}件
・ヨミ合計金額: ${(yomiSummary.totalAmount || 0).toLocaleString()}円

【フィードバックの原則】
1. 📊 数値で現状を評価する
   - 行動量は足りているか？
   - 進捗率は適切か？
   - 率（アポ率・受注率）は想定通りか？

2. ❓ 厳しく深掘りする質問
   - 「今日は何件架電した？」
   - 「なぜ目標に届いていない？」
   - 「残り何日で何件必要か理解しているか？」
   - 「アポ率が低い原因は何か？」

3. 🔢 具体的な数字で指示する
   - 「今日中にあと○件架電しろ」
   - 「今週中に商談を○件確保しろ」
   - 「このペースだと月末に○件不足する」

4. 🔥 言い訳を許さない
   - 「頑張ります」は不可→「いつ、何を、何件？」
   - 「物理的に無理」は不可→「では何が足りない？時間か？スキルか？」
   - 「設計がおかしい」は不可→「数字で証明しろ」

【重要】
未達時は「気合が足りない」ではなく、
「行動量が足りないのか」「率の問題なのか」を数値で判断し、
具体的な改善アクションを指示してください。

営業マネージャーとして、${user.name}を目標達成に導いてください。`;
};

// 管理者向け分析プロンプト
const createManagerAnalysisPrompt = (teamData) => {
  let analysis = `あなたは営業組織の分析AIです。以下のチームデータを分析し、各担当者のボトルネックと改善施策を提示してください。

【チーム状況】
`;
  
  teamData.forEach(member => {
    const kpi = member.kpiCalc;
    const actual = member.actual;
    const callsRate = kpi.requiredCalls > 0 ? Math.round((actual.calls / kpi.requiredCalls) * 100) : 0;
    const meetingsRate = kpi.requiredMeetings > 0 ? Math.round((actual.meetings / kpi.requiredMeetings) * 100) : 0;
    const actualAppointmentRate = actual.calls > 0 ? ((actual.meetings / actual.calls) * 100).toFixed(1) : 0;
    const actualConversionRate = actual.meetings > 0 ? ((actual.deals / actual.meetings) * 100).toFixed(1) : 0;
    
    analysis += `
■${member.name}
・架電進捗: ${actual.calls}/${kpi.requiredCalls}件（${callsRate}%）
・商談進捗: ${actual.meetings}/${kpi.requiredMeetings}件（${meetingsRate}%）
・受注進捗: ${actual.deals}/${kpi.targetDeals}件
・実績アポ率: ${actualAppointmentRate}%（目標${(member.kpiSettings.appointmentRate * 100).toFixed(0)}%）
・実績受注率: ${actualConversionRate}%（目標${(member.kpiSettings.conversionRate * 100).toFixed(0)}%）
・期日超過案件: ${member.overdueCount}件
`;
  });
  
  analysis += `
【分析してほしいこと】
1. 各担当者のボトルネック（行動量不足 or 率の問題）
2. 優先的に介入すべき担当者
3. 具体的な支援・改善施策
4. 構造的な問題があれば指摘

数値に基づいた客観的な分析をお願いします。`;
  
  return analysis;
};

const REPORT_TYPES = {
  free: { id: 'free', label: '自由入力', icon: '💬' },
  morning: { id: 'morning', label: '朝の日報', icon: '🌅' },
  evening: { id: 'evening', label: '夕方の日報', icon: '🌆' },
  weekly: { id: 'weekly', label: '週報', icon: '📅' },
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
  return new Date(dateStr) < today;
};

const getDaysUntil = (dateStr) => {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(dateStr) - today) / (1000 * 60 * 60 * 24));
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
  const [showKpiSettingsModal, setShowKpiSettingsModal] = useState(false);
  const [showActualModal, setShowActualModal] = useState(false);
  const [showYomiModal, setShowYomiModal] = useState(false);
  const [showYomiSettingsModal, setShowYomiSettingsModal] = useState(false);
  const [managerAnalysis, setManagerAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // KPI設定（ユーザーごと）
  const [kpiSettings, setKpiSettings] = useState({
    takahashi: { ...DEFAULT_KPI_SETTINGS },
    kaiho: { ...DEFAULT_KPI_SETTINGS, monthlyBudget: 1200000 },
  });
  
  // 実績（ユーザーごと）
  const [actuals, setActuals] = useState({
    takahashi: { calls: 0, meetings: 0, deals: 0, areas: 0 },
    kaiho: { calls: 0, meetings: 0, deals: 0, areas: 0 },
  });
  
  // 編集用KPI設定
  const [editingKpiSettings, setEditingKpiSettings] = useState({ ...DEFAULT_KPI_SETTINGS });
  
  // ヨミ表
  const [yomiFields, setYomiFields] = useState(DEFAULT_YOMI_FIELDS);
  const [yomiData, setYomiData] = useState({});
  const [selectedYomiMonth, setSelectedYomiMonth] = useState(getCurrentYearMonth());
  const [editingYomi, setEditingYomi] = useState(null);
  const [editingYomiFields, setEditingYomiFields] = useState([]);

  const currentUser = USERS.find(u => u.id === currentUserId) || USERS[0];
  const currentKpiSettings = kpiSettings[currentUserId] || DEFAULT_KPI_SETTINGS;
  const currentKpiCalc = calculateKPI(currentKpiSettings);
  const currentActual = actuals[currentUserId] || { calls: 0, meetings: 0, deals: 0, areas: 0 };
  const currentYomiList = yomiData[selectedYomiMonth]?.[currentUserId] || [];

  const getOverdueYomis = (userId) => {
    const list = yomiData[getCurrentYearMonth()]?.[userId] || [];
    return list.filter(y => y.closingDate && isOverdue(y.closingDate) && !['won', 'lost'].includes(y.status));
  };

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
    const saved = localStorage.getItem('topperformer_data_v2');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.kpiSettings) setKpiSettings(data.kpiSettings);
      if (data.actuals) setActuals(data.actuals);
      if (data.yomiData) setYomiData(data.yomiData);
      if (data.yomiFields) setYomiFields(data.yomiFields);
      if (data.reportHistory) setReportHistory(data.reportHistory);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('topperformer_data_v2', JSON.stringify({
      kpiSettings, actuals, yomiData, yomiFields, reportHistory
    }));
  }, [kpiSettings, actuals, yomiData, yomiFields, reportHistory]);

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

  const handleSubmitReport = async () => {
    if (!reportContent.trim()) return;
    setIsLoading(true); setAiResponse('');
    
    const systemPrompt = createAIPrompt(currentUser, currentKpiSettings, currentKpiCalc, currentActual, currentYomiList);
    
    try {
      const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${GEMINI_API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: `${systemPrompt}\n\n【${currentUser.name}からの報告】\n${reportContent}` }] }], 
          generationConfig: { temperature: 0.7, maxOutputTokens: 1500 } 
        })
      });
      const data = await response.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const aiText = data.candidates[0].content.parts[0].text;
        setAiResponse(aiText);
        setReportHistory(prev => [{ id: Date.now(), user: currentUser.name, userId: currentUserId, type: selectedReportType, content: reportContent, aiResponse: aiText, timestamp: new Date().toISOString() }, ...prev].slice(0, 50));
      } else {
        setAiResponse('エラー: AIからの応答を取得できませんでした。');
      }
    } catch (error) { setAiResponse(`エラー: ${error.message}`); }
    finally { setIsLoading(false); }
  };

  // 管理者向け分析
  const runManagerAnalysis = async () => {
    setIsAnalyzing(true);
    setManagerAnalysis('');
    
    const teamData = USERS.map(user => ({
      ...user,
      kpiSettings: kpiSettings[user.id] || DEFAULT_KPI_SETTINGS,
      kpiCalc: calculateKPI(kpiSettings[user.id] || DEFAULT_KPI_SETTINGS),
      actual: actuals[user.id] || { calls: 0, meetings: 0, deals: 0, areas: 0 },
      overdueCount: getOverdueYomis(user.id).length,
    }));
    
    const prompt = createManagerAnalysisPrompt(teamData);
    
    try {
      const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${GEMINI_API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: prompt }] }], 
          generationConfig: { temperature: 0.7, maxOutputTokens: 2000 } 
        })
      });
      const data = await response.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        setManagerAnalysis(data.candidates[0].content.parts[0].text);
      }
    } catch (error) { setManagerAnalysis(`エラー: ${error.message}`); }
    finally { setIsAnalyzing(false); }
  };

  // KPI設定
  const openKpiSettingsModal = () => {
    setEditingKpiSettings({ ...currentKpiSettings });
    setShowKpiSettingsModal(true);
  };

  const saveKpiSettings = () => {
    setKpiSettings(prev => ({ ...prev, [currentUserId]: { ...editingKpiSettings } }));
    setShowKpiSettingsModal(false);
  };

  // 実績修正
  const openActualModal = () => setShowActualModal(true);
  const updateActualValue = (field, value) => {
    setActuals(prev => ({ ...prev, [currentUserId]: { ...prev[currentUserId], [field]: parseInt(value) || 0 } }));
  };
  const resetActuals = () => {
    if (window.confirm('今月の実績をリセットしますか？')) {
      setActuals(prev => ({ ...prev, [currentUserId]: { calls: 0, meetings: 0, deals: 0, areas: 0 } }));
    }
  };

  // ヨミ表
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
    if (fieldId === 'monthlyFee') {
      updated.totalAmount = (parseInt(value) || 0) * 12;
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
    if (!window.confirm('削除しますか？')) return;
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

  const calculateProgress = (current, target) => target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const generateOptions = (max = 500) => [...Array(max + 1)].map((_, i) => i);

  const getYomiSummary = () => {
    const list = yomiData[selectedYomiMonth]?.[currentUserId] || [];
    return list.reduce((acc, y) => {
      acc[y.status] = (acc[y.status] || 0) + 1;
      acc.totalAmount = (acc.totalAmount || 0) + (y.totalAmount || 0);
      if (y.status === 'won') acc.wonAmount = (acc.wonAmount || 0) + (y.totalAmount || 0);
      return acc;
    }, { A: 0, B: 0, C: 0, won: 0, lost: 0, totalAmount: 0, wonAmount: 0 });
  };

  const getTeamData = () => {
    return USERS.map(user => {
      const settings = kpiSettings[user.id] || DEFAULT_KPI_SETTINGS;
      const calc = calculateKPI(settings);
      const actual = actuals[user.id] || { calls: 0, meetings: 0, deals: 0, areas: 0 };
      const dealsRate = calc.targetDeals > 0 ? Math.round((actual.deals / calc.targetDeals) * 100) : 0;
      let status = 'good';
      if (dealsRate < 50) status = 'critical';
      else if (dealsRate < 80) status = 'warning';
      return { ...user, kpiSettings: settings, kpiCalc: calc, actual, dealsRate, status, overdueCount: getOverdueYomis(user.id).length };
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
    // KPI逆算表示
    kpiSection: { padding: '12px 16px' },
    kpiTitle: { fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '8px', textTransform: 'uppercase' },
    kpiGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
    kpiBox: { padding: '8px', backgroundColor: '#F8FAFC', borderRadius: '6px' },
    kpiBoxLabel: { fontSize: '10px', color: '#64748B' },
    kpiBoxValue: { fontSize: '16px', fontWeight: '700', color: '#1E293B' },
    kpiBoxTarget: { fontSize: '10px', color: '#94A3B8' },
    // 進捗
    progressSection: { padding: '12px 16px', borderTop: '1px solid #F1F5F9' },
    progressItem: { marginBottom: '10px' },
    progressHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' },
    progressLabel: { fontSize: '12px', color: '#475569' },
    progressValue: { fontSize: '12px', fontWeight: '600', color: '#1E293B' },
    progressBar: { height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: '3px', transition: 'width 0.3s' },
    // アクションボタン
    actions: { display: 'flex', gap: '6px', padding: '10px 16px', borderTop: '1px solid #F1F5F9' },
    actionBtn: { flex: 1, padding: '6px', border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: 'white', fontSize: '10px', cursor: 'pointer', color: '#64748B' },
    // ヨミ表
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
    // 通知
    alertBox: { margin: '0 0 12px', padding: '8px 12px', backgroundColor: '#FEE2E2', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#DC2626' },
    // AI応答
    aiHeader: { display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 16px', borderBottom: '1px solid #F1F5F9' },
    aiDot: { width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22C55E' },
    aiTitle: { fontSize: '14px', fontWeight: '600', color: '#334155' },
    aiResponseArea: { padding: '14px 16px', minHeight: '140px', maxHeight: '300px', overflowY: 'auto' },
    loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100px', color: '#64748B', gap: '8px' },
    loadingSpinner: { width: '24px', height: '24px', border: '2px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 1s linear infinite' },
    aiResponseText: { fontSize: '13px', lineHeight: '1.6', color: '#334155', whiteSpace: 'pre-wrap' },
    aiPlaceholder: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', color: '#94A3B8', fontSize: '12px' },
    // レポート入力
    reportTabs: { display: 'flex', padding: '8px 12px', gap: '4px', borderBottom: '1px solid #F1F5F9', overflowX: 'auto' },
    reportTab: { padding: '5px 10px', border: 'none', borderRadius: '12px', backgroundColor: 'transparent', color: '#64748B', fontSize: '11px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap' },
    reportTabActive: { backgroundColor: '#2563EB', color: 'white' },
    inputContainer: { padding: '12px 16px' },
    textarea: { width: '100%', minHeight: '80px', padding: '10px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', lineHeight: '1.5', color: '#334155', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
    inputFooter: { display: 'flex', justifyContent: 'flex-end', padding: '8px 16px', borderTop: '1px solid #F1F5F9', backgroundColor: '#FAFBFC' },
    submitButton: { display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', border: 'none', borderRadius: '6px', backgroundColor: '#2563EB', color: 'white', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
    // 管理者
    managerLayout: { display: 'flex', flexDirection: 'column', gap: '16px' },
    managerCard: { backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px', overflowX: 'auto' },
    managerTitle: { fontSize: '14px', fontWeight: '600', color: '#1E293B', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' },
    table: { width: '100%', borderCollapse: 'collapse', minWidth: '800px', fontSize: '12px' },
    th: { padding: '8px 6px', backgroundColor: '#F8FAFC', fontWeight: '600', color: '#64748B', textAlign: 'left', borderBottom: '1px solid #E2E8F0' },
    td: { padding: '10px 6px', color: '#334155', borderBottom: '1px solid #F1F5F9' },
    statusBadge: { display: 'inline-block', padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: '500' },
    overdueAlert: { backgroundColor: '#FEE2E2', color: '#DC2626', padding: '1px 4px', borderRadius: '3px', fontSize: '9px', marginLeft: '3px' },
    analysisBtn: { padding: '8px 16px', border: 'none', borderRadius: '6px', backgroundColor: '#2563EB', color: 'white', fontSize: '12px', fontWeight: '600', cursor: 'pointer', marginBottom: '12px' },
    analysisArea: { padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap' },
    // モーダル
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
  
  // 進捗率計算
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
              {overdueYomis.length > 0 && (
                <div style={styles.alertBox}>⚠️ 期日超過 {overdueYomis.length}件</div>
              )}

              {/* KPI逆算ダッシュボード */}
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <span style={styles.cardTitle}>📊 KPI逆算</span>
                  <div style={{position: 'relative'}}>
                    <div style={styles.userBadge} onClick={() => setShowUserSelect(!showUserSelect)}>
                      {currentUser.icon} {currentUser.name} ▼
                    </div>
                    {showUserSelect && (
                      <div style={styles.userDropdown}>
                        {USERS.map(user => (
                          <div key={user.id} style={{...styles.userOption, ...(user.id === currentUserId ? styles.userOptionActive : {})}} onClick={() => handleUserChange(user.id)}>
                            {user.icon} {user.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div style={styles.kpiSection}>
                  <div style={styles.kpiTitle}>月間目標（逆算）</div>
                  <div style={styles.kpiGrid}>
                    <div style={styles.kpiBox}>
                      <div style={styles.kpiBoxLabel}>必要架電数</div>
                      <div style={styles.kpiBoxValue}>{currentKpiCalc.requiredCalls}</div>
                      <div style={styles.kpiBoxTarget}>件/月</div>
                    </div>
                    <div style={styles.kpiBox}>
                      <div style={styles.kpiBoxLabel}>必要商談数</div>
                      <div style={styles.kpiBoxValue}>{currentKpiCalc.requiredMeetings}</div>
                      <div style={styles.kpiBoxTarget}>件/月</div>
                    </div>
                    <div style={styles.kpiBox}>
                      <div style={styles.kpiBoxLabel}>目標受注数</div>
                      <div style={styles.kpiBoxValue}>{currentKpiCalc.targetDeals}</div>
                      <div style={styles.kpiBoxTarget}>件/月</div>
                    </div>
                    <div style={styles.kpiBox}>
                      <div style={styles.kpiBoxLabel}>1日架電目標</div>
                      <div style={styles.kpiBoxValue}>{currentKpiCalc.dailyRequiredCalls}</div>
                      <div style={styles.kpiBoxTarget}>件/日（最大{currentKpiCalc.maxDailyCalls}）</div>
                    </div>
                  </div>
                </div>

                <div style={styles.progressSection}>
                  <div style={styles.kpiTitle}>今月の進捗</div>
                  <div style={styles.progressItem}>
                    <div style={styles.progressHeader}>
                      <span style={styles.progressLabel}>架電数</span>
                      <span style={styles.progressValue}>{currentActual.calls} / {currentKpiCalc.requiredCalls}（{Math.round(callsProgress)}%）</span>
                    </div>
                    <div style={styles.progressBar}>
                      <div style={{...styles.progressFill, width: `${callsProgress}%`, backgroundColor: callsProgress >= 80 ? '#22C55E' : callsProgress >= 50 ? '#F59E0B' : '#DC2626'}}/>
                    </div>
                  </div>
                  <div style={styles.progressItem}>
                    <div style={styles.progressHeader}>
                      <span style={styles.progressLabel}>商談数</span>
                      <span style={styles.progressValue}>{currentActual.meetings} / {currentKpiCalc.requiredMeetings}（{Math.round(meetingsProgress)}%）</span>
                    </div>
                    <div style={styles.progressBar}>
                      <div style={{...styles.progressFill, width: `${meetingsProgress}%`, backgroundColor: meetingsProgress >= 80 ? '#22C55E' : meetingsProgress >= 50 ? '#F59E0B' : '#DC2626'}}/>
                    </div>
                  </div>
                  <div style={styles.progressItem}>
                    <div style={styles.progressHeader}>
                      <span style={styles.progressLabel}>受注数</span>
                      <span style={styles.progressValue}>{currentActual.deals} / {currentKpiCalc.targetDeals}（{Math.round(dealsProgress)}%）</span>
                    </div>
                    <div style={styles.progressBar}>
                      <div style={{...styles.progressFill, width: `${dealsProgress}%`, backgroundColor: dealsProgress >= 80 ? '#22C55E' : dealsProgress >= 50 ? '#F59E0B' : '#DC2626'}}/>
                    </div>
                  </div>
                </div>

                <div style={styles.actions}>
                  <button style={styles.actionBtn} onClick={openKpiSettingsModal}>⚙️ KPI設定</button>
                  <button style={styles.actionBtn} onClick={openActualModal}>✏️ 実績入力</button>
                  <button style={styles.actionBtn} onClick={resetActuals}>🔄 リセット</button>
                </div>
              </div>

              {/* ヨミ表 */}
              <div style={styles.card}>
                <div style={styles.yomiHeader}>
                  <span style={styles.cardTitle}>📋 ヨミ表</span>
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
                </div>
                <div style={styles.yomiList}>
                  {currentYomiList.length === 0 ? (
                    <p style={styles.yomiEmpty}>案件なし</p>
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
                          <span style={styles.yomiCompany}>{yomi.companyName || '-'}</span>
                          <span style={styles.yomiAmount}>{(yomi.totalAmount || 0).toLocaleString()}円</span>
                          {yomi.closingDate && <span style={{...styles.yomiDate, ...dateStyle}}>{formatDate(yomi.closingDate)}</span>}
                          <span style={{...styles.yomiStatus, backgroundColor: status?.bgColor, color: status?.color}}>{status?.label}</span>
                          {isCurrentMonth && (
                            <div style={styles.yomiActions}>
                              <button style={{...styles.yomiBtn, backgroundColor: '#EFF6FF', color: '#2563EB'}} onClick={() => openYomiModal(yomi)}>編集</button>
                              <button style={{...styles.yomiBtn, backgroundColor: '#FEE2E2', color: '#DC2626'}} onClick={() => deleteYomi(yomi.id)}>削除</button>
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
                    <button style={{...styles.yomiAddBtn, flex: 'none', padding: '6px 10px'}} onClick={openYomiSettingsModal}>⚙️</button>
                  </div>
                )}
              </div>
            </div>

            <div style={styles.rightColumn}>
              {/* AI応答 */}
              <div style={styles.card}>
                <div style={styles.aiHeader}><span style={styles.aiDot}></span><span style={styles.aiTitle}>AIマネージャー（厳格モード）</span></div>
                <div style={styles.aiResponseArea}>
                  {isLoading ? (
                    <div style={styles.loadingContainer}><div style={styles.loadingSpinner}></div><p style={{fontSize: '12px'}}>分析中...</p></div>
                  ) : aiResponse ? (
                    <div style={styles.aiResponseText}>{aiResponse}</div>
                  ) : (
                    <div style={styles.aiPlaceholder}>報告を提出するとフィードバックします</div>
                  )}
                </div>
              </div>

              {/* レポート入力 */}
              <div style={styles.card}>
                <div style={styles.reportTabs}>
                  {Object.values(REPORT_TYPES).map(type => (
                    <button key={type.id} style={{...styles.reportTab, ...(selectedReportType === type.id ? styles.reportTabActive : {})}} onClick={() => setSelectedReportType(type.id)}>{type.label}</button>
                  ))}
                </div>
                <div style={styles.inputContainer}>
                  <textarea style={styles.textarea} value={reportContent} onChange={(e) => setReportContent(e.target.value)} placeholder="今日の架電数、商談数、課題などを報告してください" />
                </div>
                <div style={styles.inputFooter}>
                  <button style={styles.submitButton} onClick={handleSubmitReport} disabled={isLoading}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                    提出
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.managerLayout}>
            {allOverdueYomis.length > 0 && (
              <div style={styles.alertBox}>⚠️ 期日超過: {allOverdueYomis.map(y => `${y.userName}/${y.companyName}`).join(', ')}</div>
            )}

            {/* チーム状況 */}
            <div style={styles.managerCard}>
              <h2 style={styles.managerTitle}>👥 チーム状況（KPI逆算ベース）</h2>
              <div style={{overflowX: 'auto'}}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>メンバー</th>
                      <th style={styles.th}>架電（実績/必要）</th>
                      <th style={styles.th}>商談（実績/必要）</th>
                      <th style={styles.th}>受注（実績/目標）</th>
                      <th style={styles.th}>実績アポ率</th>
                      <th style={styles.th}>実績受注率</th>
                      <th style={styles.th}>状態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getTeamData().map(member => {
                      const actualAppRate = member.actual.calls > 0 ? ((member.actual.meetings / member.actual.calls) * 100).toFixed(1) : '-';
                      const actualConvRate = member.actual.meetings > 0 ? ((member.actual.deals / member.actual.meetings) * 100).toFixed(1) : '-';
                      return (
                        <tr key={member.id}>
                          <td style={styles.td}>
                            {member.icon} {member.name}
                            {member.overdueCount > 0 && <span style={styles.overdueAlert}>⚠️{member.overdueCount}</span>}
                          </td>
                          <td style={styles.td}>{member.actual.calls}/{member.kpiCalc.requiredCalls}</td>
                          <td style={styles.td}>{member.actual.meetings}/{member.kpiCalc.requiredMeetings}</td>
                          <td style={styles.td}>{member.actual.deals}/{member.kpiCalc.targetDeals}</td>
                          <td style={styles.td}>{actualAppRate}%（目標{(member.kpiSettings.appointmentRate * 100).toFixed(0)}%）</td>
                          <td style={styles.td}>{actualConvRate}%（目標{(member.kpiSettings.conversionRate * 100).toFixed(0)}%）</td>
                          <td style={styles.td}>
                            <span style={{...styles.statusBadge, backgroundColor: member.status === 'good' ? '#DEF7EC' : member.status === 'warning' ? '#FEF3C7' : '#FEE2E2', color: member.status === 'good' ? '#03543F' : member.status === 'warning' ? '#92400E' : '#991B1B'}}>
                              {member.status === 'good' ? '良好' : member.status === 'warning' ? '要注意' : '要対応'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI分析 */}
            <div style={styles.managerCard}>
              <h2 style={styles.managerTitle}>🔍 ボトルネック分析</h2>
              <button style={styles.analysisBtn} onClick={runManagerAnalysis} disabled={isAnalyzing}>
                {isAnalyzing ? '分析中...' : 'AIでチームを分析'}
              </button>
              {managerAnalysis && (
                <div style={styles.analysisArea}>{managerAnalysis}</div>
              )}
            </div>

            {/* 担当者別ヨミ表 */}
            <div style={styles.managerCard}>
              <h2 style={styles.managerTitle}>📋 担当者別ヨミ表</h2>
              {USERS.map(user => {
                const userYomis = yomiData[getCurrentYearMonth()]?.[user.id] || [];
                return (
                  <div key={user.id} style={{marginBottom: '16px'}}>
                    <div style={{fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '8px'}}>{user.icon} {user.name}（{userYomis.length}件）</div>
                    {userYomis.length === 0 ? (
                      <p style={{fontSize: '11px', color: '#94A3B8'}}>案件なし</p>
                    ) : (
                      <table style={{...styles.table, minWidth: '400px'}}>
                        <thead>
                          <tr>
                            <th style={styles.th}>会社名</th>
                            <th style={styles.th}>金額</th>
                            <th style={styles.th}>期日</th>
                            <th style={styles.th}>状態</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userYomis.map(yomi => {
                            const status = YOMI_STATUS.find(s => s.id === yomi.status);
                            const overdue = isOverdue(yomi.closingDate) && !['won', 'lost'].includes(yomi.status);
                            return (
                              <tr key={yomi.id}>
                                <td style={styles.td}>{yomi.companyName || '-'}</td>
                                <td style={styles.td}>{(yomi.totalAmount || 0).toLocaleString()}円</td>
                                <td style={styles.td}>{yomi.closingDate ? formatDate(yomi.closingDate) : '-'}{overdue && <span style={styles.overdueAlert}>超過</span>}</td>
                                <td style={styles.td}><span style={{...styles.statusBadge, backgroundColor: status?.bgColor, color: status?.color}}>{status?.label}</span></td>
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

      {/* モーダル群 */}
      {showPasswordModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>管理者パスワード</h3>
            <input type="password" style={styles.modalInput} placeholder="パスワード" value={managerPassword} onChange={(e) => setManagerPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && verifyManagerPassword()} />
            <div style={styles.modalButtons}>
              <button style={styles.modalCancel} onClick={() => setShowPasswordModal(false)}>キャンセル</button>
              <button style={styles.modalConfirm} onClick={verifyManagerPassword}>ログイン</button>
            </div>
          </div>
        </div>
      )}

      {showKpiSettingsModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>⚙️ {currentUser.name}のKPI設定</h3>
            <p style={styles.modalText}>予算→受注→商談→架電を逆算します</p>
            
            <div style={styles.kpiSettingSection}>
              <div style={styles.kpiSettingTitle}>①営業KPI</div>
              <div style={styles.formGroup}>
                <label style={styles.modalLabel}>月間受注予算（円）</label>
                <input type="number" style={styles.modalInput} value={editingKpiSettings.monthlyBudget} onChange={(e) => setEditingKpiSettings({...editingKpiSettings, monthlyBudget: parseInt(e.target.value) || 0})} />
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.modalLabel}>平均受注単価（円）</label>
                  <input type="number" style={styles.modalInput} value={editingKpiSettings.avgOrderPrice} onChange={(e) => setEditingKpiSettings({...editingKpiSettings, avgOrderPrice: parseInt(e.target.value) || 0})} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.modalLabel}>受注率（%）</label>
                  <input type="number" style={styles.modalInput} value={editingKpiSettings.conversionRate * 100} onChange={(e) => setEditingKpiSettings({...editingKpiSettings, conversionRate: (parseFloat(e.target.value) || 0) / 100})} />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.modalLabel}>アポ率（%）</label>
                <input type="number" style={styles.modalInput} value={editingKpiSettings.appointmentRate * 100} onChange={(e) => setEditingKpiSettings({...editingKpiSettings, appointmentRate: (parseFloat(e.target.value) || 0) / 100})} />
              </div>
            </div>

            <div style={styles.kpiSettingSection}>
              <div style={styles.kpiSettingTitle}>②架電可能日数</div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.modalLabel}>月内営業日数</label>
                  <input type="number" style={styles.modalInput} value={editingKpiSettings.monthlyWorkDays} onChange={(e) => setEditingKpiSettings({...editingKpiSettings, monthlyWorkDays: parseInt(e.target.value) || 0})} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.modalLabel}>定休日数</label>
                  <input type="number" style={styles.modalInput} value={editingKpiSettings.holidayDays} onChange={(e) => setEditingKpiSettings({...editingKpiSettings, holidayDays: parseInt(e.target.value) || 0})} />
                </div>
              </div>
            </div>

            <div style={styles.kpiSettingSection}>
              <div style={styles.kpiSettingTitle}>③日次KPI</div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.modalLabel}>1日架電可能時間（分）</label>
                  <input type="number" style={styles.modalInput} value={editingKpiSettings.dailyCallTime} onChange={(e) => setEditingKpiSettings({...editingKpiSettings, dailyCallTime: parseInt(e.target.value) || 0})} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.modalLabel}>1架電あたり時間（分）</label>
                  <input type="number" style={styles.modalInput} value={editingKpiSettings.timePerCall} onChange={(e) => setEditingKpiSettings({...editingKpiSettings, timePerCall: parseInt(e.target.value) || 0})} />
                </div>
              </div>
            </div>

            {/* 計算結果プレビュー */}
            <div style={{padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '6px', fontSize: '11px'}}>
              <strong>計算結果:</strong><br/>
              必要架電数: {calculateKPI(editingKpiSettings).requiredCalls}件/月<br/>
              1日あたり: {calculateKPI(editingKpiSettings).dailyRequiredCalls}件（最大{calculateKPI(editingKpiSettings).maxDailyCalls}件）
              {!calculateKPI(editingKpiSettings).isAchievable && <span style={{color: '#DC2626'}}> ⚠️物理的に達成困難</span>}
            </div>

            <div style={styles.modalButtons}>
              <button style={styles.modalCancel} onClick={() => setShowKpiSettingsModal(false)}>キャンセル</button>
              <button style={styles.modalConfirm} onClick={saveKpiSettings}>保存</button>
            </div>
          </div>
        </div>
      )}

      {showActualModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>✏️ 実績入力</h3>
            <div style={styles.formGroup}>
              <label style={styles.modalLabel}>架電数</label>
              <select style={styles.modalSelect} value={currentActual.calls} onChange={(e) => updateActualValue('calls', e.target.value)}>
                {generateOptions().map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.modalLabel}>商談数</label>
              <select style={styles.modalSelect} value={currentActual.meetings} onChange={(e) => updateActualValue('meetings', e.target.value)}>
                {generateOptions(100).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.modalLabel}>受注数</label>
              <select style={styles.modalSelect} value={currentActual.deals} onChange={(e) => updateActualValue('deals', e.target.value)}>
                {generateOptions(50).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={styles.modalButtons}>
              <button style={styles.modalCancel} onClick={() => setShowActualModal(false)}>閉じる</button>
            </div>
          </div>
        </div>
      )}

      {showYomiModal && editingYomi && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>📋 案件入力</h3>
            {yomiFields.map(field => (
              <div key={field.id} style={styles.formGroup}>
                <label style={styles.modalLabel}>{field.name}</label>
                <input type={field.type === 'number' ? 'number' : 'text'} style={styles.modalInput} value={editingYomi[field.id] || ''} onChange={(e) => updateYomiField(field.id, e.target.value)} />
              </div>
            ))}
            <div style={styles.formGroup}>
              <label style={styles.modalLabel}>受注金額（月額×12）</label>
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
              <button style={styles.modalCancel} onClick={() => setShowYomiModal(false)}>キャンセル</button>
              <button style={styles.modalConfirm} onClick={saveYomi}>保存</button>
            </div>
          </div>
        </div>
      )}

      {showYomiSettingsModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>⚙️ ヨミ表項目設定</h3>
            {editingYomiFields.map((field, index) => (
              <div key={field.id} style={{display: 'grid', gridTemplateColumns: '1fr 70px 50px 30px', gap: '6px', marginBottom: '8px'}}>
                <input type="text" style={styles.modalInput} placeholder="項目名" value={field.name} onChange={(e) => {
                  const newFields = [...editingYomiFields];
                  newFields[index] = {...newFields[index], name: e.target.value};
                  setEditingYomiFields(newFields);
                }} />
                <select style={styles.modalSelect} value={field.type} onChange={(e) => {
                  const newFields = [...editingYomiFields];
                  newFields[index] = {...newFields[index], type: e.target.value};
                  setEditingYomiFields(newFields);
                }}>
                  <option value="text">文字</option>
                  <option value="number">数値</option>
                </select>
                <input type="text" style={styles.modalInput} placeholder="単位" value={field.unit || ''} onChange={(e) => {
                  const newFields = [...editingYomiFields];
                  newFields[index] = {...newFields[index], unit: e.target.value};
                  setEditingYomiFields(newFields);
                }} />
                <button style={{padding: '4px', border: 'none', borderRadius: '4px', backgroundColor: '#FEE2E2', color: '#DC2626', cursor: 'pointer'}} onClick={() => setEditingYomiFields(editingYomiFields.filter((_, i) => i !== index))}>✕</button>
              </div>
            ))}
            <button style={{width: '100%', padding: '6px', border: '1px dashed #E2E8F0', borderRadius: '6px', backgroundColor: 'transparent', color: '#64748B', fontSize: '11px', cursor: 'pointer', marginTop: '8px'}} onClick={() => setEditingYomiFields([...editingYomiFields, { id: `custom_${Date.now()}`, name: '', type: 'text', unit: '' }])}>+ 項目追加</button>
            <div style={styles.modalButtons}>
              <button style={styles.modalCancel} onClick={() => setShowYomiSettingsModal(false)}>キャンセル</button>
              <button style={styles.modalConfirm} onClick={() => { setYomiFields(editingYomiFields.filter(f => f.name.trim())); setShowYomiSettingsModal(false); }}>保存</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

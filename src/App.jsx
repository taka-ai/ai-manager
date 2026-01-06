import React, { useState, useEffect } from 'react';

// ============================================
// TopPerformer - AI Sales Manager
// 「報告を、戦略に変える」
// ============================================

// APIキーを直接埋め込み
const GEMINI_API_KEY = 'AIzaSyAUGPoHfMrgQ125bGUZsvZWsByZe5ZZwRE';
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// ログインパスワード
const LOGIN_PASSWORD = 'Lvntech2026';
const MANAGER_PASSWORD = 'Lvntechkamuro';

// ユーザーリスト
const USERS = [
  { id: 'takahashi', name: '髙橋', role: 'リーダー', icon: '👑' },
  { id: 'kaiho', name: '海保', role: '', icon: '👤' },
];

// デフォルトの予算設定
const DEFAULT_BUDGET = {
  takahashi: { sales: 1000000, calls: 100, meetings: 20, deals: 5 },
  kaiho: { sales: 800000, calls: 80, meetings: 15, deals: 4 },
};

// デフォルトの実績
const DEFAULT_ACTUAL = {
  takahashi: { sales: 0, calls: 0, meetings: 0, deals: 0 },
  kaiho: { sales: 0, calls: 0, meetings: 0, deals: 0 },
};

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

【質問の例】
- 「今日のアポイント数は？」
- 「架電は何件する予定？」
- 「どうやって目標を達成するつもり？」
- 「その行動量で本当に目標に届く？」
- 「いつまでに、何件やる？」
- 「午前中に何件終わらせる？」

【フィードバックの形式】
報告内容に応じて柔軟に対応するが、必ず以下を含める：

1. 📊 現状の評価（良い点があれば認める、足りない点は指摘）
2. ❓ 深掘り質問（1〜2個、具体的な数字や計画を聞き出す）
3. 🔢 行動量の提案（目標達成に必要な具体的な数字）
4. 🔥 背中を押す一言

【重要なルール】
- 「頑張ります」「やります」だけの報告は許さない → 「具体的にいつ、何を、何件？」と聞く
- 数字のない報告には → 「数字で教えて」と聞く
- 計画が甘い場合 → 「それで本当に目標達成できる？」と問いかける
- 良い報告には素直に褒める

営業マネージャーとして、部下を目標達成に導いてください。`;

const REPORT_TYPES = {
  morning: { id: 'morning', label: '朝の日報', icon: '🌅', template: `【朝の日報（計画・作戦）】\n・今日の必達目標（数値）：\n・誰に／何をアプローチするか（重点行動）：\n・今日の懸念点：` },
  evening: { id: 'evening', label: '夕方の日報', icon: '🌆', template: `【夕方の日報（振り返り）】\n・今日の成果（数値）：\n・うまくいったこと：\n・課題・反省点：\n・明日への申し送り：` },
  weekly: { id: 'weekly', label: '週報', icon: '📅', template: `【週報】\n・今週の目標達成率：\n・主な成果・勝因：\n・課題と改善策：\n・来週の重点施策：` },
  monthly: { id: 'monthly', label: '月報', icon: '📊', template: `【月報】\n・今月の売上実績 vs 目標：\n・主要KPI達成状況：\n・成功事例・学び：\n・来月の戦略：` },
  pipeline: { id: 'pipeline', label: 'ヨミ表', icon: '📋', template: `【案件ヨミ表】\n・案件名：\n・確度（A/B/C）：\n・金額：\n・クロージング予定日：\n・ネクストアクション：` },
  budget: { id: 'budget', label: '予算設定', icon: '🎯', template: `【予算設定】\n・月間売上目標：\n・架電目標数：\n・商談目標数：\n・成約目標数：` }
};

export default function App() {
  // ログイン状態
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // ユーザー選択
  const [currentUserId, setCurrentUserId] = useState('takahashi');
  const [showUserSelect, setShowUserSelect] = useState(false);

  const [viewMode, setViewMode] = useState('sales');
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [selectedReportType, setSelectedReportType] = useState('morning');
  const [reportContent, setReportContent] = useState(REPORT_TYPES.morning.template);
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reportHistory, setReportHistory] = useState([]);
  const [managerPassword, setManagerPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  
  // 予算と実績
  const [budgets, setBudgets] = useState(DEFAULT_BUDGET);
  const [actuals, setActuals] = useState(DEFAULT_ACTUAL);
  const [tempBudget, setTempBudget] = useState({ sales: 0, calls: 0, meetings: 0, deals: 0 });

  // 現在のユーザー情報を取得
  const currentUser = USERS.find(u => u.id === currentUserId) || USERS[0];
  const currentBudget = budgets[currentUserId] || DEFAULT_BUDGET.takahashi;
  const currentActual = actuals[currentUserId] || DEFAULT_ACTUAL.takahashi;

  // チームデータ（管理者ビュー用）
  const getTeamData = () => {
    return USERS.map(user => {
      const budget = budgets[user.id] || DEFAULT_BUDGET[user.id];
      const actual = actuals[user.id] || DEFAULT_ACTUAL[user.id];
      const rate = budget.deals > 0 ? Math.round((actual.deals / budget.deals) * 100) : 0;
      let status = 'good';
      if (rate < 50) status = 'critical';
      else if (rate < 80) status = 'warning';
      return {
        ...user,
        calls: actual.calls,
        meetings: actual.meetings,
        deals: actual.deals,
        target: budget.deals,
        rate,
        status
      };
    });
  };

  // ログイン状態をチェック
  useEffect(() => {
    const loggedIn = sessionStorage.getItem('topperformer_logged_in');
    if (loggedIn === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  // データの読み込み
  useEffect(() => {
    const savedHistory = localStorage.getItem('topperformer_history');
    const savedBudgets = localStorage.getItem('topperformer_budgets');
    const savedActuals = localStorage.getItem('topperformer_actuals');
    if (savedHistory) setReportHistory(JSON.parse(savedHistory));
    if (savedBudgets) setBudgets(JSON.parse(savedBudgets));
    if (savedActuals) setActuals(JSON.parse(savedActuals));
  }, []);

  // データの保存
  useEffect(() => { localStorage.setItem('topperformer_history', JSON.stringify(reportHistory)); }, [reportHistory]);
  useEffect(() => { localStorage.setItem('topperformer_budgets', JSON.stringify(budgets)); }, [budgets]);
  useEffect(() => { localStorage.setItem('topperformer_actuals', JSON.stringify(actuals)); }, [actuals]);

  // ログイン処理
  const handleLogin = () => {
    if (loginPassword === LOGIN_PASSWORD) {
      setIsLoggedIn(true);
      sessionStorage.setItem('topperformer_logged_in', 'true');
      setLoginError('');
    } else {
      setLoginError('パスワードが正しくありません');
    }
  };

  // ログアウト処理
  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem('topperformer_logged_in');
  };

  // ユーザー切り替え
  const handleUserChange = (userId) => {
    setCurrentUserId(userId);
    setShowUserSelect(false);
  };

  const handleReportTypeChange = (typeId) => { 
    setSelectedReportType(typeId); 
    setReportContent(REPORT_TYPES[typeId].template); 
  };

  // 報告から数字を抽出して実績を更新
  const extractAndUpdateActuals = (content) => {
    const callsMatch = content.match(/架電[：:]\s*(\d+)/);
    const meetingsMatch = content.match(/商談[：:]\s*(\d+)|アポ[：:]\s*(\d+)/);
    const dealsMatch = content.match(/成約[：:]\s*(\d+)|受注[：:]\s*(\d+)/);
    const salesMatch = content.match(/売上[：:]\s*(\d+)|金額[：:]\s*(\d+)/);

    if (callsMatch || meetingsMatch || dealsMatch || salesMatch) {
      setActuals(prev => ({
        ...prev,
        [currentUserId]: {
          calls: callsMatch ? parseInt(callsMatch[1]) + (prev[currentUserId]?.calls || 0) : (prev[currentUserId]?.calls || 0),
          meetings: meetingsMatch ? parseInt(meetingsMatch[1] || meetingsMatch[2]) + (prev[currentUserId]?.meetings || 0) : (prev[currentUserId]?.meetings || 0),
          deals: dealsMatch ? parseInt(dealsMatch[1] || dealsMatch[2]) + (prev[currentUserId]?.deals || 0) : (prev[currentUserId]?.deals || 0),
          sales: salesMatch ? parseInt(salesMatch[1] || salesMatch[2]) + (prev[currentUserId]?.sales || 0) : (prev[currentUserId]?.sales || 0),
        }
      }));
    }
  };

  const handleSubmitReport = async () => {
    if (!reportContent.trim()) return;
    setIsLoading(true); setAiResponse('');
    
    // 予算情報をプロンプトに追加
    const budgetInfo = `\n\n【${currentUser.name}さんの現在の状況】
・月間売上目標: ${currentBudget.sales.toLocaleString()}円 / 実績: ${currentActual.sales.toLocaleString()}円
・架電目標: ${currentBudget.calls}件 / 実績: ${currentActual.calls}件
・商談目標: ${currentBudget.meetings}件 / 実績: ${currentActual.meetings}件
・成約目標: ${currentBudget.deals}件 / 実績: ${currentActual.deals}件`;
    
    try {
      const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${GEMINI_API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ 
            parts: [{ 
              text: `${AI_SYSTEM_PROMPT}${budgetInfo}\n\n【${currentUser.name}さんからの報告】\nレポートタイプ: ${REPORT_TYPES[selectedReportType].label}\n\n${reportContent}` 
            }] 
          }], 
          generationConfig: { temperature: 0.8, maxOutputTokens: 1024 } 
        })
      });
      const data = await response.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const aiText = data.candidates[0].content.parts[0].text;
        setAiResponse(aiText);
        
        // 夕方の日報から実績を抽出
        if (selectedReportType === 'evening') {
          extractAndUpdateActuals(reportContent);
        }
        
        setReportHistory(prev => [{ 
          id: Date.now(), 
          user: currentUser.name, 
          userId: currentUserId,
          type: selectedReportType, 
          content: reportContent, 
          aiResponse: aiText, 
          timestamp: new Date().toISOString() 
        }, ...prev].slice(0, 50));
      } else if (data.error) {
        setAiResponse(`エラー: ${data.error.message}`);
      } else { 
        setAiResponse('エラー: AIからの応答を取得できませんでした。'); 
      }
    } catch (error) { setAiResponse(`エラー: ${error.message}`); }
    finally { setIsLoading(false); }
  };

  // 予算設定を開く
  const openBudgetModal = () => {
    setTempBudget({ ...currentBudget });
    setShowBudgetModal(true);
  };

  // 予算を保存
  const saveBudget = () => {
    setBudgets(prev => ({
      ...prev,
      [currentUserId]: { ...tempBudget }
    }));
    setShowBudgetModal(false);
  };

  // 実績をリセット
  const resetActuals = () => {
    if (window.confirm('今月の実績をリセットしますか？')) {
      setActuals(prev => ({
        ...prev,
        [currentUserId]: { sales: 0, calls: 0, meetings: 0, deals: 0 }
      }));
    }
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
  
  const calculateProgress = (current, target) => Math.min((current / target) * 100, 100);

  const styles = {
    // ログイン画面
    loginContainer: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', fontFamily: "'Noto Sans JP', sans-serif" },
    loginBox: { backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', maxWidth: '400px', width: '90%', textAlign: 'center' },
    loginTitle: { fontSize: '24px', fontWeight: '700', color: '#1E293B', marginBottom: '8px' },
    loginSubtitle: { fontSize: '14px', color: '#64748B', marginBottom: '32px' },
    loginInput: { width: '100%', padding: '14px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '16px', marginBottom: '16px', outline: 'none', boxSizing: 'border-box' },
    loginButton: { width: '100%', padding: '14px', border: 'none', borderRadius: '8px', backgroundColor: '#2563EB', color: 'white', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
    loginError: { color: '#DC2626', fontSize: '14px', marginBottom: '16px' },
    // メイン
    container: { minHeight: '100vh', backgroundColor: '#F8FAFC', fontFamily: "'Noto Sans JP', sans-serif" },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', backgroundColor: 'white', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 100 },
    logo: { display: 'flex', alignItems: 'center', gap: '12px' },
    logoText: { display: 'flex', flexDirection: 'column' },
    logoTitle: { fontSize: '18px', fontWeight: '700', color: '#1E293B' },
    logoSubtitle: { fontSize: '11px', color: '#64748B' },
    headerRight: { display: 'flex', alignItems: 'center', gap: '8px' },
    logoutButton: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: 'white', color: '#64748B', fontSize: '13px', cursor: 'pointer' },
    shareButton: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: '#2563EB', cursor: 'pointer' },
    viewToggle: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: 'white', color: '#64748B', fontSize: '13px', fontWeight: '500', cursor: 'pointer' },
    viewToggleActive: { backgroundColor: '#EFF6FF', borderColor: '#2563EB', color: '#2563EB' },
    main: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
    salesLayout: { display: 'grid', gridTemplateColumns: '380px 1fr', gap: '24px' },
    leftColumn: { display: 'flex', flexDirection: 'column', gap: '24px' },
    rightColumn: { display: 'flex', flexDirection: 'column', gap: '24px' },
    card: { backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #F1F5F9' },
    cardTitleRow: { display: 'flex', alignItems: 'center', gap: '8px' },
    cardTitle: { fontSize: '15px', fontWeight: '600', color: '#334155' },
    userBadge: { display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#EFF6FF', borderRadius: '20px', fontSize: '13px', fontWeight: '500', color: '#2563EB', cursor: 'pointer', position: 'relative' },
    userDropdown: { position: 'absolute', top: '100%', right: 0, marginTop: '4px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid #E2E8F0', overflow: 'hidden', zIndex: 50 },
    userOption: { padding: '10px 16px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' },
    userOptionActive: { backgroundColor: '#EFF6FF' },
    periodTabs: { display: 'flex', padding: '12px 20px', gap: '4px', backgroundColor: '#F8FAFC' },
    periodTab: { flex: 1, padding: '8px', border: 'none', borderRadius: '8px', backgroundColor: 'transparent', color: '#64748B', fontSize: '13px', fontWeight: '500', cursor: 'pointer' },
    periodTabActive: { backgroundColor: 'white', color: '#2563EB', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    kpiList: { padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' },
    kpiItem: { display: 'flex', flexDirection: 'column', gap: '6px' },
    kpiLabel: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#475569' },
    kpiValue: { fontWeight: '600', color: '#1E293B' },
    kpiTarget: { fontWeight: '400', color: '#94A3B8' },
    progressBar: { height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: '4px', transition: 'width 0.3s ease' },
    budgetActions: { display: 'flex', gap: '8px', padding: '12px 20px', borderTop: '1px solid #F1F5F9' },
    budgetButton: { flex: 1, padding: '8px', border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: 'white', fontSize: '12px', cursor: 'pointer', color: '#64748B' },
    historyList: { padding: '16px 20px' },
    emptyHistory: { color: '#94A3B8', fontSize: '13px', textAlign: 'center', padding: '20px 0' },
    historyItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #F1F5F9' },
    historyIcon: { fontSize: '18px' },
    historyContent: { display: 'flex', flexDirection: 'column', gap: '2px' },
    historyType: { fontSize: '13px', fontWeight: '500', color: '#334155' },
    historyDate: { fontSize: '11px', color: '#94A3B8' },
    aiHeader: { display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 20px', borderBottom: '1px solid #F1F5F9' },
    aiDot: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22C55E' },
    aiTitle: { fontSize: '15px', fontWeight: '600', color: '#334155' },
    aiResponseArea: { padding: '20px', minHeight: '200px' },
    loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '160px', color: '#64748B', gap: '12px' },
    loadingSpinner: { width: '32px', height: '32px', border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 1s linear infinite' },
    aiResponseText: { fontSize: '14px', lineHeight: '1.7', color: '#334155', whiteSpace: 'pre-wrap' },
    aiPlaceholder: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '160px', color: '#94A3B8', textAlign: 'center', gap: '12px' },
    reportTabs: { display: 'flex', padding: '12px 16px', gap: '8px', borderBottom: '1px solid #F1F5F9', overflowX: 'auto' },
    reportTab: { padding: '8px 16px', border: 'none', borderRadius: '20px', backgroundColor: 'transparent', color: '#64748B', fontSize: '13px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap' },
    reportTabActive: { backgroundColor: '#2563EB', color: 'white' },
    inputContainer: { position: 'relative', padding: '16px 20px' },
    textarea: { width: '100%', minHeight: '140px', padding: '16px', border: '1px solid #E2E8F0', borderRadius: '12px', fontSize: '14px', lineHeight: '1.6', color: '#334155', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
    inputFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid #F1F5F9', backgroundColor: '#FAFBFC' },
    footerText: { fontSize: '12px', color: '#94A3B8' },
    submitButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', border: 'none', borderRadius: '10px', backgroundColor: '#2563EB', color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    // 管理者ビュー
    managerLayout: { display: 'flex', flexDirection: 'column', gap: '24px' },
    managerCard: { backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px' },
    managerTitle: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '18px', fontWeight: '600', color: '#1E293B', marginBottom: '20px' },
    teamTable: { display: 'flex', flexDirection: 'column' },
    tableHeader: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', padding: '12px 16px', backgroundColor: '#F8FAFC', borderRadius: '8px', fontSize: '12px', fontWeight: '600', color: '#64748B' },
    tableRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', padding: '16px', borderBottom: '1px solid #F1F5F9', alignItems: 'center' },
    tableCell: { fontSize: '14px', color: '#334155' },
    statusBadge: { display: 'inline-block', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '500' },
    // モーダル
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { backgroundColor: 'white', borderRadius: '16px', padding: '24px', maxWidth: '400px', width: '90%' },
    modalTitle: { fontSize: '18px', fontWeight: '600', color: '#1E293B', marginBottom: '16px' },
    modalText: { fontSize: '14px', color: '#64748B', marginBottom: '16px', lineHeight: '1.6' },
    modalInput: { width: '100%', padding: '12px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', marginBottom: '12px', outline: 'none', boxSizing: 'border-box' },
    modalLabel: { fontSize: '13px', color: '#64748B', marginBottom: '4px', display: 'block' },
    modalButtons: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' },
    modalCancel: { padding: '10px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: 'white', color: '#64748B', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
    modalConfirm: { padding: '10px 16px', border: 'none', borderRadius: '8px', backgroundColor: '#2563EB', color: 'white', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  };

  // ログイン画面
  if (!isLoggedIn) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none" style={{margin: '0 auto 24px'}}>
            <rect width="32" height="32" rx="8" fill="#2563EB"/>
            <path d="M8 12h16M8 16h12M8 20h14M22 20l4-4-4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h1 style={styles.loginTitle}>TopPerformer</h1>
          <p style={styles.loginSubtitle}>営業組織専用AIマネージャー<br/>「報告を、戦略に変える」</p>
          {loginError && <p style={styles.loginError}>{loginError}</p>}
          <input
            type="password"
            style={styles.loginInput}
            placeholder="パスワードを入力..."
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <button style={styles.loginButton} onClick={handleLogin}>ログイン</button>
        </div>
      </div>
    );
  }

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
          <div style={styles.salesLayout}>
            <div style={styles.leftColumn}>
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardTitleRow}><span style={styles.cardTitle}>進捗状況</span></div>
                  <div style={{position: 'relative'}}>
                    <div style={styles.userBadge} onClick={() => setShowUserSelect(!showUserSelect)}>
                      {currentUser.icon} {currentUser.name}{currentUser.role && ` (${currentUser.role})`} ▼
                    </div>
                    {showUserSelect && (
                      <div style={styles.userDropdown}>
                        {USERS.map(user => (
                          <div 
                            key={user.id} 
                            style={{...styles.userOption, ...(user.id === currentUserId ? styles.userOptionActive : {})}}
                            onClick={() => handleUserChange(user.id)}
                          >
                            {user.icon} {user.name}{user.role && ` (${user.role})`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div style={styles.periodTabs}>
                  {['daily', 'weekly', 'monthly'].map(period => (
                    <button key={period} style={{...styles.periodTab, ...(selectedPeriod === period ? styles.periodTabActive : {})}} onClick={() => setSelectedPeriod(period)}>
                      {period === 'daily' ? '日次' : period === 'weekly' ? '週次' : '月次'}
                    </button>
                  ))}
                </div>
                <div style={styles.kpiList}>
                  <div style={styles.kpiItem}>
                    <div style={styles.kpiLabel}><span>架電数</span><span style={styles.kpiValue}>{currentActual.calls}<span style={styles.kpiTarget}>/{currentBudget.calls}件</span></span></div>
                    <div style={styles.progressBar}><div style={{...styles.progressFill, width: `${calculateProgress(currentActual.calls, currentBudget.calls)}%`, backgroundColor: calculateProgress(currentActual.calls, currentBudget.calls) >= 80 ? '#22C55E' : '#2563EB'}}/></div>
                  </div>
                  <div style={styles.kpiItem}>
                    <div style={styles.kpiLabel}><span>商談数</span><span style={styles.kpiValue}>{currentActual.meetings}<span style={styles.kpiTarget}>/{currentBudget.meetings}件</span></span></div>
                    <div style={styles.progressBar}><div style={{...styles.progressFill, width: `${calculateProgress(currentActual.meetings, currentBudget.meetings)}%`, backgroundColor: calculateProgress(currentActual.meetings, currentBudget.meetings) >= 80 ? '#22C55E' : '#2563EB'}}/></div>
                  </div>
                  <div style={styles.kpiItem}>
                    <div style={styles.kpiLabel}><span>成約数</span><span style={styles.kpiValue}>{currentActual.deals}<span style={styles.kpiTarget}>/{currentBudget.deals}件</span></span></div>
                    <div style={styles.progressBar}><div style={{...styles.progressFill, width: `${calculateProgress(currentActual.deals, currentBudget.deals)}%`, backgroundColor: calculateProgress(currentActual.deals, currentBudget.deals) >= 80 ? '#22C55E' : '#2563EB'}}/></div>
                  </div>
                  <div style={styles.kpiItem}>
                    <div style={styles.kpiLabel}><span>売上</span><span style={styles.kpiValue}>{currentActual.sales.toLocaleString()}<span style={styles.kpiTarget}>/{currentBudget.sales.toLocaleString()}円</span></span></div>
                    <div style={styles.progressBar}><div style={{...styles.progressFill, width: `${calculateProgress(currentActual.sales, currentBudget.sales)}%`, backgroundColor: calculateProgress(currentActual.sales, currentBudget.sales) >= 80 ? '#22C55E' : '#2563EB'}}/></div>
                  </div>
                </div>
                <div style={styles.budgetActions}>
                  <button style={styles.budgetButton} onClick={openBudgetModal}>🎯 予算設定</button>
                  <button style={styles.budgetButton} onClick={resetActuals}>🔄 実績リセット</button>
                </div>
              </div>
              <div style={styles.card}>
                <div style={styles.cardHeader}><div style={styles.cardTitleRow}><span style={styles.cardTitle}>最近のレポート</span></div></div>
                <div style={styles.historyList}>
                  {reportHistory.filter(r => r.userId === currentUserId).length === 0 ? (
                    <p style={styles.emptyHistory}>{currentUser.name}さんの履歴はありません。</p>
                  ) : (
                    reportHistory.filter(r => r.userId === currentUserId).slice(0, 5).map(report => (
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
              <div style={styles.card}>
                <div style={styles.aiHeader}><span style={styles.aiDot}></span><span style={styles.aiTitle}>AIマネージャーの応答</span></div>
                <div style={styles.aiResponseArea}>
                  {isLoading ? (
                    <div style={styles.loadingContainer}><div style={styles.loadingSpinner}></div><p>分析中...</p></div>
                  ) : aiResponse ? (
                    <div style={styles.aiResponseText}>{aiResponse}</div>
                  ) : (
                    <div style={styles.aiPlaceholder}>
                      <p>レポートを提出すると、AIマネージャーが<br/>行動量と計画についてフィードバックします。</p>
                    </div>
                  )}
                </div>
              </div>
              <div style={styles.card}>
                <div style={styles.reportTabs}>
                  {Object.values(REPORT_TYPES).map(type => (
                    <button key={type.id} style={{...styles.reportTab, ...(selectedReportType === type.id ? styles.reportTabActive : {})}} onClick={() => handleReportTypeChange(type.id)}>
                      {type.label}
                    </button>
                  ))}
                </div>
                <div style={styles.inputContainer}>
                  <textarea style={styles.textarea} value={reportContent} onChange={(e) => setReportContent(e.target.value)} />
                </div>
                <div style={styles.inputFooter}>
                  <p style={styles.footerText}>AIマネージャーが行動量と計画を分析します。</p>
                  <button style={styles.submitButton} onClick={handleSubmitReport} disabled={isLoading}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                    日報を提出
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.managerLayout}>
            <div style={styles.managerCard}>
              <h2 style={styles.managerTitle}>👥 チーム・ヘルスチェック</h2>
              <div style={styles.teamTable}>
                <div style={styles.tableHeader}>
                  <span>メンバー</span><span>架電数</span><span>商談数</span><span>成約</span><span>達成率</span><span>状態</span>
                </div>
                {getTeamData().map(member => (
                  <div key={member.id} style={styles.tableRow}>
                    <span style={styles.tableCell}>{member.icon} {member.name}</span>
                    <span style={styles.tableCell}>{member.calls}</span>
                    <span style={styles.tableCell}>{member.meetings}</span>
                    <span style={styles.tableCell}>{member.deals}/{member.target}</span>
                    <span style={styles.tableCell}>{member.rate}%</span>
                    <span style={styles.tableCell}>
                      <span style={{...styles.statusBadge, 
                        backgroundColor: member.status === 'good' ? '#DEF7EC' : member.status === 'warning' ? '#FEF3C7' : '#FEE2E2', 
                        color: member.status === 'good' ? '#03543F' : member.status === 'warning' ? '#92400E' : '#991B1B'
                      }}>
                        {member.status === 'good' ? '良好' : member.status === 'warning' ? '要注意' : '要対応'}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 管理者パスワードモーダル */}
      {showPasswordModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>管理者パスワード</h3>
            <p style={styles.modalText}>管理者ビューにアクセスするにはパスワードを入力してください。</p>
            <input type="password" style={styles.modalInput} placeholder="パスワードを入力..." value={managerPassword} onChange={(e) => setManagerPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && verifyManagerPassword()} />
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
            <h3 style={styles.modalTitle}>🎯 {currentUser.name}さんの予算設定</h3>
            <label style={styles.modalLabel}>月間売上目標（円）</label>
            <input type="number" style={styles.modalInput} value={tempBudget.sales} onChange={(e) => setTempBudget({...tempBudget, sales: parseInt(e.target.value) || 0})} />
            <label style={styles.modalLabel}>架電目標数</label>
            <input type="number" style={styles.modalInput} value={tempBudget.calls} onChange={(e) => setTempBudget({...tempBudget, calls: parseInt(e.target.value) || 0})} />
            <label style={styles.modalLabel}>商談目標数</label>
            <input type="number" style={styles.modalInput} value={tempBudget.meetings} onChange={(e) => setTempBudget({...tempBudget, meetings: parseInt(e.target.value) || 0})} />
            <label style={styles.modalLabel}>成約目標数</label>
            <input type="number" style={styles.modalInput} value={tempBudget.deals} onChange={(e) => setTempBudget({...tempBudget, deals: parseInt(e.target.value) || 0})} />
            <div style={styles.modalButtons}>
              <button style={styles.modalCancel} onClick={() => setShowBudgetModal(false)}>キャンセル</button>
              <button style={styles.modalConfirm} onClick={saveBudget}>保存</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

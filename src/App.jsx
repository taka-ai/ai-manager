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

const AI_SYSTEM_PROMPT = `あなたは「TopPerformer」という営業組織専用AIマネージャーです。

【人格設定】
- 名前：AIマネージャー
- 役割：「行動量で勝たせるコーチ」
- 性格：丁寧かつ論理的、数字にこだわるプロフェッショナル

【最重要ミッション】
営業は「行動量」が全て。架電数・訪問数・商談数などの行動量を増やすための具体的な示唆を行う。

【分析の視点】
1. 報告された数字から「行動量は十分か？」を判断
2. 目標達成に必要な行動量を逆算して提示
3. 行動量を増やすための時間の使い方を提案
4. 質より量。まず量を確保することを最優先

【フィードバックの形式】
1. 📊 現状の行動量評価（数字ベース）
2. 🔢 目標達成に必要な行動量（具体的な数字で提示）
3. ⏰ 行動量を増やすための時間術（いつ・何をするか）
4. 🔥 背中を押す一言

「もっと架電しましょう」ではなく「1日あと10件、午前中に集中して架電」のように具体的に。`;

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

  const [currentUser, setCurrentUser] = useState('高橋');
  const [viewMode, setViewMode] = useState('sales');
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [selectedReportType, setSelectedReportType] = useState('morning');
  const [reportContent, setReportContent] = useState(REPORT_TYPES.morning.template);
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reportHistory, setReportHistory] = useState([]);
  const [managerPassword, setManagerPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [kpiData, setKpiData] = useState({ calls: { current: 45, target: 100 }, prospects: { current: 12, target: 20 }, deals: { current: 3, target: 5 } });
  const [teamData] = useState([
    { name: '高橋', calls: 45, prospects: 12, deals: 3, target: 5, status: 'good' },
    { name: '佐藤', calls: 38, prospects: 8, deals: 2, target: 5, status: 'warning' },
    { name: '田中', calls: 52, prospects: 15, deals: 4, target: 5, status: 'good' },
    { name: '山田', calls: 25, prospects: 5, deals: 1, target: 5, status: 'critical' },
  ]);

  // ログイン状態をチェック
  useEffect(() => {
    const loggedIn = sessionStorage.getItem('topperformer_logged_in');
    if (loggedIn === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    const savedHistory = localStorage.getItem('topperformer_history');
    if (savedHistory) setReportHistory(JSON.parse(savedHistory));
  }, []);

  useEffect(() => { localStorage.setItem('topperformer_history', JSON.stringify(reportHistory)); }, [reportHistory]);

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

  const handleReportTypeChange = (typeId) => { setSelectedReportType(typeId); setReportContent(REPORT_TYPES[typeId].template); };

  const handleSubmitReport = async () => {
    if (!reportContent.trim()) return;
    setIsLoading(true); setAiResponse('');
    try {
      const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${GEMINI_API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `${AI_SYSTEM_PROMPT}\n\n【${currentUser}さんからの報告】\nレポートタイプ: ${REPORT_TYPES[selectedReportType].label}\n\n${reportContent}` }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 1024 } })
      });
      const data = await response.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const aiText = data.candidates[0].content.parts[0].text;
        setAiResponse(aiText);
        setReportHistory(prev => [{ id: Date.now(), user: currentUser, type: selectedReportType, content: reportContent, aiResponse: aiText, timestamp: new Date().toISOString() }, ...prev].slice(0, 50));
      } else if (data.error) {
        setAiResponse(`エラー: ${data.error.message}`);
      } else { 
        setAiResponse('エラー: AIからの応答を取得できませんでした。'); 
      }
    } catch (error) { setAiResponse(`エラー: ${error.message}`); }
    finally { setIsLoading(false); }
  };

  const handleManagerAccess = () => { if (viewMode === 'manager') setViewMode('sales'); else setShowPasswordModal(true); };
  const verifyManagerPassword = () => { if (managerPassword === MANAGER_PASSWORD) { setViewMode('manager'); setShowPasswordModal(false); setManagerPassword(''); } else alert('パスワードが正しくありません'); };
  const handleShare = () => { navigator.clipboard.writeText(`【${REPORT_TYPES[selectedReportType].label}】\n${reportContent}\n\n【AIマネージャーからのフィードバック】\n${aiResponse}`); alert('クリップボードにコピーしました！'); };
  const calculateProgress = (current, target) => Math.min((current / target) * 100, 100);

  const styles = {
    // ログイン画面のスタイル
    loginContainer: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', fontFamily: "'Noto Sans JP', sans-serif" },
    loginBox: { backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', maxWidth: '400px', width: '90%', textAlign: 'center' },
    loginLogo: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '24px' },
    loginTitle: { fontSize: '24px', fontWeight: '700', color: '#1E293B', marginBottom: '8px' },
    loginSubtitle: { fontSize: '14px', color: '#64748B', marginBottom: '32px' },
    loginInput: { width: '100%', padding: '14px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '16px', marginBottom: '16px', outline: 'none', boxSizing: 'border-box' },
    loginButton: { width: '100%', padding: '14px', border: 'none', borderRadius: '8px', backgroundColor: '#2563EB', color: 'white', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
    loginError: { color: '#DC2626', fontSize: '14px', marginBottom: '16px' },
    // 既存のスタイル
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
    userBadge: { display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#EFF6FF', borderRadius: '20px', fontSize: '13px', fontWeight: '500', color: '#2563EB' },
    periodTabs: { display: 'flex', padding: '12px 20px', gap: '4px', backgroundColor: '#F8FAFC' },
    periodTab: { flex: 1, padding: '8px', border: 'none', borderRadius: '8px', backgroundColor: 'transparent', color: '#64748B', fontSize: '13px', fontWeight: '500', cursor: 'pointer' },
    periodTabActive: { backgroundColor: 'white', color: '#2563EB', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    kpiList: { padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' },
    kpiItem: { display: 'flex', flexDirection: 'column', gap: '6px' },
    kpiLabel: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#475569' },
    kpiValue: { fontWeight: '600', color: '#1E293B' },
    kpiTarget: { fontWeight: '400', color: '#94A3B8' },
    progressBar: { height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#2563EB', borderRadius: '4px', transition: 'width 0.3s ease' },
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
    aiPlaceholderSub: { fontSize: '12px', color: '#CBD5E1' },
    reportTabs: { display: 'flex', padding: '12px 16px', gap: '8px', borderBottom: '1px solid #F1F5F9', overflowX: 'auto' },
    reportTab: { padding: '8px 16px', border: 'none', borderRadius: '20px', backgroundColor: 'transparent', color: '#64748B', fontSize: '13px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap' },
    reportTabActive: { backgroundColor: '#2563EB', color: 'white' },
    inputContainer: { position: 'relative', padding: '16px 20px' },
    textarea: { width: '100%', minHeight: '140px', padding: '16px', paddingRight: '48px', border: '1px solid #E2E8F0', borderRadius: '12px', fontSize: '14px', lineHeight: '1.6', color: '#334155', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
    micButton: { position: 'absolute', right: '32px', bottom: '32px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '8px', backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer' },
    inputFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid #F1F5F9', backgroundColor: '#FAFBFC' },
    footerText: { fontSize: '12px', color: '#94A3B8' },
    submitButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', border: 'none', borderRadius: '10px', backgroundColor: '#2563EB', color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    managerLayout: { display: 'flex', flexDirection: 'column', gap: '24px' },
    managerCard: { backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px' },
    managerTitle: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '18px', fontWeight: '600', color: '#1E293B', marginBottom: '20px' },
    teamTable: { display: 'flex', flexDirection: 'column' },
    tableHeader: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', padding: '12px 16px', backgroundColor: '#F8FAFC', borderRadius: '8px', fontSize: '12px', fontWeight: '600', color: '#64748B' },
    tableRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', padding: '16px', borderBottom: '1px solid #F1F5F9', alignItems: 'center' },
    tableCell: { fontSize: '14px', color: '#334155' },
    statusBadge: { display: 'inline-block', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '500' },
    analysisContent: { display: 'flex', flexDirection: 'column', gap: '16px' },
    analysisItem: { padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', borderLeft: '4px solid #F59E0B' },
    analysisName: { fontSize: '15px', fontWeight: '600', color: '#1E293B', marginBottom: '8px' },
    analysisText: { fontSize: '14px', color: '#475569', lineHeight: '1.6' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { backgroundColor: 'white', borderRadius: '16px', padding: '24px', maxWidth: '400px', width: '90%' },
    modalTitle: { fontSize: '18px', fontWeight: '600', color: '#1E293B', marginBottom: '12px' },
    modalText: { fontSize: '14px', color: '#64748B', marginBottom: '16px', lineHeight: '1.6' },
    modalInput: { width: '100%', padding: '12px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', marginBottom: '16px', outline: 'none', boxSizing: 'border-box' },
    modalButtons: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
    modalCancel: { padding: '10px 16px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: 'white', color: '#64748B', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
    modalConfirm: { padding: '10px 16px', border: 'none', borderRadius: '8px', backgroundColor: '#2563EB', color: 'white', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  };

  // ログイン画面
  if (!isLoggedIn) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <div style={styles.loginLogo}>
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#2563EB"/>
              <path d="M8 12h16M8 16h12M8 20h14M22 20l4-4-4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
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
          <button style={styles.loginButton} onClick={handleLogin}>
            ログイン
          </button>
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
          <button style={{...styles.viewToggle, ...(viewMode === 'sales' ? styles.viewToggleActive : {})}} onClick={() => setViewMode('sales')}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/></svg>営業担当</button>
          <button style={{...styles.viewToggle, ...(viewMode === 'manager' ? styles.viewToggleActive : {})}} onClick={handleManagerAccess}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3"/></svg>管理者</button>
        </div>
      </header>

      <main style={styles.main}>
        {viewMode === 'sales' ? (
          <div style={styles.salesLayout}>
            <div style={styles.leftColumn}>
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardTitleRow}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg><span style={styles.cardTitle}>進捗状況</span></div>
                  <div style={styles.userBadge}>{currentUser} 👤</div>
                </div>
                <div style={styles.periodTabs}>
                  {['daily', 'weekly', 'monthly'].map(period => (<button key={period} style={{...styles.periodTab, ...(selectedPeriod === period ? styles.periodTabActive : {})}} onClick={() => setSelectedPeriod(period)}>{period === 'daily' ? '日次' : period === 'weekly' ? '週次' : '月次'}</button>))}
                </div>
                <div style={styles.kpiList}>
                  <div style={styles.kpiItem}><div style={styles.kpiLabel}><span>架電数</span><span style={styles.kpiValue}>{kpiData.calls.current}<span style={styles.kpiTarget}>/{kpiData.calls.target}件</span></span></div><div style={styles.progressBar}><div style={{...styles.progressFill, width: `${calculateProgress(kpiData.calls.current, kpiData.calls.target)}%`}}/></div></div>
                  <div style={styles.kpiItem}><div style={styles.kpiLabel}><span>顧客代理数</span><span style={styles.kpiValue}>{kpiData.prospects.current}<span style={styles.kpiTarget}>/{kpiData.prospects.target}件</span></span></div><div style={styles.progressBar}><div style={{...styles.progressFill, width: `${calculateProgress(kpiData.prospects.current, kpiData.prospects.target)}%`}}/></div></div>
                  <div style={styles.kpiItem}><div style={styles.kpiLabel}><span>成約獲得数</span><span style={styles.kpiValue}>{kpiData.deals.current}<span style={styles.kpiTarget}>/{kpiData.deals.target}件</span></span></div><div style={styles.progressBar}><div style={{...styles.progressFill, width: `${calculateProgress(kpiData.deals.current, kpiData.deals.target)}%`}}/></div></div>
                </div>
              </div>
              <div style={styles.card}>
                <div style={styles.cardHeader}><div style={styles.cardTitleRow}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span style={styles.cardTitle}>最近のレポート</span></div></div>
                <div style={styles.historyList}>{reportHistory.length === 0 ? <p style={styles.emptyHistory}>{currentUser}さんの履歴はありません。</p> : reportHistory.slice(0, 5).map(report => (<div key={report.id} style={styles.historyItem}><span style={styles.historyIcon}>{REPORT_TYPES[report.type]?.icon || '📝'}</span><div style={styles.historyContent}><span style={styles.historyType}>{REPORT_TYPES[report.type]?.label}</span><span style={styles.historyDate}>{new Date(report.timestamp).toLocaleDateString('ja-JP')}</span></div></div>))}</div>
              </div>
            </div>
            <div style={styles.rightColumn}>
              <div style={styles.card}>
                <div style={styles.aiHeader}><span style={styles.aiDot}></span><span style={styles.aiTitle}>AIマネージャーの応答</span></div>
                <div style={styles.aiResponseArea}>{isLoading ? <div style={styles.loadingContainer}><div style={styles.loadingSpinner}></div><p>分析中...</p></div> : aiResponse ? <div style={styles.aiResponseText}>{aiResponse}</div> : <div style={styles.aiPlaceholder}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5"><path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zM12 8v8M8 12h8"/></svg><p>モードを選択し、日報や相談内容を入力してください。</p><p style={styles.aiPlaceholderSub}>スマホの場合はホーム画面に追加してご利用ください。</p></div>}</div>
              </div>
              <div style={styles.card}>
                <div style={styles.reportTabs}>{Object.values(REPORT_TYPES).map(type => (<button key={type.id} style={{...styles.reportTab, ...(selectedReportType === type.id ? styles.reportTabActive : {})}} onClick={() => handleReportTypeChange(type.id)}>{type.label}</button>))}</div>
                <div style={styles.inputContainer}><textarea style={styles.textarea} value={reportContent} onChange={(e) => setReportContent(e.target.value)} /><button style={styles.micButton} title="音声入力"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg></button></div>
                <div style={styles.inputFooter}><p style={styles.footerText}>AIマネージャーが数値と行動・感情を分析します。</p><button style={styles.submitButton} onClick={handleSubmitReport} disabled={isLoading}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>日報を提出</button></div>
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.managerLayout}>
            <div style={styles.managerCard}>
              <h2 style={styles.managerTitle}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>チーム・ヘルスチェック</h2>
              <div style={styles.teamTable}>
                <div style={styles.tableHeader}><span style={styles.tableCell}>メンバー</span><span style={styles.tableCell}>架電数</span><span style={styles.tableCell}>商談数</span><span style={styles.tableCell}>成約</span><span style={styles.tableCell}>達成率</span><span style={styles.tableCell}>状態</span></div>
                {teamData.map(member => (<div key={member.name} style={styles.tableRow}><span style={styles.tableCell}>{member.name}</span><span style={styles.tableCell}>{member.calls}</span><span style={styles.tableCell}>{member.prospects}</span><span style={styles.tableCell}>{member.deals}/{member.target}</span><span style={styles.tableCell}>{Math.round((member.deals / member.target) * 100)}%</span><span style={styles.tableCell}><span style={{...styles.statusBadge, backgroundColor: member.status === 'good' ? '#DEF7EC' : member.status === 'warning' ? '#FEF3C7' : '#FEE2E2', color: member.status === 'good' ? '#03543F' : member.status === 'warning' ? '#92400E' : '#991B1B'}}>{member.status === 'good' ? '良好' : member.status === 'warning' ? '要注意' : '要対応'}</span></span></div>))}
              </div>
            </div>
            <div style={styles.managerCard}>
              <h2 style={styles.managerTitle}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>AIボトルネック分析</h2>
              <div style={styles.analysisContent}>
                <div style={styles.analysisItem}><h3 style={styles.analysisName}>山田さん</h3><p style={styles.analysisText}>架電数が目標の50%以下です。行動量の不足が主な原因と考えられます。1on1で架電時間の確保について話し合うことをお勧めします。</p></div>
                <div style={styles.analysisItem}><h3 style={styles.analysisName}>佐藤さん</h3><p style={styles.analysisText}>架電数は良好ですが、商談化率が低めです。トークスクリプトの見直しや、ロールプレイングが効果的かもしれません。</p></div>
              </div>
            </div>
          </div>
        )}
      </main>

      {showPasswordModal && (<div style={styles.modalOverlay}><div style={styles.modal}><h3 style={styles.modalTitle}>管理者パスワード</h3><p style={styles.modalText}>管理者ビューにアクセスするにはパスワードを入力してください。</p><input type="password" style={styles.modalInput} placeholder="パスワードを入力..." value={managerPassword} onChange={(e) => setManagerPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && verifyManagerPassword()} /><div style={styles.modalButtons}><button style={styles.modalCancel} onClick={() => { setShowPasswordModal(false); setManagerPassword(''); }}>キャンセル</button><button style={styles.modalConfirm} onClick={verifyManagerPassword}>ログイン</button></div></div></div>)}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

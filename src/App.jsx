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
  free: { id: 'free', label: '自由報告', icon: '💬', template: '' },
  morning: { id: 'morning', label: '朝の計画', icon: '🌅', template: '' },
  evening: { id: 'evening', label: '夕方の振り返り', icon: '🌆', template: '' },
  weekly: { id: 'weekly', label: '週の振り返り', icon: '📅', template: '' },
  consult: { id: 'consult', label: '相談・壁打ち', icon: '🤔', template: '' },
};

export default function App() {
  // ログイン状態
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [currentUser, setCurrentUser] = useState('');
  const [showUserSetup, setShowUserSetup] = useState(false);
  const [viewMode, setViewMode] = useState('sales');
  const [selectedReportType, setSelectedReportType] = useState('free');
  const [reportContent, setReportContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reportHistory, setReportHistory] = useState([]);
  const [managerPassword, setManagerPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [teamData] = useState([
    { name: '高橋', calls: 45, prospects: 12, deals: 3, target: 5, status: 'good' },
    { name: '佐藤', calls: 38, prospects: 8, deals: 2, target: 5, status: 'warning' },
    { name: '田中', calls: 52, prospects: 15, deals: 4, target: 5, status: 'good' },
    { name: '山田', calls: 25, prospects: 5, deals: 1, target: 5, status: 'critical' },
  ]);

  // ログイン状態をチェック
  useEffect(() => {
    const loggedIn = sessionStorage.getItem('topperformer_logged_in');
    const savedUser = localStorage.getItem('topperformer_username');
    if (loggedIn === 'true') {
      setIsLoggedIn(true);
      if (savedUser) {
        setCurrentUser(savedUser);
      } else {
        setShowUserSetup(true);
      }
    }
  }, []);

  useEffect(() => {
    const savedHistory = localStorage.getItem('topperformer_history');
    const savedConversation = sessionStorage.getItem('topperformer_conversation');
    if (savedHistory) setReportHistory(JSON.parse(savedHistory));
    if (savedConversation) setConversationHistory(JSON.parse(savedConversation));
  }, []);

  useEffect(() => { localStorage.setItem('topperformer_history', JSON.stringify(reportHistory)); }, [reportHistory]);
  useEffect(() => { sessionStorage.setItem('topperformer_conversation', JSON.stringify(conversationHistory)); }, [conversationHistory]);

  // ログイン処理
  const handleLogin = () => {
    if (loginPassword === LOGIN_PASSWORD) {
      setIsLoggedIn(true);
      sessionStorage.setItem('topperformer_logged_in', 'true');
      setLoginError('');
      const savedUser = localStorage.getItem('topperformer_username');
      if (!savedUser) {
        setShowUserSetup(true);
      } else {
        setCurrentUser(savedUser);
      }
    } else {
      setLoginError('パスワードが正しくありません');
    }
  };

  // ユーザー名設定
  const handleSetUser = (name) => {
    setCurrentUser(name);
    localStorage.setItem('topperformer_username', name);
    setShowUserSetup(false);
  };

  // ログアウト処理
  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem('topperformer_logged_in');
    sessionStorage.removeItem('topperformer_conversation');
    setConversationHistory([]);
  };

  const handleReportTypeChange = (typeId) => { 
    setSelectedReportType(typeId); 
    setReportContent(''); 
  };

  const handleSubmitReport = async () => {
    if (!reportContent.trim()) return;
    setIsLoading(true);
    
    // 会話履歴に追加
    const newUserMessage = { role: 'user', content: reportContent };
    const updatedHistory = [...conversationHistory, newUserMessage];
    setConversationHistory(updatedHistory);
    
    // 会話履歴を含めたプロンプト作成
    let conversationContext = '';
    if (updatedHistory.length > 1) {
      conversationContext = '\n\n【これまでの会話】\n';
      updatedHistory.slice(-6).forEach(msg => {
        conversationContext += msg.role === 'user' ? `営業担当: ${msg.content}\n` : `AIマネージャー: ${msg.content}\n`;
      });
    }
    
    const reportTypeLabel = REPORT_TYPES[selectedReportType].label;
    
    try {
      const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${GEMINI_API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ 
            parts: [{ 
              text: `${AI_SYSTEM_PROMPT}${conversationContext}\n\n【${currentUser}さんからの${reportTypeLabel}】\n${reportContent}` 
            }] 
          }], 
          generationConfig: { temperature: 0.8, maxOutputTokens: 1024 } 
        })
      });
      const data = await response.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const aiText = data.candidates[0].content.parts[0].text;
        
        // AI応答を会話履歴に追加
        setConversationHistory(prev => [...prev, { role: 'assistant', content: aiText }]);
        
        setReportHistory(prev => [{ 
          id: Date.now(), 
          user: currentUser, 
          type: selectedReportType, 
          content: reportContent, 
          aiResponse: aiText, 
          timestamp: new Date().toISOString() 
        }, ...prev].slice(0, 50));
        
        setReportContent(''); // 入力をクリア
      } else if (data.error) {
        setConversationHistory(prev => [...prev, { role: 'assistant', content: `エラー: ${data.error.message}` }]);
      } else { 
        setConversationHistory(prev => [...prev, { role: 'assistant', content: 'エラー: AIからの応答を取得できませんでした。' }]);
      }
    } catch (error) { 
      setConversationHistory(prev => [...prev, { role: 'assistant', content: `エラー: ${error.message}` }]);
    }
    finally { setIsLoading(false); }
  };

  const handleClearConversation = () => {
    setConversationHistory([]);
    sessionStorage.removeItem('topperformer_conversation');
  };

  const handleManagerAccess = () => { if (viewMode === 'manager') setViewMode('sales'); else setShowPasswordModal(true); };
  const verifyManagerPassword = () => { if (managerPassword === MANAGER_PASSWORD) { setViewMode('manager'); setShowPasswordModal(false); setManagerPassword(''); } else alert('パスワードが正しくありません'); };
  const handleShare = () => { 
    const shareText = conversationHistory.map(msg => 
      msg.role === 'user' ? `【${currentUser}】\n${msg.content}` : `【AIマネージャー】\n${msg.content}`
    ).join('\n\n---\n\n');
    navigator.clipboard.writeText(shareText); 
    alert('会話をクリップボードにコピーしました！'); 
  };

  const getPlaceholder = () => {
    switch(selectedReportType) {
      case 'morning':
        return '今日の目標や予定を自由に書いてください。\n例：「今日は新規架電30件、アポ2件取る」';
      case 'evening':
        return '今日の結果や気づきを自由に書いてください。\n例：「架電25件、アポ1件。思ったより取れなかった」';
      case 'weekly':
        return '今週の振り返りを自由に書いてください。';
      case 'consult':
        return '悩んでいること、相談したいことを自由に書いてください。';
      default:
        return '何でも自由に報告・相談してください。\nAIマネージャーが質問しながら、目標達成をサポートします。';
    }
  };

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
    salesLayout: { display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' },
    leftColumn: { display: 'flex', flexDirection: 'column', gap: '24px' },
    rightColumn: { display: 'flex', flexDirection: 'column', gap: '24px' },
    card: { backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #F1F5F9' },
    cardTitleRow: { display: 'flex', alignItems: 'center', gap: '8px' },
    cardTitle: { fontSize: '15px', fontWeight: '600', color: '#334155' },
    userBadge: { display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#EFF6FF', borderRadius: '20px', fontSize: '13px', fontWeight: '500', color: '#2563EB', cursor: 'pointer' },
    modeList: { padding: '12px' },
    modeItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', marginBottom: '4px', transition: 'all 0.2s' },
    modeItemActive: { backgroundColor: '#EFF6FF' },
    modeIcon: { fontSize: '20px' },
    modeLabel: { fontSize: '14px', fontWeight: '500', color: '#334155' },
    historyList: { padding: '16px 20px', maxHeight: '300px', overflowY: 'auto' },
    emptyHistory: { color: '#94A3B8', fontSize: '13px', textAlign: 'center', padding: '20px 0' },
    historyItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #F1F5F9' },
    historyIcon: { fontSize: '18px' },
    historyContent: { display: 'flex', flexDirection: 'column', gap: '2px' },
    historyType: { fontSize: '13px', fontWeight: '500', color: '#334155' },
    historyDate: { fontSize: '11px', color: '#94A3B8' },
    chatContainer: { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', minHeight: '500px' },
    chatHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #F1F5F9' },
    chatHeaderLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
    aiDot: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22C55E' },
    aiTitle: { fontSize: '15px', fontWeight: '600', color: '#334155' },
    clearButton: { padding: '6px 12px', border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: 'white', color: '#64748B', fontSize: '12px', cursor: 'pointer' },
    chatMessages: { flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' },
    messageUser: { alignSelf: 'flex-end', maxWidth: '80%', padding: '12px 16px', backgroundColor: '#2563EB', color: 'white', borderRadius: '16px 16px 4px 16px', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' },
    messageAI: { alignSelf: 'flex-start', maxWidth: '80%', padding: '12px 16px', backgroundColor: '#F1F5F9', color: '#334155', borderRadius: '16px 16px 16px 4px', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' },
    loadingMessage: { alignSelf: 'flex-start', padding: '12px 16px', backgroundColor: '#F1F5F9', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '8px' },
    loadingDots: { display: 'flex', gap: '4px' },
    loadingDot: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#94A3B8', animation: 'bounce 1.4s infinite ease-in-out' },
    chatPlaceholder: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8', textAlign: 'center', gap: '12px' },
    chatInputArea: { padding: '16px 20px', borderTop: '1px solid #F1F5F9', backgroundColor: '#FAFBFC' },
    chatInputWrapper: { display: 'flex', gap: '12px', alignItems: 'flex-end' },
    textarea: { flex: 1, minHeight: '60px', maxHeight: '150px', padding: '12px 16px', border: '1px solid #E2E8F0', borderRadius: '12px', fontSize: '14px', lineHeight: '1.6', color: '#334155', resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
    submitButton: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', border: 'none', borderRadius: '12px', backgroundColor: '#2563EB', color: 'white', cursor: 'pointer', flexShrink: 0 },
    submitButtonDisabled: { backgroundColor: '#94A3B8', cursor: 'not-allowed' },
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

  // ユーザー名設定画面
  if (showUserSetup) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <h1 style={styles.loginTitle}>ようこそ！</h1>
          <p style={styles.loginSubtitle}>あなたの名前を教えてください</p>
          
          <input
            type="text"
            style={styles.loginInput}
            placeholder="名前を入力..."
            onKeyDown={(e) => e.key === 'Enter' && e.target.value && handleSetUser(e.target.value)}
          />
          <button 
            style={styles.loginButton} 
            onClick={() => {
              const input = document.querySelector('input[type="text"]');
              if (input.value) handleSetUser(input.value);
            }}
          >
            始める
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
          <button style={styles.shareButton} onClick={handleShare} disabled={conversationHistory.length === 0}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg></button>
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
                  <div style={styles.cardTitleRow}>
                    <span style={styles.cardTitle}>報告モード</span>
                  </div>
                  <div style={styles.userBadge} onClick={() => setShowUserSetup(true)}>{currentUser} 👤</div>
                </div>
                <div style={styles.modeList}>
                  {Object.values(REPORT_TYPES).map(type => (
                    <div 
                      key={type.id} 
                      style={{...styles.modeItem, ...(selectedReportType === type.id ? styles.modeItemActive : {})}}
                      onClick={() => handleReportTypeChange(type.id)}
                    >
                      <span style={styles.modeIcon}>{type.icon}</span>
                      <span style={styles.modeLabel}>{type.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardTitleRow}>
                    <span style={styles.cardTitle}>履歴</span>
                  </div>
                </div>
                <div style={styles.historyList}>
                  {reportHistory.length === 0 ? (
                    <p style={styles.emptyHistory}>まだ履歴がありません</p>
                  ) : (
                    reportHistory.slice(0, 10).map(report => (
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
              <div style={{...styles.card, ...styles.chatContainer}}>
                <div style={styles.chatHeader}>
                  <div style={styles.chatHeaderLeft}>
                    <span style={styles.aiDot}></span>
                    <span style={styles.aiTitle}>AIマネージャー</span>
                  </div>
                  {conversationHistory.length > 0 && (
                    <button style={styles.clearButton} onClick={handleClearConversation}>
                      会話をクリア
                    </button>
                  )}
                </div>
                
                <div style={styles.chatMessages}>
                  {conversationHistory.length === 0 ? (
                    <div style={styles.chatPlaceholder}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                      </svg>
                      <p>AIマネージャーに報告・相談してください。</p>
                      <p style={{fontSize: '12px', color: '#94A3B8'}}>
                        目標達成のために必要な行動量を一緒に考えます。
                      </p>
                    </div>
                  ) : (
                    <>
                      {conversationHistory.map((msg, idx) => (
                        <div key={idx} style={msg.role === 'user' ? styles.messageUser : styles.messageAI}>
                          {msg.content}
                        </div>
                      ))}
                      {isLoading && (
                        <div style={styles.loadingMessage}>
                          <div style={styles.loadingDots}>
                            <div style={{...styles.loadingDot, animationDelay: '0s'}}></div>
                            <div style={{...styles.loadingDot, animationDelay: '0.2s'}}></div>
                            <div style={{...styles.loadingDot, animationDelay: '0.4s'}}></div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                <div style={styles.chatInputArea}>
                  <div style={styles.chatInputWrapper}>
                    <textarea 
                      style={styles.textarea} 
                      value={reportContent} 
                      onChange={(e) => setReportContent(e.target.value)}
                      placeholder={getPlaceholder()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmitReport();
                        }
                      }}
                    />
                    <button 
                      style={{...styles.submitButton, ...(isLoading || !reportContent.trim() ? styles.submitButtonDisabled : {})}} 
                      onClick={handleSubmitReport} 
                      disabled={isLoading || !reportContent.trim()}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                      </svg>
                    </button>
                  </div>
                </div>
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
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

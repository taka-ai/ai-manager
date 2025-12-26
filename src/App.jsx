import React, { useState, useEffect, useRef } from 'react';

// ============================================
// TopPerformer - AI Sales Manager
// 「報告を、戦略に変える」
// ============================================

const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// AI System Prompt
const AI_SYSTEM_PROMPT = `あなたは「TopPerformer」という営業組織専用AIマネージャーです。

【人格設定】
- 名前：AIマネージャー
- 役割：「勝たせるコーチ」
- 性格：丁寧かつ論理的、時には厳しい指摘も厭わないプロフェッショナル
- 口調：敬語を使いつつも、親しみやすく、励ましの言葉も忘れない

【分析の視点】
1. 「数字（定量）」と「行動・感情（定性）」の両面から分析
2. 他責（環境のせい）を自責（自分の行動による改善）へ転換させる
3. 一貫して「明日から何を変えるか」に焦点を当てる

【フィードバックの形式】
1. 📊 状況の整理（簡潔に）
2. 💡 気づきのポイント（1-2個）
3. 🎯 具体的な次のアクション（必ず実行可能なもの）
4. 💪 励ましの一言

短く、的確に、すぐ行動に移せるアドバイスを心がけてください。`;

// Report Types Configuration
const REPORT_TYPES = {
  morning: {
    id: 'morning',
    label: '朝の日報',
    icon: '🌅',
    template: `【朝の日報（計画・作戦）】
・今日の必達目標（数値）：
・誰に／何をアプローチするか（重点行動）：
・今日の懸念点（AIに相談したいこと）：`,
    placeholder: '今日の計画を入力してください...'
  },
  evening: {
    id: 'evening',
    label: '夕方の日報',
    icon: '🌆',
    template: `【夕方の日報（振り返り）】
・今日の成果（数値）：
・うまくいったこと：
・課題・反省点：
・明日への申し送り：`,
    placeholder: '今日の振り返りを入力してください...'
  },
  weekly: {
    id: 'weekly',
    label: '週報',
    icon: '📅',
    template: `【週報】
・今週の目標達成率：
・主な成果・勝因：
・課題と改善策：
・来週の重点施策：`,
    placeholder: '今週の振り返りを入力してください...'
  },
  monthly: {
    id: 'monthly',
    label: '月報',
    icon: '📊',
    template: `【月報】
・今月の売上実績 vs 目標：
・主要KPI達成状況：
・成功事例・学び：
・来月の戦略：`,
    placeholder: '今月の振り返りを入力してください...'
  },
  pipeline: {
    id: 'pipeline',
    label: 'ヨミ表',
    icon: '📋',
    template: `【案件ヨミ表】
・案件名：
・確度（A/B/C）：
・金額：
・クロージング予定日：
・ネクストアクション：`,
    placeholder: '案件情報を入力してください...'
  },
  budget: {
    id: 'budget',
    label: '予算設定',
    icon: '🎯',
    template: `【予算設定】
・月間売上目標：
・架電目標数：
・商談目標数：
・成約目標数：`,
    placeholder: '目標を入力してください...'
  }
};

// Main App Component
export default function App() {
  // State Management
  const [currentUser, setCurrentUser] = useState('高橋');
  const [viewMode, setViewMode] = useState('sales'); // 'sales' or 'manager'
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [selectedReportType, setSelectedReportType] = useState('morning');
  const [reportContent, setReportContent] = useState(REPORT_TYPES.morning.template);
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [reportHistory, setReportHistory] = useState([]);
  const [managerPassword, setManagerPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // KPI State
  const [kpiData, setKpiData] = useState({
    calls: { current: 45, target: 100 },
    prospects: { current: 12, target: 20 },
    deals: { current: 3, target: 5 }
  });

  // Team Data (for manager view)
  const [teamData] = useState([
    { name: '高橋', calls: 45, prospects: 12, deals: 3, target: 5, status: 'good' },
    { name: '佐藤', calls: 38, prospects: 8, deals: 2, target: 5, status: 'warning' },
    { name: '田中', calls: 52, prospects: 15, deals: 4, target: 5, status: 'good' },
    { name: '山田', calls: 25, prospects: 5, deals: 1, target: 5, status: 'critical' },
  ]);

  const textareaRef = useRef(null);

  // Load saved data on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('topperformer_apikey');
    const savedHistory = localStorage.getItem('topperformer_history');
    const savedKpi = localStorage.getItem('topperformer_kpi');
    
    if (savedApiKey) setApiKey(savedApiKey);
    if (savedHistory) setReportHistory(JSON.parse(savedHistory));
    if (savedKpi) setKpiData(JSON.parse(savedKpi));
  }, []);

  // Save data when changed
  useEffect(() => {
    if (apiKey) localStorage.setItem('topperformer_apikey', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('topperformer_history', JSON.stringify(reportHistory));
  }, [reportHistory]);

  useEffect(() => {
    localStorage.setItem('topperformer_kpi', JSON.stringify(kpiData));
  }, [kpiData]);

  // Handle report type change
  const handleReportTypeChange = (typeId) => {
    setSelectedReportType(typeId);
    setReportContent(REPORT_TYPES[typeId].template);
  };

  // Submit report to AI
  const handleSubmitReport = async () => {
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    if (!reportContent.trim()) return;

    setIsLoading(true);
    setAiResponse('');

    try {
      const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${AI_SYSTEM_PROMPT}\n\n【${currentUser}さんからの報告】\nレポートタイプ: ${REPORT_TYPES[selectedReportType].label}\n\n${reportContent}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          }
        })
      });

      const data = await response.json();
      
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        const aiText = data.candidates[0].content.parts[0].text;
        setAiResponse(aiText);
        
        // Save to history
        const newReport = {
          id: Date.now(),
          user: currentUser,
          type: selectedReportType,
          content: reportContent,
          aiResponse: aiText,
          timestamp: new Date().toISOString()
        };
        setReportHistory(prev => [newReport, ...prev].slice(0, 50));
      } else {
        setAiResponse('エラー: AIからの応答を取得できませんでした。APIキーを確認してください。');
      }
    } catch (error) {
      setAiResponse(`エラー: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle manager view access
  const handleManagerAccess = () => {
    if (viewMode === 'manager') {
      setViewMode('sales');
    } else {
      setShowPasswordModal(true);
    }
  };

  const verifyManagerPassword = () => {
    // Simple password check (in production, use proper authentication)
    if (managerPassword === 'admin' || managerPassword === '1234') {
      setViewMode('manager');
      setShowPasswordModal(false);
      setManagerPassword('');
    } else {
      alert('パスワードが正しくありません');
    }
  };

  // Share to clipboard
  const handleShare = () => {
    const shareText = `【${REPORT_TYPES[selectedReportType].label}】\n${reportContent}\n\n【AIマネージャーからのフィードバック】\n${aiResponse}`;
    navigator.clipboard.writeText(shareText);
    alert('クリップボードにコピーしました！');
  };

  // Calculate progress percentage
  const calculateProgress = (current, target) => Math.min((current / target) * 100, 100);

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#2563EB"/>
              <path d="M8 12h16M8 16h12M8 20h14M22 20l4-4-4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div style={styles.logoText}>
              <span style={styles.logoTitle}>TopPerformer</span>
              <span style={styles.logoSubtitle}>AI Sales Manager</span>
            </div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <button style={styles.shareButton} onClick={handleShare} disabled={!aiResponse}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
            </svg>
          </button>
          <button 
            style={{...styles.viewToggle, ...(viewMode === 'sales' ? styles.viewToggleActive : {})}}
            onClick={() => setViewMode('sales')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>
            </svg>
            営業担当
          </button>
          <button 
            style={{...styles.viewToggle, ...(viewMode === 'manager' ? styles.viewToggleActive : {})}}
            onClick={handleManagerAccess}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3"/>
            </svg>
            管理者
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {viewMode === 'sales' ? (
          // Sales View
          <div style={styles.salesLayout}>
            {/* Left Column */}
            <div style={styles.leftColumn}>
              {/* Progress Card */}
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardTitleRow}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                    <span style={styles.cardTitle}>進捗状況</span>
                  </div>
                  <div style={styles.userBadge}>
                    {currentUser}
                    <span style={styles.userBadgeIcon}>👤</span>
                  </div>
                </div>

                {/* Period Tabs */}
                <div style={styles.periodTabs}>
                  {['daily', 'weekly', 'monthly'].map(period => (
                    <button
                      key={period}
                      style={{
                        ...styles.periodTab,
                        ...(selectedPeriod === period ? styles.periodTabActive : {})
                      }}
                      onClick={() => setSelectedPeriod(period)}
                    >
                      {period === 'daily' ? '日次' : period === 'weekly' ? '週次' : '月次'}
                    </button>
                  ))}
                </div>

                {/* KPI Bars */}
                <div style={styles.kpiList}>
                  <div style={styles.kpiItem}>
                    <div style={styles.kpiLabel}>
                      <span>架電数</span>
                      <span style={styles.kpiValue}>{kpiData.calls.current}<span style={styles.kpiTarget}>/{kpiData.calls.target}件</span></span>
                    </div>
                    <div style={styles.progressBar}>
                      <div style={{...styles.progressFill, width: `${calculateProgress(kpiData.calls.current, kpiData.calls.target)}%`}}/>
                    </div>
                  </div>
                  <div style={styles.kpiItem}>
                    <div style={styles.kpiLabel}>
                      <span>顧客代理数</span>
                      <span style={styles.kpiValue}>{kpiData.prospects.current}<span style={styles.kpiTarget}>/{kpiData.prospects.target}件</span></span>
                    </div>
                    <div style={styles.progressBar}>
                      <div style={{...styles.progressFill, width: `${calculateProgress(kpiData.prospects.current, kpiData.prospects.target)}%`}}/>
                    </div>
                  </div>
                  <div style={styles.kpiItem}>
                    <div style={styles.kpiLabel}>
                      <span>成約獲得数</span>
                      <span style={styles.kpiValue}>{kpiData.deals.current}<span style={styles.kpiTarget}>/{kpiData.deals.target}件</span></span>
                    </div>
                    <div style={styles.progressBar}>
                      <div style={{...styles.progressFill, width: `${calculateProgress(kpiData.deals.current, kpiData.deals.target)}%`}}/>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Reports */}
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardTitleRow}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
                      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span style={styles.cardTitle}>最近のレポート</span>
                  </div>
                </div>
                <div style={styles.historyList}>
                  {reportHistory.length === 0 ? (
                    <p style={styles.emptyHistory}>{currentUser}さんの履歴はありません。</p>
                  ) : (
                    reportHistory.slice(0, 5).map(report => (
                      <div key={report.id} style={styles.historyItem}>
                        <span style={styles.historyIcon}>{REPORT_TYPES[report.type]?.icon || '📝'}</span>
                        <div style={styles.historyContent}>
                          <span style={styles.historyType}>{REPORT_TYPES[report.type]?.label || report.type}</span>
                          <span style={styles.historyDate}>
                            {new Date(report.timestamp).toLocaleDateString('ja-JP')}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div style={styles.rightColumn}>
              {/* AI Response Card */}
              <div style={styles.card}>
                <div style={styles.aiHeader}>
                  <span style={styles.aiDot}></span>
                  <span style={styles.aiTitle}>AIマネージャーの応答</span>
                </div>
                <div style={styles.aiResponseArea}>
                  {isLoading ? (
                    <div style={styles.loadingContainer}>
                      <div style={styles.loadingSpinner}></div>
                      <p>分析中...</p>
                    </div>
                  ) : aiResponse ? (
                    <div style={styles.aiResponseText}>{aiResponse}</div>
                  ) : (
                    <div style={styles.aiPlaceholder}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5">
                        <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zM12 8v8M8 12h8"/>
                      </svg>
                      <p>モードを選択し、日報や相談内容を入力してください。</p>
                      <p style={styles.aiPlaceholderSub}>スマホの場合はホーム画面に追加してご利用ください。</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Report Input Card */}
              <div style={styles.card}>
                {/* Report Type Tabs */}
                <div style={styles.reportTabs}>
                  {Object.values(REPORT_TYPES).map(type => (
                    <button
                      key={type.id}
                      style={{
                        ...styles.reportTab,
                        ...(selectedReportType === type.id ? styles.reportTabActive : {})
                      }}
                      onClick={() => handleReportTypeChange(type.id)}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>

                {/* Text Input */}
                <div style={styles.inputContainer}>
                  <textarea
                    ref={textareaRef}
                    style={styles.textarea}
                    value={reportContent}
                    onChange={(e) => setReportContent(e.target.value)}
                    placeholder={REPORT_TYPES[selectedReportType].placeholder}
                  />
                  <button style={styles.micButton} title="音声入力（準備中）">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>
                    </svg>
                  </button>
                </div>

                {/* Footer */}
                <div style={styles.inputFooter}>
                  <p style={styles.footerText}>AIマネージャーが数値と行動・感情を分析します。</p>
                  <button 
                    style={styles.submitButton}
                    onClick={handleSubmitReport}
                    disabled={isLoading}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                    </svg>
                    日報を提出
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Manager View
          <div style={styles.managerLayout}>
            <div style={styles.managerCard}>
              <h2 style={styles.managerTitle}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
                チーム・ヘルスチェック
              </h2>
              <div style={styles.teamTable}>
                <div style={styles.tableHeader}>
                  <span style={styles.tableCell}>メンバー</span>
                  <span style={styles.tableCell}>架電数</span>
                  <span style={styles.tableCell}>商談数</span>
                  <span style={styles.tableCell}>成約</span>
                  <span style={styles.tableCell}>達成率</span>
                  <span style={styles.tableCell}>状態</span>
                </div>
                {teamData.map(member => (
                  <div key={member.name} style={styles.tableRow}>
                    <span style={styles.tableCell}>{member.name}</span>
                    <span style={styles.tableCell}>{member.calls}</span>
                    <span style={styles.tableCell}>{member.prospects}</span>
                    <span style={styles.tableCell}>{member.deals}/{member.target}</span>
                    <span style={styles.tableCell}>{Math.round((member.deals / member.target) * 100)}%</span>
                    <span style={styles.tableCell}>
                      <span style={{
                        ...styles.statusBadge,
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

            <div style={styles.managerCard}>
              <h2 style={styles.managerTitle}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
                AIボトルネック分析
              </h2>
              <div style={styles.analysisContent}>
                <div style={styles.analysisItem}>
                  <h3 style={styles.analysisName}>山田さん</h3>
                  <p style={styles.analysisText}>
                    架電数が目標の50%以下です。行動量の不足が主な原因と考えられます。
                    1on1で架電時間の確保について話し合うことをお勧めします。
                  </p>
                </div>
                <div style={styles.analysisItem}>
                  <h3 style={styles.analysisName}>佐藤さん</h3>
                  <p style={styles.analysisText}>
                    架電数は良好ですが、商談化率が低めです。
                    トークスクリプトの見直しや、ロールプレイングが効果的かもしれません。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Gemini APIキーを設定</h3>
            <p style={styles.modalText}>
              AIマネージャー機能を使用するには、Google AI StudioでAPIキーを取得してください。
            </p>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              style={styles.modalLink}
            >
              → Google AI Studioでキーを取得
            </a>
            <input
              type="password"
              style={styles.modalInput}
              placeholder="APIキーを入力..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <div style={styles.modalButtons}>
              <button style={styles.modalCancel} onClick={() => setShowApiKeyModal(false)}>
                キャンセル
              </button>
              <button 
                style={styles.modalConfirm} 
                onClick={() => {
                  setShowApiKeyModal(false);
                  if (apiKey) handleSubmitReport();
                }}
              >
                保存して続行
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>管理者パスワード</h3>
            <p style={styles.modalText}>
              管理者ビューにアクセスするにはパスワードを入力してください。
            </p>
            <input
              type="password"
              style={styles.modalInput}
              placeholder="パスワードを入力..."
              value={managerPassword}
              onChange={(e) => setManagerPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && verifyManagerPassword()}
            />
            <div style={styles.modalButtons}>
              <button style={styles.modalCancel} onClick={() => {
                setShowPasswordModal(false);
                setManagerPassword('');
              }}>
                キャンセル
              </button>
              <button style={styles.modalConfirm} onClick={verifyManagerPassword}>
                ログイン
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Styles */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

// Styles
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F8FAFC',
    fontFamily: "'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: 'white',
    borderBottom: '1px solid #E2E8F0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoText: {
    display: 'flex',
    flexDirection: 'column',
  },
  logoTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: '-0.5px',
  },
  logoSubtitle: {
    fontSize: '11px',
    color: '#64748B',
    letterSpacing: '0.5px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  shareButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#2563EB',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  viewToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #E2E8F0',
    backgroundColor: 'white',
    color: '#64748B',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  viewToggleActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
    color: '#2563EB',
  },
  main: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  salesLayout: {
    display: 'grid',
    gridTemplateColumns: '380px 1fr',
    gap: '24px',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    border: '1px solid #E2E8F0',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #F1F5F9',
  },
  cardTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#334155',
  },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    backgroundColor: '#EFF6FF',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#2563EB',
  },
  userBadgeIcon: {
    fontSize: '14px',
  },
  periodTabs: {
    display: 'flex',
    padding: '12px 20px',
    gap: '4px',
    backgroundColor: '#F8FAFC',
  },
  periodTab: {
    flex: 1,
    padding: '8px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: '#64748B',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  periodTabActive: {
    backgroundColor: 'white',
    color: '#2563EB',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  kpiList: {
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  kpiItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  kpiLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    color: '#475569',
  },
  kpiValue: {
    fontWeight: '600',
    color: '#1E293B',
  },
  kpiTarget: {
    fontWeight: '400',
    color: '#94A3B8',
  },
  progressBar: {
    height: '8px',
    backgroundColor: '#E2E8F0',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  historyList: {
    padding: '16px 20px',
  },
  emptyHistory: {
    color: '#94A3B8',
    fontSize: '13px',
    textAlign: 'center',
    padding: '20px 0',
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 0',
    borderBottom: '1px solid #F1F5F9',
  },
  historyIcon: {
    fontSize: '18px',
  },
  historyContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  historyType: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#334155',
  },
  historyDate: {
    fontSize: '11px',
    color: '#94A3B8',
  },
  aiHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '16px 20px',
    borderBottom: '1px solid #F1F5F9',
  },
  aiDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#22C55E',
  },
  aiTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#334155',
  },
  aiResponseArea: {
    padding: '20px',
    minHeight: '200px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '160px',
    color: '#64748B',
    gap: '12px',
  },
  loadingSpinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #E2E8F0',
    borderTopColor: '#2563EB',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  aiResponseText: {
    fontSize: '14px',
    lineHeight: '1.7',
    color: '#334155',
    whiteSpace: 'pre-wrap',
  },
  aiPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '160px',
    color: '#94A3B8',
    textAlign: 'center',
    gap: '12px',
  },
  aiPlaceholderSub: {
    fontSize: '12px',
    color: '#CBD5E1',
  },
  reportTabs: {
    display: 'flex',
    padding: '12px 16px',
    gap: '8px',
    borderBottom: '1px solid #F1F5F9',
    overflowX: 'auto',
  },
  reportTab: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '20px',
    backgroundColor: 'transparent',
    color: '#64748B',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
  reportTabActive: {
    backgroundColor: '#2563EB',
    color: 'white',
  },
  inputContainer: {
    position: 'relative',
    padding: '16px 20px',
  },
  textarea: {
    width: '100%',
    minHeight: '140px',
    padding: '16px',
    paddingRight: '48px',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#334155',
    resize: 'vertical',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  micButton: {
    position: 'absolute',
    right: '32px',
    bottom: '32px',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: '#94A3B8',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  inputFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    borderTop: '1px solid #F1F5F9',
    backgroundColor: '#FAFBFC',
  },
  footerText: {
    fontSize: '12px',
    color: '#94A3B8',
  },
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '10px',
    backgroundColor: '#2563EB',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  // Manager View Styles
  managerLayout: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  managerCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    border: '1px solid #E2E8F0',
    padding: '24px',
  },
  managerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '18px',
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: '20px',
  },
  teamTable: {
    display: 'flex',
    flexDirection: 'column',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr',
    padding: '12px 16px',
    backgroundColor: '#F8FAFC',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr',
    padding: '16px',
    borderBottom: '1px solid #F1F5F9',
    alignItems: 'center',
  },
  tableCell: {
    fontSize: '14px',
    color: '#334155',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
  },
  analysisContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  analysisItem: {
    padding: '16px',
    backgroundColor: '#F8FAFC',
    borderRadius: '12px',
    borderLeft: '4px solid #F59E0B',
  },
  analysisName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: '8px',
  },
  analysisText: {
    fontSize: '14px',
    color: '#475569',
    lineHeight: '1.6',
  },
  // Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '400px',
    width: '90%',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: '12px',
  },
  modalText: {
    fontSize: '14px',
    color: '#64748B',
    marginBottom: '16px',
    lineHeight: '1.6',
  },
  modalLink: {
    display: 'block',
    fontSize: '13px',
    color: '#2563EB',
    marginBottom: '16px',
    textDecoration: 'none',
  },
  modalInput: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  modalButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  modalCancel: {
    padding: '10px 16px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    backgroundColor: 'white',
    color: '#64748B',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  modalConfirm: {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#2563EB',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
};

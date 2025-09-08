import React from 'react';

const TestPage: React.FC = () => {
  const handleTestLog = () => {
    console.log('テストログ: ボタンが押されました');
    console.error('テストエラーログ');
    alert('テストボタンが押されました！');
  };

  const handleApiTest = async () => {
    console.log('APIテスト開始');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/health`);
      const data = await response.json();
      console.log('APIテスト成功:', data);
      alert('API接続成功: ' + JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('APIテストエラー:', error);
      alert('API接続失敗: ' + String(error));
    }
  };

  const handleStockApiTest = async () => {
    console.log('株価APIテスト開始 - トヨタ (7203)');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/stocks/7203`);
      const data = await response.json();
      console.log('株価APIテスト成功:', data);
      alert('株価API成功: ' + JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('株価APIテストエラー:', error);
      alert('株価API失敗: ' + String(error));
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>デバッグテストページ</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleTestLog}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          コンソールログテスト
        </button>
        
        <button 
          onClick={handleApiTest}
          style={{ 
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          APIテスト
        </button>
        
        <button 
          onClick={handleStockApiTest}
          style={{ 
            padding: '10px 20px',
            backgroundColor: '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          株価APIテスト (7203)
        </button>
      </div>

      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '15px', 
        borderRadius: '4px',
        marginTop: '20px'
      }}>
        <h3>テスト手順:</h3>
        <ol>
          <li>F12を押してデベロッパーツールを開く</li>
          <li>Consoleタブをクリック</li>
          <li>上の「コンソールログテスト」ボタンを押す</li>
          <li>コンソールにログが表示されるか確認</li>
          <li>「APIテスト」ボタンを押してAPI接続をテスト</li>
          <li><strong>「株価APIテスト (7203)」ボタンを押してトヨタの株価データを取得</strong></li>
        </ol>
      </div>
    </div>
  );
};

export default TestPage;
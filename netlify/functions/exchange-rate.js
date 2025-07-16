// netlify/functions/exchange-rate.js
// 이 파일을 netlify/functions/ 폴더에 정확히 저장하세요!

exports.handler = async (event, context) => {
  console.log('🚀 환율 API 함수 시작');
  
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // OPTIONS 요청 처리 (브라우저 CORS 체크)
  if (event.httpMethod === 'OPTIONS') {
    console.log('📡 OPTIONS 요청 처리');
    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify({ message: 'CORS OK' })
    };
  }

  // GET 요청만 허용
  if (event.httpMethod !== 'GET') {
    console.log('❌ 잘못된 HTTP 메서드:', event.httpMethod);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'GET 요청만 허용됩니다' 
      })
    };
  }

  try {
    // 한국수출입은행 API 설정
    const API_KEY = 'OcNbWis9kSxYMlWzwHV0ncFnlq5hjlPO';
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const apiUrl = `https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=${API_KEY}&searchdate=${today}&data=AP01`;
    
    console.log('📞 한국수출입은행 API 호출:', apiUrl);
    
    // API 호출
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ExchangeRateProxy/1.0'
      }
    });

    console.log('📊 API 응답 상태:', response.status);

    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ 데이터 수신 성공, 항목 수:', data.length);
    
    // 성공 응답
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: data,
        timestamp: new Date().toISOString(),
        message: '한국수출입은행 실시간 환율 데이터',
        count: data.length
      })
    };

  } catch (error) {
    console.error('💥 오류 발생:', error);
    
    // 실패 응답
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        message: '환율 데이터를 가져올 수 없습니다'
      })
    };
  }
};
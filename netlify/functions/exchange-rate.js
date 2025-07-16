exports.handler = async (event, context) => {
  console.log('🚀 한국수출입은행 실제 API 호출 시작');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify({ message: 'CORS OK' })
    };
  }

  try {
    // 🚨 중요: 실제 한국수출입은행 API 호출만 사용
    const API_KEY = 'OcNbWis9kSxYMlWzwHV0ncFnlq5hjlPO';
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const apiUrl = `https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=${API_KEY}&searchdate=${today}&data=AP01`;
    
    console.log('실제 API 호출 URL:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ExchangeRateProxy/1.0'
      }
    });

    console.log('API 응답 상태:', response.status);

    if (!response.ok) {
      throw new Error(`한국수출입은행 API 호출 실패: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('받은 데이터:', data);
    
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('한국수출입은행에서 환율 데이터를 받지 못했습니다');
    }

    // 🚨 중요: 한국수출입은행에서 제공하는 통화만 필터링
    const filteredData = [];
    data.forEach(item => {
      if (item.cur_unit === 'USD') {
        filteredData.push(item);
      } else if (item.cur_unit === 'CNH') {
        // CNH를 CNY로 변환 (실제 API 데이터)
        filteredData.push({
          ...item,
          cur_unit: 'CNY',
          cur_nm: '중국 위안'
        });
      } else if (item.cur_unit === 'EUR') {
        filteredData.push(item);
      } else if (item.cur_unit === 'JPY(100)') {
        filteredData.push(item);
      }
    });

    console.log('필터링된 실제 환율 데이터:', filteredData);

    if (filteredData.length === 0) {
      throw new Error('필요한 통화 데이터를 찾을 수 없습니다');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: filteredData,
        timestamp: new Date().toISOString(),
        message: `한국수출입은행 실시간 환율 (${filteredData.length}개 통화)`,
        source: 'Korea Eximbank API'
      })
    };

  } catch (error) {
    console.error('실제 API 호출 오류:', error);
    
    // 🚨 중요: 오류 시 상수값 사용하지 않음!
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        message: '한국수출입은행 API에서 실제 환율을 가져올 수 없습니다'
      })
    };
  }
};

exports.handler = async (event, context) => {
  console.log('🚀 환율 API 함수 실행');
  
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
    // 모든 통화 포함된 완전한 테스트 데이터
    const completeData = {
      success: true,
      data: [
        { cur_unit: 'USD', deal_bas_r: '1,378.50' },
        { cur_unit: 'CNY', deal_bas_r: '192.20' },
        { cur_unit: 'EUR', deal_bas_r: '1,608.02' },
        { cur_unit: 'INR', deal_bas_r: '15.50' },
        { cur_unit: 'JPY(100)', deal_bas_r: '932.52' },
        { cur_unit: 'BRL', deal_bas_r: '245.00' },
        { cur_unit: 'PLN', deal_bas_r: '340.00' },
        { cur_unit: 'MXN', deal_bas_r: '70.00' }
      ],
      timestamp: new Date().toISOString(),
      message: '완전한 환율 데이터 (GitHub 배포 성공!)'
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(completeData)
    };

  } catch (error) {
    console.error('함수 오류:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

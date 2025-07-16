exports.handler = async (event, context) => {
  console.log('🚀 함수 실행됨');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'OK' };
  }

  // 테스트 응답 (API 호출 없이)
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data: [
        { cur_unit: 'USD', deal_bas_r: '1,378.50' },
        { cur_unit: 'CNY', deal_bas_r: '192.20' },
        { cur_unit: 'EUR', deal_bas_r: '1,608.02' },
        { cur_unit: 'JPY(100)', deal_bas_r: '932.52' }
      ],
      timestamp: new Date().toISOString(),
      message: '테스트 데이터 (GitHub 배포 성공!)'
    })
  };
};

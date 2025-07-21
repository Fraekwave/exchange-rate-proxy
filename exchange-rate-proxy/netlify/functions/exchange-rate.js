// netlify/functions/exchange-rate.js

const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('🚀 환율 API 호출 시작:', new Date().toISOString());
    
    // 한국수출입은행 API 설정
    const API_KEY = 'OcNbWis9kSxYMlWzwHV0ncFnlq5hjlPO';
    const today = new Date();
    
    // 한국 시간 기준으로 날짜 조정
    const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
    const searchDate = koreaTime.toISOString().slice(0, 10).replace(/-/g, '');
    
    console.log('📅 검색 날짜:', searchDate);
    
    const apiUrl = `https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=${API_KEY}&searchdate=${searchDate}&data=AP01`;
    
    console.log('🔗 API URL:', apiUrl);

    // 여러 날짜를 시도 (최근 영업일 찾기)
    const datesToTry = [];
    for (let i = 0; i < 5; i++) {
      const tryDate = new Date(koreaTime.getTime() - (i * 24 * 60 * 60 * 1000));
      datesToTry.push(tryDate.toISOString().slice(0, 10).replace(/-/g, ''));
    }
    
    console.log('🗓️ 시도할 날짜들:', datesToTry);

    let lastError = null;
    let responseData = null;

    // 최근 날짜부터 순차적으로 시도
    for (const dateStr of datesToTry) {
      try {
        const tryUrl = `https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=${API_KEY}&searchdate=${dateStr}&data=AP01`;
        
        console.log(`📞 ${dateStr} 날짜로 API 호출 시도:`, tryUrl);
        
        const response = await fetch(tryUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
          },
          timeout: 10000
        });

        console.log(`📊 ${dateStr} 응답 상태:`, response.status, response.statusText);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseText = await response.text();
        console.log(`📄 ${dateStr} 응답 크기:`, responseText.length, '문자');
        console.log(`📝 ${dateStr} 응답 시작:`, responseText.substring(0, 200));

        if (!responseText || responseText.trim() === '') {
          throw new Error('빈 응답 받음');
        }

        // JSON 파싱 시도
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error(`❌ ${dateStr} JSON 파싱 실패:`, parseError.message);
          throw new Error(`JSON 파싱 실패: ${parseError.message}`);
        }

        // 데이터 검증
        if (!Array.isArray(data)) {
          console.error(`❌ ${dateStr} 응답이 배열이 아님:`, typeof data);
          throw new Error('응답 데이터가 배열이 아님');
        }

        if (data.length === 0) {
          console.warn(`⚠️ ${dateStr} 빈 배열 응답`);
          throw new Error('빈 환율 데이터');
        }

        // 필요한 통화가 포함되어 있는지 확인
        const currencies = data.map(item => item.cur_unit);
        console.log(`💱 ${dateStr} 포함된 통화:`, currencies);

        const requiredCurrencies = ['USD', 'EUR', 'CNY', 'JPY(100)'];
        const foundCurrencies = requiredCurrencies.filter(curr => 
          currencies.includes(curr) || (curr === 'JPY(100)' && currencies.includes('JPY(100)'))
        );

        if (foundCurrencies.length < 2) {
          throw new Error(`필요한 통화가 부족함. 발견된 통화: ${foundCurrencies.join(', ')}`);
        }

        console.log(`✅ ${dateStr} 성공! 발견된 주요 통화:`, foundCurrencies);
        responseData = data;
        lastError = null;
        break;

      } catch (error) {
        console.error(`❌ ${dateStr} 실패:`, error.message);
        lastError = error;
        continue;
      }
    }

    // 모든 날짜 시도 실패
    if (!responseData) {
      console.error('💥 모든 날짜 시도 실패. 마지막 에러:', lastError?.message);
      
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          success: false,
          error: '한국수출입은행 API 호출 실패',
          details: lastError?.message || '알 수 없는 오류',
          timestamp: new Date().toISOString(),
          message: '실시간 환율 데이터를 가져올 수 없습니다. API 서버에 문제가 있거나 네트워크 연결에 문제가 있습니다.'
        })
      };
    }

    // 성공적으로 데이터를 받은 경우
    console.log('🎉 환율 데이터 성공적으로 수신:', responseData.length, '개 항목');
    
    // 데이터 검증 및 로깅
    responseData.forEach((item, index) => {
      console.log(`💰 [${index}] ${item.cur_unit}: ${item.deal_bas_r} (${item.cur_nm})`);
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: responseData,
        timestamp: new Date().toISOString(),
        message: '한국수출입은행 실시간 환율 데이터 성공',
        dataDate: datesToTry[0] // 실제 데이터 날짜
      })
    };

  } catch (error) {
    console.error('💥 전체 함수 오류:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '서버 내부 오류',
        details: error.message,
        timestamp: new Date().toISOString(),
        message: '환율 데이터 처리 중 오류가 발생했습니다.'
      })
    };
  }
};

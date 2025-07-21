// netlify/functions/exchange-rate.js

// SSL 인증서 검증 전역 비활성화
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const https = require('https');
const axios = require('axios');

// SSL 검증을 우회하는 HTTPS Agent 생성
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  checkServerIdentity: () => undefined,
  secureProtocol: 'TLSv1_2_method'
});

exports.handler = async (event, context) => {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
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
    console.log('🚀 NEW 환율 API 호출 시작:', new Date().toISOString());
    console.log('🔒 SSL 인증서 검증 비활성화 설정 완료');
    
    // 한국수출입은행 API 설정
    const API_KEY = 'OcNbWis9kSxYMlWzwHV0ncFnlq5hjlPO';
    const today = new Date();
    
    // 한국 시간 기준으로 날짜 조정 (UTC+9)
    const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
    
    // 여러 날짜를 시도 (최근 7일간 영업일 찾기)
    const datesToTry = [];
    for (let i = 0; i < 7; i++) {
      const tryDate = new Date(koreaTime.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = tryDate.toISOString().slice(0, 10).replace(/-/g, '');
      datesToTry.push(dateStr);
    }
    
    console.log('🗓️ NEW 시도할 날짜들:', datesToTry);

    let lastError = null;
    let responseData = null;
    let successDate = null;

    // axios 인스턴스 생성 (SSL 검증 비활성화)
    const axiosInstance = axios.create({
      httpsAgent: httpsAgent,
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
      },
      validateStatus: (status) => status < 500 // 500 이상만 에러로 처리
    });

    // 최근 날짜부터 순차적으로 시도
    for (const dateStr of datesToTry) {
      try {
        const apiUrl = `https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=${API_KEY}&searchdate=${dateStr}&data=AP01`;
        
        console.log(`📞 NEW ${dateStr} 날짜로 API 호출 시도:`, apiUrl);
        
        const response = await axiosInstance.get(apiUrl);

        console.log(`📊 NEW ${dateStr} 응답 상태:`, response.status, response.statusText);
        console.log(`📋 NEW ${dateStr} 응답 헤더:`, JSON.stringify(response.headers));
        
        if (response.status !== 200) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseData = response.data;
        console.log(`📄 NEW ${dateStr} 응답 타입:`, typeof responseData);
        console.log(`📝 NEW ${dateStr} 응답 내용:`, JSON.stringify(responseData).substring(0, 300));

        if (!responseData) {
          throw new Error('빈 응답 받음');
        }

        // 응답이 문자열인 경우 JSON 파싱
        let data = responseData;
        if (typeof responseData === 'string') {
          try {
            data = JSON.parse(responseData);
          } catch (parseError) {
            console.error(`❌ NEW ${dateStr} JSON 파싱 실패:`, parseError.message);
            throw new Error(`JSON 파싱 실패: ${parseError.message}`);
          }
        }

        // 데이터 검증
        if (!Array.isArray(data)) {
          console.error(`❌ NEW ${dateStr} 응답이 배열이 아님:`, typeof data, data);
          throw new Error(`응답 데이터가 배열이 아님. 타입: ${typeof data}`);
        }

        if (data.length === 0) {
          console.warn(`⚠️ NEW ${dateStr} 빈 배열 응답`);
          throw new Error('빈 환율 데이터 배열');
        }

        // 필요한 통화가 포함되어 있는지 확인
        const currencies = data.map(item => item.cur_unit);
        console.log(`💱 NEW ${dateStr} 포함된 모든 통화:`, currencies);

        const requiredCurrencies = ['USD', 'EUR', 'CNY', 'JPY(100)'];
        const foundCurrencies = requiredCurrencies.filter(curr => currencies.includes(curr));

        console.log(`🔍 NEW ${dateStr} 필요 통화 매칭:`, foundCurrencies);

        if (foundCurrencies.length < 2) {
          throw new Error(`필요한 통화가 부족함. 필요: ${requiredCurrencies.join(', ')}, 발견: ${foundCurrencies.join(', ')}`);
        }

        console.log(`✅ NEW ${dateStr} 성공! 발견된 주요 통화:`, foundCurrencies);
        
        // 상세 환율 정보 로깅
        data.forEach((item, index) => {
          if (requiredCurrencies.includes(item.cur_unit)) {
            console.log(`💰 NEW [${index}] ${item.cur_unit}: ${item.deal_bas_r} (${item.cur_nm})`);
          }
        });
        
        responseData = data;
        successDate = dateStr;
        lastError = null;
        break;

      } catch (error) {
        console.error(`❌ NEW ${dateStr} 실패:`, error.message);
        console.error(`🔍 NEW ${dateStr} 에러 코드:`, error.code);
        console.error(`🔍 NEW ${dateStr} 에러 상세:`, error.response?.status, error.response?.statusText);
        lastError = error;
        continue;
      }
    }

    // 모든 날짜 시도 실패
    if (!responseData) {
      console.error('💥 NEW 모든 날짜 시도 실패. 마지막 에러:', lastError?.message);
      console.error('🔍 NEW 전체 에러 상세:', lastError);
      
      // 🚨 중요: 절대 기본값을 반환하지 않음!
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          success: false,
          error: '한국수출입은행 API 호출 완전 실패',
          details: lastError?.message || '알 수 없는 오류',
          errorCode: lastError?.code || 'UNKNOWN_ERROR',
          httpStatus: lastError?.response?.status,
          timestamp: new Date().toISOString(),
          message: '🚨 실시간 환율 데이터를 가져올 수 없습니다. 한국수출입은행 API 서버에 접근할 수 없습니다.',
          triedDates: datesToTry
        })
      };
    }

    // 성공적으로 데이터를 받은 경우
    console.log('🎉 NEW 환율 데이터 성공적으로 수신:', responseData.length, '개 항목');
    console.log('📅 NEW 성공한 날짜:', successDate);

    // 최종 데이터 검증
    const finalUsdRate = responseData.find(item => item.cur_unit === 'USD')?.deal_bas_r;
    console.log('💵 NEW 최종 USD 환율:', finalUsdRate);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: responseData,
        timestamp: new Date().toISOString(),
        dataDate: successDate,
        message: `NEW 한국수출입은행 실시간 환율 데이터 (${successDate} 기준) - USD: ${finalUsdRate}`
      })
    };

  } catch (error) {
    console.error('💥 NEW 전체 함수 오류:', error);
    console.error('🔍 NEW 오류 스택:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'NEW 서버 내부 오류',
        details: error.message,
        timestamp: new Date().toISOString(),
        message: 'NEW 환율 데이터 처리 중 오류가 발생했습니다.'
      })
    };
  }
};

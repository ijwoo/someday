// API 실패 시 폴백용 데모 코스 (실제 서비스에서는 노출 안 됨)
export const DEMO_COURSE = {
  title: '서울 감성 1박 2일',
  theme: '도심 속 감성 여행',
  totalTime: '약 13시간',
  steps: [
    { order:1, name:'경복궁',       time:'10:00', duration:'1시간 30분', desc:'조선 왕조의 법궁. 이른 아침 방문하면 고즈넉한 분위기를 느낄 수 있어요.', lat:37.5796, lng:126.9770, day:1, badge:'관광명소', tags:['culture'], ti:3, seed:11 },
    { order:2, name:'삼청동',        time:'11:30', duration:'1시간',      desc:'한옥과 카페가 어우러진 감성 골목. 북촌과 이어지는 산책 코스예요.',    lat:37.5823, lng:126.9816, day:1, badge:'카페거리', tags:['cafe','view'], ti:4, seed:22 },
    { order:3, name:'광장시장',      time:'13:30', duration:'1시간 30분', desc:'100년 전통 시장. 육회비빔밥과 빈대떡은 꼭 먹어봐야 해요.',           lat:37.5700, lng:126.9993, day:1, badge:'맛집',    tags:['food'], ti:2, seed:33 },
    { order:4, name:'성수동',        time:'16:00', duration:'2시간',      desc:'팝업스토어와 갤러리가 가득한 서울의 브루클린.',                       lat:37.5448, lng:127.0557, day:1, badge:'핫플',    tags:['view','culture'], ti:0, seed:44 },
    { order:5, name:'익선동',        time:'09:30', duration:'1시간 30분', desc:'1920년대 한옥 개조 카페. 이른 아침은 조용해서 사진 찍기 좋아요.',    lat:37.5729, lng:126.9938, day:2, badge:'포토스팟', tags:['cafe','view'], ti:3, seed:55 },
    { order:6, name:'DDP',           time:'11:00', duration:'1시간 30분', desc:'자하 하디드 설계의 미래적 건물. 전시와 팝업이 항상 열려 있어요.',    lat:37.5667, lng:127.0096, day:2, badge:'전시',    tags:['culture','view'], ti:0, seed:66 },
    { order:7, name:'한강 노을공원', time:'14:00', duration:'2시간',      desc:'서울 최대 억새밭. 해질 무렵 노을이 장관이에요.',                     lat:37.5657, lng:126.8830, day:2, badge:'자연',    tags:['view'], ti:1, seed:77 },
  ],
}

// ============================================================
// gameData.js — 카드 데이터 하드코딩 (31장: 물건 20 + 능력 11)
// ============================================================

const ITEM_CARDS = [
  // ─── 일반 물건 카드 ───────────────────────────────────────
  { id: 1,  type: 'item', name: '골동품 도자기',    realPrice: 100, fakePrice: 10,  isReal: true,  isSet: false },
  { id: 2,  type: 'item', name: '복제 도자기',      realPrice: 100, fakePrice: 10,  isReal: false, isSet: false },
  { id: 3,  type: 'item', name: '은제 촛대',        realPrice: 20,  fakePrice: 20,  isReal: true,  isSet: false },
  { id: 4,  type: 'item', name: '도금 촛대',        realPrice: 20,  fakePrice: 20,  isReal: false, isSet: false },
  { id: 5,  type: 'item', name: '희귀 우표',        realPrice: 20,  fakePrice: 10,  isReal: true,  isSet: false },
  { id: 6,  type: 'item', name: '가짜 우표',        realPrice: 20,  fakePrice: 10,  isReal: false, isSet: false },
  { id: 7,  type: 'item', name: '빈티지 시계',      realPrice: 30,  fakePrice: 10,  isReal: true,  isSet: false },
  { id: 8,  type: 'item', name: '복제 시계',        realPrice: 30,  fakePrice: 10,  isReal: false, isSet: false },
  { id: 9,  type: 'item', name: '명화 원작',        realPrice: 50,  fakePrice: 20,  isReal: true,  isSet: false },
  { id: 10, type: 'item', name: '명화 복사본',      realPrice: 50,  fakePrice: 20,  isReal: false, isSet: false },
  { id: 11, type: 'item', name: '철제 주화',        realPrice: 10,  fakePrice: 10,  isReal: true,  isSet: false },
  { id: 12, type: 'item', name: '주조 주화',        realPrice: 10,  fakePrice: 10,  isReal: false, isSet: false },
  { id: 13, type: 'item', name: '루비 원석',        realPrice: 80,  fakePrice: 30,  isReal: true,  isSet: false },
  { id: 14, type: 'item', name: '합성 루비',        realPrice: 80,  fakePrice: 30,  isReal: false, isSet: false },

  // ─── 세트 카드 (15~20, isSet: true) ──────────────────────
  // 3장 완성: 가짜 0개=$80, 1개=$60, 2개=$45, 3개=$30
  { id: 15, type: 'item', name: '황금 동상 I',     realPrice: 10,  fakePrice: 10,  isReal: true,  isSet: true },
  { id: 16, type: 'item', name: '황금 동상 II',    realPrice: 10,  fakePrice: 10,  isReal: true,  isSet: true },
  { id: 17, type: 'item', name: '황금 동상 III',   realPrice: 10,  fakePrice: 10,  isReal: true,  isSet: true },
  { id: 18, type: 'item', name: '동상 복제품 I',   realPrice: 10,  fakePrice: 10,  isReal: false, isSet: true },
  { id: 19, type: 'item', name: '동상 복제품 II',  realPrice: 10,  fakePrice: 10,  isReal: false, isSet: true },
  { id: 20, type: 'item', name: '동상 복제품 III', realPrice: 10,  fakePrice: 10,  isReal: false, isSet: true },
];

const ABILITY_CARDS = [
  { id: 21, type: 'ability', name: '정가+10 강제인수',     basePrice: 10, effect: 'forced_buy',       desc: '경매 중인 카드를 (정가+$10)에 즉시 강제 낙찰합니다.' },
  { id: 22, type: 'ability', name: '상대 물건 없애기',      basePrice: 10, effect: 'destroy_item',      desc: '상대방의 물건 카드 1장을 선택해 제거합니다.' },
  { id: 23, type: 'ability', name: '가짜 물건 -$10 판매',   basePrice: 10, effect: 'sell_fake_minus10', desc: '내 가짜 물건 1장을 은행에 (가짜가격-$10)에 팝니다.' },
  { id: 24, type: 'ability', name: '진위 확인',             basePrice: 10, effect: 'reveal_truth',      desc: '경매 중인 카드 또는 상대 카드 1장의 진위를 나만 확인합니다.' },
  { id: 25, type: 'ability', name: '돈 +$20',              basePrice: 10, effect: 'money_plus20',      desc: '즉시 $20을 획득합니다.' },
  { id: 26, type: 'ability', name: '모두에게 5씩 걷기',     basePrice: 10, effect: 'collect_5_from_all',desc: '다른 플레이어 각각에게 $5를 걷습니다. 결과가 5로 끝나면 내림 처리.' },
  { id: 27, type: 'ability', name: '입찰금 $10 걷기',       basePrice: 10, effect: 'collect_bid10',     desc: '경매 중인 최고 입찰자에게 $10을 걷습니다.' },
  { id: 28, type: 'ability', name: '경매품 변경',           basePrice: 10, effect: 'swap_auction_card', desc: '경매 중인 카드를 덱에 반납하고 무작위 새 카드로 교체합니다.' },
  { id: 29, type: 'ability', name: '카드 버리고 뽑기',      basePrice: 10, effect: 'discard_draw',      desc: '내 카드 1장을 버리고 덱에서 무작위로 1장을 뽑습니다.' },
  { id: 30, type: 'ability', name: '차례 한번 더',          basePrice: 10, effect: 'extra_turn',        desc: '이번 턴 종료 후 내 차례가 한 번 더 진행됩니다.' },
  { id: 31, type: 'ability', name: '수수료 없이 판매',      basePrice: 10, effect: 'free_bank_sell',    desc: '이번 턴 은행 판매 시 수수료 $10이 면제됩니다.' },
];

const ALL_CARDS = [...ITEM_CARDS, ...ABILITY_CARDS];

// 세트 카드 가치 테이블
const SET_VALUE_TABLE = {
  0: 80, // 가짜 0개
  1: 60, // 가짜 1개
  2: 45, // 가짜 2개
  3: 30, // 가짜 3개
};

// 덱 셔플 (Fisher-Yates)
function shuffleDeck(deck) {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 새 덱 생성 (딥카피 + 셔플)
function createShuffledDeck() {
  const deck = ALL_CARDS.map(c => ({ ...c }));
  return shuffleDeck(deck);
}

module.exports = {
  ITEM_CARDS,
  ABILITY_CARDS,
  ALL_CARDS,
  SET_VALUE_TABLE,
  shuffleDeck,
  createShuffledDeck,
};

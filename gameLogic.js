// ============================================================
// gameLogic.js — 서버 측 순수 게임 로직 (인원 가변 + 라운드 카드 추가 + 물건카드 소진 종료)
// ============================================================

const { createShuffledDeck, shuffleDeck, SET_VALUE_TABLE } = require('./gameData');

// ── 초기 게임 상태 생성 ────────────────────────────────────
function createInitialGameState(players) {
  let deck = createShuffledDeck();

  const playerStates = players.map(p => {
    const card = deck.shift();
    return {
      id: p.id,
      name: p.name,
      money: 100,
      inventory: [card],
      freeBankSell: false,
      revealedCards: [],
    };
  });

  return {
    phase: 'playing',
    players: playerStates,
    deck,
    auction: {
      active: false,
      card: null,
      sellerId: null,
      bids: [],
      currentBid: 0,
      highestBidderId: null,
      phase: 'idle',
    },
    trade: {
      active: false,
      proposerId: null,
      targetId: null,
      offer: { cards: [], money: 0 },
      request: { cards: [], money: 0 },
      status: 'idle',
    },
    turnIndex: 0,
    roundIndex: 0,           // 라운드 번호 (0부터 시작, 플레이어 수만큼 턴이 돌면 1 증가)
    turnsThisRound: 0,       // 이번 라운드에서 완료된 턴 수
    turnActions: {
      auctionUsed: false,
      tradeCount: 0,
      tradedWith: [],
      extraTurn: false,
    },
    log: ['게임이 시작되었습니다!'],
    gameEnded: false,
  };
}

function getCurrentPlayer(state) {
  return state.players[state.turnIndex];
}

// ── 물건 카드만 덱에 있는지 확인 ──────────────────────────
function hasItemCardsInDeck(deck) {
  return deck.some(c => c.type === 'item');
}

// ── 턴 종료 ──────────────────────────────────────────────
function endTurn(state) {
  const newState = deepClone(state);
  const playerCount = newState.players.length;

  // extra_turn 처리
  if (newState.turnActions.extraTurn) {
    newState.turnActions = {
      auctionUsed: false,
      tradeCount: 0,
      tradedWith: [],
      extraTurn: false,
    };
    const cp = getCurrentPlayer(newState);
    newState.log.push(`[추가턴] ${cp.name}이(가) 차례를 한번 더 진행합니다!`);
    return newState;
  }

  // 다음 플레이어로
  newState.turnIndex = (newState.turnIndex + 1) % playerCount;
  newState.turnsThisRound += 1;
  newState.turnActions = {
    auctionUsed: false,
    tradeCount: 0,
    tradedWith: [],
    extraTurn: false,
  };

  // ── 라운드 완료 체크 ─────────────────────────────────
  if (newState.turnsThisRound >= playerCount) {
    newState.roundIndex += 1;
    newState.turnsThisRound = 0;
    newState.log.push(`[라운드] 라운드 ${newState.roundIndex} 완료! 모든 플레이어가 카드 1장씩 획득합니다.`);

    // 각 플레이어에게 카드 1장 지급 (덱에 남은 카드가 있는 경우)
    for (const player of newState.players) {
      if (newState.deck.length > 0) {
        const card = newState.deck.shift();
        player.inventory.push(card);
        newState.log.push(`  [보상] ${player.name}: "${card.name}" 획득`);
      }
    }
  }

  // ── 게임 종료 조건: 덱에 물건 카드가 없으면 이번 턴 종료 시 게임 종료 ──
  if (!hasItemCardsInDeck(newState.deck)) {
    newState.gameEnded = true;
    newState.phase = 'ended';
    newState.log.push('[종료] 덱에 물건 카드가 소진되었습니다. 게임이 종료되었습니다!');
    return newState;
  }

  const next = getCurrentPlayer(newState);
  newState.log.push(`[턴] ${next.name}의 턴입니다.`);
  return newState;
}

// ── 행동 A: 경매 시작 ─────────────────────────────────────
function startAuction(state, sellerId, cardId) {
  const newState = deepClone(state);
  const seller = newState.players.find(p => p.id === sellerId);
  if (!seller) return { error: '플레이어를 찾을 수 없습니다.' };

  const cardIdx = seller.inventory.findIndex(c => c.id === cardId);
  if (cardIdx === -1) return { error: '카드를 찾을 수 없습니다.' };
  if (newState.turnActions.auctionUsed) return { error: '이번 턴에 이미 경매를 사용했습니다.' };
  if (newState.auction.active) return { error: '이미 경매가 진행 중입니다.' };

  const card = seller.inventory.splice(cardIdx, 1)[0];
  newState.auction = {
    active: true,
    card,
    sellerId,
    bids: [],
    currentBid: 0,
    highestBidderId: null,
    phase: 'bidding',
  };
  newState.turnActions.auctionUsed = true;
  newState.log.push(`[경매] ${seller.name}이(가) "${card.name}"을(를) 경매에 올렸습니다.`);
  return newState;
}

// ── 경매 입찰 ─────────────────────────────────────────────
function placeBid(state, bidderId, amount) {
  const newState = deepClone(state);
  if (!newState.auction.active) return { error: '진행 중인 경매가 없습니다.' };
  if (newState.auction.sellerId === bidderId) return { error: '판매자는 입찰할 수 없습니다.' };

  const bidder = newState.players.find(p => p.id === bidderId);
  if (!bidder) return { error: '플레이어를 찾을 수 없습니다.' };
  if (amount % 10 !== 0) return { error: '입찰은 $10 단위여야 합니다.' };
  if (amount <= newState.auction.currentBid) return { error: `현재 최고 입찰가($${newState.auction.currentBid})보다 높아야 합니다.` };
  if (bidder.money < amount) return { error: '잔액이 부족합니다.' };

  newState.auction.currentBid = amount;
  newState.auction.highestBidderId = bidderId;
  newState.auction.bids.push({ playerId: bidderId, amount });
  newState.log.push(`[입찰] ${bidder.name}이(가) $${amount}에 입찰했습니다.`);
  return newState;
}

// ── 경매 낙찰 ─────────────────────────────────────────────
function closeAuction(state) {
  const newState = deepClone(state);
  const auction = newState.auction;
  if (!auction.active) return { error: '진행 중인 경매가 없습니다.' };

  const seller = newState.players.find(p => p.id === auction.sellerId);
  if (auction.highestBidderId) {
    const buyer = newState.players.find(p => p.id === auction.highestBidderId);
    buyer.money -= auction.currentBid;
    seller.money += auction.currentBid;
    buyer.inventory.push({ ...auction.card });
    newState.log.push(`[낙찰] ${buyer.name}이(가) "${auction.card.name}"을(를) $${auction.currentBid}에 낙찰받았습니다.`);
  } else {
    seller.inventory.push({ ...auction.card });
    newState.log.push(`[유찰] "${auction.card.name}" 유찰. 판매자에게 반납됩니다.`);
  }

  newState.auction = {
    active: false, card: null, sellerId: null, bids: [], currentBid: 0, highestBidderId: null, phase: 'idle',
  };
  return newState;
}

// ── 행동 B: 덱에서 카드 뽑기 ($20, 물건 카드만 제공) ──────
function drawFromDeck(state, playerId) {
  const newState = deepClone(state);
  const player = newState.players.find(p => p.id === playerId);
  if (!player) return { error: '플레이어를 찾을 수 없습니다.' };
  if (player.money < 20) return { error: '잔액이 부족합니다. ($20 필요)' };
  if (newState.deck.length === 0) return { error: '덱이 비어 있습니다.' };

  player.money -= 20;
  const card = newState.deck.shift();
  player.inventory.push(card);
  newState.log.push(`[뽑기] ${player.name}이(가) $20을 내고 카드를 뽑았습니다.`);
  return newState;
}

// ── 행동 C: 은행 판매 ─────────────────────────────────────
function sellToBank(state, playerId, cardId) {
  const newState = deepClone(state);
  const player = newState.players.find(p => p.id === playerId);
  if (!player) return { error: '플레이어를 찾을 수 없습니다.' };

  const cardIdx = player.inventory.findIndex(c => c.id === cardId);
  if (cardIdx === -1) return { error: '카드를 찾을 수 없습니다.' };

  const card = player.inventory[cardIdx];
  if (card.type === 'ability') return { error: '능력 카드는 은행에 판매할 수 없습니다.' };

  const value = getCardBankValue(card, player.inventory);
  const fee = player.freeBankSell ? 0 : 10;
  const earn = value - fee;
  if (earn <= 0) return { error: '판매 수익이 없어 판매할 수 없습니다.' };

  player.inventory.splice(cardIdx, 1);
  player.money += earn;
  if (player.freeBankSell) player.freeBankSell = false;

  newState.log.push(`[은행판매] ${player.name}이(가) "${card.name}"을(를) 은행에 $${earn}에 판매했습니다.${fee === 0 ? ' (수수료 면제)' : ''}`);
  return newState;
}

function getCardBankValue(card, inventory) {
  if (card.type === 'ability') return card.basePrice;
  if (card.isSet) {
    const ownedSetCards = inventory.filter(c => c.isSet);
    if (ownedSetCards.length < 3) return card.isReal ? card.realPrice : card.fakePrice;
    const fakeCount = ownedSetCards.filter(c => !c.isReal).length;
    return SET_VALUE_TABLE[Math.min(fakeCount, 3)];
  }
  return card.isReal ? card.realPrice : card.fakePrice;
}

function calcFinalAsset(player) {
  let total = player.money;
  const setCards = player.inventory.filter(c => c.isSet);
  const nonSetCards = player.inventory.filter(c => !c.isSet && c.type === 'item');

  for (const c of nonSetCards) {
    total += c.isReal ? c.realPrice : c.fakePrice;
  }

  if (setCards.length >= 3) {
    const fakeCount = setCards.filter(c => !c.isReal).length;
    total += SET_VALUE_TABLE[Math.min(fakeCount, 3)];
  } else {
    for (const c of setCards) {
      total += c.isReal ? c.realPrice : c.fakePrice;
    }
  }

  return total;
}

// ── 거래 ──────────────────────────────────────────────────
function proposeTrade(state, proposerId, targetId, offerCards, offerMoney, requestCards, requestMoney) {
  const newState = deepClone(state);
  const currentPlayer = getCurrentPlayer(newState);

  if (currentPlayer.id !== proposerId) return { error: '자신의 턴에만 거래를 제안할 수 있습니다.' };
  if (newState.turnActions.tradeCount >= 2) return { error: '이번 턴에 거래를 2회 이미 진행했습니다.' };
  if (newState.turnActions.tradedWith.includes(targetId)) return { error: '이미 이 플레이어와 거래했습니다.' };
  if (newState.trade.active) return { error: '이미 거래가 진행 중입니다.' };

  const proposer = newState.players.find(p => p.id === proposerId);
  const target = newState.players.find(p => p.id === targetId);
  if (!target) return { error: '대상 플레이어를 찾을 수 없습니다.' };
  if (proposer.money < offerMoney) return { error: '제시할 금액이 부족합니다.' };

  for (const cid of offerCards) {
    if (!proposer.inventory.find(c => c.id === cid)) return { error: `카드 ID ${cid}를 보유하고 있지 않습니다.` };
  }
  for (const cid of requestCards) {
    if (!target.inventory.find(c => c.id === cid)) return { error: `상대가 카드 ID ${cid}를 보유하고 있지 않습니다.` };
  }

  newState.trade = {
    active: true,
    proposerId,
    targetId,
    offer: { cards: offerCards, money: offerMoney },
    request: { cards: requestCards, money: requestMoney },
    status: 'pending',
  };

  newState.log.push(`[거래] ${proposer.name}이(가) ${target.name}에게 거래를 제안했습니다.`);
  return newState;
}

function respondTrade(state, targetId, accepted) {
  const newState = deepClone(state);
  const trade = newState.trade;
  if (!trade.active || trade.status !== 'pending') return { error: '진행 중인 거래 제안이 없습니다.' };
  if (trade.targetId !== targetId) return { error: '거래 수락 권한이 없습니다.' };

  const proposer = newState.players.find(p => p.id === trade.proposerId);
  const target = newState.players.find(p => p.id === trade.targetId);

  if (accepted) {
    for (const cid of trade.offer.cards) {
      const idx = proposer.inventory.findIndex(c => c.id === cid);
      if (idx !== -1) { const [card] = proposer.inventory.splice(idx, 1); target.inventory.push(card); }
    }
    for (const cid of trade.request.cards) {
      const idx = target.inventory.findIndex(c => c.id === cid);
      if (idx !== -1) { const [card] = target.inventory.splice(idx, 1); proposer.inventory.push(card); }
    }
    proposer.money -= trade.offer.money;
    target.money += trade.offer.money;
    target.money -= trade.request.money;
    proposer.money += trade.request.money;

    newState.log.push(`[거래성사] ${proposer.name}과(와) ${target.name}의 거래가 성사되었습니다.`);
    newState.turnActions.tradeCount += 1;
    newState.turnActions.tradedWith.push(targetId);
  } else {
    newState.log.push(`[거래거절] ${target.name}이(가) 거래를 거절했습니다.`);
  }

  newState.trade = { active: false, proposerId: null, targetId: null, offer: { cards: [], money: 0 }, request: { cards: [], money: 0 }, status: 'idle' };
  return newState;
}

function cancelTrade(state, proposerId) {
  const newState = deepClone(state);
  if (!newState.trade.active || newState.trade.proposerId !== proposerId) return { error: '취소할 수 없습니다.' };
  const proposer = newState.players.find(p => p.id === proposerId);
  newState.log.push(`[거래취소] ${proposer.name}이(가) 거래를 취소했습니다.`);
  newState.trade = { active: false, proposerId: null, targetId: null, offer: { cards: [], money: 0 }, request: { cards: [], money: 0 }, status: 'idle' };
  return newState;
}

// ── 능력 카드 사용 ────────────────────────────────────────
function useAbilityCard(state, userId, cardId, params = {}) {
  let newState = deepClone(state);
  const user = newState.players.find(p => p.id === userId);
  if (!user) return { error: '플레이어를 찾을 수 없습니다.' };

  const cardIdx = user.inventory.findIndex(c => c.id === cardId && c.type === 'ability');
  if (cardIdx === -1) return { error: '능력 카드를 찾을 수 없습니다.' };
  const card = user.inventory[cardIdx];

  let result;
  switch (card.effect) {
    case 'forced_buy': result = abilityForcedBuy(newState, user, card); break;
    case 'destroy_item': result = abilityDestroyItem(newState, user, params); break;
    case 'sell_fake_minus10': result = abilitySellFakeMinus10(newState, user, params); break;
    case 'reveal_truth': result = abilityRevealTruth(newState, user, params); break;
    case 'money_plus20': result = abilityMoneyPlus20(newState, user); break;
    case 'collect_5_from_all': result = abilityCollect5(newState, user); break;
    case 'collect_bid10': result = abilityCollectBid10(newState, user); break;
    case 'swap_auction_card': result = abilitySwapAuctionCard(newState, user); break;
    case 'discard_draw': result = abilityDiscardDraw(newState, user, params); break;
    case 'extra_turn': result = abilityExtraTurn(newState, user); break;
    case 'free_bank_sell': result = abilityFreeBankSell(newState, user); break;
    default: return { error: '알 수 없는 능력입니다.' };
  }

  if (result.error) return result;
  newState = result;

  const userAfter = newState.players.find(p => p.id === userId);
  const afterIdx = userAfter.inventory.findIndex(c => c.id === cardId);
  if (afterIdx !== -1) {
    const [used] = userAfter.inventory.splice(afterIdx, 1);
    newState.deck.push(used);
    newState.deck = shuffleDeck(newState.deck);
  }

  newState.log.push(`[능력] ${user.name}이(가) 능력 카드 "${card.name}"을(를) 사용했습니다.`);
  return newState;
}

function abilityForcedBuy(state, user, abilityCard) {
  if (!state.auction.active) return { error: '경매가 진행 중이 아닙니다.' };
  const auction = state.auction;
  const auctionCard = auction.card;
  const forcedPrice = (auctionCard.isReal ? auctionCard.realPrice : auctionCard.fakePrice) + 10;
  if (user.money < forcedPrice) return { error: `잔액 부족. 강제인수에는 $${forcedPrice}가 필요합니다.` };

  const seller = state.players.find(p => p.id === auction.sellerId);
  user.money -= forcedPrice;
  seller.money += forcedPrice;
  user.inventory.push({ ...auctionCard });

  state.auction = { active: false, card: null, sellerId: null, bids: [], currentBid: 0, highestBidderId: null, phase: 'idle' };
  state.log.push(`[능력:강제낙찰] ${user.name}이(가) "${auctionCard.name}"을(를) $${forcedPrice}에 강제 낙찰했습니다!`);
  return state;
}

function abilityDestroyItem(state, user, params) {
  const { targetPlayerId, targetCardId } = params;
  if (!targetPlayerId || !targetCardId) return { error: '대상 플레이어와 카드를 지정해야 합니다.' };
  const target = state.players.find(p => p.id === targetPlayerId);
  if (!target) return { error: '대상 플레이어를 찾을 수 없습니다.' };
  const cardIdx = target.inventory.findIndex(c => c.id === targetCardId && c.type === 'item');
  if (cardIdx === -1) return { error: '해당 물건 카드를 찾을 수 없습니다.' };
  const [removed] = target.inventory.splice(cardIdx, 1);
  state.log.push(`[능력:카드제거] ${user.name}이(가) ${target.name}의 "${removed.name}"을(를) 제거했습니다!`);
  return state;
}

function abilitySellFakeMinus10(state, user, params) {
  const { cardId } = params;
  if (!cardId) return { error: '판매할 카드 ID를 지정해야 합니다.' };
  const cardIdx = user.inventory.findIndex(c => c.id === cardId && c.type === 'item' && !c.isReal);
  if (cardIdx === -1) return { error: '해당 가짜 물건 카드를 찾을 수 없습니다.' };
  const card = user.inventory[cardIdx];
  const earn = Math.max(0, card.fakePrice - 10);
  user.inventory.splice(cardIdx, 1);
  user.money += earn;
  state.log.push(`[능력:가품판매] ${user.name}이(가) "${card.name}"을(를) $${earn}에 판매했습니다.`);
  return state;
}

function abilityRevealTruth(state, user, params) {
  const { targetCardId } = params;
  if (!targetCardId) return { error: '확인할 카드 ID를 지정해야 합니다.' };
  let foundCard = null;
  if (state.auction.active && state.auction.card?.id === targetCardId) {
    foundCard = state.auction.card;
  } else {
    for (const p of state.players) {
      const c = p.inventory.find(c => c.id === targetCardId);
      if (c) { foundCard = c; break; }
    }
  }
  if (!foundCard) return { error: '해당 카드를 찾을 수 없습니다.' };
  if (!user.revealedCards.includes(targetCardId)) user.revealedCards.push(targetCardId);
  state._revealResult = { userId: user.id, cardId: targetCardId, isReal: foundCard.isReal, cardName: foundCard.name };
  state.log.push(`[능력:진위확인] ${user.name}이(가) 카드의 진위를 확인했습니다.`);
  return state;
}

function abilityMoneyPlus20(state, user) {
  user.money += 20;
  state.log.push(`[능력:자금획득] ${user.name}이(가) $20을 획득했습니다!`);
  return state;
}

function abilityCollect5(state, user) {
  let totalCollected = 0;
  for (const p of state.players) {
    if (p.id === user.id) continue;
    let deduct = 5;
    const remainder = (p.money - 5) % 10;
    if (remainder === 5) deduct = 10;
    const actualDeduct = Math.min(deduct, p.money);
    p.money -= actualDeduct;
    totalCollected += actualDeduct;
  }
  user.money += totalCollected;
  state.log.push(`[능력:징수] ${user.name}이(가) 다른 플레이어들로부터 총 $${totalCollected}을 걷었습니다!`);
  return state;
}

function abilityCollectBid10(state, user) {
  if (!state.auction.active) return { error: '경매가 진행 중이 아닙니다.' };
  if (!state.auction.highestBidderId) return { error: '현재 최고 입찰자가 없습니다.' };
  const highBidder = state.players.find(p => p.id === state.auction.highestBidderId);
  if (highBidder.money < 10) return { error: '최고 입찰자의 잔액이 부족합니다.' };
  highBidder.money -= 10;
  user.money += 10;
  state.log.push(`[능력:입찰자징수] ${user.name}이(가) ${highBidder.name}에게 $10을 걷었습니다!`);
  return state;
}

function abilitySwapAuctionCard(state, user) {
  if (!state.auction.active) return { error: '경매가 진행 중이 아닙니다.' };
  if (state.deck.length === 0) return { error: '덱이 비어 있습니다.' };
  const oldCard = state.auction.card;
  state.deck.push({ ...oldCard });
  state.deck = shuffleDeck(state.deck);
  const newCard = state.deck.shift();
  state.auction.card = newCard;
  state.auction.bids = [];
  state.auction.currentBid = 0;
  state.auction.highestBidderId = null;
  state.log.push(`[능력:경매카드교체] ${user.name}이(가) 경매 카드를 변경했습니다! 새 카드: "${newCard.name}"`);
  return state;
}

function abilityDiscardDraw(state, user, params) {
  const { discardCardId } = params;
  if (!discardCardId) return { error: '버릴 카드 ID를 지정해야 합니다.' };
  const cardIdx = user.inventory.findIndex(c => c.id === discardCardId);
  if (cardIdx === -1) return { error: '해당 카드를 찾을 수 없습니다.' };
  if (state.deck.length === 0) return { error: '덱이 비어 있습니다.' };
  const [discard] = user.inventory.splice(cardIdx, 1);
  state.deck.push({ ...discard });
  state.deck = shuffleDeck(state.deck);
  const drawn = state.deck.shift();
  user.inventory.push(drawn);
  state.log.push(`[능력:카드교체] ${user.name}이(가) 카드를 버리고 새 카드를 뽑았습니다.`);
  return state;
}

function abilityExtraTurn(state, user) {
  state.turnActions.extraTurn = true;
  state.log.push(`[능력:추가턴] ${user.name}이(가) "차례 한번 더" 능력을 발동했습니다!`);
  return state;
}

function abilityFreeBankSell(state, user) {
  user.freeBankSell = true;
  state.log.push(`[능력:수수료면제] ${user.name}이(가) 이번 판매에 수수료를 면제받습니다!`);
  return state;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getClientState(state, viewerId) {
  const cs = deepClone(state);
  const viewer = cs.players.find(p => p.id === viewerId);

  // Deck counts for all players
  cs.deckCount = state.deck.length;
  cs.deckItemCount = state.deck.filter(c => c.type === 'item').length;

  // Sanitize deck array to avoid leaking future secret cards in DevTools
  cs.deck = state.deck.map(c => ({ id: c.id, type: c.type }));

  // Sanitize player inventories (hide isReal of opponents' cards unless revealed)
  for (const p of cs.players) {
    for (const c of p.inventory) {
      if (p.id === viewerId) continue;
      const revealed = viewer?.revealedCards?.includes(c.id);
      if (!revealed) delete c.isReal;
    }
  }

  // Sanitize auction card (keep name, prices, icon; hide only isReal unless revealed)
  if (cs.auction?.card) {
    const revealed = viewer?.revealedCards?.includes(cs.auction.card.id);
    if (!revealed) delete cs.auction.card.isReal;
  }

  if (cs.trade?.active) {
    const isParticipant = (cs.trade.proposerId === viewerId || cs.trade.targetId === viewerId);
    if (!isParticipant) {
      cs.trade.offer = { cards: [], money: '?' };
      cs.trade.request = { cards: [], money: '?' };
    }
  }

  delete cs._revealResult;
  return cs;
}

module.exports = {
  createInitialGameState,
  getCurrentPlayer,
  endTurn,
  startAuction,
  placeBid,
  closeAuction,
  drawFromDeck,
  sellToBank,
  getCardBankValue,
  calcFinalAsset,
  proposeTrade,
  respondTrade,
  cancelTrade,
  useAbilityCard,
  getClientState,
  deepClone,
};

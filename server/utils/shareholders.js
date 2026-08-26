const SHAREHOLDERS = [
  { id: 'ziad', name: 'Ziad', share: 0.4 },
  { id: 'khaled', name: 'Khaled', share: 0.3 },
  { id: 'omar', name: 'Omar', share: 0.3 },
];

const SHAREHOLDER_IDS = new Set(SHAREHOLDERS.map((s) => s.id));

const ADVANCE_REPAY = {
  omar: { ziad: 0.55, khaled: 0.45 },
  ziad: { omar: 0.5, khaled: 0.5 },
  khaled: { ziad: 0.55, omar: 0.45 },
};

const repaySharesForPayer = (payerId) => ADVANCE_REPAY[payerId] || null;

module.exports = {
  SHAREHOLDERS,
  SHAREHOLDER_IDS,
  ADVANCE_REPAY,
  repaySharesForPayer,
};

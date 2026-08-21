const SHAREHOLDERS = [
  { id: 'ziad', name: 'Ziad', share: 0.4 },
  { id: 'khaled', name: 'Khaled', share: 0.3 },
  { id: 'omar', name: 'Omar', share: 0.3 },
];

const SHAREHOLDER_IDS = new Set(SHAREHOLDERS.map((s) => s.id));

module.exports = { SHAREHOLDERS, SHAREHOLDER_IDS };

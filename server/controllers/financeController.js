const prisma = require('../lib/prisma');
const { SHAREHOLDERS, SHAREHOLDER_IDS, repaySharesForPayer } = require('../utils/shareholders');

const toNum = (v) => Number(v) || 0;

const parseDateRange = (query) => {
  const createdAt = {};
  if (query.from) createdAt.gte = new Date(query.from);
  if (query.to) {
    const end = new Date(query.to);
    end.setHours(23, 59, 59, 999);
    createdAt.lte = end;
  }
  return Object.keys(createdAt).length ? createdAt : undefined;
};

const serializeEntry = (e) => ({
  ...e,
  amount: toNum(e.amount),
});

const listEntries = async (req, res) => {
  try {
    const occurredAt = parseDateRange(req.query);
    const entries = await prisma.financeEntry.findMany({
      where: occurredAt ? { occurredAt } : undefined,
      orderBy: { occurredAt: 'desc' },
    });
    res.json(entries.map(serializeEntry));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createEntry = async (req, res) => {
  try {
    const { kind, funding, paidBy, title, notes, amount, occurredAt } = req.body;
    if (!['expense', 'revenue'].includes(kind)) {
      return res.status(400).json({ message: 'kind must be expense or revenue' });
    }
    const fundingType = funding === 'advance' ? 'advance' : 'company';
    if (fundingType === 'advance') {
      if (kind !== 'expense') {
        return res.status(400).json({ message: 'Shareholder advances must be expenses' });
      }
      if (!SHAREHOLDER_IDS.has(paidBy)) {
        return res.status(400).json({ message: 'paidBy must be ziad, khaled, or omar' });
      }
    }
    if (!String(title || '').trim()) {
      return res.status(400).json({ message: 'title is required' });
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number' });
    }

    const entry = await prisma.financeEntry.create({
      data: {
        kind,
        funding: fundingType,
        paidBy: fundingType === 'advance' ? paidBy : null,
        title: String(title).trim(),
        notes: notes ? String(notes).trim() : null,
        amount: value,
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      },
    });
    res.status(201).json(serializeEntry(entry));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateEntry = async (req, res) => {
  try {
    const existing = await prisma.financeEntry.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Entry not found' });

    const data = {};
    if (req.body.kind !== undefined) {
      if (!['expense', 'revenue'].includes(req.body.kind)) {
        return res.status(400).json({ message: 'kind must be expense or revenue' });
      }
      data.kind = req.body.kind;
    }
    if (req.body.funding !== undefined) {
      data.funding = req.body.funding === 'advance' ? 'advance' : 'company';
    }
    if (req.body.paidBy !== undefined) data.paidBy = req.body.paidBy || null;
    if (req.body.title !== undefined) data.title = String(req.body.title).trim();
    if (req.body.notes !== undefined) {
      data.notes = req.body.notes ? String(req.body.notes).trim() : null;
    }
    if (req.body.amount !== undefined) {
      const value = Number(req.body.amount);
      if (!Number.isFinite(value) || value <= 0) {
        return res.status(400).json({ message: 'amount must be a positive number' });
      }
      data.amount = value;
    }
    if (req.body.occurredAt !== undefined) data.occurredAt = new Date(req.body.occurredAt);

    const kind = data.kind ?? existing.kind;
    const funding = data.funding ?? existing.funding;
    let paidBy = data.paidBy !== undefined ? data.paidBy : existing.paidBy;

    if (funding === 'advance') {
      if (kind !== 'expense') {
        return res.status(400).json({ message: 'Shareholder advances must be expenses' });
      }
      if (!SHAREHOLDER_IDS.has(paidBy)) {
        return res.status(400).json({ message: 'paidBy must be ziad, khaled, or omar' });
      }
    } else {
      paidBy = null;
      data.paidBy = null;
    }

    const entry = await prisma.financeEntry.update({
      where: { id: req.params.id },
      data: { ...data, paidBy },
    });
    res.json(serializeEntry(entry));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteEntry = async (req, res) => {
  try {
    await prisma.financeEntry.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const financeOverview = async (req, res) => {
  try {
    const orderCreatedAt = parseDateRange(req.query);
    const entryOccurredAt = parseDateRange(req.query);

    const [orders, entries, lowStock] = await Promise.all([
      prisma.order.findMany({
        where: {
          status: { not: 'canceled' },
          ...(orderCreatedAt ? { createdAt: orderCreatedAt } : {}),
        },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.financeEntry.findMany({
        where: entryOccurredAt ? { occurredAt: entryOccurredAt } : undefined,
        orderBy: { occurredAt: 'desc' },
      }),
      prisma.product.findMany({
        where: { stock: { lte: 5 } },
        orderBy: { stock: 'asc' },
        take: 10,
      }),
    ]);

    const orderRevenue = orders.reduce((sum, o) => sum + toNum(o.totalPrice), 0);
    const collected = orders
      .filter((o) => o.isPaid)
      .reduce((sum, o) => sum + toNum(o.totalPrice), 0);
    const itemsRevenue = orders.reduce((sum, o) => sum + toNum(o.itemsPrice), 0);
    const shippingRevenue = orders.reduce((sum, o) => sum + toNum(o.shippingPrice), 0);
    const discounts = orders.reduce((sum, o) => sum + toNum(o.discountAmount), 0);

    let cogs = 0;
    let unitsSold = 0;
    for (const order of orders) {
      for (const item of order.items || []) {
        const qty = Number(item.qty) || 0;
        cogs += toNum(item.cost) * qty;
        unitsSold += qty;
      }
    }

    const customRevenue = entries
      .filter((e) => e.kind === 'revenue')
      .reduce((sum, e) => sum + toNum(e.amount), 0);
    const companyExpenses = entries
      .filter((e) => e.kind === 'expense' && e.funding === 'company')
      .reduce((sum, e) => sum + toNum(e.amount), 0);
    const advanceExpenses = entries
      .filter((e) => e.kind === 'expense' && e.funding === 'advance')
      .reduce((sum, e) => sum + toNum(e.amount), 0);

    const totalRevenue = orderRevenue + customRevenue;
    const totalExpenses = cogs + companyExpenses + advanceExpenses;
    const profit = totalRevenue - totalExpenses;

    const owedBy = Object.fromEntries(SHAREHOLDERS.map((s) => [s.id, 0]));
    const owedTo = Object.fromEntries(SHAREHOLDERS.map((s) => [s.id, 0]));
    const settlements = [];

    for (const entry of entries.filter((e) => e.kind === 'expense' && e.funding === 'advance')) {
      const payer = SHAREHOLDERS.find((s) => s.id === entry.paidBy);
      if (!payer) continue;
      const amount = toNum(entry.amount);
      const repay = repaySharesForPayer(payer.id);
      if (!repay) continue;

      for (const [fromId, portion] of Object.entries(repay)) {
        const from = SHAREHOLDERS.find((s) => s.id === fromId);
        if (!from || from.id === payer.id) continue;
        const shareAmount = amount * portion;
        owedBy[from.id] += shareAmount;
        owedTo[payer.id] += shareAmount;
        settlements.push({
          entryId: entry.id,
          title: entry.title,
          from: from.id,
          fromName: from.name,
          to: payer.id,
          toName: payer.name,
          amount: Math.round(shareAmount * 100) / 100,
        });
      }
    }

    const shareholders = SHAREHOLDERS.map((s) => ({
      ...s,
      sharePercent: Math.round(s.share * 100),
      profitShare: Math.round(profit * s.share * 100) / 100,
      owedToThem: Math.round(owedTo[s.id] * 100) / 100,
      theyOwe: Math.round(owedBy[s.id] * 100) / 100,
      netReimbursement: Math.round((owedTo[s.id] - owedBy[s.id]) * 100) / 100,
    }));

    const byStatus = orders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});

    res.json({
      shareholders,
      settlements,
      overview: {
        orderCount: orders.length,
        unitsSold,
        orderRevenue: Math.round(orderRevenue * 100) / 100,
        itemsRevenue: Math.round(itemsRevenue * 100) / 100,
        shippingRevenue: Math.round(shippingRevenue * 100) / 100,
        discounts: Math.round(discounts * 100) / 100,
        collected: Math.round(collected * 100) / 100,
        customRevenue: Math.round(customRevenue * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        cogs: Math.round(cogs * 100) / 100,
        companyExpenses: Math.round(companyExpenses * 100) / 100,
        advanceExpenses: Math.round(advanceExpenses * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        marginPercent:
          totalRevenue > 0 ? Math.round((profit / totalRevenue) * 1000) / 10 : 0,
      },
      byStatus,
      recentOrders: orders.slice(0, 10).map((o) => ({
        id: o.id,
        totalPrice: toNum(o.totalPrice),
        status: o.status,
        isPaid: o.isPaid,
        createdAt: o.createdAt,
        customerName: o.userId ? undefined : o.guestName,
      })),
      recentEntries: entries.slice(0, 10).map(serializeEntry),
      lowStock: lowStock.map((p) => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        price: toNum(p.price),
        cost: toNum(p.cost),
      })),
      suggestions: [
        'Track courier fees as company expenses so delivery cost is not hidden inside profit.',
        'Update each product Cost when supplier prices change — COGS uses the cost saved on each order line.',
        'Log shareholder advances right away (Uber, samples, packaging) so reimbursements stay clear.',
        'Use date filters for monthly closes before splitting profit among Ziad / Khaled / Omar.',
        'Prefer Collected (paid) vs Gross revenue when cash is tight — unpaid COD is not money in hand yet.',
        'Add a “settled” flag later for advance repayments once Ziad/Khaled/Omar pay each other back.',
      ],
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  listEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  financeOverview,
  SHAREHOLDERS,
};

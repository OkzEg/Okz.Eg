const formatMoney = (n) =>
  new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Make Drive / Cloudinary / absolute URLs usable in email <img> tags. */
const publicImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    const isDriveRelated =
      /drive\.google\.com|drive\.usercontent\.google\.com|lh3\.googleusercontent\.com\/d\//.test(
        path
      );
    if (isDriveRelated) {
      const id =
        path.match(/\/file\/d\/([^/?&#]+)/)?.[1] ||
        path.match(/lh3\.googleusercontent\.com\/d\/([^?=&#]+)/)?.[1] ||
        path.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];
      if (id) return `https://lh3.googleusercontent.com/d/${id}`;
    }
    if (path.includes('res.cloudinary.com/image/upload/')) {
      const tx = 'f_auto,q_auto,w_240,c_limit';
      const [prefix, rest] = path.split('/upload/');
      if (rest && !rest.startsWith(`${tx}/`)) {
        return `${prefix}/upload/${tx}/${rest}`;
      }
    }
    return path;
  }
  return path;
};

const addressLines = (shippingAddress) => {
  if (!shippingAddress || typeof shippingAddress !== 'object') return [];
  return [
    shippingAddress.street,
    [shippingAddress.city, shippingAddress.state].filter(Boolean).join(', '),
    shippingAddress.zip,
    shippingAddress.country,
  ].filter((line) => String(line || '').trim());
};

const buildOrderConfirmationHtml = (order) => {
  const orderId = String(order.id || '').slice(0, 8).toUpperCase();
  const name = order.customerName || order.guestName || 'there';
  const items = Array.isArray(order.items) ? order.items : [];
  const addr = addressLines(order.shippingAddress);

  const itemRows = items
    .map((item) => {
      const img = publicImageUrl(item.image);
      const meta = [item.color, item.size ? `Size ${item.size}` : null, `Qty ${item.qty}`]
        .filter(Boolean)
        .join(' · ');
      const lineTotal = formatMoney(Number(item.price) * Number(item.qty));
      return `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #ebe5d8;vertical-align:top;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td width="72" style="vertical-align:top;padding-right:14px;">
                  ${
                    img
                      ? `<img src="${escapeHtml(img)}" alt="" width="64" height="64" style="display:block;width:64px;height:64px;object-fit:contain;border-radius:8px;background:#f5f1e8;border:1px solid #ebe5d8;" />`
                      : `<div style="width:64px;height:64px;border-radius:8px;background:#f5f1e8;border:1px solid #ebe5d8;"></div>`
                  }
                </td>
                <td style="vertical-align:top;">
                  <div style="font-weight:600;color:#2b262c;font-size:15px;">${escapeHtml(item.name)}</div>
                  <div style="color:#6e686f;font-size:13px;margin-top:4px;">${escapeHtml(meta)}</div>
                  <div style="color:#2b262c;font-size:14px;margin-top:6px;font-weight:600;">${escapeHtml(lineTotal)}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    })
    .join('');

  const discount =
    Number(order.discountAmount) > 0
      ? `<tr>
          <td style="padding:6px 0;color:#6e686f;font-size:14px;">Discount${
            order.couponCode ? ` (${escapeHtml(order.couponCode)})` : ''
          }</td>
          <td style="padding:6px 0;text-align:right;color:#2b262c;font-size:14px;">-${escapeHtml(
            formatMoney(order.discountAmount)
          )}</td>
        </tr>`
      : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Order ${escapeHtml(orderId)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f1e8;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f5f1e8;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ebe5d8;">
          <tr>
            <td style="background:#2b262c;padding:28px 28px 24px;text-align:center;">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#b77239;font-weight:700;">OKZ</div>
              <div style="font-size:28px;letter-spacing:0.04em;color:#faf6ef;margin-top:10px;">Order confirmed</div>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#d4cdc0;margin-top:8px;">Thanks, ${escapeHtml(
                name
              )} — we received your order.</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-family:Arial,Helvetica,sans-serif;margin-bottom:22px;">
                <tr>
                  <td style="color:#6e686f;font-size:13px;">Order</td>
                  <td style="text-align:right;color:#2b262c;font-size:13px;font-weight:700;font-family:ui-monospace,Consolas,monospace;">#${escapeHtml(
                    orderId
                  )}</td>
                </tr>
                <tr>
                  <td style="color:#6e686f;font-size:13px;padding-top:8px;">Payment</td>
                  <td style="text-align:right;color:#2b262c;font-size:13px;padding-top:8px;">${escapeHtml(
                    order.paymentMethod || '—'
                  )}</td>
                </tr>
                <tr>
                  <td style="color:#6e686f;font-size:13px;padding-top:8px;">Date</td>
                  <td style="text-align:right;color:#2b262c;font-size:13px;padding-top:8px;">${escapeHtml(
                    order.createdAt
                      ? new Date(order.createdAt).toLocaleString('en-EG', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : '—'
                  )}</td>
                </tr>
              </table>

              <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#6e686f;margin-bottom:8px;">Items</div>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-family:Arial,Helvetica,sans-serif;">
                ${itemRows || '<tr><td style="color:#6e686f;font-size:14px;">No items</td></tr>'}
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-family:Arial,Helvetica,sans-serif;margin-top:18px;border-top:1px solid #ebe5d8;padding-top:12px;">
                <tr>
                  <td style="padding:6px 0;color:#6e686f;font-size:14px;">Subtotal</td>
                  <td style="padding:6px 0;text-align:right;color:#2b262c;font-size:14px;">${escapeHtml(
                    formatMoney(order.itemsPrice)
                  )}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#6e686f;font-size:14px;">Shipping</td>
                  <td style="padding:6px 0;text-align:right;color:#2b262c;font-size:14px;">${
                    Number(order.shippingPrice) === 0
                      ? 'Free'
                      : escapeHtml(formatMoney(order.shippingPrice))
                  }</td>
                </tr>
                ${discount}
                <tr>
                  <td style="padding:12px 0 0;color:#2b262c;font-size:16px;font-weight:700;">Total</td>
                  <td style="padding:12px 0 0;text-align:right;color:#2b262c;font-size:16px;font-weight:700;">${escapeHtml(
                    formatMoney(order.totalPrice)
                  )}</td>
                </tr>
              </table>

              ${
                addr.length
                  ? `<div style="font-family:Arial,Helvetica,sans-serif;margin-top:24px;padding-top:18px;border-top:1px solid #ebe5d8;">
                      <div style="font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#6e686f;margin-bottom:8px;">Shipping address</div>
                      <div style="color:#2b262c;font-size:14px;line-height:1.55;">${addr
                        .map((line) => escapeHtml(line))
                        .join('<br/>')}</div>
                    </div>`
                  : ''
              }

              <p style="font-family:Arial,Helvetica,sans-serif;margin:24px 0 0;color:#6e686f;font-size:13px;line-height:1.55;">
                We’ll contact you within 12 hours to confirm your order. If you have questions, reply to this email or reach us at
                <a href="mailto:okzeg3@gmail.com" style="color:#b77239;text-decoration:none;">okzeg3@gmail.com</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#faf6ef;padding:16px 28px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6e686f;">
              © ${new Date().getFullYear()} OKZ · Premium boots &amp; gear
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

module.exports = {
  buildOrderConfirmationHtml,
  formatMoney,
  publicImageUrl,
};

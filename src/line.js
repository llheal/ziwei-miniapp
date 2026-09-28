import liff from '@line/liff';

// LIFF ID は .env の VITE_LIFF_ID で指定する。未設定なら通常のブラウザとして動作する（開発用）。
const LIFF_ID = import.meta.env.VITE_LIFF_ID || '';

// アプリ内課金の設定。注文ID（orderId）の発行と購入完了の確認はサーバー側で行う必要があるため、
// VITE_ORDER_API が未設定の間は課金を行わない。
const ORDER_API = import.meta.env.VITE_ORDER_API || '';
export const PRODUCT_ID = import.meta.env.VITE_PRODUCT_ID || 'ziwei_full_report';

let ready = false;

export async function initLine() {
  if (!LIFF_ID) return { enabled: false };
  try {
    await liff.init({ liffId: LIFF_ID });
    ready = true;
    return { enabled: true, inClient: liff.isInClient() };
  } catch (e) {
    console.error('LIFF init failed', e);
    return { enabled: false, error: String(e) };
  }
}

export function permanentLink() {
  if (!LIFF_ID) return location.origin + location.pathname;
  return `https://miniapp.line.me/${LIFF_ID}`;
}

/** 相性結果を友だちにシェアする。LINE外ではWeb Share APIかクリップボードにフォールバック。 */
export async function shareCompat({ nameA, nameB, score, typeA, typeB }) {
  const link = permanentLink();
  const altText = `${nameA}×${nameB}の紫微斗数相性は${score}点でした`;
  if (ready && liff.isApiAvailable('shareTargetPicker')) {
    const message = {
      type: 'flex',
      altText,
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            { type: 'text', text: '紫微斗数 相性診断', size: 'sm', color: '#8a7cc2', weight: 'bold' },
            { type: 'text', text: `${nameA} × ${nameB}`, size: 'lg', weight: 'bold', wrap: true },
            { type: 'text', text: `${score}点`, size: '3xl', weight: 'bold', color: '#5b3fd1' },
            { type: 'text', text: `${typeA} × ${typeB}`, size: 'sm', color: '#666666', wrap: true },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'button', style: 'primary', color: '#5b3fd1', action: { type: 'uri', label: 'あなたも無料で占う', uri: link } },
          ],
        },
      },
    };
    const res = await liff.shareTargetPicker([message]);
    return res ? 'sent' : 'cancelled';
  }
  const text = `${altText}✨\nあなたも無料で占ってみて → ${link}`;
  if (navigator.share) {
    try { await navigator.share({ text }); return 'sent'; } catch { return 'cancelled'; }
  }
  try { await navigator.clipboard.writeText(text); return 'copied'; } catch { return 'failed'; }
}

/**
 * 詳細レポートの購入。
 * 本番：サーバーで注文を作成 → liff.iap.createPayment → サーバーで購入完了を確認。
 * 開発：課金設定がない場合はテスト解放のみ（本番では表示しない）。
 */
export async function purchaseReport() {
  if (ready && liff.isInClient() && ORDER_API) {
    await liff.iap.requestConsentAgreement();
    const idToken = liff.getIDToken();
    const orderRes = await fetch(`${ORDER_API}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ productId: PRODUCT_ID }),
    });
    if (!orderRes.ok) throw new Error('注文の作成に失敗しました');
    const { orderId } = await orderRes.json();
    await liff.iap.createPayment({ productId: PRODUCT_ID, orderId });
    const check = await fetch(`${ORDER_API}/orders/${orderId}`, { headers: { Authorization: `Bearer ${idToken}` } });
    const { status } = await check.json();
    return status === 'COMPLETED';
  }
  if (import.meta.env.DEV) return true; // 開発モードのテスト解放
  throw new Error('現在、購入機能を準備中です');
}

export async function fetchPrice() {
  if (!(ready && liff.isInClient() && ORDER_API)) return null;
  try {
    const products = await liff.iap.getPlatformProducts({ productIds: [PRODUCT_ID] });
    return products[PRODUCT_ID] || null;
  } catch {
    return null;
  }
}

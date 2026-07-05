export async function triggerPushNotification(
  recipientUids: string[],
  title: string,
  body: string,
  type: string = 'chat',
  data: any = {}
) {
  if (!recipientUids || recipientUids.length === 0) return;

  try {
    const res = await fetch('/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipientUids,
        title,
        body,
        data: {
          type,
          ...data
        }
      })
    });
    const responseData = await res.json();
    console.log('[notifications.ts] Push trigger output:', responseData);
  } catch (err) {
    console.error('[notifications.ts] Push notification trigger error:', err);
  }
}

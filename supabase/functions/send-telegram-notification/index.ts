const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramRequest {
  projectName: string;
  deploymentUrl: string;
  status: 'success' | 'failed';
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectName, deploymentUrl, status, error } = await req.json() as TelegramRequest;
    
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const chatId = Deno.env.get('TELEGRAM_CHAT_ID');

    if (!botToken || !chatId) {
      throw new Error('Telegram credentials not configured');
    }

    const statusEmoji = status === 'success' ? '✅' : '❌';
    const message = status === 'success'
      ? `${statusEmoji} *Deployment Successful*\n\n` +
        `*Project:* ${projectName}\n` +
        `*URL:* ${deploymentUrl}\n` +
        `*Status:* ${status}\n` +
        `*Time:* ${new Date().toLocaleString()}`
      : `${statusEmoji} *Deployment Failed*\n\n` +
        `*Project:* ${projectName}\n` +
        `*Status:* ${status}\n` +
        `*Error:* ${error || 'Unknown error'}\n` +
        `*Time:* ${new Date().toLocaleString()}`;

    console.log('Sending Telegram message:', message);

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      }
    );

    const telegramData = await telegramResponse.json();
    console.log('Telegram response:', telegramData);

    if (!telegramResponse.ok) {
      throw new Error(`Telegram API error: ${JSON.stringify(telegramData)}`);
    }

    return new Response(
      JSON.stringify({ success: true, telegram: telegramData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Telegram notification error:', error);

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

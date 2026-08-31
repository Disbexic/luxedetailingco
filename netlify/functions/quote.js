exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body || '{}');

    const message = [
      'LUXE QUOTE REQUEST',
      '',
      `Name: ${data.name || ''}`,
      `Phone: ${data.phone || ''}`,
      `Email: ${data.email || ''}`,
      `Vehicle: ${data['vehicle-type'] || ''}`,
      `Service: ${data.service || ''}`,
      `Condition: ${data.condition || ''}`,
      `City / ZIP: ${data.location || ''}`,
      `Preferred Date: ${data.date || ''}`
    ].join('\n');

    const smsTarget = process.env.LUXE_SMS_TO || '+19258722494';
    const emailTarget =
      process.env.LUXE_EMAIL_TO || 'ldctrivalley@gmail.com';

    let smsSent = false;
    let emailSent = false;

    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER
    ) {
      const auth = Buffer.from(
        `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
      ).toString('base64');

      const body = new URLSearchParams({
        To: smsTarget,
        From: process.env.TWILIO_FROM_NUMBER,
        Body: message
      });

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body
        }
      );

      smsSent = response.ok;
    }

    if (process.env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from:
            process.env.RESEND_FROM_EMAIL ||
            'Luxe Website <onboarding@resend.dev>',
          to: [emailTarget],
          subject: `New Luxe quote request — ${data.name || 'Customer'}`,
          text: message
        })
      });

      emailSent = response.ok;
    }

    if (!smsSent && !emailSent) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'SMS and email services are not configured yet.'
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        smsSent,
        emailSent
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Could not send quote request.'
      })
    };
  }
};

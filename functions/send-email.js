// InsForge Edge Function for sending emails
// Deploy this function to handle email notifications

module.exports = async function(request) {
  try {
    const { to, subject, html, text } = await request.json();

    // Validate required fields
    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Use your email service provider (e.g., SendGrid, Mailgun, AWS SES)
    // Example with a generic email API:
    const emailServiceUrl = process.env.EMAIL_SERVICE_URL || 'https://api.emailservice.com/send';
    const emailApiKey = process.env.EMAIL_API_KEY;

    const emailResponse = await fetch(emailServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${emailApiKey}`
      },
      body: JSON.stringify({
        to,
        subject,
        html: html || text,
        text: text || html?.replace(/<[^>]*>/g, '') // Strip HTML if only HTML provided
      })
    });

    if (!emailResponse.ok) {
      throw new Error('Failed to send email');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Email sending error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send email' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};


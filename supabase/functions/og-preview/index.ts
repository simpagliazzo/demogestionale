import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const type = url.searchParams.get('type') // 'quote' or 'confirmation'
    const id = url.searchParams.get('id')

    if (!type || !id) {
      return new Response('Missing parameters', { status: 400 })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch agency settings
    const { data: agency } = await supabase
      .from('agency_settings')
      .select('*')
      .limit(1)
      .single()

    let title = ''
    let description = ''
    let imageUrl = agency?.logo_url || ''

    if (type === 'quote') {
      // Fetch quote data
      const { data: quote, error } = await supabase
        .from('quotes')
        .select('destination, customer_name')
        .eq('id', id)
        .single()

      if (error || !quote) {
        return new Response('Quote not found', { status: 404 })
      }

      // Build title from template
      title = agency?.og_quote_title || 'Preventivo di Viaggio - {DESTINAZIONE}'
      title = title
        .replace(/\{DESTINAZIONE\}/g, quote.destination || '')
        .replace(/\{NOME_CLIENTE\}/g, quote.customer_name || '')
        .replace(/\{NOME_AGENZIA\}/g, agency?.business_name || '')

      // Build description from template
      description = agency?.og_quote_description || 'Preventivo personalizzato per il tuo viaggio a {DESTINAZIONE}'
      description = description
        .replace(/\{DESTINAZIONE\}/g, quote.destination || '')
        .replace(/\{NOME_CLIENTE\}/g, quote.customer_name || '')
        .replace(/\{NOME_AGENZIA\}/g, agency?.business_name || '')

      // Use custom image if set
      if (agency?.og_quote_image_url) {
        imageUrl = agency.og_quote_image_url
      }

    } else if (type === 'confirmation') {
      // Fetch participant and trip data
      const { data: participant, error } = await supabase
        .from('participants')
        .select('full_name, trip_id, trips(title)')
        .eq('id', id)
        .single()

      if (error || !participant) {
        return new Response('Confirmation not found', { status: 404 })
      }

      const tripTitle = (participant.trips as any)?.title || 'Viaggio'

      // Build title from template
      title = agency?.og_confirmation_title || 'Conferma Prenotazione - {VIAGGIO}'
      title = title
        .replace(/\{VIAGGIO\}/g, tripTitle)
        .replace(/\{PARTECIPANTE\}/g, participant.full_name || '')
        .replace(/\{NOME_AGENZIA\}/g, agency?.business_name || '')

      // Build description from template
      description = agency?.og_confirmation_description || 'La tua prenotazione per {VIAGGIO} è confermata!'
      description = description
        .replace(/\{VIAGGIO\}/g, tripTitle)
        .replace(/\{PARTECIPANTE\}/g, participant.full_name || '')
        .replace(/\{NOME_AGENZIA\}/g, agency?.business_name || '')

      // Use custom image if set
      if (agency?.og_confirmation_image_url) {
        imageUrl = agency.og_confirmation_image_url
      }
    } else {
      return new Response('Invalid type', { status: 400 })
    }

    // Escape HTML entities
    const escapeHtml = (text: string) => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }

    const safeTitle = escapeHtml(title)
    const safeDescription = escapeHtml(description)
    const safeImageUrl = escapeHtml(imageUrl)
    const agencyName = escapeHtml(agency?.business_name || 'Agenzia Viaggi')

    // Determine redirect URL
    const appUrl = Deno.env.get('APP_URL') || 'https://07467253-b461-4615-a97f-74400294f8c8.lovableproject.com'
    const redirectPath = type === 'quote' ? `/preventivo/${id}` : `/conferma/${id}`
    const fullRedirectUrl = `${appUrl}${redirectPath}`

    // Return HTML with OG meta tags and redirect
    const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:site_name" content="${agencyName}">
  ${safeImageUrl ? `<meta property="og:image" content="${safeImageUrl}">` : ''}
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  ${safeImageUrl ? `<meta name="twitter:image" content="${safeImageUrl}">` : ''}
  
  <!-- Redirect to actual app -->
  <meta http-equiv="refresh" content="0;url=${fullRedirectUrl}">
  <script>window.location.href = "${fullRedirectUrl}";</script>
</head>
<body>
  <p>Reindirizzamento in corso...</p>
  <p><a href="${fullRedirectUrl}">Clicca qui se non vieni reindirizzato automaticamente</a></p>
</body>
</html>`

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response('Internal error', { status: 500 })
  }
})
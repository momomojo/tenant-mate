// Updated January 2026 - Security hardened
import { createClient } from 'npm:@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightOrRestrict } from '../_shared/cors.ts'

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: Record<string, unknown>
  old_record?: Record<string, unknown>
  schema: string
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  const preflightResponse = handleCorsPreflightOrRestrict(req)
  if (preflightResponse) return preflightResponse

  try {
    const payload: WebhookPayload = await req.json()
    const { type, table, record, old_record } = payload

    console.log(`Database webhook received: ${type} on ${table}`)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Route to appropriate handler based on table and event type
    switch (table) {
      case 'maintenance_requests':
        if (type === 'INSERT') {
          await handleMaintenanceCreated(supabase, supabaseUrl, serviceRoleKey, record)
        } else if (type === 'UPDATE' && old_record?.status !== record.status) {
          await handleMaintenanceStatusChanged(supabase, supabaseUrl, serviceRoleKey, record)
        }
        break

      case 'tenant_units':
        if (type === 'INSERT') {
          await handleTenantAssigned(supabase, supabaseUrl, serviceRoleKey, record)
        }
        break

      default:
        console.log(`No handler for table: ${table}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Database webhook error:', error)
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleMaintenanceCreated(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceRoleKey: string,
  record: Record<string, unknown>
) {
  // Fetch full maintenance request with related data
  const { data: maintenance } = await supabase
    .from('maintenance_requests')
    .select(`
      id,
      title,
      description,
      priority,
      tenant_id,
      unit:units(
        unit_number,
        property:properties(
          name,
          owner_id
        )
      ),
      tenant:profiles!maintenance_requests_tenant_id_fkey(first_name, last_name)
    `)
    .eq('id', record.id)
    .single()

  if (!maintenance?.unit?.property?.owner_id) {
    console.log('Could not find property owner for maintenance request')
    return
  }

  // Get landlord email
  const { data: landlord } = await supabase
    .from('profiles')
    .select('email, first_name, last_name')
    .eq('id', maintenance.unit.property.owner_id)
    .single()

  if (!landlord?.email) {
    console.log('Landlord email not found')
    return
  }

  // Send email notification to landlord
  await sendNotificationEmail(supabaseUrl, serviceRoleKey, {
    type: 'maintenance_created',
    recipientEmail: landlord.email,
    recipientName: `${landlord.first_name || ''} ${landlord.last_name || ''}`.trim() || 'Property Owner',
    data: {
      title: maintenance.title,
      description: maintenance.description,
      priority: maintenance.priority,
      propertyName: maintenance.unit.property.name,
      unitNumber: maintenance.unit.unit_number,
      tenantName: `${maintenance.tenant?.first_name || ''} ${maintenance.tenant?.last_name || ''}`.trim() || 'Tenant',
    },
  })

  console.log('Maintenance created email sent to landlord')
}

async function handleMaintenanceStatusChanged(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceRoleKey: string,
  record: Record<string, unknown>
) {
  // Fetch maintenance request with tenant info
  const { data: maintenance } = await supabase
    .from('maintenance_requests')
    .select(`
      id,
      title,
      status,
      tenant:profiles!maintenance_requests_tenant_id_fkey(email, first_name, last_name),
      unit:units(
        unit_number,
        property:properties(name)
      )
    `)
    .eq('id', record.id)
    .single()

  if (!maintenance?.tenant?.email) {
    console.log('Tenant email not found for maintenance status update')
    return
  }

  // Send email notification to tenant
  await sendNotificationEmail(supabaseUrl, serviceRoleKey, {
    type: 'maintenance_status_changed',
    recipientEmail: maintenance.tenant.email,
    recipientName: `${maintenance.tenant.first_name || ''} ${maintenance.tenant.last_name || ''}`.trim() || 'Tenant',
    data: {
      title: maintenance.title,
      status: maintenance.status,
      propertyName: maintenance.unit?.property?.name || 'Property',
      unitNumber: maintenance.unit?.unit_number || 'Unit',
    },
  })

  console.log('Maintenance status update email sent to tenant')
}

async function handleTenantAssigned(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceRoleKey: string,
  record: Record<string, unknown>
) {
  // Fetch tenant unit with related data
  const { data: tenantUnit } = await supabase
    .from('tenant_units')
    .select(`
      id,
      lease_start,
      lease_end,
      rent_amount,
      tenant:profiles!tenant_units_tenant_id_fkey(email, first_name, last_name),
      unit:units(
        unit_number,
        property:properties(name)
      )
    `)
    .eq('id', record.id)
    .single()

  if (!tenantUnit?.tenant?.email) {
    console.log('Tenant email not found for assignment notification')
    return
  }

  // Send welcome email to tenant
  await sendNotificationEmail(supabaseUrl, serviceRoleKey, {
    type: 'tenant_assigned',
    recipientEmail: tenantUnit.tenant.email,
    recipientName: `${tenantUnit.tenant.first_name || ''} ${tenantUnit.tenant.last_name || ''}`.trim() || 'Tenant',
    data: {
      propertyName: tenantUnit.unit?.property?.name || 'Property',
      unitNumber: tenantUnit.unit?.unit_number || 'Unit',
      monthlyRent: tenantUnit.rent_amount,
      leaseStart: tenantUnit.lease_start ? new Date(tenantUnit.lease_start as string).toLocaleDateString() : 'TBD',
      leaseEnd: tenantUnit.lease_end ? new Date(tenantUnit.lease_end as string).toLocaleDateString() : 'TBD',
    },
  })

  console.log('Tenant assignment welcome email sent')
}

async function sendNotificationEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  payload: {
    type: string
    recipientEmail: string
    recipientName: string
    data: Record<string, unknown>
  }
) {
  const response = await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Failed to send notification email:', errorText)
    throw new Error(`Email send failed: ${errorText}`)
  }

  return response.json()
}

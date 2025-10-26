export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { OpenMeter } from '@openmeter/sdk'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // TODO: authenticate user, resolve subject
  const subject = process.env.OPENMETER_SUBJECT

  const openmeter = new OpenMeter({
    baseUrl: process.env.OPENMETER_URL,
    token: process.env.OPENMETER_API_KEY
  })
  const data = await openmeter.portal.createToken({ subject })

  return Response.json(data)
}
